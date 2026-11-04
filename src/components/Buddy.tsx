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
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { FoodIcon } from '@/characters/FoodIcon';
import { Pet } from '@/characters/Pet';
import { HOME_DOOR } from '@/characters/PetHome';
import { mouthPoint, pencilTip, type RigAction, type RigMood } from '@/characters/PetRig';
import type { PetSpecies } from '@/data/types';
import type { Mood } from '@/game/engine';

/** A mounted native view, which can report where it sits on screen. */
export type ViewRef = ComponentRef<typeof View>;

const SIZE = 68;
/** Walking speed in px per ms. */
const SPEED = 0.07;
/** Fraction of the pet's box from the top down to its feet. */
const FEET = 0.9;

type BuddyApi = {
  /** Attach to the home in the top card so the pet knows where its door is. */
  homeRef: RefObject<ViewRef | null>;
  /** Pet is out of its home (the home then shows empty). */
  out: boolean;
  /** Pet is asleep inside its home. */
  sleeping: boolean;
  /** Pet is eating right now. */
  eating: boolean;
  /** Quests the pet is walking over to tick: shown as not-done until it has drawn the tick. */
  pending: Set<number>;
  drawTick: (row: ViewRef | null, itemId: number) => void;
  /** A happy hop for good-habit taps. */
  cheer: () => void;
  feed: (foodId: string) => void;
  /** Call the pet out of its home (tap on the home). */
  callOut: () => void;
};

const BuddyContext = createContext<BuddyApi | null>(null);

/** Rows and the Today screen use this. Outside the Today screen it is null. */
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

/** Pencil stroke that draws a check mark, then fades. */
function TickStroke({ x, y }: { x: number; y: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) });
  }, [t]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: 32 * (1 - t.value) }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - 16, top: y - 16, width: 32, height: 32 }}>
      <Svg width={32} height={32} viewBox="-16 -16 32 32">
        <AnimatedPathTick animatedProps={props} />
      </Svg>
    </View>
  );
}
const AnimatedPath = Animated.createAnimatedComponent(Path);
function AnimatedPathTick({ animatedProps }: { animatedProps: object }) {
  return (
    <AnimatedPath
      d="M-9 0 L-3 7 L10 -8"
      stroke="#22C58B"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray="32"
      animatedProps={animatedProps}
    />
  );
}

/** Food on the ground that shrinks bite by bite. */
function GroundFood({ id, x, y, bites }: { id: string; x: number; y: number; bites: number }) {
  const left = Math.max(0, 1 - bites / 3);
  if (left <= 0) return null;
  const size = 30 * (0.35 + 0.65 * left);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - size / 2, top: y - size, width: size, height: size }}>
      <FoodIcon id={id} size={size} />
    </View>
  );
}

/**
 * The one and only pet on the Today screen. It lives in the home in the top card, walks out to greet
 * you when the app opens, then roams the whole page on its legs. It eats food set in front of its mouth,
 * walks over to draw the tick on quests you complete, and goes home to sleep at night.
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
  const [action, setAction] = useState<RigAction>('idle');
  const [moodOverride, setMoodOverride] = useState<RigMood | null>(null);
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [food, setFood] = useState<{ id: string; x: number; y: number; bites: number } | null>(null);
  const [tick, setTick] = useState<{ key: number; x: number; y: number } | null>(null);

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const facing = useSharedValue(1);
  const hop = useSharedValue(0);
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

  /** Walk to a point (top-left of the pet). Roaming walks give way as soon as a task arrives. */
  const walkTo = useCallback(
    async (tx: number, ty: number, interruptible = false) => {
      const fx = x.get();
      const fy = y.get();
      const d = Math.hypot(tx - fx, ty - fy);
      if (d < 2) return;
      facing.set(tx >= fx ? 1 : -1);
      const ms = d / SPEED;
      setAction('walk');
      x.set(withTiming(tx, { duration: ms, easing: Easing.linear }));
      y.set(withTiming(ty, { duration: ms, easing: Easing.linear }));
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
    [x, y, facing],
  );

  const happyHop = useCallback(
    async (ms = 1100) => {
      setMoodOverride('celebrate');
      hop.set(withSequence(withTiming(-14, { duration: 180, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) })));
      Haptics.selectionAsync();
      await wait(ms);
      setMoodOverride(null);
    },
    [hop],
  );

  /** Door position in overlay coordinates: where the pet stands to enter or leave its home. */
  const doorSpot = useCallback(async () => {
    const [c, h] = await Promise.all([measure(container.current), measure(homeRef.current)]);
    if (!c || !h) return null;
    const dx = h.x - c.x + (HOME_DOOR.x / 120) * h.w;
    const dy = h.y - c.y + (HOME_DOOR.y / 100) * h.h;
    return { x: dx - SIZE / 2, y: dy - SIZE * FEET };
  }, []);

  const comeOut = useCallback(
    async (greet: boolean) => {
      if (outRef.current) return;
      const door = await doorSpot();
      if (!door) return;
      setSleeping(false);
      x.set(door.x);
      y.set(door.y);
      facing.set(1);
      setIsOut(true);
      appear.set(withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
      await wait(250);
      // Step out and down onto the page
      await walkTo(door.x + 30, door.y + 90);
      if (greet) {
        setMoodOverride('celebrate');
        setAction('wave');
        Haptics.selectionAsync();
        await wait(1500);
        setAction('idle');
        setMoodOverride(null);
      }
    },
    [doorSpot, walkTo, x, y, facing, appear],
  );

  const goHome = useCallback(async () => {
    if (!outRef.current) return;
    const door = await doorSpot();
    if (door) await walkTo(door.x, door.y);
    appear.set(withTiming(0, { duration: 350 }));
    await wait(350);
    setIsOut(false);
  }, [doorSpot, walkTo, appear]);

  // The brain: run queued tasks, otherwise roam (or sleep at home at night)
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
        // Roam anywhere on the page, keeping clear of the Add button corner
        const { w, h } = boxRef.current;
        let tx = 6 + Math.random() * Math.max(0, w - SIZE - 12);
        let ty = 120 + Math.random() * Math.max(0, h - SIZE - 140);
        if (tx > w - 210 && ty > h - 150) ty = h - 220;
        await walkTo(tx, ty, true);
        if (queue.current.length) continue;
        // Pause and look around
        const pause = 1500 + Math.random() * 3000;
        const start = Date.now();
        if (Math.random() < 0.4) facing.set(-facing.get());
        while (alive.current && Date.now() - start < pause && !queue.current.length) await wait(100);
        tx = ty = 0;
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

  const drawTick = useCallback<BuddyApi['drawTick']>(
    (row, itemId) => {
      setPending((p) => new Set(p).add(itemId));
      const reveal = () =>
        setPending((p) => {
          const n = new Set(p);
          n.delete(itemId);
          return n;
        });
      enqueue(async () => {
        await comeOut(false);
        const [c, r] = await Promise.all([measure(container.current), measure(row)]);
        if (!c || !r) return reveal();
        // Checkbox centre: card border + padding + half the 32px checkbox
        const cb = { x: r.x - c.x + 2 + 16 + 16, y: r.y - c.y + r.h / 2 };
        const tip = pencilTip(stage);
        // Stand just right of the checkbox, facing it, with the pencil tip on it
        const tx = cb.x - ((120 - tip.x) / 120) * SIZE;
        const ty = cb.y - (tip.y / 120) * SIZE;
        await walkTo(tx, ty);
        facing.set(-1);
        setAction('draw');
        await wait(250);
        setTick({ key: Date.now(), x: cb.x, y: cb.y });
        await wait(750);
        setAction('idle');
        reveal();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await happyHop(1000);
        setTick(null);
      });
    },
    [enqueue, comeOut, walkTo, facing, happyHop, stage],
  );

  const feed = useCallback<BuddyApi['feed']>(
    (foodId) => {
      enqueue(async () => {
        await comeOut(false);
        // Set the food on the ground right under its mouth
        const m = mouthPoint(species, stage);
        const f = facing.get();
        const mx = f > 0 ? (m.x / 120) * SIZE : ((120 - m.x) / 120) * SIZE;
        const fx = x.get() + mx + f * SIZE * 0.08;
        const fy = y.get() + SIZE * FEET + 2;
        setFood({ id: foodId, x: fx, y: fy, bites: 0 });
        setMoodOverride('happy');
        await wait(400);
        // Three big bites in time with the jaw
        setAction('eat');
        for (let b = 1; b <= 3; b++) {
          await wait(700);
          setFood((fd) => (fd ? { ...fd, bites: b } : fd));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setFood(null);
        // Chew, swallow, smile
        setAction('chew');
        await wait(1600);
        setAction('idle');
        await happyHop(1400);
      });
    },
    [enqueue, comeOut, species, stage, facing, x, y, happyHop],
  );

  const cheer = useCallback(() => enqueue(() => happyHop(900)), [enqueue, happyHop]);
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
    transform: [{ translateX: x.value }, { translateY: y.value + hop.value }, { scale: 0.6 + appear.value * 0.4 }],
  }));
  const flipStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: facing.value }] }));

  const api = useMemo<BuddyApi>(
    () => ({ homeRef, out, sleeping, eating: !!food || action === 'chew', pending, drawTick, cheer, feed, callOut }),
    [out, sleeping, food, action, pending, drawTick, cheer, feed, callOut],
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
          {food && <GroundFood id={food.id} x={food.x} y={food.y} bites={food.bites} />}
          {tick && <TickStroke key={tick.key} x={tick.x} y={tick.y} />}
          {out && (
            <Animated.View style={[styles.pet, petStyle]}>
              <Pressable accessibilityLabel="Your pet" onPress={onTapPet} hitSlop={6}>
                <Animated.View style={flipStyle}>
                  <Pet species={species} stage={stage} accessory={accessory} size={SIZE} mood={moodOverride ?? mood} action={action} />
                </Animated.View>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </View>
    </BuddyContext.Provider>
  );
}

const styles = StyleSheet.create({
  pet: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
});
