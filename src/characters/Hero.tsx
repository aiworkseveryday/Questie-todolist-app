import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import { hairHex, SKIN_TONES, type HeroStyle } from '@/game/style';
import { Ball, darken, Drop, Glow, lighten, OUTLINE, useGradientIds } from './paint';

const INK = '#2A1F3D';

/** Colours for each outfit: main garment, trim/lining, pants, shoes and glow accents. */
const OUTFIT_COLORS: Record<string, { main: string; trim: string; pants: string; shoe: string; accent: string }> = {
  bomber: { main: '#4E7A55', trim: '#F08A3C', pants: '#2F3550', shoe: '#F2F2F5', accent: '#F08A3C' },
  hoodie: { main: '#7C5CFF', trim: '#B9A6FF', pants: '#33395A', shoe: '#FFFFFF', accent: '#FFC233' },
  tactical: { main: '#3A4656', trim: '#6B7A45', pants: '#2C333D', shoe: '#3B2E25', accent: '#FFC233' },
  street: { main: '#1F1B2E', trim: '#FF4FD8', pants: '#2A2540', shoe: '#FFFFFF', accent: '#3BE8FF' },
  ranger: { main: '#C9A26B', trim: '#7A4E2D', pants: '#5B4636', shoe: '#5A3B28', accent: '#E8572E' },
  armor: { main: '#E6EAF4', trim: '#8C97B0', pants: '#3A4258', shoe: '#E6EAF4', accent: '#3BD5FF' },
};

type Props = { style: HeroStyle; size?: number; bounce?: boolean };

function Eyes({ female, iris }: { female: boolean; iris: string }) {
  return (
    <G>
      {[50, 70].map((cx) => {
        const out = cx < 60 ? -1 : 1;
        return (
          <G key={cx}>
            {/* almond eye white */}
            <Path d={`M${cx - 5.5} 41 Q${cx} 35.5 ${cx + 5.5} 41 Q${cx} 45.5 ${cx - 5.5} 41 Z`} fill="#FFFFFF" />
            <Circle cx={cx} cy={40.8} r={3.4} fill={iris} />
            <Circle cx={cx} cy={40.8} r={1.6} fill="#0E0818" />
            <Circle cx={cx + 1.2} cy={39.6} r={1} fill="#FFFFFF" />
            {/* upper lid line, with a flick for lashes */}
            <Path
              d={female ? `M${cx - 6} 40.5 Q${cx} 34.5 ${cx + 6} 40 L${cx + 7.5 * out} 38` : `M${cx - 6} 40.5 Q${cx} 35 ${cx + 6} 40.5`}
              stroke={INK}
              strokeWidth={1.6}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        );
      })}
    </G>
  );
}

/** Hair drawn behind the head and body (long hair, tails, braids, hoods). */
function BackHair({ hair, fill }: { hair: string; fill: string }) {
  if (hair === 'long')
    return <Path d="M38 34 C36 12 84 12 82 34 L86 92 Q74 100 66 90 L60 70 L54 90 Q46 100 34 92 Z" fill={fill} {...OUTLINE} />;
  if (hair === 'ponytail')
    return (
      <G>
        <Path d="M76 26 Q96 30 92 60 Q90 82 82 96 Q80 74 80 58 Q80 40 72 32 Z" fill={fill} {...OUTLINE} />
      </G>
    );
  if (hair === 'braid')
    return (
      <G>
        {[48, 58, 68, 78, 88, 98].map((y, i) => (
          <Ellipse key={y} cx={76 + i * 1.2} cy={y} rx={6 - i * 0.4} ry={6} fill={fill} {...OUTLINE} />
        ))}
        <Circle cx={83} cy={105} r={2.5} fill="#FF5FB8" />
      </G>
    );
  return null;
}

/** Hair drawn over the head. */
function FrontHair({ hair, fill, shine }: { hair: string; fill: string; shine: string }) {
  const gloss = <Path d="M46 20 Q58 13 72 17" stroke={shine} strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" fill="none" />;
  switch (hair) {
    case 'undercut':
      return (
        <G>
          <Path d="M39 40 C38 26 44 20 50 18 L48 30 Q42 32 40 40 Z M81 40 C82 26 76 20 70 18 L72 30 Q78 32 80 40 Z" fill={fill} opacity={0.45} />
          <Path d="M42 30 C42 10 80 6 84 26 C76 20 66 21 58 26 C52 23 46 26 42 30 Z" fill={fill} {...OUTLINE} />
          {gloss}
        </G>
      );
    case 'spiky':
      return (
        <G>
          <Path
            d="M38 40 L35 25 L44 28 L41 15 L52 21 L55 8 L62 19 L71 10 L72 22 L83 17 L80 29 L85 33 L82 40 C78 30 70 26 60 27 C50 26 42 31 38 40 Z"
            fill={fill}
            {...OUTLINE}
          />
          {gloss}
        </G>
      );
    case 'long':
      return (
        <G>
          <Path d="M38 44 C33 10 87 10 82 44 C80 33 72 25 62 25 C57 31 47 33 40 33 Z" fill={fill} {...OUTLINE} />
          <Path d="M39 38 Q36 60 41 78 L46 76 Q42 60 44 40 Z M81 38 Q84 60 79 78 L74 76 Q78 60 76 40 Z" fill={fill} {...OUTLINE} />
          {gloss}
        </G>
      );
    case 'ponytail':
      return (
        <G>
          <Path d="M39 40 C36 12 84 12 81 40 C78 30 70 24 60 25 C50 24 42 30 39 40 Z" fill={fill} {...OUTLINE} />
          <Rect x="74" y="26" width="6" height="7" rx="2" fill="#FF5FB8" transform="rotate(25 77 29)" />
          {gloss}
        </G>
      );
    case 'buns':
      return (
        <G>
          <Circle cx="43" cy="20" r="9" fill={fill} {...OUTLINE} />
          <Circle cx="77" cy="20" r="9" fill={fill} {...OUTLINE} />
          <Path d="M39 40 C36 12 84 12 81 40 C77 31 70 27 62 30 C55 26 45 30 39 40 Z" fill={fill} {...OUTLINE} />
          {gloss}
        </G>
      );
    case 'mohawk':
      return (
        <G>
          <Path d="M40 38 C39 24 46 19 52 18 L52 28 Q44 30 41 38 Z M80 38 C81 24 74 19 68 18 L68 28 Q76 30 79 38 Z" fill={fill} opacity={0.4} />
          <Path d="M53 30 L50 6 L57 11 L60 2 L64 11 L71 6 L67 30 Q60 27 53 30 Z" fill={fill} {...OUTLINE} />
        </G>
      );
    case 'braid':
      return (
        <G>
          <Path d="M38 42 C34 12 86 12 82 40 C78 32 72 28 66 30 C58 24 46 28 38 42 Z" fill={fill} {...OUTLINE} />
          {gloss}
        </G>
      );
    default: // crop
      return (
        <G>
          <Path d="M39 40 C37 12 83 12 81 40 C79 31 71 26 60 26.5 C49 26 41 31 39 40 Z" fill={fill} {...OUTLINE} />
          <Path d="M48 27 L46 33 M58 26 L57 32 M68 27 L70 33" stroke={darken(fill, 0.2)} strokeWidth={1.5} strokeLinecap="round" />
          {gloss}
        </G>
      );
  }
}

/**
 * Original battle-royale style hero: athletic proportions, layered outfits and gear.
 * Hairstyle, hair colour, skin tone and outfit all mix and match.
 */
export function Hero({ style, size = 120, bounce = true }: Props) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (!bounce) return;
    y.value = withRepeat(withSequence(withTiming(-3, { duration: 1100 }), withTiming(0, { duration: 1100 })), -1);
  }, [bounce, y]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const female = style.gender === 'female';
  const skin = SKIN_TONES[style.skin] ?? SKIN_TONES[1];
  const hair = hairHex(style.hair_color);
  const o = OUTFIT_COLORS[style.outfit] ?? OUTFIT_COLORS.bomber;
  const outfit = style.outfit;
  const g = useGradientIds();
  const ids = {
    skin: g('skin'),
    limb: g('limb'),
    hair: g('hair'),
    main: g('main'),
    trim: g('trim'),
    pants: g('pants'),
    shoe: g('shoe'),
    glow: g('glow'),
    shadow: g('shadow'),
    blush: g('blush'),
  };
  // Narrower shoulders and a waist for female builds
  const torso = female
    ? 'M42 66 Q60 61 78 66 L80 82 Q76 92 78 104 L82 118 Q60 124 38 118 L42 104 Q44 92 40 82 Z'
    : 'M37 67 Q60 60 83 67 L85 90 L84 118 Q60 124 36 118 L35 90 Z';
  const shoulder = female ? 41 : 36;
  const iris = darken(hair === '#D5DAE6' ? '#7A55E8' : hair, 0.1);
  const gloves = outfit === 'tactical' || outfit === 'street';

  return (
    <Animated.View style={anim}>
      <Svg width={size} height={size * (200 / 120)} viewBox="0 0 120 200">
        <Defs>
          <Ball id={ids.skin.id} color={skin} />
          <Drop id={ids.limb.id} color={skin} from={0.1} to={0.15} />
          <Drop id={ids.hair.id} color={hair} from={0.3} to={0.35} />
          <Ball id={ids.main.id} color={o.main} />
          <Drop id={ids.trim.id} color={o.trim} from={0.25} to={0.25} />
          <Drop id={ids.pants.id} color={o.pants} from={0.15} to={0.3} />
          <Drop id={ids.shoe.id} color={o.shoe} from={0.2} to={0.25} />
          <Glow id={ids.glow.id} color={o.accent} opacity={0.9} />
          <Glow id={ids.shadow.id} color="#1A1028" opacity={0.35} />
          <Glow id={ids.blush.id} color="#FF6FA8" opacity={0.4} />
        </Defs>

        <Ellipse cx="60" cy="194" rx="34" ry="5" fill={ids.shadow.url} />

        {/* behind the body: long hair, hood, ranger coat tails */}
        <BackHair hair={style.hair} fill={ids.hair.url} />
        {outfit === 'hoodie' && <Path d="M40 62 Q36 46 46 44 L74 44 Q84 46 80 62 Z" fill={darken(o.main, 0.2)} {...OUTLINE} />}
        {outfit === 'ranger' && <Path d="M38 100 L32 156 L50 150 L60 120 L70 150 L88 156 L82 100 Z" fill={ids.main.url} {...OUTLINE} />}

        {/* legs and shoes, slight heroic stance */}
        <Path d="M44 114 L58 114 L57 178 L45 178 Q42 146 44 114 Z" fill={ids.pants.url} {...OUTLINE} />
        <Path d="M62 114 L76 114 Q78 146 75 178 L63 178 Z" fill={ids.pants.url} {...OUTLINE} />
        {(outfit === 'tactical' || outfit === 'ranger') && (
          <G>
            <Rect x="44" y="140" width="10" height="9" rx="2" fill={darken(o.pants, 0.25)} />
            <Rect x="66" y="140" width="10" height="9" rx="2" fill={darken(o.pants, 0.25)} />
          </G>
        )}
        {outfit === 'street' && <Path d="M47 120 L46 176 M73 120 L74 176" stroke={o.trim} strokeWidth={1.6} />}
        <Path d="M41 177 Q41 172 47 172 L58 172 L59 186 L38 186 Q37 179 41 177 Z" fill={ids.shoe.url} {...OUTLINE} />
        <Path d="M62 172 L73 172 Q79 172 79 177 Q83 179 82 186 L61 186 Z" fill={ids.shoe.url} {...OUTLINE} />
        <Path d="M38 183 H59 M61 183 H82" stroke={darken(o.shoe, 0.35)} strokeWidth={2.5} />
        <Path d="M45 177 L53 176 M67 176 L75 177" stroke={o.accent} strokeWidth={2} strokeLinecap="round" />

        {/* neck */}
        <Rect x="54" y="54" width="12" height="14" rx="4" fill={darken(skin, 0.12)} />

        {/* arms: sleeve plus hand */}
        <Path
          d={`M${shoulder} 68 Q${shoulder - 9} 70 ${shoulder - 10} 86 L${shoulder - 9} 122 L${shoulder} 122 L${shoulder + 3} 86 Z`}
          fill={ids.main.url}
          {...OUTLINE}
        />
        <Path
          d={`M${120 - shoulder} 68 Q${129 - shoulder} 70 ${130 - shoulder} 86 L${129 - shoulder} 122 L${120 - shoulder} 122 L${117 - shoulder} 86 Z`}
          fill={ids.main.url}
          {...OUTLINE}
        />
        <Rect x={shoulder - 10} y="117" width="11" height="6" rx="2" fill={ids.trim.url} />
        <Rect x={119 - shoulder} y="117" width="11" height="6" rx="2" fill={ids.trim.url} />
        <Circle cx={shoulder - 4.5} cy="128" r="6" fill={gloves ? '#2A2533' : ids.skin.url} {...OUTLINE} />
        <Circle cx={124.5 - shoulder} cy="128" r="6" fill={gloves ? '#2A2533' : ids.skin.url} {...OUTLINE} />
        {outfit === 'street' && (
          <G>
            <Path d={`M${shoulder - 7} 80 L${shoulder - 7} 116 M${127 - shoulder} 80 L${127 - shoulder} 116`} stroke={o.trim} strokeWidth={2} />
            <Rect x={121 - shoulder} y="108" width="8" height="5" rx="1.5" fill={o.accent} />
          </G>
        )}

        {/* torso */}
        <Path d={torso} fill={ids.main.url} {...OUTLINE} />

        {outfit === 'bomber' && (
          <G>
            {/* open jacket over a tee, ribbed collar and hem, orange lining */}
            <Path d="M52 66 L60 74 L68 66 L66 118 L54 118 Z" fill="#EDEFF5" {...OUTLINE} />
            <Path d="M52 66 L54 118 M68 66 L66 118" stroke={o.trim} strokeWidth={2.5} />
            <Path d="M48 64 Q60 70 72 64 L70 70 Q60 75 50 70 Z" fill={ids.trim.url} {...OUTLINE} />
            <Rect x="36" y="112" width="48" height="7" rx="2" fill={darken(o.main, 0.25)} />
            <Rect x={female ? 69 : 71} y="78" width="8" height="8" rx="1.5" fill={o.trim} />
            {/* headphones resting on the neck */}
            <Path d="M46 62 Q60 74 74 62" stroke="#2A2533" strokeWidth={3} fill="none" />
            <Ellipse cx="45" cy="62" rx="4" ry="5.5" fill="#2A2533" />
            <Ellipse cx="75" cy="62" rx="4" ry="5.5" fill="#2A2533" />
            <Ellipse cx="75" cy="61" rx="1.6" ry="2.5" fill={o.trim} />
          </G>
        )}
        {outfit === 'hoodie' && (
          <G>
            <Path d="M48 64 Q60 76 72 64" stroke={darken(o.main, 0.35)} strokeWidth={2} fill="none" />
            <Path d="M56 70 L55 84 M64 70 L65 84" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />
            <Path d="M46 98 L74 98 L78 114 L42 114 Z" fill={darken(o.main, 0.15)} {...OUTLINE} />
            <Path d="M52 82 l2 4 4.4.6-3.2 3.1.8 4.4-4-2.1-4 2.1.8-4.4-3.2-3.1 4.4-.6z" fill={o.accent} />
          </G>
        )}
        {outfit === 'tactical' && (
          <G>
            {/* plate-carrier vest with pouches and straps */}
            <Path d={female ? 'M44 68 L76 68 L78 108 L42 108 Z' : 'M41 68 L79 68 L81 108 L39 108 Z'} fill={ids.trim.url} {...OUTLINE} />
            <Path d="M48 66 L48 72 M72 66 L72 72" stroke={darken(o.trim, 0.3)} strokeWidth={4} />
            {[44, 56, 66].map((x) => (
              <Rect key={x} x={x} y="92" width="10" height="13" rx="2" fill={darken(o.trim, 0.2)} {...OUTLINE} />
            ))}
            <Rect x="52" y="76" width="16" height="7" rx="1.5" fill={darken(o.trim, 0.3)} />
            <Rect x="36" y="111" width="48" height="6" rx="2" fill="#2A2533" />
          </G>
        )}
        {outfit === 'street' && (
          <G>
            {/* cropped jacket with neon piping and a glowing belt */}
            <Path d="M54 66 L60 72 L66 66 L66 104 L54 104 Z" fill="#2E2A40" />
            <Path d="M54 66 L54 104 M66 66 L66 104 M40 102 H80" stroke={o.trim} strokeWidth={2} />
            <Rect x="38" y="108" width="44" height="5" rx="2.5" fill={o.accent} />
            <Ellipse cx="60" cy="110.5" rx="26" ry="7" fill={ids.glow.url} opacity={0.5} />
            <Path d="M70 76 L76 76 L73 84 L78 84 L69 96 L72 86 L67 86 Z" fill={o.accent} />
          </G>
        )}
        {outfit === 'ranger' && (
          <G>
            <Path d="M54 66 L60 80 L66 66 L64 112 L56 112 Z" fill="#EADBC1" {...OUTLINE} />
            <Path d="M40 104 H80" stroke={o.trim} strokeWidth={6} />
            <Rect x="56" y="101" width="8" height="6" rx="1.5" fill="#FFC233" />
            {/* scarf with a trailing end */}
            <Path d="M44 62 Q60 74 76 62 L76 70 Q60 80 44 70 Z" fill={o.accent} {...OUTLINE} />
            <Path d="M70 70 L76 92 L82 90 L76 68 Z" fill={darken(o.accent, 0.15)} {...OUTLINE} />
          </G>
        )}
        {outfit === 'armor' && (
          <G>
            {/* chest plate with a glowing core and shoulder pads */}
            <Path d="M44 70 L76 70 L74 96 L60 104 L46 96 Z" fill={lighten(o.main, 0.4)} {...OUTLINE} />
            <Path d="M48 74 L60 92 L72 74" stroke={o.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <Circle cx="60" cy="84" r="5" fill={ids.glow.url} />
            <Circle cx="60" cy="84" r="2.5" fill="#FFFFFF" />
            <Ellipse cx={shoulder - 1} cy="70" rx="10" ry="7" fill={ids.main.url} {...OUTLINE} />
            <Ellipse cx={121 - shoulder} cy="70" rx="10" ry="7" fill={ids.main.url} {...OUTLINE} />
            <Path d={`M${shoulder - 8} 70 H${shoulder + 6} M${114 - shoulder} 70 H${128 - shoulder}`} stroke={o.accent} strokeWidth={1.6} />
            <Rect x="36" y="110" width="48" height="6" rx="3" fill={o.trim} />
            <Rect x="54" y="109" width="12" height="8" rx="2" fill={o.accent} />
          </G>
        )}

        {/* head */}
        <Ellipse cx="39" cy="42" rx="4" ry="6" fill={ids.skin.url} {...OUTLINE} />
        <Ellipse cx="81" cy="42" rx="4" ry="6" fill={ids.skin.url} {...OUTLINE} />
        <Path d="M40 36 C40 16 80 16 80 36 C80 50 72 60 60 61 C48 60 40 50 40 36 Z" fill={ids.skin.url} {...OUTLINE} />

        <FrontHair hair={style.hair} fill={ids.hair.url} shine={lighten(hair, 0.6)} />

        {/* face: brows, eyes, nose, a confident smile */}
        <Path
          d={female ? 'M45 33 Q50 30.5 55 32.5 M65 32.5 Q70 30.5 75 33' : 'M44.5 33.5 L55 31.5 M65 31.5 L75.5 33.5'}
          stroke={darken(hair, 0.35)}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        />
        <Eyes female={female} iris={iris} />
        <Path d="M60 44 L59 49 L61 49.5" stroke={darken(skin, 0.3)} strokeWidth={1.2} strokeLinecap="round" fill="none" />
        <Ellipse cx="47" cy="49" rx="4.5" ry="2.5" fill={ids.blush.url} />
        <Ellipse cx="73" cy="49" rx="4.5" ry="2.5" fill={ids.blush.url} />
        <Path d="M54 53 Q60 57.5 66 52.5" stroke="#7A2E3E" strokeWidth={1.8} strokeLinecap="round" fill="none" />

        {/* gear worn on the head */}
        {outfit === 'tactical' && (
          <G>
            <Path d="M40 27 Q60 20 80 27" stroke="#2A2533" strokeWidth={3.5} fill="none" />
            <Rect x="44" y="21" width="14" height="9" rx="4.5" fill="#2A2533" />
            <Rect x="62" y="21" width="14" height="9" rx="4.5" fill="#2A2533" />
            <Rect x="46" y="22.5" width="10" height="6" rx="3" fill="#FFB347" opacity={0.9} />
            <Rect x="64" y="22.5" width="10" height="6" rx="3" fill="#FFB347" opacity={0.9} />
          </G>
        )}
        {outfit === 'armor' && (
          <G>
            <Path d="M80 30 Q86 40 82 50" stroke="#3A4258" strokeWidth={3} fill="none" />
            <Rect x="79" y="36" width="7" height="12" rx="3" fill={o.main} {...OUTLINE} />
            <Path d="M82 48 Q76 56 66 56" stroke="#3A4258" strokeWidth={1.6} fill="none" />
            <Circle cx="66" cy="56" r="1.8" fill={o.accent} />
          </G>
        )}
        {outfit === 'ranger' && (
          <G>
            <Path d="M46 66 Q60 72 74 66" stroke="#4A3626" strokeWidth={2.5} fill="none" />
            <Circle cx="53" cy="68" r="4" fill="#8FD0E8" stroke="#4A3626" strokeWidth={1.5} />
            <Circle cx="67" cy="68" r="4" fill="#8FD0E8" stroke="#4A3626" strokeWidth={1.5} />
          </G>
        )}

        {/* rim light */}
        <Path d="M78 30 Q81 42 76 52" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={2} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}
