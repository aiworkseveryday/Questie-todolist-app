export type Difficulty = 'easy' | 'medium' | 'hard';

/** habit = scheduled check-off, counter = +/- good/bad habit, todo = one-off task */
export type ItemKind = 'habit' | 'counter' | 'todo';

export type Item = {
  id: number;
  kind: ItemKind;
  title: string;
  difficulty: Difficulty;
  /** Weekdays a habit is due on, 0 = Sunday. All seven = daily. */
  days: number[];
  /** Habit taps needed per day, e.g. 8 for "Drink water". 1 = a plain check-off. */
  target: number;
  /** Todo due date (YYYY-MM-DD) */
  due: string | null;
  /** Todo due time (HH:MM, 24h). When set, a reminder fires at that time. */
  due_time: string | null;
  /** Scheduled reminder, so it can be cancelled when the todo changes */
  notif_id: string | null;
  /** When a todo was completed (YYYY-MM-DD) */
  done_on: string | null;
  sort: number;
};

export type Completion = {
  id: number;
  item_id: number;
  date: string;
  /** +1 for a check-off or good tap, -1 for a bad tap */
  delta: 1 | -1;
  xp: number;
  coins: number;
};

export type HeroGender = 'male' | 'female';
export type PetSpecies = 'cat' | 'bunny' | 'dino';

export type Profile = {
  name: string;
  gender: HeroGender;
  /** Index into the hero look presets */
  look: number;
  pet: PetSpecies;
  pet_name: string;
  xp: number;
  coins: number;
  streak: number;
  best_streak: number;
  last_active_on: string | null;
  freeze_tokens: number;
  onboarded: boolean;
  /** Food and other consumables: item id → how many you own */
  inventory: Record<string, number>;
  /** Day the pet was last fed (YYYY-MM-DD); a fed pet is happy all that day */
  fed_on: string | null;
  /** Cosmetics bought in the shop (outfits, hairstyles, pet accessories) */
  owned: string[];
  /** Accessory the pet is wearing */
  pet_accessory: string | null;
  /** Hero customisation (see game/style.ts) */
  hair: string;
  hair_color: string;
  /** Index into SKIN_TONES */
  skin: number;
  outfit: string;
};
