import { Image } from 'react-native-svg';

/** One picture per growth stage: baby, kid, teen, adult, legendary. */
const DRAGON_IMAGES = [
  require('@/assets/pets/dragon-0.png'),
  require('@/assets/pets/dragon-1.png'),
  require('@/assets/pets/dragon-2.png'),
  require('@/assets/pets/dragon-3.png'),
  require('@/assets/pets/dragon-4.png'),
];

/**
 * Where the head sits in each stage's picture (centre and radius in the 120×120 pet viewBox),
 * so the sad tear, the legendary crown and shop accessories land on the head.
 */
export const DRAGON_HEAD = [
  { x: 60, y: 39, r: 30 },
  { x: 85, y: 31, r: 17 },
  { x: 37, y: 21, r: 12 },
  { x: 89, y: 19, r: 10 },
  { x: 96, y: 39, r: 11 },
];

/** The dragon picture for a stage, fitted into the pet's 120×120 box and standing on the ground line. */
export function DragonArt({ stage }: { stage: number }) {
  return (
    <Image
      href={DRAGON_IMAGES[Math.max(0, Math.min(4, stage))]}
      x={2}
      y={2}
      width={116}
      height={110}
      preserveAspectRatio="xMidYMax meet"
    />
  );
}
