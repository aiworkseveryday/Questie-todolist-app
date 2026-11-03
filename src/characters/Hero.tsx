import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { hairHex, SKIN_TONES, type HeroStyle } from '@/game/style';
import { darken, lighten, useGradientIds } from './paint';

/** Anime-style line art: a dark ink outline on every shape. */
const LINE = { stroke: '#2A2238', strokeWidth: 1.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const INK = '#2A2238';

/** Height of the drawing relative to its width (viewBox 200 × 440). */
export const HERO_ASPECT = 2.2;

type Ids = Record<'silver' | 'irisF' | 'irisM', { id: string; url: string }>;
type Props = { style: HeroStyle; size?: number; bounce?: boolean };

/** Big glossy anime eye; `cx` is its centre, the outer corner gets a lash flick. */
function Eye({ cx, iris, female }: { cx: number; iris: string; female: boolean }) {
  const out = cx < 100 ? -1 : 1;
  const y = 51;
  return (
    <G>
      <Path d={`M${cx - 6} ${y} Q${cx} ${y - 6} ${cx + 6} ${y - 1} Q${cx} ${y + 5} ${cx - 6} ${y} Z`} fill="#FFFFFF" />
      <Ellipse cx={cx + 0.4} cy={y} rx={3.3} ry={female ? 4.4 : 3.8} fill={iris} />
      <Ellipse cx={cx + 0.4} cy={y + 0.4} rx={1.4} ry={female ? 2.2 : 1.9} fill="#120C1E" />
      <Circle cx={cx + 1.5} cy={y - 1.8} r={1.25} fill="#FFFFFF" />
      <Circle cx={cx - 0.9} cy={y + 2} r={0.6} fill="#FFFFFF" />
      <Path d={`M${cx - 6.5} ${y - 0.5} Q${cx} ${y - 7} ${cx + 6.5} ${y - 1.5}`} stroke={INK} strokeWidth={female ? 2.3 : 2} strokeLinecap="round" fill="none" />
      {female && <Path d={`M${cx + 6.5 * out} ${y - 1} L${cx + 8.4 * out} ${y - 2.6}`} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />}
      <Path d={`M${cx - 4} ${y + 4.2} Q${cx} ${y + 5.2} ${cx + 4} ${y + 3.8}`} stroke={INK} strokeOpacity={0.45} strokeWidth={0.8} fill="none" />
    </G>
  );
}

/** Aurora: an original knight in navy, white and gold with silver plate armour. */
function Aurora({ skin, hair, ids }: { skin: string; hair: string; ids: Ids }) {
  const navy = '#22356B';
  const navyShade = darken(navy, 0.3);
  const white = '#F5F3FA';
  const whiteShade = '#D6D2E4';
  const gold = '#E2B23E';
  const silver = ids.silver.url;
  const teal = '#2EC4B6';
  const skinShade = darken(skin, 0.14);
  const hairShade = darken(hair, 0.28);

  return (
    <G>
      {/* long white back panels flowing behind the legs */}
      <Path d="M72 150 Q60 262 50 384 Q68 374 82 390 Q88 300 92 182 Z" fill={white} {...LINE} />
      <Path d="M128 150 Q140 262 150 384 Q132 374 118 390 Q112 300 108 182 Z" fill={whiteShade} {...LINE} />
      <Path d="M72 150 Q60 262 50 384 M128 150 Q140 262 150 384" stroke={gold} strokeWidth={2} fill="none" />

      {/* hair behind the head: a jaw-length bob */}
      <Path d="M70 44 Q66 10 100 8 Q134 10 130 44 L132 84 Q122 92 114 82 L112 56 L88 56 L86 82 Q78 92 68 84 Z" fill={hairShade} {...LINE} />

      {/* armoured legs with shield knee guards */}
      <Path d="M84 230 L98 230 L97 302 L96 400 L100 420 L74 420 Q72 412 80 404 L82 302 Z" fill={silver} {...LINE} />
      <Path d="M102 230 L116 230 L118 302 L120 400 L126 420 L100 420 L104 400 L103 302 Z" fill={silver} {...LINE} />
      <Path d="M92 236 L91 398 M111 236 L113 398" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.6} />
      {[90, 110].map((x) => (
        <G key={x}>
          <Path d={`M${x - 9} 296 L${x + 9} 296 L${x + 9} 311 L${x} 320 L${x - 9} 311 Z`} fill={navy} {...LINE} />
          <Path d={`M${x - 7} 298 L${x + 7} 298 L${x + 7} 310 L${x} 317 L${x - 7} 310 Z`} stroke={gold} strokeWidth={1.2} fill="none" />
          <Circle cx={x} cy={306} r={2.6} fill={teal} stroke={INK} strokeWidth={0.8} />
        </G>
      ))}

      {/* split skirt over a white underlayer */}
      <Path d="M96 170 L104 170 L103 252 L97 252 Z" fill={white} {...LINE} />
      <Path d="M74 170 L98 172 L96 246 L70 236 Q70 200 74 170 Z" fill={navy} {...LINE} />
      <Path d="M126 170 L102 172 L104 246 L130 236 Q130 200 126 170 Z" fill={navyShade} {...LINE} />
      <Path d="M70 236 L96 246 M130 236 L104 246" stroke={gold} strokeWidth={2.2} />

      {/* arms: navy sleeves, silver gauntlets */}
      <Path d="M70 98 Q60 100 58 120 L56 160 L68 162 L72 124 Z" fill={navy} {...LINE} />
      <Path d="M130 98 Q140 100 142 120 L144 160 L132 162 L128 124 Z" fill={navyShade} {...LINE} />
      <Path d="M55 158 L69 160 L67 206 L53 206 Z" fill={silver} {...LINE} />
      <Path d="M145 158 L131 160 L133 206 L147 206 Z" fill={silver} {...LINE} />
      <Path d="M55 172 L68 173 M145 172 L132 173" stroke={gold} strokeWidth={1.6} />
      <Path d="M53 206 Q50 220 57 227 Q66 227 67 214 L67 206 Z" fill={skin} {...LINE} />
      <Path d="M147 206 Q150 220 143 227 Q134 227 133 214 L133 206 Z" fill={skinShade} {...LINE} />

      {/* fitted tunic: navy with a white centre panel and gold clasps */}
      <Path d="M70 96 Q100 88 130 96 L126 132 Q120 150 118 170 L82 170 Q80 150 74 132 Z" fill={navy} {...LINE} />
      <Path d="M112 96 L130 96 L126 132 Q120 150 118 170 L108 170 Z" fill={navyShade} />
      <Path d="M93 92 L107 92 L105 170 L95 170 Z" fill={white} {...LINE} />
      <Path d="M93 92 L95 170 M107 92 L105 170" stroke={gold} strokeWidth={1.6} />
      {[112, 128, 144].map((y) => (
        <G key={y}>
          <Path d={`M86 ${y} H114`} stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
          <Path d={`M88 ${y} H112`} stroke={gold} strokeWidth={1.6} strokeLinecap="round" />
        </G>
      ))}
      <Path d="M80 160 H120 V170 H80 Z" fill={INK} {...LINE} />
      <Path d="M94 159 H106 V171 H94 Z" fill={gold} {...LINE} />
      <Circle cx={100} cy={165} r={2.4} fill={teal} />

      {/* silver shoulder plates with gold edging and teal gems */}
      {[
        { a: 'M57 96 Q63 83 80 88 L82 104 Q70 112 57 110 Z', b: 'M55 108 Q66 114 79 106 L77 117 Q66 123 55 119 Z', gem: 70 },
        { a: 'M143 96 Q137 83 120 88 L118 104 Q130 112 143 110 Z', b: 'M145 108 Q134 114 121 106 L123 117 Q134 123 145 119 Z', gem: 130 },
      ].map((p) => (
        <G key={p.gem}>
          <Path d={p.b} fill={silver} {...LINE} />
          <Path d={p.a} fill={silver} {...LINE} />
          <Path d={p.a} stroke={gold} strokeWidth={1.1} fill="none" />
          <Circle cx={p.gem} cy={97} r={2.6} fill={teal} stroke={INK} strokeWidth={0.8} />
        </G>
      ))}

      {/* neck and high collar */}
      <Path d="M95 72 L105 72 L106 90 L94 90 Z" fill={skin} {...LINE} />
      <Path d="M95 74 Q100 81 105 74 L105 82 Q100 85 95 81 Z" fill={skinShade} />
      <Path d="M87 84 L113 84 L115 97 Q100 101 85 97 Z" fill={white} {...LINE} />
      <Path d="M87 84 L113 84" stroke={gold} strokeWidth={1.6} />

      {/* face */}
      <Path d="M80 44 Q80 22 100 20 Q120 22 120 44 Q120 62 108 74 Q100 79 92 74 Q80 62 80 44 Z" fill={skin} {...LINE} />
      <Path d="M114 52 Q114 64 106 72 Q113 66 117 52 Z" fill={skinShade} />

      {/* front hair: jagged fringe and face-framing locks */}
      <Path d="M80 40 Q75 60 82 82 L87 79 Q82 60 86 44 Z" fill={hair} {...LINE} />
      <Path d="M120 40 Q125 60 118 82 L113 79 Q118 60 114 44 Z" fill={hairShade} {...LINE} />
      <Path d="M78 50 Q74 15 100 13 Q126 15 122 50 L118 37 L114 49 L108 31 L102 45 L96 29 L90 45 L86 34 L82 50 Z" fill={hair} {...LINE} />
      <Path d="M86 24 Q100 17 114 23" stroke={lighten(hair, 0.6)} strokeOpacity={0.8} strokeWidth={2.2} strokeLinecap="round" fill="none" />

      {/* features */}
      <Path d="M85 42 Q90 40 96 41.5 M104 41.5 Q110 40 115 42" stroke={darken(hair, 0.45)} strokeWidth={1.3} strokeLinecap="round" fill="none" />
      <Eye cx={91} iris={ids.irisF.url} female />
      <Eye cx={109} iris={ids.irisF.url} female />
      <Path d="M100.5 57 L99.5 60" stroke={darken(skin, 0.35)} strokeWidth={1} strokeLinecap="round" />
      <Path d="M97.5 66 Q100 67.4 102.5 66" stroke="#9A3E52" strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <Ellipse cx={87} cy={60} rx={3.5} ry={1.6} fill="#FF7FA8" opacity={0.3} />
      <Ellipse cx={113} cy={60} rx={3.5} ry={1.6} fill="#FF7FA8" opacity={0.3} />
    </G>
  );
}

/** Kael: an original wanderer in a long rune-lit coat with a torn hem. */
function Kael({ skin, hair, ids }: { skin: string; hair: string; ids: Ids }) {
  const coat = '#34323F';
  const coatShade = darken(coat, 0.35);
  const lining = '#4A4658';
  const pants = '#3A3F55';
  const rune = '#3BE0D0';
  const skinShade = darken(skin, 0.14);
  const hairShade = darken(hair, 0.3);

  return (
    <G>
      {/* coat tails behind the legs, hem torn into ragged points */}
      <Path d="M66 150 Q58 262 44 352 L54 346 L57 358 L67 342 L74 354 L80 334 L84 300 L90 200 Z" fill={coat} {...LINE} />
      <Path d="M134 150 Q142 262 156 358 L146 350 L141 362 L131 344 L125 354 L120 332 L116 300 L110 200 Z" fill={coatShade} {...LINE} />

      {/* back hair */}
      <Path d="M76 48 Q68 10 100 6 Q134 8 126 48 Z" fill={hairShade} {...LINE} />

      {/* slim pants and boots */}
      <Path d="M84 196 L99 196 L96 300 L94 396 L82 396 L82 300 Z" fill={pants} {...LINE} />
      <Path d="M101 196 L116 196 L121 300 L122 396 L109 396 L104 300 Z" fill={darken(pants, 0.25)} {...LINE} />
      <Path d="M86 300 Q90 304 95 300 M106 300 Q112 304 118 300" stroke={INK} strokeOpacity={0.4} strokeWidth={1} fill="none" />
      <Path d="M80 390 L97 390 L99 420 L70 420 Q69 410 80 403 Z" fill="#1E1C24" {...LINE} />
      <Path d="M107 390 L124 390 L132 403 Q134 412 131 420 L105 420 Z" fill="#1E1C24" {...LINE} />
      <Path d="M76 410 L96 410 M108 410 L128 410" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={1.4} />

      {/* sleeves, a bracer and clenched fists */}
      <Path d="M66 100 Q55 104 53 126 L51 196 L66 198 L70 130 Z" fill={coat} {...LINE} />
      <Path d="M134 100 Q145 104 147 126 L149 196 L134 198 L130 130 Z" fill={coatShade} {...LINE} />
      <Path d="M51 190 L66 192 M149 190 L134 192" stroke={rune} strokeWidth={1.6} />
      <Path d="M133 166 L149 166 L149 190 L133 190 Z" fill="#26242E" {...LINE} />
      <Path d="M136 172 L146 172 M136 184 L146 184" stroke={rune} strokeWidth={1.2} />
      <Path d="M51 196 Q48 212 57 217 Q66 215 66 204 L66 198 Z" fill={skin} {...LINE} />
      <Path d="M149 196 Q152 212 143 217 Q134 215 134 204 L134 198 Z" fill={skinShade} {...LINE} />

      {/* dark shirt with an open neck */}
      <Path d="M74 100 Q100 94 126 100 L120 196 L80 196 Z" fill="#1D1C26" {...LINE} />
      <Path d="M94 96 L100 112 L106 96 Z" fill={skinShade} {...LINE} />

      {/* belt with a silver buckle and a hanging chain */}
      <Path d="M80 184 L120 184 L120 194 L80 194 Z" fill="#5A3A28" {...LINE} />
      <Path d="M95 182 L105 182 L105 196 L95 196 Z" fill="#C9D0DC" {...LINE} />
      <Path d="M110 194 Q118 214 106 222 Q98 214 96 196" stroke="#AEB6C4" strokeWidth={1.6} strokeDasharray="2 1.6" fill="none" />

      {/* open coat front with lapels and glowing rune lines */}
      <Path d="M66 98 L92 98 L86 196 L82 196 Q78 260 74 300 L67 296 Q63 220 66 150 Z" fill={coat} {...LINE} />
      <Path d="M134 98 L108 98 L114 196 L118 196 Q122 260 126 300 L133 296 Q137 220 134 150 Z" fill={coatShade} {...LINE} />
      <Path d="M92 98 L82 138 L75 112 Z" fill={lining} {...LINE} />
      <Path d="M108 98 L118 138 L125 112 Z" fill={darken(lining, 0.25)} {...LINE} />
      <Path d="M72 122 L80 122 L76 142 L84 152 L80 190 L78 250" stroke={rune} strokeWidth={1.6} fill="none" />
      <Path d="M128 122 L121 130 L126 150 L118 162 L122 192 L124 250" stroke={rune} strokeWidth={1.6} fill="none" />
      {/* dark armoured plate on one shoulder */}
      <Path d="M124 94 Q142 88 150 106 Q141 117 127 112 Z" fill="#26242E" {...LINE} />
      <Path d="M128 98 Q141 95 146 106" stroke={rune} strokeWidth={1.2} fill="none" />

      {/* neck and standing collar */}
      <Path d="M95 74 L105 74 L106 98 L94 98 Z" fill={skin} {...LINE} />
      <Path d="M95 76 Q100 83 105 76 L105 84 Q100 88 95 84 Z" fill={skinShade} />
      <Path d="M83 92 Q100 85 117 92 L119 101 Q100 96 81 101 Z" fill={lining} {...LINE} />

      {/* face with a sharper jaw */}
      <Ellipse cx={80.5} cy={50} rx={3} ry={6} fill={skin} {...LINE} />
      <Ellipse cx={119.5} cy={50} rx={3} ry={6} fill={skinShade} {...LINE} />
      <Path d="M81 44 Q81 22 100 20 Q119 22 119 44 Q119 60 110 72 Q100 80 90 72 Q81 60 81 44 Z" fill={skin} {...LINE} />
      <Path d="M114 50 Q114 64 106 73 Q113 67 117 50 Z" fill={skinShade} />

      {/* messy fringe swept to one side */}
      <Path d="M78 48 Q72 13 102 9 Q130 11 124 44 L118 33 L116 46 L110 29 L104 44 L98 27 L92 42 L86 30 L82 45 Z" fill={hair} {...LINE} />
      <Path d="M88 20 Q100 13 114 18" stroke={lighten(hair, 0.55)} strokeOpacity={0.7} strokeWidth={2} strokeLinecap="round" fill="none" />

      {/* features: level brows, focused eyes */}
      <Path d="M84 43.5 L96 45 M104 45 L116 43.5" stroke={darken(hair, 0.4)} strokeWidth={2} strokeLinecap="round" />
      <Eye cx={91} iris={ids.irisM.url} female={false} />
      <Eye cx={109} iris={ids.irisM.url} female={false} />
      <Path d="M100.5 56 L98.8 61 L101.2 61.6" stroke={darken(skin, 0.35)} strokeWidth={1} strokeLinecap="round" fill="none" />
      <Path d="M97 67 Q100 67.8 103.5 66.4" stroke="#7A3A44" strokeWidth={1.2} strokeLinecap="round" fill="none" />
    </G>
  );
}

/**
 * Anime-style hero: Aurora the knight (female) or Kael the wanderer (male).
 * Skin tone and hair colour follow the player's choices.
 */
export function Hero({ style, size = 100, bounce = true }: Props) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (!bounce) return;
    y.value = withRepeat(withSequence(withTiming(-3, { duration: 1200 }), withTiming(0, { duration: 1200 })), -1);
  }, [bounce, y]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const skin = SKIN_TONES[style.skin] ?? SKIN_TONES[1];
  const hair = hairHex(style.hair_color);
  const g = useGradientIds();
  const ids: Ids = { silver: g('silver'), irisF: g('irisF'), irisM: g('irisM') };

  return (
    <Animated.View style={anim}>
      <Svg width={size} height={size * HERO_ASPECT} viewBox="0 0 200 440">
        <Defs>
          <LinearGradient id={ids.silver.id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#F2F4F8" />
            <Stop offset="0.5" stopColor="#C9CFDC" />
            <Stop offset="1" stopColor="#8E97AB" />
          </LinearGradient>
          <LinearGradient id={ids.irisF.id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0E2A3A" />
            <Stop offset="1" stopColor="#3FD2C4" />
          </LinearGradient>
          <LinearGradient id={ids.irisM.id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3A1E0E" />
            <Stop offset="1" stopColor="#F0B040" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={100} cy={424} rx={46} ry={6} fill="#1A1028" opacity={0.15} />
        {style.gender === 'female' ? <Aurora skin={skin} hair={hair} ids={ids} /> : <Kael skin={skin} hair={hair} ids={ids} />}
      </Svg>
    </Animated.View>
  );
}
