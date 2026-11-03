import type { Difficulty, Item, Profile } from '@/data/types';
import { addDays, daysBetween, fromISODate, toISODate } from '@/lib/dates';

export const REWARD: Record<Difficulty, { xp: number; coins: number }> = {
  easy: { xp: 10, coins: 2 },
  medium: { xp: 20, coins: 5 },
  hard: { xp: 35, coins: 10 },
};

/**
 * Small XP for each tap towards a multi-tap habit (e.g. 3/8 glasses of water).
 * The tap that reaches the goal also pays the full REWARD, so a goal is worth ~1.5x a plain habit.
 */
export function tapXp(difficulty: Difficulty, target: number) {
  return target > 1 ? Math.ceil(REWARD[difficulty].xp / (2 * target)) : 0;
}

/** Time-of-day greeting the pet opens with. */
export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

/** XP lost when tapping "-" on a bad habit */
export const PENALTY: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 15 };

/** A freeze token is earned every 7 streak days, holding at most 3. */
export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 3;

/** XP needed to reach each level grows gently: 100, 250, 450, ... */
export function levelFor(xp: number) {
  let level = 1;
  let need = 100;
  let floor = 0;
  while (xp >= floor + need) {
    floor += need;
    level += 1;
    need += 50;
  }
  return { level, intoLevel: xp - floor, levelSize: need, floor };
}

type StreakFields = Pick<Profile, 'streak' | 'best_streak' | 'last_active_on' | 'freeze_tokens'>;

/**
 * done    – already active today
 * pending – active yesterday, today still open
 * frozen  – missed days, but enough freeze tokens to cover them on the next check-off
 * broken  – streak lost
 */
export type StreakState = 'done' | 'pending' | 'frozen' | 'broken';

function missedDays(last: string, today: Date) {
  return daysBetween(fromISODate(last), today) - 1;
}

/** Streak as the user should see it right now. */
export function streakStatus(p: StreakFields, today = new Date()): { streak: number; state: StreakState } {
  const last = p.last_active_on;
  // Brand new: nothing to lose yet, so the pet just waits instead of being sad
  if (!last) return { streak: 0, state: 'pending' };
  if (p.streak === 0) return { streak: 0, state: 'broken' };
  if (last === toISODate(today)) return { streak: p.streak, state: 'done' };
  if (last === toISODate(addDays(today, -1))) return { streak: p.streak, state: 'pending' };
  if (missedDays(last, today) <= p.freeze_tokens) return { streak: p.streak, state: 'frozen' };
  return { streak: 0, state: 'broken' };
}

export type StreakResult = {
  patch: StreakFields;
  increased: boolean;
  freezesUsed: number;
  tokenEarned: boolean;
};

/** Marks today as active: extends, rescues (with freezes) or restarts the streak. */
export function applyStreak(p: StreakFields, today = new Date()): StreakResult {
  const todayKey = toISODate(today);
  if (p.last_active_on === todayKey) {
    return { patch: { ...p }, increased: false, freezesUsed: 0, tokenEarned: false };
  }
  let streak = 1;
  let tokens = p.freeze_tokens;
  let freezesUsed = 0;
  if (p.last_active_on && p.streak > 0) {
    const missed = missedDays(p.last_active_on, today);
    if (missed <= 0) streak = p.streak + 1;
    else if (missed <= tokens) {
      tokens -= missed;
      freezesUsed = missed;
      streak = p.streak + 1;
    }
  }
  const tokenEarned = streak % FREEZE_EVERY === 0 && tokens < MAX_FREEZES;
  if (tokenEarned) tokens += 1;
  return {
    patch: { streak, best_streak: Math.max(p.best_streak, streak), last_active_on: todayKey, freeze_tokens: tokens },
    increased: true,
    freezesUsed,
    tokenEarned,
  };
}

export type GainResult = StreakResult & {
  xp: number;
  coins: number;
  levelUp: boolean;
  newLevel: number;
};

/** Reward for a check-off, a finished todo or a good "+" tap. */
export function gain(p: Profile, difficulty: Difficulty, today = new Date()): GainResult {
  const { xp, coins } = REWARD[difficulty];
  const before = levelFor(p.xp).level;
  const after = levelFor(p.xp + xp).level;
  const streak = applyStreak(p, today);
  return {
    ...streak,
    patch: { ...streak.patch },
    xp,
    coins,
    levelUp: after > before,
    newLevel: after,
  };
}

/** XP lost on a bad "-" tap. Never drops you below the start of your current level. */
export function penalty(p: Pick<Profile, 'xp'>, difficulty: Difficulty) {
  const { floor } = levelFor(p.xp);
  const xp = Math.max(floor, p.xp - PENALTY[difficulty]);
  return { xp, lost: p.xp - xp };
}

/** Pets grow up as the hero levels: each stage looks clearly different. */
export const PET_STAGES = [
  { name: 'Baby', level: 1 },
  { name: 'Kid', level: 5 },
  { name: 'Teen', level: 10 },
  { name: 'Adult', level: 20 },
  { name: 'Legendary', level: 30 },
] as const;

/** Index into PET_STAGES for a hero level. */
export function petStage(level: number) {
  let stage = 0;
  PET_STAGES.forEach((s, i) => {
    if (level >= s.level) stage = i;
  });
  return stage;
}

/** The next stage and the level it unlocks at, or null at Legendary. */
export function nextPetStage(level: number) {
  return PET_STAGES[petStage(level) + 1] ?? null;
}

export type Mood = 'happy' | 'idle' | 'sad' | 'celebrate';

/** A pet fed today is happy all day, even if the streak broke. */
export function petMood(state: StreakState, fedToday = false): Mood {
  if (fedToday || state === 'done') return 'happy';
  if (state === 'broken') return 'sad';
  return 'idle';
}

/** Whether an item belongs on the list for the given day. */
export function isDueOn(item: Item, date: Date) {
  if (item.kind === 'counter') return true;
  if (item.kind === 'habit') return item.days.includes(date.getDay());
  // Todos stay until done, and show for the rest of the day they were finished
  return item.done_on == null || item.done_on === toISODate(date);
}
