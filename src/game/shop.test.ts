import type { Profile } from '@/data/types';
import { petMood } from './engine';
import { buy, feed, FREEZE_PRICE } from './shop';

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
  owned: [],
  pet_accessory: null,
  hair: 'crop',
  hair_color: 'brown',
  skin: 1,
  outfit: 'bomber',
};

describe('shop', () => {
  it('buys food into the inventory', () => {
    const r = buy(base, 'choco');
    expect(r).toEqual({ ok: true, patch: { coins: 75, inventory: { choco: 1 } } });
  });

  it('refuses when short on coins', () => {
    const r = buy({ ...base, coins: 5 }, 'cake');
    expect(r.ok).toBe(false);
  });

  it('sells freezes up to the cap', () => {
    const rich = { ...base, coins: 1000 };
    expect(buy(rich, 'freeze')).toEqual({ ok: true, patch: { coins: 1000 - FREEZE_PRICE, freeze_tokens: 1 } });
    expect(buy({ ...rich, freeze_tokens: 3 }, 'freeze').ok).toBe(false);
  });
});

describe('accessories', () => {
  it('buys once and puts it on', () => {
    const r = buy(base, 'bow');
    expect(r).toEqual({ ok: true, patch: { coins: 50, owned: ['bow'], pet_accessory: 'bow' } });
    expect(buy({ ...base, owned: ['bow'] }, 'bow').ok).toBe(false);
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
