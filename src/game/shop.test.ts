import type { Profile } from '@/data/types';
import { petMood } from './engine';
import { buy, feed, FREE_PER_DAY, FREEZE_PRICE } from './shop';

const base: Profile = {
  name: 'me',
  gender: 'female',
  look: 0,
  pet: 'cat',
  pet_name: 'Mochi',
  xp: 0,
  coins: 100,
  streak: 0,
  best_streak: 0,
  last_active_on: null,
  freeze_tokens: 0,
  onboarded: true,
  inventory: {},
  fed_on: null,
  freebies: { on: null, n: 0 },
  owned: [],
  pet_accessory: null,
  hair: 'crop',
  hair_color: 'brown',
  skin: 1,
  outfit: 'bomber',
};

describe('shop', () => {
  it('gives the pet its own free treat, up to the daily limit', () => {
    const day = '2026-11-04';
    const r = buy(base, 'fish', day);
    expect(r).toEqual({ ok: true, patch: { inventory: { fish: 1 }, freebies: { on: day, n: 1 } } });
    expect(buy({ ...base, freebies: { on: day, n: FREE_PER_DAY } }, 'fish', day).ok).toBe(false);
    // a new day resets the count
    expect(buy({ ...base, freebies: { on: '2026-11-03', n: FREE_PER_DAY } }, 'fish', day).ok).toBe(true);
    expect(buy(base, 'carrot', day).ok).toBe(false);
  });

  it('buys food into the inventory', () => {
    const r = buy(base, 'choco', '2026-11-04');
    expect(r).toEqual({ ok: true, patch: { coins: 75, inventory: { choco: 1 } } });
  });

  it('refuses when short on coins', () => {
    const r = buy({ ...base, coins: 5 }, 'cake', '2026-11-04');
    expect(r.ok).toBe(false);
  });

  it('sells freezes up to the cap', () => {
    const rich = { ...base, coins: 1000 };
    expect(buy(rich, 'freeze', '2026-11-04')).toEqual({ ok: true, patch: { coins: 1000 - FREEZE_PRICE, freeze_tokens: 1 } });
    expect(buy({ ...rich, freeze_tokens: 3 }, 'freeze', '2026-11-04').ok).toBe(false);
  });
});

describe('accessories', () => {
  it('buys once and puts it on', () => {
    const r = buy(base, 'bow', '2026-11-04');
    expect(r).toEqual({ ok: true, patch: { coins: 50, owned: ['bow'], pet_accessory: 'bow' } });
    expect(buy({ ...base, owned: ['bow'] }, 'bow', '2026-11-04').ok).toBe(false);
  });
});

describe('feeding', () => {
  it('uses one food and marks the pet fed today', () => {
    const r = feed({ ...base, inventory: { apple: 2 } }, 'apple', '2026-11-03');
    expect(r).toEqual({ ok: true, patch: { inventory: { apple: 1 }, fed_on: '2026-11-03' } });
    expect(feed(base, 'apple', '2026-11-03').ok).toBe(false);
  });

  it('cheers up a sad pet for the day', () => {
    expect(petMood('broken')).toBe('sad');
    expect(petMood('broken', true)).toBe('happy');
  });
});
