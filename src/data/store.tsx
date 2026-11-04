import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { gain, levelFor, penalty, petStage, tapXp, type GainResult } from '@/game/engine';
import { buy, feed } from '@/game/shop';
import { chooseStyle, type StyleOption } from '@/game/style';
import { todayISO } from '@/lib/dates';
import { cancelReminder, scheduleTodoReminder } from '@/lib/notifications';
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
  /** Set when the pet grows into a new stage; shown after any level-up celebration */
  evolution: { stage: number } | null;
  dismissEvolution: () => void;
  createProfile: (p: Pick<Profile, 'name' | 'gender' | 'look' | 'pet' | 'pet_name' | 'hair' | 'hair_color' | 'skin' | 'outfit'>) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  saveItem: (d: db.ItemDraft) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  /** Check off a habit or todo, or undo it when already done today */
  toggle: (item: Item) => Promise<void>;
  /** Good (+1) or bad (-1) tap on a counter habit */
  tap: (item: Item, delta: 1 | -1) => Promise<void>;
  /** Wipes everything and returns to onboarding */
  resetAll: () => Promise<void>;
  /** Buys a shop item with coins. Resolves to an error message, or null on success. */
  buyItem: (itemId: string) => Promise<string | null>;
  /** Feeds one food from the inventory. Resolves to an error message, or null on success. */
  feedPet: (foodId: string) => Promise<string | null>;
  /** Equips a hairstyle, hair colour or outfit, buying it first if locked. Resolves to an error, or null. */
  pickStyle: (kind: 'hair' | 'color' | 'outfit', option: StyleOption) => Promise<string | null>;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const sql = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [today, setToday] = useState<Completion[]>([]);
  const [reward, setReward] = useState<Reward | null>(null);
  const [evolution, setEvolution] = useState<{ stage: number } | null>(null);
  // Latest saved profile, so every save can tell whether it crossed a pet growth stage
  const profileRef = useRef<Profile | null>(null);

  const [day, setDay] = useState(todayISO);

  useEffect(() => {
    (async () => {
      const [p, i, c] = await Promise.all([db.loadProfile(sql), db.loadItems(sql), db.loadCompletions(sql, day)]);
      profileRef.current = p;
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
    // ...or stays open past midnight
    const tick = setInterval(() => setDay(todayISO()), 60_000);
    return () => {
      sub.remove();
      clearInterval(tick);
    };
  }, []);

  const persist = useCallback(
    async (next: Profile) => {
      const prev = profileRef.current;
      profileRef.current = next;
      setProfile(next);
      await db.saveProfile(sql, next);
      // Every way of gaining XP passes through here, so this is where the pet evolves
      if (prev && next.onboarded) {
        const before = petStage(levelFor(prev.xp).level);
        const after = petStage(levelFor(next.xp).level);
        if (after > before) setEvolution({ stage: after });
      }
    },
    [sql],
  );

  const reloadItems = useCallback(async () => setItems(await db.loadItems(sql)), [sql]);

  /** Full reward for finishing something; `extra` is the small tap XP that rides along on a multi-tap goal. */
  const earn = useCallback(
    async (p: Profile, item: Item, extra = 0) => {
      const result = gain(p, item.difficulty);
      const xp = result.xp + extra;
      const c = await db.addCompletion(sql, { item_id: item.id, date: todayISO(), delta: 1, xp, coins: result.coins });
      setToday((t) => [...t, c]);
      await persist({ ...p, ...result.patch, xp: p.xp + xp, coins: p.coins + result.coins });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newLevel = levelFor(p.xp + xp).level;
      const levelUp = newLevel > levelFor(p.xp).level;
      if (levelUp || result.increased || result.tokenEarned) setReward({ ...result, xp, levelUp, newLevel, title: item.title });
    },
    [sql, persist],
  );

  // Quests with a save in progress: rapid repeat taps are ignored so a goal can't be overshot
  const inflight = useRef(new Set<number>());

  const toggle = useCallback<GameContextValue['toggle']>(
    async (item) => {
      if (!profile || inflight.current.has(item.id)) return;
      inflight.current.add(item.id);
      try {
      const taps = today.filter((c) => c.item_id === item.id && c.delta > 0);
      const goal = item.kind === 'habit' ? Math.max(1, item.target) : 1;
      if (taps.length >= goal) {
        // Undo the latest tap: gives back its XP and coins, but the streak day stays earned
        const last = taps[taps.length - 1];
        await db.removeCompletion(sql, last.id);
        setToday((t) => t.filter((c) => c.id !== last.id));
        await persist({ ...profile, xp: Math.max(0, profile.xp - last.xp), coins: Math.max(0, profile.coins - last.coins) });
        if (item.kind === 'todo') {
          await db.setTodoDone(sql, item.id, null);
          await db.setNotifId(sql, item.id, await scheduleTodoReminder(item, profile.pet_name));
        }
        Haptics.selectionAsync();
      } else if (taps.length + 1 < goal) {
        // One more step towards a multi-tap goal
        const xp = tapXp(item.difficulty, goal);
        const c = await db.addCompletion(sql, { item_id: item.id, date: todayISO(), delta: 1, xp, coins: 0 });
        setToday((t) => [...t, c]);
        await persist({ ...profile, xp: profile.xp + xp });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Small taps can tip you over into the next level too
        const newLevel = levelFor(profile.xp + xp).level;
        if (newLevel > levelFor(profile.xp).level) {
          setReward({
            patch: { streak: profile.streak, best_streak: profile.best_streak, last_active_on: profile.last_active_on, freeze_tokens: profile.freeze_tokens },
            increased: false,
            freezesUsed: 0,
            tokenEarned: false,
            xp,
            coins: 0,
            levelUp: true,
            newLevel,
            title: item.title,
          });
        }
      } else {
        await earn(profile, item, tapXp(item.difficulty, goal));
        if (item.kind === 'todo') {
          await db.setTodoDone(sql, item.id, todayISO());
          await cancelReminder(item.notif_id);
          await db.setNotifId(sql, item.id, null);
        }
      }
      if (item.kind === 'todo') await reloadItems();
      } finally {
        inflight.current.delete(item.id);
      }
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
    evolution,
    dismissEvolution: () => setEvolution(null),
    createProfile: (p) =>
      persist({ ...db.PROFILE_DEFAULTS, ...p, xp: 0, coins: 0, streak: 0, best_streak: 0, last_active_on: null, freeze_tokens: 0, onboarded: true }),
    updateProfile: async (patch) => {
      if (profile) await persist({ ...profile, ...patch });
    },
    saveItem: async (d) => {
      const id = await db.saveItem(sql, d);
      // Re-plan the reminder whenever a todo's date or time may have changed
      await cancelReminder(items.find((i) => i.id === id)?.notif_id ?? null);
      const notif = d.kind === 'todo' ? await scheduleTodoReminder(d, profile?.pet_name ?? 'Your pet') : null;
      await db.setNotifId(sql, id, notif);
      await reloadItems();
    },
    deleteItem: async (id) => {
      await cancelReminder(items.find((i) => i.id === id)?.notif_id ?? null);
      await db.deleteItem(sql, id);
      setToday((t) => t.filter((c) => c.item_id !== id));
      await reloadItems();
    },
    toggle,
    tap,
    buyItem: async (itemId) => {
      if (!profile) return 'No profile';
      const r = buy(profile, itemId);
      if (!r.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return r.reason;
      }
      await persist({ ...profile, ...r.patch });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return null;
    },
    feedPet: async (foodId) => {
      if (!profile) return 'No profile';
      const r = feed(profile, foodId, todayISO());
      if (!r.ok) return r.reason;
      await persist({ ...profile, ...r.patch });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return null;
    },
    pickStyle: async (kind, option) => {
      if (!profile) return 'No profile';
      const r = chooseStyle(profile, kind, option);
      if (!r.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return r.reason;
      }
      const bought = (r.patch.coins ?? profile.coins) < profile.coins;
      await persist({ ...profile, ...r.patch });
      if (bought) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return null;
    },
    resetAll: async () => {
      await db.resetAll(sql);
      profileRef.current = null;
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
