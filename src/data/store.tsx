import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { gain, penalty, type GainResult } from '@/game/engine';
import { todayISO } from '@/lib/dates';
import * as db from './db';
import type { Completion, Item, Profile } from './types';

/** Something worth a full-screen celebration */
export type Reward = GainResult & { title: string };

type GameContextValue = {
  ready: boolean;
  profile: Profile | null;
  items: Item[];
  /** Completions logged today */
  today: Completion[];
  reward: Reward | null;
  dismissReward: () => void;
  createProfile: (p: Pick<Profile, 'name' | 'gender' | 'look' | 'pet' | 'pet_name'>) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  saveItem: (d: db.ItemDraft) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  /** Check off a habit or todo, or undo it when already done today */
  toggle: (item: Item) => Promise<void>;
  /** Good (+1) or bad (-1) tap on a counter habit */
  tap: (item: Item, delta: 1 | -1) => Promise<void>;
  /** Wipes everything and returns to onboarding */
  resetAll: () => Promise<void>;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const sql = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [today, setToday] = useState<Completion[]>([]);
  const [reward, setReward] = useState<Reward | null>(null);

  const [day, setDay] = useState(todayISO);

  useEffect(() => {
    (async () => {
      const [p, i, c] = await Promise.all([db.loadProfile(sql), db.loadItems(sql), db.loadCompletions(sql, day)]);
      setProfile(p);
      setItems(i);
      setToday(c);
      setReady(true);
    })();
  }, [sql, day]);

  // The app can sit in the background overnight: start a fresh day when it comes back
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setDay(todayISO());
    });
    return () => sub.remove();
  }, []);

  const persist = useCallback(
    async (next: Profile) => {
      setProfile(next);
      await db.saveProfile(sql, next);
    },
    [sql],
  );

  const reloadItems = useCallback(async () => setItems(await db.loadItems(sql)), [sql]);

  const earn = useCallback(
    async (p: Profile, item: Item) => {
      const result = gain(p, item.difficulty);
      const c = await db.addCompletion(sql, { item_id: item.id, date: todayISO(), delta: 1, xp: result.xp, coins: result.coins });
      setToday((t) => [...t, c]);
      await persist({ ...p, ...result.patch, xp: p.xp + result.xp, coins: p.coins + result.coins });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.levelUp || result.increased || result.tokenEarned) setReward({ ...result, title: item.title });
    },
    [sql, persist],
  );

  const toggle = useCallback<GameContextValue['toggle']>(
    async (item) => {
      if (!profile) return;
      const done = today.find((c) => c.item_id === item.id && c.delta > 0);
      if (done) {
        // Undo gives back the XP and coins, but the streak day stays earned
        await db.removeCompletion(sql, done.id);
        setToday((t) => t.filter((c) => c.id !== done.id));
        await persist({ ...profile, xp: Math.max(0, profile.xp - done.xp), coins: Math.max(0, profile.coins - done.coins) });
        if (item.kind === 'todo') await db.setTodoDone(sql, item.id, null);
        Haptics.selectionAsync();
      } else {
        await earn(profile, item);
        if (item.kind === 'todo') await db.setTodoDone(sql, item.id, todayISO());
      }
      if (item.kind === 'todo') await reloadItems();
    },
    [profile, today, sql, persist, earn, reloadItems],
  );

  const tap = useCallback<GameContextValue['tap']>(
    async (item, delta) => {
      if (!profile) return;
      if (delta > 0) return earn(profile, item);
      const { xp, lost } = penalty(profile, item.difficulty);
      const c = await db.addCompletion(sql, { item_id: item.id, date: todayISO(), delta: -1, xp: -lost, coins: 0 });
      setToday((t) => [...t, c]);
      await persist({ ...profile, xp });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    [profile, sql, persist, earn],
  );

  const value: GameContextValue = {
    ready,
    profile,
    items,
    today,
    reward,
    dismissReward: () => setReward(null),
    createProfile: (p) =>
      persist({ ...p, xp: 0, coins: 0, streak: 0, best_streak: 0, last_active_on: null, freeze_tokens: 0, onboarded: true }),
    updateProfile: async (patch) => {
      if (profile) await persist({ ...profile, ...patch });
    },
    saveItem: async (d) => {
      await db.saveItem(sql, d);
      await reloadItems();
    },
    deleteItem: async (id) => {
      await db.deleteItem(sql, id);
      setToday((t) => t.filter((c) => c.item_id !== id));
      await reloadItems();
    },
    toggle,
    tap,
    resetAll: async () => {
      await db.resetAll(sql);
      setItems([]);
      setToday([]);
      setProfile(null);
    },
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
