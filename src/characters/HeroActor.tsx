import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { HeroGender } from '@/data/types';
import { FoodIcon } from './FoodIcon';
import { HERO_LOOKS } from './Hero';
import { darken, lighten, OUTLINE } from './paint';

const INK = '#2A1F3D';
const GOLD = '#FFC233';

/** One full walk cycle (left step + right step). */
export const HERO_STEP_MS = 520;

export type HeroAction = 'idle' | 'walk' | 'crouch' | 'pat' | 'cheer' | 'wave';

/** Where the feet touch the ground in the 120×150 drawing. */
export const HERO_FEET_Y = 138;
/**
 * Where the front hand ends up in the 120×150 drawing when the side-view hero faces left: kneeling to
 * set food down, and reaching out to pat the pet. Scenes line the hero up with these.
 */
export const HERO_SIDE_HAND = { crouch: { x: 37.5, y: 113 }, pat: { x: 39, y: 74 } };

/**
 * One moving part: a full-size SVG cached as a hardware texture. On Android an SVG can't use a
 * gradient from another SVG, so every part is painted with solid colours and soft highlights.
 */
function Part({ w, h, style, children, extra }: { w: number; h: number; style?: object; children: ReactNode; extra?: ReactNode }) {
  return (
    <Animated.View pointerEvents="none" renderToHardwareTextureAndroid shouldRasterizeIOS style={[StyleSheet.absoluteFill, style]}>
      <Svg width={w} height={h} viewBox="0 0 120 150">
        {children}
      </Svg>
      {extra}
    </Animated.View>
  );
}

/** The hero facing you: waves and cheers with its sword in the air. */
function HeroFront({
  gender,
  look,
  size = 72,
  action = 'idle',
  holding = null,
  lean = 0,
}: {
  gender: HeroGender;
  look: number;
  /** Width; the hero is 1.25× as tall */
  size?: number;
  action?: HeroAction;
  /** Food id carried in the left hand */
  holding?: string | null;
  /** Walking direction: -1 left, 1 right; the hero leans into it a little */
  lean?: number;
}) {
  const l = HERO_LOOKS[look] ?? HERO_LOOKS[0];
  const female = gender === 'female';
  const w = size;
  const h = size * 1.25;
  const k = size / 120;
  const px = (v: number) => v * k;

  const cycle = useSharedValue(0);
  const walk = useSharedValue(0);
  const breath = useSharedValue(0);
  const blink = useSharedValue(0);
  const crouch = useSharedValue(0);
  const carry = useSharedValue(holding ? 1 : 0);
  const armUp = useSharedValue(0);
  const swordUp = useSharedValue(0);
  const wave = useSharedValue(0);
  const hop = useSharedValue(0);
  const tilt = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1);
    blink.value = withRepeat(withSequence(withDelay(2800, withTiming(1, { duration: 80 })), withTiming(0, { duration: 110 })), -1);
    return () => {
      cancelAnimation(breath);
      cancelAnimation(blink);
    };
  }, [breath, blink]);

  useEffect(() => {
    tilt.value = withTiming(lean, { duration: 250 });
  }, [lean, tilt]);

  useEffect(() => {
    carry.value = withTiming(holding ? 1 : 0, { duration: 220 });
  }, [holding, carry]);

  useEffect(() => {
    cancelAnimation(wave);
    cancelAnimation(hop);
    if (action === 'walk') {
      cycle.value = 0;
      cycle.value = withRepeat(withTiming(1, { duration: HERO_STEP_MS, easing: Easing.linear }), -1);
      walk.value = withTiming(1, { duration: 140 });
    } else {
      walk.value = withTiming(0, { duration: 180 });
    }
    // Bend the knees and reach down, with a soft settle
    crouch.value = action === 'crouch' ? withSpring(1, { damping: 14, stiffness: 140 }) : withSpring(0, { damping: 16, stiffness: 160 });
    armUp.value = withTiming(action === 'wave' ? 1 : 0, { duration: 260 });
    swordUp.value = withTiming(action === 'cheer' ? 1 : 0, { duration: 260 });
    wave.value =
      action === 'wave' ? withRepeat(withSequence(withTiming(1, { duration: 230 }), withTiming(-1, { duration: 230 })), -1) : withTiming(0, { duration: 150 });
    hop.value =
      action === 'cheer'
        ? withRepeat(withSequence(withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) })), -1)
        : withTiming(0, { duration: 150 });
  }, [action, cycle, walk, crouch, armUp, swordUp, wave, hop]);

  // Body: bobs up on every step, sways side to side, sinks when crouching, hops when cheering
  const bodyStyle = useAnimatedStyle(() => {
    const s = Math.sin(cycle.value * Math.PI * 2);
    const br = Math.sin(breath.value * Math.PI * 2);
    const y = -Math.abs(s) * 3.2 * k * walk.value + crouch.value * 8 * k - hop.value * 9 * k + br * 0.5 * k;
    const rot = s * 3 * walk.value + tilt.value * 4 * walk.value;
    return { transform: [{ translateY: y }, { rotate: `${rot}deg` }, { scaleY: 1 + br * 0.008 }] };
  });
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 1 - hop.value * 0.35,
    transform: [{ scaleX: 1 - hop.value * 0.25 + crouch.value * 0.08 }],
  }));
  // Legs take turns lifting; when crouching they shorten from the boots up
  const legL = useAnimatedStyle(() => ({
    transform: [
      { translateY: -Math.max(0, Math.sin(cycle.value * Math.PI * 2)) * 6 * k * walk.value - hop.value * 9 * k },
      { scaleY: 1 - crouch.value * 0.35 },
    ],
  }));
  const legR = useAnimatedStyle(() => ({
    transform: [
      { translateY: -Math.max(0, -Math.sin(cycle.value * Math.PI * 2)) * 6 * k * walk.value - hop.value * 9 * k },
      { scaleY: 1 - crouch.value * 0.35 },
    ],
  }));
  // Left arm: swings while walking, holds food out to the side, reaches down to set it, or waves
  const armLStyle = useAnimatedStyle(() => {
    const s = Math.sin(cycle.value * Math.PI * 2);
    const swing = s * 20 * walk.value * (1 - carry.value);
    const hold = carry.value * (24 + s * 3 * walk.value);
    return { transform: [{ rotate: `${swing + hold - crouch.value * 14 + armUp.value * 150 + wave.value * 22 * armUp.value}deg` }] };
  });
  // Sword arm swings opposite the left one, or lifts the sword high to cheer
  const armRStyle = useAnimatedStyle(() => {
    const s = Math.sin(cycle.value * Math.PI * 2);
    return { transform: [{ rotate: `${s * 18 * walk.value - swordUp.value * 140 + hop.value * 10 * swordUp.value}deg` }] };
  });
  const capeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-Math.sin(cycle.value * Math.PI * 2) * 4 * walk.value - tilt.value * 5 * walk.value}deg` }],
  }));
  // Look down at the food while crouching
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: crouch.value * 3 * k }, { rotate: `${crouch.value * -4 + Math.sin(cycle.value * Math.PI * 4) * 1.2 * walk.value}deg` }],
  }));
  const blinkStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - blink.value * 0.9 }] }));

  const skinShade = darken(l.skin, 0.14);
  const fs = size * 0.34;
  const happy = action === 'cheer' || action === 'wave';

  return (
    <View style={{ width: w, height: h }}>
      <Part w={w} h={h} style={[{ transformOrigin: [px(60), px(143), 0] }, shadowStyle]}>
        <Ellipse cx="60" cy="143" rx="32" ry="5.5" fill="#1A1028" opacity={0.2} />
      </Part>

      {/* legs stay planted; the body sinks onto them when crouching */}
      {([-1, 1] as const).map((side) => (
        <Part key={side} w={w} h={h} style={[{ transformOrigin: [px(60 + side * 8), px(HERO_FEET_Y), 0] }, side < 0 ? legL : legR]}>
          <Rect x={side < 0 ? 46 : 62} y="112" width="12" height="22" rx="5" fill="#3E3566" {...OUTLINE} />
          <Rect x={side < 0 ? 42 : 60} y="127" width="18" height="11" rx="5.5" fill="#7A5236" {...OUTLINE} />
          <Ellipse cx={side < 0 ? 48 : 66} cy="130" rx="4" ry="1.6" fill="#FFFFFF" opacity={0.3} />
        </Part>
      ))}

      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [px(60), px(HERO_FEET_Y), 0] }, bodyStyle]}>
        <Part w={w} h={h} style={[{ transformOrigin: [px(60), px(86), 0] }, capeStyle]}>
          <Path d="M38 86 Q28 112 28 130 Q60 138 92 130 Q92 112 82 86 Z" fill={darken(l.outfit, 0.25)} {...OUTLINE} />
          <Path d="M44 100 Q41 116 41 130 M76 100 Q79 116 79 130" stroke={darken(l.outfit, 0.5)} strokeOpacity={0.35} strokeWidth={1.5} fill="none" />
        </Part>

        {/* left arm, with the food in its hand */}
        <Part
          w={w}
          h={h}
          style={[{ transformOrigin: [px(33.5), px(89), 0] }, armLStyle]}
          extra={
            holding ? (
              <View style={{ position: 'absolute', left: px(33.5) - fs / 2, top: px(118) - fs * 0.62, width: fs, height: fs }}>
                <FoodIcon id={holding} size={fs} />
              </View>
            ) : null
          }>
          <Rect x="27" y="87" width="13" height="26" rx="6.5" fill={l.outfit} {...OUTLINE} />
          <Rect x="29" y="89" width="4" height="18" rx="2" fill="#FFFFFF" opacity={0.25} />
          <Circle cx="33.5" cy="114" r="6.5" fill={l.skin} {...OUTLINE} />
        </Part>

        <Part w={w} h={h}>
          <Path d="M39 86 Q60 77 81 86 L85 120 Q60 128 35 120 Z" fill={l.outfit} {...OUTLINE} />
          <Path d="M72 88 Q82 92 84 118 Q76 122 70 122 Q76 104 72 88 Z" fill={darken(l.outfit, 0.2)} opacity={0.5} />
          <Path d="M43 90 Q46 100 44 114" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M47 84 Q60 96 73 84 Q60 90 47 84 Z" fill={lighten(l.outfit, 0.35)} />
          <Path d="M60 92 l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z" fill={GOLD} stroke={darken(GOLD, 0.4)} strokeWidth={0.8} />
          <Rect x="35" y="107" width="50" height="7" rx="2" fill="#5A3B28" {...OUTLINE} />
          <Rect x="54.5" y="104.5" width="11" height="12" rx="2.5" fill={GOLD} stroke={darken(GOLD, 0.4)} strokeWidth={1} />
          <Rect x="57.5" y="107.5" width="5" height="6" rx="1" fill="none" stroke={darken(GOLD, 0.45)} strokeWidth={1.2} />
        </Part>

        {/* sword arm */}
        <Part w={w} h={h} style={[{ transformOrigin: [px(86.5), px(89), 0] }, armRStyle]}>
          <G transform="rotate(30 87 113)">
            <Path d="M84.5 64 L87 56 L89.5 64 L89.5 106 L84.5 106 Z" fill="#C9D3E4" {...OUTLINE} />
            <Path d="M87 60 L87 104" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={1.2} />
            <Rect x="79" y="105" width="16" height="4.5" rx="2.2" fill={GOLD} {...OUTLINE} />
            <Rect x="85" y="109" width="4" height="10" rx="1.5" fill="#5A3B28" />
            <Circle cx="87" cy="121" r="2.8" fill={GOLD} />
          </G>
          <Rect x="80" y="87" width="13" height="26" rx="6.5" fill={l.outfit} {...OUTLINE} />
          <Circle cx="86.5" cy="114" r="6.5" fill={l.skin} {...OUTLINE} />
        </Part>

        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [px(60), px(86), 0] }, headStyle]}>
          <Part w={w} h={h}>
            {female && (
              <Path d="M24 52 C18 6 102 6 96 52 L99 96 Q91 104 83 95 L80 66 L40 66 L37 95 Q29 104 21 96 Z" fill={l.hair} {...OUTLINE} />
            )}
            <Ellipse cx="26" cy="57" rx="6" ry="8" fill={l.skin} {...OUTLINE} />
            <Ellipse cx="94" cy="57" rx="6" ry="8" fill={l.skin} {...OUTLINE} />
            <Circle cx="60" cy="52" r="34" fill={l.skin} {...OUTLINE} />
            <Path d="M94 52 A34 34 0 0 1 60 86 A34 34 0 0 1 32 72 Q62 84 86 60 Q92 46 88 34 Q94 42 94 52 Z" fill={skinShade} opacity={0.35} />
            {female ? (
              <G>
                <Path d="M24 58 C14 2 106 2 96 58 C93 42 82 31 67 33 C58 41 45 43 35 40 C29 45 26 51 24 58 Z" fill={l.hair} {...OUTLINE} />
                <Path d="M84 22 L76 14 L76 30 Z M84 22 L92 14 L92 30 Z" fill="#FF7AC6" stroke={darken('#FF7AC6', 0.4)} strokeWidth={1} />
                <Circle cx="84" cy="22" r="3.2" fill={GOLD} />
              </G>
            ) : (
              <Path
                d="M25 57 C17 4 103 4 95 57 C93 45 88 38 82 35 L78 43 L72 32 L64 41 L57 30 L50 40 L43 32 L38 42 C32 41 27 47 25 57 Z"
                fill={l.hair}
                {...OUTLINE}
              />
            )}
            <Path d="M40 27 Q58 18 78 24" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={4} strokeLinecap="round" fill="none" />
            <Path d="M40 45 Q46 42 52 44 M68 44 Q74 42 80 45" stroke={darken(l.hair, 0.2)} strokeWidth={2.6} strokeLinecap="round" fill="none" />
            <Ellipse cx="37" cy="70" rx="7" ry="4.5" fill="#FF6FA8" opacity={0.35} />
            <Ellipse cx="83" cy="70" rx="7" ry="4.5" fill="#FF6FA8" opacity={0.35} />
            <Ellipse cx="60" cy="66.5" rx="2" ry="1.3" fill={darken(l.skin, 0.25)} opacity={0.6} />
            <Path d={happy ? 'M51 70 Q60 84 69 70 Z' : 'M53 71 Q60 81 67 71 Z'} fill="#5A2333" />
            <Ellipse cx="60" cy={happy ? 77 : 76} rx="3.4" ry="1.7" fill="#FF7A8A" />
          </Part>
          {/* eyes: closed happy arcs when cheering, otherwise glossy and blinking */}
          {happy ? (
            <Part w={w} h={h}>
              <Path d="M40 59 Q47 51 54 59 M66 59 Q73 51 80 59" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
            </Part>
          ) : (
            <Part w={w} h={h} style={[{ transformOrigin: [px(60), px(58), 0] }, blinkStyle]}>
              {[47, 73].map((cx) => (
                <G key={cx}>
                  <Ellipse cx={cx} cy={58} rx={7.2} ry={9} fill={l.eyes} />
                  <Ellipse cx={cx} cy={59.5} rx={3.6} ry={4.6} fill="#0E0818" />
                  <Circle cx={cx + 2.6} cy={54.2} r={2.9} fill="#FFFFFF" />
                  <Circle cx={cx - 2.6} cy={62.5} r={1.4} fill="#FFFFFF" opacity={0.85} />
                  {female && (
                    <Path
                      d={`M${cx - 7 * (cx < 60 ? -1 : 1)} 52 Q${cx} 46 ${cx + 7.5 * (cx < 60 ? -1 : 1)} 51 L${cx + 10 * (cx < 60 ? -1 : 1)} 48`}
                      stroke={INK}
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      fill="none"
                    />
                  )}
                </G>
              ))}
            </Part>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * The hero seen from the side, drawn facing right (flipped to face left): legs swing from the hip
 * in a real stride, arms swing opposite, the cape trails behind. It can carry food out in front,
 * kneel to set it down and reach out to pat the pet.
 */
function HeroSide({
  gender,
  look,
  size,
  action,
  holding,
}: {
  gender: HeroGender;
  look: number;
  size: number;
  action: HeroAction;
  holding: string | null;
}) {
  const l = HERO_LOOKS[look] ?? HERO_LOOKS[0];
  const female = gender === 'female';
  const w = size;
  const h = size * 1.25;
  const k = size / 120;
  const px = (v: number) => v * k;

  const cycle = useSharedValue(0);
  const walk = useSharedValue(0);
  const breath = useSharedValue(0);
  const blink = useSharedValue(0);
  const crouch = useSharedValue(0);
  const carry = useSharedValue(holding ? 1 : 0);
  const reach = useSharedValue(0);
  const pat = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1);
    blink.value = withRepeat(withSequence(withDelay(2600, withTiming(1, { duration: 80 })), withTiming(0, { duration: 110 })), -1);
    return () => {
      cancelAnimation(breath);
      cancelAnimation(blink);
    };
  }, [breath, blink]);

  useEffect(() => {
    carry.value = withTiming(holding ? 1 : 0, { duration: 200 });
  }, [holding, carry]);

  useEffect(() => {
    cancelAnimation(pat);
    if (action === 'walk') {
      cycle.value = 0;
      cycle.value = withRepeat(withTiming(1, { duration: HERO_STEP_MS, easing: Easing.linear }), -1);
      walk.value = withTiming(1, { duration: 140 });
    } else {
      walk.value = withTiming(0, { duration: 180 });
    }
    crouch.value = action === 'crouch' ? withSpring(1, { damping: 14, stiffness: 140 }) : withSpring(0, { damping: 16, stiffness: 160 });
    reach.value = withTiming(action === 'pat' ? 1 : 0, { duration: 320, easing: Easing.out(Easing.quad) });
    // Gentle pats on the head
    pat.value =
      action === 'pat'
        ? withDelay(320, withRepeat(withSequence(withTiming(1, { duration: 200 }), withTiming(0, { duration: 220 })), -1))
        : withTiming(0, { duration: 150 });
  }, [action, cycle, walk, crouch, reach, pat]);

  const bodyStyle = useAnimatedStyle(() => {
    const s = Math.sin(cycle.value * Math.PI * 2);
    const br = Math.sin(breath.value * Math.PI * 2);
    // Up on each passing step, down when the legs are spread; lean into the stride a little
    const y = -Math.abs(Math.cos(cycle.value * Math.PI * 2)) * 2.8 * k * walk.value + crouch.value * 9 * k + br * 0.5 * k;
    return { transform: [{ translateY: y }, { rotate: `${3 * walk.value + s * 0.8 * walk.value + reach.value * 3}deg` }] };
  });
  const legStyle = (side: 1 | -1) => {
    'worklet';
    const s = Math.sin(cycle.value * Math.PI * 2) * side;
    // Knees bend into a kneel: front leg steps forward, back leg tucks under
    return { transform: [{ rotate: `${s * 30 * walk.value - crouch.value * (side > 0 ? 28 : -18)}deg` }] };
  };
  const frontLeg = useAnimatedStyle(() => legStyle(1));
  const backLeg = useAnimatedStyle(() => legStyle(-1));
  const crouchLegs = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - crouch.value * 0.22 }] }));
  const frontArm = useAnimatedStyle(() => {
    const s = Math.sin(cycle.value * Math.PI * 2);
    const swing = -s * 24 * walk.value * (1 - carry.value);
    const hold = -carry.value * (42 + s * 3 * walk.value);
    const down = -crouch.value * 13 * carry.value - crouch.value * 40 * (1 - carry.value);
    return { transform: [{ rotate: `${swing + hold + down - reach.value * 130 + pat.value * 14}deg` }] };
  });
  const backArm = useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.sin(cycle.value * Math.PI * 2) * 24 * walk.value + crouch.value * 15}deg` }] }));
  const capeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${12 * walk.value + Math.sin(cycle.value * Math.PI * 4) * 4 * walk.value + Math.sin(breath.value * Math.PI * 2) * 1.5}deg` }],
  }));
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: crouch.value * 2 * k }, { rotate: `${crouch.value * 10 + reach.value * 4 + Math.sin(cycle.value * Math.PI * 4) * 1 * walk.value}deg` }],
  }));
  const blinkStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - blink.value * 0.9 }] }));

  const pants = '#3E3566';
  const boot = '#7A5236';
  const fs = size * 0.34;
  const happy = action === 'pat';

  const leg = (front: boolean) => (
    <G>
      <Rect x="54" y="110" width="12" height="22" rx="5" fill={front ? pants : darken(pants, 0.2)} {...OUTLINE} />
      <Rect x="52" y="127" width="21" height="11" rx="5.5" fill={front ? boot : darken(boot, 0.2)} {...OUTLINE} />
      {front && <Ellipse cx="62" cy="130" rx="4" ry="1.5" fill="#FFFFFF" opacity={0.3} />}
    </G>
  );

  return (
    <View style={{ width: w, height: h }}>
      <Part w={w} h={h}>
        <Ellipse cx="60" cy="143" rx="24" ry="5" fill="#1A1028" opacity={0.2} />
      </Part>

      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [px(60), px(HERO_FEET_Y), 0] }, bodyStyle]}>
        {/* far arm and cape, behind the body */}
        <Part w={w} h={h} style={[{ transformOrigin: [px(60), px(90), 0] }, backArm]}>
          <Rect x="54" y="88" width="12" height="25" rx="6" fill={darken(l.outfit, 0.18)} {...OUTLINE} />
          <Circle cx="60" cy="114" r="6" fill={darken(l.skin, 0.12)} {...OUTLINE} />
        </Part>
        <Part w={w} h={h} style={[{ transformOrigin: [px(56), px(86), 0] }, capeStyle]}>
          <Path d="M56 86 Q42 108 36 132 Q48 137 62 132 Q60 110 64 88 Z" fill={darken(l.outfit, 0.28)} {...OUTLINE} />
        </Part>
        {/* sheathed sword on the back */}
        <Part w={w} h={h}>
          <G transform="rotate(-38 50 104)">
            <Rect x="47" y="96" width="6" height="34" rx="2.5" fill="#5A3B28" {...OUTLINE} />
            <Rect x="47" y="126" width="6" height="5" rx="2" fill={GOLD} />
            <Rect x="43" y="92" width="14" height="4" rx="2" fill={GOLD} {...OUTLINE} />
            <Rect x="48" y="83" width="4" height="10" rx="1.5" fill="#5A3B28" />
          </G>
        </Part>

        {/* legs: the body sinks onto them when kneeling */}
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [px(60), px(HERO_FEET_Y), 0] }, crouchLegs]}>
          <Part w={w} h={h} style={[{ transformOrigin: [px(60), px(112), 0] }, backLeg]}>
            {leg(false)}
          </Part>
          <Part w={w} h={h} style={[{ transformOrigin: [px(60), px(112), 0] }, frontLeg]}>
            {leg(true)}
          </Part>
        </Animated.View>

        <Part w={w} h={h}>
          <Path d="M47 88 Q60 82 73 88 L77 120 Q60 126 43 120 Z" fill={l.outfit} {...OUTLINE} />
          <Path d="M47 92 Q45 106 46 116" stroke={darken(l.outfit, 0.25)} strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M70 92 Q73 104 72 116" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M60 86 Q68 92 74 88 Q68 90 60 86 Z" fill={lighten(l.outfit, 0.35)} />
          <Rect x="43" y="107" width="34" height="7" rx="2" fill="#5A3B28" {...OUTLINE} />
          <Rect x="68" y="104.5" width="8" height="12" rx="2.5" fill={GOLD} stroke={darken(GOLD, 0.4)} strokeWidth={1} />
        </Part>

        {/* head, in profile */}
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [px(62), px(86), 0] }, headStyle]}>
          <Part w={w} h={h}>
            {female && <Path d="M36 40 Q24 72 34 98 Q44 104 54 94 Q50 74 54 56 Z" fill={l.hair} {...OUTLINE} />}
            <Circle cx="62" cy="52" r="32" fill={l.skin} {...OUTLINE} />
            <Path d="M34 64 A32 32 0 0 0 62 84 A32 32 0 0 0 76 81 Q54 80 40 62 Z" fill={darken(l.skin, 0.14)} opacity={0.35} />
            <Ellipse cx="53" cy="58" rx="5" ry="7" fill={l.skin} {...OUTLINE} />
            <Path d="M52 55 Q55 58 52 61" stroke={darken(l.skin, 0.3)} strokeWidth={1.4} fill="none" strokeLinecap="round" />
            <Path d="M92.5 57 Q98 60 93 64" fill={l.skin} stroke={darken(l.skin, 0.28)} strokeWidth={1.3} strokeLinecap="round" />
            {female ? (
              <G>
                <Path d="M29 62 C20 14 76 4 96 40 C86 33 76 31 68 33 C62 40 56 43 50 43 C47 52 46 59 46 66 Q36 72 29 62 Z" fill={l.hair} {...OUTLINE} />
                <Path d="M44 22 L36 14 L36 30 Z M44 22 L52 14 L52 30 Z" fill="#FF7AC6" stroke={darken('#FF7AC6', 0.4)} strokeWidth={1} />
                <Circle cx="44" cy="22" r="3" fill={GOLD} />
              </G>
            ) : (
              <Path
                d="M29 62 C21 18 70 4 96 36 L88 40 L86 31 L78 39 L73 29 L65 38 L60 30 C55 40 50 48 47 64 Q37 70 29 62 Z"
                fill={l.hair}
                {...OUTLINE}
              />
            )}
            <Path d="M46 26 Q62 16 80 22" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={4} strokeLinecap="round" fill="none" />
            <Path d="M75 45 Q80 42.5 86 45" stroke={darken(l.hair, 0.2)} strokeWidth={2.6} strokeLinecap="round" fill="none" />
            <Ellipse cx="82" cy="68" rx="5.5" ry="3.2" fill="#FF6FA8" opacity={0.35} />
            <Path d={happy ? 'M82 70 Q87 79 92 70 Z' : 'M83 71 Q87.5 75 91.5 70.5'} fill={happy ? '#5A2333' : 'none'} stroke="#5A2333" strokeWidth={2} strokeLinecap="round" />
          </Part>
          {happy ? (
            <Part w={w} h={h}>
              <Path d="M76 58 Q80.5 51 85 58" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
            </Part>
          ) : (
            <Part w={w} h={h} style={[{ transformOrigin: [px(80), px(57), 0] }, blinkStyle]}>
              <Ellipse cx="80" cy="57" rx="4.6" ry="8.4" fill={l.eyes} />
              <Ellipse cx="81.4" cy="58.5" rx="2.6" ry="4.6" fill="#0E0818" />
              <Circle cx="82.2" cy="53.6" r="1.9" fill="#FFFFFF" />
              {female && <Path d="M76 50 Q81 46 86 49 L89 46" stroke={INK} strokeWidth={2} strokeLinecap="round" fill="none" />}
            </Part>
          )}
        </Animated.View>

        {/* near arm, in front of everything, carrying the food */}
        <Part
          w={w}
          h={h}
          style={[{ transformOrigin: [px(62), px(90), 0] }, frontArm]}
          extra={
            holding ? (
              <View style={{ position: 'absolute', left: px(62) - fs / 2, top: px(119) - fs * 0.6, width: fs, height: fs }}>
                <FoodIcon id={holding} size={fs} />
              </View>
            ) : null
          }>
          <Rect x="56" y="88" width="12" height="25" rx="6" fill={l.outfit} {...OUTLINE} />
          <Rect x="58" y="90" width="3.5" height="17" rx="1.7" fill="#FFFFFF" opacity={0.25} />
          <Circle cx="62" cy="115" r="6.5" fill={l.skin} {...OUTLINE} />
        </Part>
      </Animated.View>
    </View>
  );
}

/**
 * The hero as a little actor for scenes on the Today screen, built from moving parts. Facing left or
 * right it's drawn from the side and really walks; facing you (0) it can wave and cheer.
 */
export function HeroActor({
  gender,
  look,
  size = 72,
  action = 'idle',
  holding = null,
  facing = 0,
}: {
  gender: HeroGender;
  look: number;
  /** Width; the hero is 1.25× as tall */
  size?: number;
  action?: HeroAction;
  /** Food id carried in the front hand */
  holding?: string | null;
  /** -1 faces left, 1 faces right, 0 faces you */
  facing?: -1 | 0 | 1;
}) {
  return (
    // Turning around is a quick cross-fade between the views
    <Animated.View key={facing} entering={FadeIn.duration(140)} style={{ width: size, height: size * 1.25 }}>
      {facing === 0 ? (
        <HeroFront gender={gender} look={look} size={size} action={action} holding={holding} />
      ) : (
        <View style={{ transform: [{ scaleX: facing }] }}>
          <HeroSide gender={gender} look={look} size={size} action={action} holding={holding} />
        </View>
      )}
    </Animated.View>
  );
}
