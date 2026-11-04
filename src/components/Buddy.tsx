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
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { FoodIcon } from '@/characters/FoodIcon';
import { HOP_GROUND, Pet, STEP_MS, type PetAction, type PetMood } from '@/characters/Pet';
import { HOME_DOOR } from '@/characters/PetHome';
import type { PetSpecies } from '@/data/types';
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

type BuddyApi = {
  /** Attach to the home in the top card so the pet knows where its door is. */
  homeRef: RefObject<ViewRef | null>;
  /** Pet is out of its home (the home then shows empty). */
  out: boolean;
  /** Pet is asleep inside its home. */
  sleeping: boolean;
  /** Pet is eating right now. */
  eating: boolean;
  /** The pet runs home and eats this food in front of its door. */
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

/** Food set down in front of the home, shrinking bite by bite. */
function GroundFood({ id, x, y, bites }: { id: string; x: number; y: number; bites: number }) {
  const left = Math.max(0, 1 - bites / 3);
  if (left <= 0) return null;
  const size = 34 * (0.35 + 0.65 * left);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - size / 2, top: y - size, width: size, height: size }}>
      <FoodIcon id={id} size={size} />
    </View>
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
  children,
}: {
  species: PetSpecies;
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

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const appear = useSharedValue(0);

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
      enqueue(async () => {
        const door = await doorSpot();
        if (!door) return;
        // The food appears in front of the home straight away; the pet heads back to eat it
        setFood({ id: foodId, x: door.cx, y: door.bottom + 10, bites: 0 });
        if (outRef.current) await moveTo(door.x, door.y);
        else await comeOut(false);
        setMoodOverride('happy');
        await wait(300);
        setAction('eat');
        for (let b = 1; b <= 3; b++) {
          await wait(600);
          setFood((f) => (f ? { ...f, bites: b } : f));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setFood(null);
        setAction('chew');
        await wait(1500);
        setAction('idle');
        await happy(1400);
      });
    },
    [enqueue, doorSpot, moveTo, comeOut, happy],
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
                <Pet species={species} stage={stage} accessory={accessory} size={SIZE} mood={moodOverride ?? mood} action={action} />
              </Pressable>
            </Animated.View>
          )}
          {/* in front of the pet, so it looks like it's eating from the bowl */}
          {food && <GroundFood id={food.id} x={food.x} y={food.y} bites={food.bites} />}
        </View>
      </View>
    </BuddyContext.Provider>
  );
}

const styles = StyleSheet.create({
  pet: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
});
