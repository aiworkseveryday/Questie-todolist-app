import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Pet } from '@/characters/Pet';
import type { PetSpecies } from '@/data/types';
import { palette } from '@/theme/tokens';
import { AppText } from './AppText';

const SIZE = 58;
/** Gap between the buddy's feet and the bottom of the screen area. */
const FLOOR = 10;
/** Keep clear of the floating "Add" button on the right. */
const RIGHT_CLEARANCE = 200;
const WALK_MS_PER_PX = 14;

/** A mounted native view, which can report where it sits on screen. */
export type ViewRef = ComponentRef<typeof View>;

type BuddyApi = {
  /** Run over to this row, stamp it, then walk back home. */
  stamp: (row: ViewRef | null) => void;
};

const BuddyContext = createContext<BuddyApi | null>(null);

/** Rows call this when a quest is completed. Outside the Today screen it does nothing. */
export function useBuddy() {
  return useContext(BuddyContext);
}

const isNight = () => {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
};

/** A floating "Zzz" while the buddy naps. */
function Zzz() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1);
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ translateY: -24 * t.value }, { translateX: 10 * t.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.zzz, style]}>
      <AppText variant="label" color={palette.violet}>
        Zzz
      </AppText>
    </Animated.View>
  );
}

/** Short-lived bubble above the buddy: a reaction emoji or the stamp mark. */
function Pop({ text, left, top, big }: { text: string; left: number; top: number; big?: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.7 ? 1 : (1 - t.value) / 0.3,
    transform: [{ translateY: -18 * t.value }, { scale: 0.7 + Math.min(1, t.value * 3) * 0.4 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.pop, { left, top }, style]}>
      <AppText style={{ fontSize: big ? 30 : 22, lineHeight: big ? 36 : 28 }}>{text}</AppText>
    </Animated.View>
  );
}

/**
 * Today-screen companion: a small copy of the pet that wanders along the bottom, naps at night,
 * reacts when tapped and runs up to stamp each quest you complete.
 */
export function BuddyProvider({
  species,
  stage,
  accessory,
  children,
}: {
  species: PetSpecies;
  stage: number;
  accessory: string | null;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const container = useRef<ViewRef>(null);
  const [height, setHeight] = useState(0);
  const [sleeping, setSleeping] = useState(isNight);
  const [busy, setBusy] = useState(false);
  const [pops, setPops] = useState<{ key: number; text: string; left: number; top: number; big?: boolean }[]>([]);
  const busyRef = useRef(false);
  const popSeq = useRef(0);

  const x = useSharedValue(24);
  const y = useSharedValue(0);
  const facing = useSharedValue(1);
  const squash = useSharedValue(1);
  const home = 24;
  const maxX = Math.max(home + 40, width - RIGHT_CLEARANCE - SIZE);
  const groundTop = height - SIZE - FLOOR;

  const pop = useCallback((text: string, left: number, top: number, big?: boolean) => {
    popSeq.current += 1;
    const key = popSeq.current;
    setPops((p) => [...p, { key, text, left, top, big }]);
    setTimeout(() => setPops((p) => p.filter((q) => q.key !== key)), 950);
  }, []);

  const walkTo = useCallback(
    (tx: number) => {
      const d = Math.abs(tx - x.get());
      facing.set(tx >= x.get() ? 1 : -1);
      x.set(withTiming(tx, { duration: Math.max(300, d * WALK_MS_PER_PX), easing: Easing.inOut(Easing.quad) }));
      return Math.max(300, d * WALK_MS_PER_PX);
    },
    [x, facing],
  );

  // Wander: walk somewhere, pause, repeat. At night stay put and nap.
  useEffect(() => {
    if (!height) return;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const night = isNight();
      setSleeping(night);
      if (!busyRef.current && !night) {
        const tx = home + Math.random() * (maxX - home);
        const ms = walkTo(tx);
        timer = setTimeout(step, ms + 2000 + Math.random() * 3500);
      } else {
        timer = setTimeout(step, 4000);
      }
    };
    timer = setTimeout(step, 1500);
    return () => clearTimeout(timer);
  }, [height, maxX, walkTo]);

  const stamp = useCallback<BuddyApi['stamp']>(
    (row) => {
      if (!row || !container.current || !height) return;
      container.current.measureInWindow((cx: number, cy: number) => {
        row.measureInWindow((rx: number, ry: number, rw: number, rh: number) => {
          busyRef.current = true;
          setBusy(true);
          setSleeping(false);
          // Land on the row's left edge, where its checkbox is, centred vertically
          const tx = Math.min(maxX, Math.max(0, rx - cx + 6));
          const ty = ry - cy + rh / 2 - SIZE / 2 - groundTop;
          const d = Math.hypot(tx - x.get(), ty);
          const go = Math.min(700, Math.max(300, d * 1.6));
          facing.set(tx >= x.get() ? 1 : -1);
          x.set(withTiming(tx, { duration: go, easing: Easing.inOut(Easing.quad) }));
          // Hop up in an arc
          y.set(withSequence(
            withTiming(ty - 26, { duration: go * 0.65, easing: Easing.out(Easing.quad) }),
            withTiming(ty, { duration: go * 0.35, easing: Easing.in(Easing.quad) }),
          ));
          setTimeout(() => {
            // Stamp: squash down once, a check mark pops out
            squash.set(withSequence(withTiming(0.78, { duration: 110 }), withTiming(1, { duration: 160 })));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            pop('✅', tx + SIZE / 2 - 18, groundTop + ty - 6, true);
          }, go + 40);
          setTimeout(() => {
            // Hop back down and stroll home
            y.set(withSequence(
              withTiming(Math.min(0, ty) - 20, { duration: 220, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
            ));
            const ms = walkTo(home + Math.random() * (maxX - home));
            setTimeout(() => {
              busyRef.current = false;
              setBusy(false);
            }, ms);
          }, go + 750);
        });
      });
    },
    [height, maxX, groundTop, x, y, facing, squash, pop, walkTo],
  );

  const onTap = () => {
    Haptics.selectionAsync();
    setSleeping(false);
    y.set(withSequence(withTiming(-22, { duration: 180, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) })));
    const faces = ['💖', '😄', '❗', '✨', '🎵'];
    pop(faces[Math.floor(Math.random() * faces.length)], x.get() + SIZE / 2 - 12, groundTop - 30);
    // Doze off again a little later if it's night
    if (isNight()) setTimeout(() => setSleeping(isNight()), 5000);
  };

  const moveStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }] }));
  // Only the pet flips to face where it walks, so the "Zzz" text never mirrors
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: facing.value }, { scaleY: squash.value }] }));

  return (
    <BuddyContext.Provider value={{ stamp }}>
      <View style={{ flex: 1 }}>
        {children}
        <View
          ref={container}
          pointerEvents="box-none"
          style={StyleSheet.absoluteFill}
          onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
          {height > 0 && (
            <Animated.View style={[styles.buddy, { top: groundTop }, moveStyle]}>
              <Animated.View style={bodyStyle}>
                <Pressable accessibilityLabel="Your pet buddy" onPress={onTap} hitSlop={8}>
                  <Pet species={species} stage={stage} accessory={accessory} size={SIZE} mood={busy ? 'celebrate' : sleeping ? 'idle' : 'happy'} />
                </Pressable>
              </Animated.View>
              {sleeping && !busy && <Zzz />}
            </Animated.View>
          )}
          {pops.map((p) => (
            <Pop key={p.key} text={p.text} left={p.left} top={p.top} big={p.big} />
          ))}
        </View>
      </View>
    </BuddyContext.Provider>
  );
}

const styles = StyleSheet.create({
  buddy: { position: 'absolute', left: 0, width: SIZE, height: SIZE },
  zzz: { position: 'absolute', right: -14, top: -6 },
  pop: { position: 'absolute' },
});
