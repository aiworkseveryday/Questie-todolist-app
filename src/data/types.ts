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
  /** Todo due date (YYYY-MM-DD) */
  due: string | null;
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
};
