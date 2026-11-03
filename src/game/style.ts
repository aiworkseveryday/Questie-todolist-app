import type { Profile } from '@/data/types';

/** A hero customisation option. price 0 = free from the start. */
export type StyleOption = { id: string; name: string; price: number };

export const HAIR_STYLES: StyleOption[] = [
  { id: 'crop', name: 'Crop', price: 0 },
  { id: 'undercut', name: 'Undercut', price: 0 },
  { id: 'spiky', name: 'Spiky', price: 0 },
  { id: 'long', name: 'Long', price: 0 },
  { id: 'ponytail', name: 'Ponytail', price: 0 },
  { id: 'buns', name: 'Space buns', price: 60 },
  { id: 'mohawk', name: 'Mohawk', price: 80 },
  { id: 'braid', name: 'Side braid', price: 80 },
];

export const HAIR_COLORS: (StyleOption & { hex: string })[] = [
  { id: 'black', name: 'Black', hex: '#2A211D', price: 0 },
  { id: 'brown', name: 'Brown', hex: '#6B4430', price: 0 },
  { id: 'blonde', name: 'Blonde', hex: '#E3B85C', price: 0 },
  { id: 'auburn', name: 'Auburn', hex: '#A4472A', price: 0 },
  { id: 'pink', name: 'Neon pink', hex: '#FF5FB8', price: 40 },
  { id: 'blue', name: 'Electric blue', hex: '#3BA7FF', price: 40 },
  { id: 'silver', name: 'Silver', hex: '#D5DAE6', price: 40 },
];

export const SKIN_TONES = ['#FBE0CC', '#F2C7A5', '#D9A47E', '#A86F4C', '#6E4630'];

export type OutfitId = 'bomber' | 'hoodie' | 'tactical' | 'street' | 'ranger' | 'armor';

export const OUTFITS: (StyleOption & { id: OutfitId; blurb: string })[] = [
  { id: 'bomber', name: 'Bomber', blurb: 'Olive jacket and headphones', price: 0 },
  { id: 'hoodie', name: 'Hoodie', blurb: 'Comfy violet hoodie', price: 0 },
  { id: 'tactical', name: 'Tactical', blurb: 'Vest, gloves and goggles', price: 0 },
  { id: 'street', name: 'Neon Street', blurb: 'Glowing night-runner gear', price: 90 },
  { id: 'ranger', name: 'Desert Ranger', blurb: 'Long coat and scarf', price: 100 },
  { id: 'armor', name: 'Nova Armor', blurb: 'Sci-fi plate with a headset', price: 150 },
];

export type HeroStyle = Pick<Profile, 'gender' | 'hair' | 'hair_color' | 'skin' | 'outfit'>;

export const hairHex = (id: string) => (HAIR_COLORS.find((c) => c.id === id) ?? HAIR_COLORS[0]).hex;

/** Shop/owned id for a style option, e.g. "hair:buns" */
export const styleKey = (kind: 'hair' | 'color' | 'outfit', id: string) => `${kind}:${id}`;

export function isUnlocked(p: Pick<Profile, 'owned'>, kind: 'hair' | 'color' | 'outfit', option: StyleOption) {
  return option.price === 0 || p.owned.includes(styleKey(kind, option.id));
}

export type StyleResult = { ok: true; patch: Partial<Profile> } | { ok: false; reason: string };

const FIELD = { hair: 'hair', color: 'hair_color', outfit: 'outfit' } as const;

/** Equips a style option, buying it first when it's locked and affordable. */
export function chooseStyle(p: Profile, kind: 'hair' | 'color' | 'outfit', option: StyleOption): StyleResult {
  const field = FIELD[kind];
  if (isUnlocked(p, kind, option)) return { ok: true, patch: { [field]: option.id } };
  if (p.coins < option.price) return { ok: false, reason: `You need ${option.price - p.coins} more coins.` };
  return {
    ok: true,
    patch: { [field]: option.id, coins: p.coins - option.price, owned: [...p.owned, styleKey(kind, option.id)] },
  };
}
