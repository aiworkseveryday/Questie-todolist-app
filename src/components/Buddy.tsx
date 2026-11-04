import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ZoomIn,
  ZoomOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BITE_COUNT, CRUMB_COLOR, FoodIcon } from '@/characters/FoodIcon';
import { HERO_FEET_Y, HERO_SIDE_HAND, HeroActor, type HeroAction } from '@/characters/HeroActor';
import { HOP_GROUND, Pet, STEP_MS, type PetAction, type PetMood } from '@/characters/Pet';
import { HOME_DOOR } from '@/characters/PetHome';
import { AppText } from '@/components/AppText';
import type { HeroGender, PetSpecies } from '@/data/types';
import type { Mood } from '@/game/engine';

/** A mounted native view, which can report where it sits on screen. */
export type ViewRef = ComponentRef<typeof View>;

const SIZE = 84;
/** Walking speed for the cat and dragon, in px per ms. */
const SPEED = 0.07;
/** Distance covered by one bunny hop. */
const HOP = 36;
/** Fraction of the pet's box from the top down to its feet. */
const FEET = 0.93;
/** The hero's width in feeding scenes, and walking speed in px per ms. */
const HERO_W = 70;
const HERO_SPEED = 0.085;
/** Feeding this many times within STUFFED_MS makes the pet too full to eat more. */
const STUFFED_AFTER = 2;
const STUFFED_MS = 2 * 60 * 1000;

type BuddyApi = {
  /** Attach to the home in the top card so the pet knows where its door is. */
  homeRef: RefObject<ViewRef | null>;
  /** Pet is out of its home (the home then shows empty). */
  out: boolean;
  /** Pet is asleep inside its home. */
  sleeping: boolean;
  /** Pet is eating right now. */
  eating: boolean;
  /** The hero walks the food over to the pet's plate, and the pet comes home to eat it. */
  feed: (foodId: string) => void;
  /** Call the pet out of its home (tap on the home). */
  callOut: () => void;
};

const BuddyContext = createContext<BuddyApi | null>(null);

/** The Today screen uses this. Outside it, it is null. */
export function useBuddy() {
  return useContext(BuddyContext);
}

const isNight = () => {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function measure(v: ViewRef | null) {
  return new Promise<{ x: number; y: number; w: number; h: number } | null>((resolve) => {
    if (!v) return resolve(null);
    v.measureInWindow((x: number, y: number, w: number, h: number) => resolve(w || h ? { x, y, w, h } : null));
  });
}

const FOOD_SIZE = 34;

/** One crumb flung out by a bite: flies up and out, then falls and fades. */
function Crumb({ angle, dist, color, size }: { angle: number; dist: number; color: string; size: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) });
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value * t.value,
    transform: [
      { translateX: Math.cos(angle) * dist * t.value },
      { translateY: -Math.sin(angle) * dist * t.value + 26 * t.value * t.value },
      { rotate: `${t.value * 240}deg` },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 3, backgroundColor: color }, style]} />;
}

/** A little spray of crumbs from where the pet just bit. */
function Crumbs({ x, y, color }: { x: number; y: number; color: string }) {
  // Fixed spread so every bite looks a bit different but nothing random runs during render
  const bits = [
    [0.4, 22, 4],
    [1.1, 18, 3],
    [1.7, 24, 3.5],
    [2.5, 20, 3],
    [2.9, 16, 4],
    [0.9, 28, 2.5],
  ];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y }}>
      {bits.map(([a, d, sz], i) => (
        <Crumb key={i} angle={a} dist={d} size={sz} color={i % 3 === 2 ? '#FFFFFF' : color} />
      ))}
    </View>
  );
}

/** Food on the plate, with real bite marks taken out of it and crumbs flying at every bite. */
function GroundFood({ id, x, y, bites }: { id: string; x: number; y: number; bites: number }) {
  // Each bite gives the food a little jolt
  const jolt = useSharedValue(0);
  useEffect(() => {
    if (bites) jolt.value = withSequence(withTiming(1, { duration: 70 }), withSpring(0, { damping: 6, stiffness: 260 }));
  }, [bites, jolt]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - jolt.value * 0.1 }, { rotate: `${jolt.value * -6}deg` }] }));
  if (bites >= BITE_COUNT) return null;
  return (
    <Animated.View
      entering={ZoomIn.duration(180)}
      pointerEvents="none"
      style={[{ position: 'absolute', left: x - FOOD_SIZE / 2, top: y - FOOD_SIZE + 2, width: FOOD_SIZE, height: FOOD_SIZE }, style]}>
      <FoodIcon id={id} size={FOOD_SIZE} bites={bites} />
    </Animated.View>
  );
}

/**
 * The one and only pet on the Today screen. It lives in the home in the top card, comes out to greet
 * you when the app opens, then roams the page: the cat and dragon walk, the bunny hops. When fed it
 * goes back to its home and eats in front of the door. At night it goes home to sleep.
 */
export function BuddyProvider({
  species,
  stage,
  accessory,
  mood,
  hero,
  children,
}: {
  species: PetSpecies;
  /** The hero who brings the food */
  hero: { gender: HeroGender; look: number };
  stage: number;
  accessory: string | null;
  /** Everyday mood from the streak (happy / idle / sad) */
  mood: Mood;
  children: ReactNode;
}) {
  const container = useRef<ViewRef>(null);
  const homeRef = useRef<ViewRef>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [out, setOut] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [action, setAction] = useState<PetAction>('idle');
  const [moodOverride, setMoodOverride] = useState<PetMood | null>(null);
  const [food, setFood] = useState<{ id: string; x: number; y: number; bites: number } | null>(null);
  const [actor, setActor] = useState<{ action: HeroAction; holding: string | null; facing: -1 | 0 | 1 } | null>(null);
  const [stuffed, setStuffed] = useState(false);

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const appear = useSharedValue(0);
  const hx = useSharedValue(0);
  const hy = useSharedValue(0);
  const heroIn = useSharedValue(0);
  const fat = useSharedValue(0);
  const wobble = useSharedValue(0);
  const roll = useSharedValue(0);
  // When each recent feeding was asked for, to spot overfeeding
  const feedTimes = useRef<number[]>([]);

  // Everything the pet does runs one task at a time from this queue; roaming fills the gaps.
  const queue = useRef<(() => Promise<void>)[]>([]);
  const alive = useRef(true);
  const outRef = useRef(false);
  const boxRef = useRef(box);
  useEffect(() => {
    boxRef.current = box;
  }, [box]);

  const setIsOut = (v: boolean) => {
    outRef.current = v;
    setOut(v);
  };

  /** Go to a point (top-left of the pet): walking for the cat and dragon, hop by hop for the bunny. */
  const moveTo = useCallback(
    async (tx: number, ty: number, interruptible = false) => {
      const fx = x.get();
      const fy = y.get();
      const d = Math.hypot(tx - fx, ty - fy);
      if (d < 2) return;
      let ms: number;
      setAction('walk');
      if (species === 'bunny') {
        // Only move while in the air, so each hop lands before the next one starts
        const n = Math.max(1, Math.ceil(d / HOP));
        const ground = STEP_MS * HOP_GROUND;
        const air = STEP_MS - ground;
        const hopsX = Array.from({ length: n }, (_, i) => withDelay(ground, withTiming(fx + ((tx - fx) * (i + 1)) / n, { duration: air, easing: Easing.inOut(Easing.quad) })));
        const hopsY = Array.from({ length: n }, (_, i) => withDelay(ground, withTiming(fy + ((ty - fy) * (i + 1)) / n, { duration: air, easing: Easing.inOut(Easing.quad) })));
        x.set(withSequence(...hopsX));
        y.set(withSequence(...hopsY));
        ms = n * STEP_MS;
      } else {
        ms = d / SPEED;
        x.set(withTiming(tx, { duration: ms, easing: Easing.linear }));
        y.set(withTiming(ty, { duration: ms, easing: Easing.linear }));
      }
      const start = Date.now();
      while (alive.current && Date.now() - start < ms) {
        if (interruptible && queue.current.length) {
          cancelAnimation(x);
          cancelAnimation(y);
          break;
        }
        await wait(80);
      }
      setAction('idle');
    },
    [x, y, species],
  );

  const happy = useCallback(async (ms: number) => {
    setMoodOverride('celebrate');
    Haptics.selectionAsync();
    await wait(ms);
    setMoodOverride(null);
  }, []);

  /**
   * Walk the hero to a point (its top-left), stepping all the way. It faces where it's going,
   * unless `facing` is given (shuffling back a step while still looking at the pet).
   */
  const heroWalk = useCallback(
    async (tx: number, ty: number, facing?: -1 | 1) => {
      const fx = hx.get();
      const d = Math.hypot(tx - fx, ty - hy.get());
      if (d < 2) return;
      const ms = d / HERO_SPEED;
      const dir = facing ?? (tx < fx ? -1 : 1);
      setActor((a) => a && { ...a, action: 'walk', facing: dir });
      hx.set(withTiming(tx, { duration: ms, easing: Easing.linear }));
      hy.set(withTiming(ty, { duration: ms, easing: Easing.linear }));
      await wait(ms);
      setActor((a) => a && { ...a, action: 'idle' });
    },
    [hx, hy],
  );
  const heroDo = (action: HeroAction, change: { holding?: string | null; facing?: -1 | 0 | 1 } = {}) =>
    setActor((a) => a && { ...a, action, ...change });

  /** Too much food: the pet puffs up into a ball, rolls over on the ground and cries that it can't eat any more. */
  const overfed = useCallback(async () => {
    setMoodOverride('sad');
    setStuffed(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    fat.set(withSpring(1, { damping: 6, stiffness: 110 }));
    await wait(700);
    // Roll over one way and back like a ball, towards whichever side has room
    const dir = x.get() + SIZE + 50 < boxRef.current.w ? 1 : -1;
    const from = x.get();
    const rollOnce = async (to: number, turn: number) => {
      roll.set(withTiming(turn, { duration: 950, easing: Easing.inOut(Easing.quad) }));
      x.set(withTiming(to, { duration: 950, easing: Easing.inOut(Easing.quad) }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await wait(1000);
    };
    await rollOnce(from + dir * 46, dir);
    wobble.set(withRepeat(withSequence(withTiming(1, { duration: 260 }), withTiming(-1, { duration: 260 })), -1, true));
    await wait(1100);
    cancelAnimation(wobble);
    wobble.set(withTiming(0, { duration: 150 }));
    await rollOnce(from, 0);
    await wait(500);
    fat.set(withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }));
    setStuffed(false);
    await wait(700);
    setMoodOverride(null);
  }, [fat, wobble, roll, x]);

  /** Where the pet stands to go in or out of its home, in overlay coordinates. */
  const doorSpot = useCallback(async () => {
    const [c, h] = await Promise.all([measure(container.current), measure(homeRef.current)]);
    if (!c || !h) return null;
    const cx = h.x - c.x + (HOME_DOOR.x / 120) * h.w;
    const bottom = h.y - c.y + (HOME_DOOR.y / 100) * h.h;
    return { x: cx - SIZE / 2, y: bottom - SIZE * FEET, cx, bottom };
  }, []);

  const comeOut = useCallback(
    async (greet: boolean) => {
      if (outRef.current) return;
      const door = await doorSpot();
      if (!door) return;
      setSleeping(false);
      x.set(door.x);
      y.set(door.y);
      setIsOut(true);
      appear.set(withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
      await wait(350);
      if (greet) {
        setMoodOverride('celebrate');
        setAction('wave');
        Haptics.selectionAsync();
        await wait(1600);
        setAction('idle');
        setMoodOverride(null);
      }
    },
    [doorSpot, x, y, appear],
  );

  const goHome = useCallback(async () => {
    if (!outRef.current) return;
    const door = await doorSpot();
    if (door) await moveTo(door.x, door.y);
    appear.set(withTiming(0, { duration: 350 }));
    await wait(350);
    setIsOut(false);
  }, [doorSpot, moveTo, appear]);

  // The pet's day: do queued tasks, otherwise roam, or sleep at home at night
  useEffect(() => {
    if (!box.w) return;
    alive.current = true;
    (async () => {
      await wait(600);
      if (isNight()) setSleeping(true);
      else await comeOut(true);
      while (alive.current) {
        const task = queue.current.shift();
        if (task) {
          await task();
          continue;
        }
        if (isNight()) {
          if (outRef.current) await goHome();
          setSleeping(true);
          await wait(1500);
          continue;
        }
        if (!outRef.current) {
          await comeOut(false);
          continue;
        }
        // Wander anywhere on the page, keeping clear of the Add button corner
        const { w, h } = boxRef.current;
        const tx = 6 + Math.random() * Math.max(0, w - SIZE - 12);
        let ty = 110 + Math.random() * Math.max(0, h - SIZE - 130);
        if (tx > w - 220 && ty > h - 160) ty = h - 240;
        await moveTo(tx, ty, true);
        if (queue.current.length) continue;
        // Stop and look around for a bit
        const pause = 1500 + Math.random() * 3000;
        const start = Date.now();
        while (alive.current && Date.now() - start < pause && !queue.current.length) await wait(100);
      }
    })();
    return () => {
      alive.current = false;
    };
    // Starts once the screen has a size; the loop reads live values from refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.w > 0]);

  const enqueue = useCallback((task: () => Promise<void>) => {
    queue.current.push(task);
  }, []);

  const feed = useCallback<BuddyApi['feed']>(
    (foodId) => {
      const now = Date.now();
      feedTimes.current = [...feedTimes.current.filter((t) => now - t < STUFFED_MS), now];
      const tooMuch = feedTimes.current.length >= STUFFED_AFTER;
      enqueue(async () => {
        const door = await doorSpot();
        if (!door) return;
        const plateX = door.cx;
        const plateY = door.bottom + 10;
        // Hero lines up by its hands: over the plate when kneeling, then on the pet's head to pat it
        const kh = HERO_W / 120;
        const heroY = plateY - HERO_FEET_Y * kh;
        const placeX = plateX - HERO_SIDE_HAND.crouch.x * kh;
        const patX = door.cx + 16 - HERO_SIDE_HAND.pat.x * kh;

        // The pet stops and watches excitedly while the hero walks in from the right with the food
        if (outRef.current) setMoodOverride('celebrate');
        hx.set(boxRef.current.w + 10);
        hy.set(heroY);
        setActor({ action: 'walk', holding: foodId, facing: -1 });
        heroIn.set(withTiming(1, { duration: 250 }));
        await heroWalk(placeX, heroY);

        // Kneel, set the food on the plate, get up and shuffle back a step, still facing the pet
        heroDo('crouch');
        await wait(520);
        setFood({ id: foodId, x: plateX, y: plateY, bites: 0 });
        heroDo('crouch', { holding: null });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await wait(380);
        heroDo('idle');
        await wait(200);
        await heroWalk(patX, heroY, -1);

        // The pet comes over to its plate
        setMoodOverride(null);
        if (outRef.current) await moveTo(door.x, door.y);
        else await comeOut(false);

        // A pat on the head as it arrives
        heroDo('pat');
        setMoodOverride('happy');
        Haptics.selectionAsync();
        await wait(1500);
        heroDo('idle');

        // Eat bite by bite while the hero waits right there
        await wait(150);
        setAction('eat');
        for (let b = 1; b <= BITE_COUNT; b++) {
          await wait(560);
          setFood((f) => (f ? { ...f, bites: b } : f));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        // let the last crumbs land
        await wait(600);
        setFood(null);
        setAction('chew');
        heroDo('pat');
        await wait(1300);
        setAction('idle');

        // Turn to say bye, then walk off to the right while the pet reacts
        heroDo('wave', { facing: 0 });
        const leave = (async () => {
          await wait(1200);
          await heroWalk(boxRef.current.w + 10, heroY);
          heroIn.set(withTiming(0, { duration: 200 }));
          await wait(200);
          setActor(null);
        })();
        if (tooMuch) await overfed();
        else await happy(1400);
        await leave;
      });
    },
    [enqueue, doorSpot, moveTo, comeOut, happy, heroWalk, overfed, hx, hy, heroIn],
  );

  const callOut = useCallback(() => enqueue(() => comeOut(true)), [enqueue, comeOut]);

  const onTapPet = () =>
    enqueue(async () => {
      setMoodOverride('celebrate');
      setAction('wave');
      Haptics.selectionAsync();
      await wait(1200);
      setAction('idle');
      setMoodOverride(null);
    });

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroIn.value,
    transform: [{ translateX: hx.value }, { translateY: hy.value }],
  }));
  // Overfed: wider and squatter, wobbling like jelly
  const fatStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + fat.value * (0.42 + wobble.value * 0.05) }, { scaleY: 1 + fat.value * (0.06 - wobble.value * 0.04) }],
  }));
  // Rolling over: one full turn about the middle of the round body, lifted so it stays on the ground
  const rollStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.abs(Math.sin(roll.value * Math.PI)) * 6 }, { rotate: `${roll.value * 360}deg` }],
  }));
  const petStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: 0.6 + appear.value * 0.4 }],
  }));

  const api = useMemo<BuddyApi>(
    () => ({ homeRef, out, sleeping, eating: !!food || action === 'chew', feed, callOut }),
    [out, sleeping, food, action, feed, callOut],
  );

  return (
    <BuddyContext.Provider value={api}>
      <View style={{ flex: 1 }}>
        {children}
        <View
          ref={container}
          pointerEvents="box-none"
          style={StyleSheet.absoluteFill}
          onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {out && (
            <Animated.View style={[styles.pet, petStyle]}>
              <Pressable accessibilityLabel="Your pet" onPress={onTapPet} hitSlop={6}>
                <Animated.View style={[{ transformOrigin: [SIZE / 2, SIZE * 0.64, 0] }, rollStyle]}>
                  <Animated.View style={[{ transformOrigin: [SIZE / 2, SIZE * FEET, 0] }, fatStyle]}>
                    <Pet species={species} stage={stage} accessory={accessory} size={SIZE} mood={moodOverride ?? mood} action={action} />
                  </Animated.View>
                </Animated.View>
              </Pressable>
              {stuffed && (
                <Animated.View entering={ZoomIn.springify()} exiting={ZoomOut.duration(200)} pointerEvents="none" style={styles.stuffed}>
                  <AppText variant="label" center color="#2A1F3D">
                    No more food… I can&apos;t eat! 😭
                  </AppText>
                </Animated.View>
              )}
            </Animated.View>
          )}
          {/* in front of the pet, so it looks like it's eating from the plate by its door */}
          {food && <GroundFood id={food.id} x={food.x} y={food.y} bites={food.bites} />}
          {food && food.bites > 0 && (
            <Crumbs key={food.bites} x={food.x} y={food.y - FOOD_SIZE * 0.6} color={CRUMB_COLOR[food.id] ?? '#C98A4A'} />
          )}
          {actor && (
            <Animated.View pointerEvents="none" style={[styles.hero, heroStyle]}>
              <HeroActor gender={hero.gender} look={hero.look} size={HERO_W} action={actor.action} holding={actor.holding} facing={actor.facing} />
            </Animated.View>
          )}
        </View>
      </View>
    </BuddyContext.Provider>
  );
}

const styles = StyleSheet.create({
  pet: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
  hero: { position: 'absolute', left: 0, top: 0, width: HERO_W, height: HERO_W * 1.25 },
  stuffed: {
    position: 'absolute',
    left: SIZE / 2 - 80,
    width: 160,
    bottom: SIZE - 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2A1F3D22',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
