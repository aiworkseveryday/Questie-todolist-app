import type { Profile } from '@/data/types';
import { MAX_FREEZES } from './engine';

export type ShopCategory = 'food' | 'boost' | 'accessory';

export type ShopItem = {
  id: string;
  category: ShopCategory;
  name: string;
  blurb: string;
  price: number;
};

export const FOODS: ShopItem[] = [
  { id: 'kibble', category: 'food', name: 'Crunchy kibble', blurb: 'A bowl of everyday crunch.', price: 10 },
  { id: 'apple', category: 'food', name: 'Shiny apple', blurb: 'Fresh, sweet and healthy.', price: 15 },
  { id: 'choco', category: 'food', name: 'Choco treat', blurb: 'Pet-safe magic chocolate. Pure joy.', price: 25 },
  { id: 'cake', category: 'food', name: 'Party cake', blurb: 'For very good days.', price: 40 },
];

export const FREEZE_PRICE = 150;

export const BOOSTS: ShopItem[] = [
  { id: 'freeze', category: 'boost', name: 'Streak freeze', blurb: 'Saves your streak on a missed day.', price: FREEZE_PRICE },
];

/** Pet accessories are bought once and can be worn or taken off for free. */
export const ACCESSORIES: ShopItem[] = [
  { id: 'party_hat', category: 'accessory', name: 'Party hat', blurb: 'Every day is a celebration.', price: 60 },
  { id: 'bow', category: 'accessory', name: 'Bow', blurb: 'A big pink bow. Adorable.', price: 50 },
  { id: 'scarf', category: 'accessory', name: 'Cozy scarf', blurb: 'Warm and stylish.', price: 70 },
  { id: 'shades', category: 'accessory', name: 'Cool shades', blurb: 'Too cool for the streak.', price: 90 },
];

export const itemById = (id: string) => [...FOODS, ...BOOSTS, ...ACCESSORIES].find((i) => i.id === id);

export type BuyResult = { ok: true; patch: Partial<Profile> } | { ok: false; reason: string };

/** Works out the profile change for a purchase, or why it isn't allowed. */
export function buy(p: Profile, itemId: string): BuyResult {
  const item = itemById(itemId);
  if (!item) return { ok: false, reason: 'Unknown item' };
  if (p.coins < item.price) return { ok: false, reason: `You need ${item.price - p.coins} more coins.` };
  if (item.id === 'freeze') {
    if (p.freeze_tokens >= MAX_FREEZES) return { ok: false, reason: `You can hold at most ${MAX_FREEZES} freezes.` };
    return { ok: true, patch: { coins: p.coins - item.price, freeze_tokens: p.freeze_tokens + 1 } };
  }
  if (item.category === 'accessory') {
    if (p.owned.includes(item.id)) return { ok: false, reason: 'You already own this.' };
    // Put it on straight away
    return { ok: true, patch: { coins: p.coins - item.price, owned: [...p.owned, item.id], pet_accessory: item.id } };
  }
  const inventory = { ...p.inventory, [item.id]: (p.inventory[item.id] ?? 0) + 1 };
  return { ok: true, patch: { coins: p.coins - item.price, inventory } };
}

/** Uses one food from the inventory; the pet is happy for the rest of the day. */
export function feed(p: Profile, foodId: string, today: string): BuyResult {
  const have = p.inventory[foodId] ?? 0;
  if (have <= 0) return { ok: false, reason: 'None left. Buy more in the shop!' };
  const inventory = { ...p.inventory, [foodId]: have - 1 };
  return { ok: true, patch: { inventory, fed_on: today } };
}
