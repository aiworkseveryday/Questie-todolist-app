import type { PetSpecies } from '@/data/types';
import type { Mood } from '@/game/engine';
import { PetRig, type RigAction, type RigMood } from './PetRig';

export const PETS: { id: PetSpecies; name: string }[] = [
  { id: 'cat', name: 'Cat' },
  { id: 'bunny', name: 'Bunny' },
  { id: 'dino', name: 'Dragon' },
];

type Props = {
  species: PetSpecies;
  mood?: Mood | RigMood;
  size?: number;
  /** Growth stage, 0 = Baby … 4 = Legendary (see PET_STAGES) */
  stage?: number;
  /** Shop accessory being worn */
  accessory?: string | null;
  action?: RigAction;
  /** Off for small previews, so a screen full of pets doesn't run dozens of animations */
  animated?: boolean;
};

/** The companion pet, drawn as a rigged character that can walk, eat, blink and smile. */
export function Pet({ species, mood = 'happy', size = 90, stage = 1, accessory = null, action = 'idle', animated = true }: Props) {
  return <PetRig species={species} stage={stage} mood={mood} action={action} size={size} accessory={accessory} animated={animated} />;
}
