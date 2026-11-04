import type { Item, Profile } from '@/data/types';
import { applyStreak, gain, greeting, isDueOn, levelFor, nextPetStage, penalty, petMood, petStage, shownPetStage, streakStatus, tapXp } from './engine';

const base: Profile = {
  name: 'me',
  gender: 'female',
  look: 0,
  pet: 'cat',
  pet_name: 'Mochi',
  xp: 0,
  coins: 0,
  streak: 0,
  best_streak: 0,
  last_active_on: null,
  freeze_tokens: 0,
  onboarded: true,
  inventory: {},
  fed_on: null,
  freebies: { on: null, n: 0 },
  pet_form: null,
  owned: [],
  pet_accessory: null,
  hair: 'crop',
  hair_color: 'brown',
  skin: 1,
  outfit: 'bomber',
};
// Tuesday
const today = new Date(2026, 10, 3);

describe('applyStreak', () => {
  it('starts a streak and does not double count today', () => {
    const r = applyStreak(base, today);
    expect(r.patch.streak).toBe(1);
    expect(r.patch.last_active_on).toBe('2026-11-03');
    const again = applyStreak({ ...base, ...r.patch }, today);
    expect(again.increased).toBe(false);
    expect(again.patch.streak).toBe(1);
  });

  it('extends from yesterday', () => {
    const r = applyStreak({ ...base, streak: 4, best_streak: 4, last_active_on: '2026-11-02' }, today);
    expect(r.patch.streak).toBe(5);
    expect(r.patch.best_streak).toBe(5);
  });

  it('spends freeze tokens to bridge missed days', () => {
    const r = applyStreak({ ...base, streak: 10, last_active_on: '2026-10-31', freeze_tokens: 2 }, today);
    expect(r.freezesUsed).toBe(2);
    expect(r.patch.freeze_tokens).toBe(0);
    expect(r.patch.streak).toBe(11);
  });

  it('restarts when tokens cannot cover the gap but keeps the best streak', () => {
    const r = applyStreak({ ...base, streak: 10, best_streak: 10, last_active_on: '2026-10-30', freeze_tokens: 2 }, today);
    expect(r.patch.streak).toBe(1);
    expect(r.patch.freeze_tokens).toBe(2);
    expect(r.patch.best_streak).toBe(10);
  });

  it('earns a token every 7 days up to the cap', () => {
    const r = applyStreak({ ...base, streak: 6, last_active_on: '2026-11-02' }, today);
    expect(r.tokenEarned).toBe(true);
    expect(r.patch.freeze_tokens).toBe(1);
    const capped = applyStreak({ ...base, streak: 13, last_active_on: '2026-11-02', freeze_tokens: 3 }, today);
    expect(capped.tokenEarned).toBe(false);
    expect(capped.patch.freeze_tokens).toBe(3);
  });
});

describe('streakStatus and mood', () => {
  it('reports each state', () => {
    expect(streakStatus(base, today)).toEqual({ streak: 0, state: 'pending' });
    expect(streakStatus({ ...base, streak: 3, last_active_on: '2026-11-03' }, today).state).toBe('done');
    expect(streakStatus({ ...base, streak: 3, last_active_on: '2026-11-02' }, today).state).toBe('pending');
    expect(streakStatus({ ...base, streak: 3, last_active_on: '2026-11-01', freeze_tokens: 1 }, today).state).toBe('frozen');
    expect(streakStatus({ ...base, streak: 3, last_active_on: '2026-11-01' }, today)).toEqual({ streak: 0, state: 'broken' });
    expect(petMood('done')).toBe('happy');
    expect(petMood('broken')).toBe('sad');
  });
});

describe('xp', () => {
  it('computes levels', () => {
    expect(levelFor(0)).toEqual({ level: 1, intoLevel: 0, levelSize: 100, floor: 0 });
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(260).level).toBe(3);
  });

  it('pays by difficulty and flags level ups', () => {
    const r = gain({ ...base, xp: 90 }, 'hard', today);
    expect(r.xp).toBe(35);
    expect(r.coins).toBe(10);
    expect(r.levelUp).toBe(true);
    expect(r.newLevel).toBe(2);
    expect(gain(base, 'easy', today).levelUp).toBe(false);
  });

  it('never penalises below the current level floor', () => {
    expect(penalty({ xp: 50 }, 'hard')).toEqual({ xp: 35, lost: 15 });
    expect(penalty({ xp: 104 }, 'medium')).toEqual({ xp: 100, lost: 4 });
    expect(penalty({ xp: 0 }, 'easy')).toEqual({ xp: 0, lost: 0 });
  });
});

describe('multi-tap habits and greeting', () => {
  it('pays a small amount per tap only when there is a target', () => {
    expect(tapXp('easy', 1)).toBe(0);
    expect(tapXp('easy', 8)).toBe(1);
    expect(tapXp('hard', 4)).toBe(5);
  });

  it('greets by time of day', () => {
    expect(greeting(new Date(2026, 10, 3, 7))).toBe('Good morning');
    expect(greeting(new Date(2026, 10, 3, 13))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 10, 3, 19))).toBe('Good evening');
    expect(greeting(new Date(2026, 10, 3, 23))).toBe('Good night');
    expect(greeting(new Date(2026, 10, 3, 3))).toBe('Good night');
  });
});

describe('pet stages', () => {
  it('grows with hero level', () => {
    expect(petStage(1)).toBe(0);
    expect(petStage(4)).toBe(0);
    expect(petStage(5)).toBe(1);
    expect(petStage(19)).toBe(2);
    expect(petStage(30)).toBe(4);
    expect(nextPetStage(7)).toEqual({ name: 'Teen', level: 10 });
    expect(nextPetStage(40)).toBeNull();
  });
});

describe('shownPetStage', () => {
  it('shows the newest form unless an earlier one was picked, and never one not reached yet', () => {
    let xp = 0;
    while (petStage(levelFor(xp).level) < 2) xp += 10;
    expect(shownPetStage({ xp, pet_form: null })).toBe(2);
    expect(shownPetStage({ xp, pet_form: 0 })).toBe(0);
    expect(shownPetStage({ xp, pet_form: 4 })).toBe(2);
  });
});

describe('isDueOn', () => {
  const item = (over: Partial<Item>): Item => ({
    id: 1, kind: 'habit', title: 't', difficulty: 'easy', days: [0, 1, 2, 3, 4, 5, 6], target: 1, due: null, due_time: null, notif_id: null, done_on: null, sort: 0, ...over,
  });
  it('follows weekdays for habits and completion for todos', () => {
    expect(isDueOn(item({ days: [2] }), today)).toBe(true);
    expect(isDueOn(item({ days: [1, 3] }), today)).toBe(false);
    expect(isDueOn(item({ kind: 'counter', days: [] }), today)).toBe(true);
    expect(isDueOn(item({ kind: 'todo', done_on: '2026-11-03' }), today)).toBe(true);
    expect(isDueOn(item({ kind: 'todo', done_on: '2026-11-01' }), today)).toBe(false);
  });
});
