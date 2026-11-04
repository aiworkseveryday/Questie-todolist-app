import Svg, { Circle, Defs, Ellipse, G, Mask, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Ball, darken, Drop, Glow, OUTLINE, useGradientIds } from './paint';

/**
 * Bite marks, one cluster per bite: each is a few overlapping circles, so the edge left behind is
 * scalloped like real teeth marks. Later bites eat into the middle until only a nub is left.
 */
const BITES = [
  [
    [50, 15, 9],
    [57, 25, 7.5],
    [42, 9, 7],
  ],
  [
    [58, 40, 9.5],
    [51, 48, 7.5],
    [60, 31, 7.5],
  ],
  [
    [10, 18, 9.5],
    [17, 10, 7.5],
    [6, 30, 8.5],
  ],
  [
    [32, 16, 14],
    [20, 30, 10],
    [44, 30, 10],
    [32, 30, 9],
  ],
];
export const BITE_COUNT = BITES.length;

/** Colour of the crumbs each food drops while being eaten. */
export const CRUMB_COLOR: Record<string, string> = {
  kibble: '#C98A4A',
  apple: '#FFE7A8',
  choco: '#8A5230',
  cake: '#F6D49A',
  fish: '#F4C6B0',
  carrot: '#FF8A1F',
  meat: '#C8553D',
};

/** Shaded food and boost icons for the shop and the feeding sheet. With `bites`, chunks are bitten out of it. */
export function FoodIcon({ id, size = 56, bites = 0 }: { id: string; size?: number; bites?: number }) {
  const g = useGradientIds();
  const a = g('a');
  const b = g('b');
  const c = g('c');
  const shadow = g('shadow');
  const bitten = g('bitten');

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        {bites > 0 && (
          <Mask id={bitten.id} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
            <Rect x="0" y="0" width="64" height="64" fill="#FFFFFF" />
            {BITES.slice(0, bites)
              .flat()
              .map(([cx, cy, r]) => (
                <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#000000" />
              ))}
          </Mask>
        )}
        {id === 'kibble' && (
          <>
            <Drop id={a.id} color="#3BA7FF" />
            <Ball id={b.id} color="#C98A4A" />
          </>
        )}
        {id === 'apple' && (
          <>
            <Ball id={a.id} color="#FF4D5E" />
            <Drop id={b.id} color="#3FBF6A" />
          </>
        )}
        {id === 'choco' && (
          <>
            <Drop id={a.id} color="#8A5230" from={0.3} to={0.3} />
            <Drop id={b.id} color="#E3141F" from={0.3} to={0.25} />
            <Drop id={c.id} color="#E7E7F2" from={0.6} to={0.1} />
          </>
        )}
        {id === 'cake' && (
          <>
            <Drop id={a.id} color="#F6D49A" />
            <Drop id={b.id} color="#E39A3B" from={0.35} to={0.2} />
            <Ball id={c.id} color="#C8742A" />
          </>
        )}
        {id === 'fish' && (
          <>
            <Drop id={a.id} color="#6FB7E8" from={0.4} to={0.3} />
            <Drop id={b.id} color="#3B86C4" />
          </>
        )}
        {id === 'carrot' && (
          <>
            <Drop id={a.id} color="#FF8A1F" from={0.35} to={0.3} />
            <Drop id={b.id} color="#3FBF6A" />
          </>
        )}
        {id === 'meat' && (
          <>
            <Ball id={a.id} color="#C8553D" />
            <Drop id={b.id} color="#F4EBDC" from={0.5} to={0.2} />
          </>
        )}
        {id === 'freeze' && <Ball id={a.id} color="#7CC6FF" />}
        <Glow id={shadow.id} color="#1A1028" opacity={0.3} />
      </Defs>

      <Ellipse cx="32" cy="58" rx="20" ry="4" fill={shadow.url} />
      <G mask={bites > 0 ? bitten.url : undefined}>

      {id === 'kibble' && (
        <G>
          <Circle cx="24" cy="34" r="6" fill={b.url} {...OUTLINE} />
          <Circle cx="34" cy="31" r="6" fill={b.url} {...OUTLINE} />
          <Circle cx="42" cy="36" r="5.5" fill={b.url} {...OUTLINE} />
          <Circle cx="30" cy="38" r="5.5" fill={b.url} {...OUTLINE} />
          <Path d="M8 38 H56 L50 54 Q32 59 14 54 Z" fill={a.url} {...OUTLINE} />
          <Ellipse cx="32" cy="38" rx="24" ry="3.5" fill={darken('#3BA7FF', 0.2)} {...OUTLINE} />
          <Path d="M14 44 Q32 49 50 44" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={2.5} strokeLinecap="round" fill="none" />
        </G>
      )}

      {id === 'apple' && (
        <G>
          <Path d="M32 18 Q33 10 38 6" stroke="#6B4430" strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M34 14 Q44 6 50 12 Q42 18 34 14 Z" fill={b.url} {...OUTLINE} />
          <Path d="M32 18 C20 10 6 20 10 36 C13 50 24 58 32 52 C40 58 51 50 54 36 C58 20 44 10 32 18 Z" fill={a.url} {...OUTLINE} />
          <Ellipse cx="21" cy="27" rx="4" ry="6" fill="#FFFFFF" opacity={0.45} transform="rotate(-25 21 27)" />
        </G>
      )}

      {id === 'choco' && (
        <G transform="rotate(-14 32 34)">
          {/* four wafer fingers poking out of a torn red wrapper */}
          {[0, 1, 2, 3].map((i) => (
            <G key={i}>
              <Rect x={12 + i * 10.5} y={8} width={9} height={30} rx={2.5} fill={a.url} {...OUTLINE} />
              <Rect x={13.5 + i * 10.5} y={10} width={2.2} height={24} rx={1} fill="#FFFFFF" opacity={0.25} />
            </G>
          ))}
          <Path d="M8 30 L12 26 L16 31 L21 25 L26 31 L31 26 L36 31 L41 25 L46 31 L51 26 L56 30 L56 58 L8 58 Z" fill={c.url} {...OUTLINE} />
          <Path d="M8 34 L12 30 L16 35 L21 29 L26 35 L31 30 L36 35 L41 29 L46 35 L51 30 L56 34 L56 58 L8 58 Z" fill={b.url} {...OUTLINE} />
          <Ellipse cx="32" cy="46" rx="15" ry="7.5" fill="#FFFFFF" />
          <SvgText x="32" y="49.5" fontSize="9.5" fontWeight="bold" fill="#E3141F" textAnchor="middle">
            KitKat
          </SvgText>
        </G>
      )}

      {id === 'cake' && (
        <G>
          {/* golden sponge, butterscotch cream, caramel drips and crunchy toffee bits */}
          <Path d="M10 30 L54 30 L54 52 Q32 57 10 52 Z" fill={a.url} {...OUTLINE} />
          <Path d="M10 41 L54 41" stroke="#E39A3B" strokeWidth={4} />
          <Path d="M8 30 Q8 20 32 20 Q56 20 56 30 Q53 38 49 31 Q46 40 41 31 Q37 36 33 31 Q29 39 24 31 Q20 36 16 31 Q12 37 8 30 Z" fill={b.url} {...OUTLINE} />
          <Path d="M16 25 Q24 21 32 22" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" fill="none" />
          {[
            [22, 18, -20],
            [32, 15, 10],
            [42, 18, 35],
            [28, 22, 60],
            [38, 22, -40],
          ].map(([x, y, r]) => (
            <Rect key={`${x}${y}`} x={x - 3} y={y - 3} width={6} height={6} rx={1.5} fill={c.url} transform={`rotate(${r} ${x} ${y})`} {...OUTLINE} />
          ))}
          <Circle cx="32" cy="9" r="4.5" fill="#E39A3B" {...OUTLINE} />
          <Path d="M32 5 Q35 1 38 3" stroke="#6B4430" strokeWidth={1.6} strokeLinecap="round" fill="none" />
        </G>
      )}

      {id === 'fish' && (
        <G transform="rotate(-10 32 34)">
          <Path d="M46 34 L60 22 Q58 34 60 46 Z" fill={b.url} {...OUTLINE} />
          <Path d="M6 34 Q18 16 36 18 Q48 22 50 34 Q48 46 36 50 Q18 52 6 34 Z" fill={a.url} {...OUTLINE} />
          <Path d="M24 22 Q30 16 38 20" stroke={darken('#3B86C4', 0.1)} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Path d="M28 26 Q32 34 28 42 M36 25 Q40 34 36 43" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.6} fill="none" />
          <Circle cx="16" cy="31" r="3.4" fill="#FFFFFF" {...OUTLINE} />
          <Circle cx="16.6" cy="31.4" r="1.8" fill="#1A1028" />
          <Path d="M8 37 Q11 38 13 36" stroke="#1A1028" strokeOpacity={0.5} strokeWidth={1.2} fill="none" />
        </G>
      )}

      {id === 'carrot' && (
        <G transform="rotate(30 32 32)">
          <Path d="M32 14 Q22 4 20 10 Q26 12 30 16 Z M32 14 Q32 2 37 4 Q35 10 34 16 Z M32 14 Q42 6 44 12 Q38 14 34 17 Z" fill={b.url} {...OUTLINE} />
          <Path d="M22 18 Q32 12 42 18 Q40 40 32 60 Q24 40 22 18 Z" fill={a.url} {...OUTLINE} />
          <Path d="M25 26 L29 27 M36 32 L39 31 M27 38 L31 39 M34 46 L36 45" stroke={darken('#FF8A1F', 0.3)} strokeWidth={1.4} strokeLinecap="round" />
          <Path d="M27 21 Q26 32 29 42" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={2.2} strokeLinecap="round" fill="none" />
        </G>
      )}

      {id === 'meat' && (
        <G transform="rotate(-25 32 34)">
          {/* a cartoon drumstick on the bone */}
          <Path d="M36 34 L52 22" stroke={b.url} strokeWidth={7} strokeLinecap="round" />
          <Circle cx="53" cy="17" r="4.5" fill={b.url} {...OUTLINE} />
          <Circle cx="57" cy="22" r="4.5" fill={b.url} {...OUTLINE} />
          <Path d="M10 38 Q8 20 24 18 Q38 18 40 32 Q40 46 26 50 Q12 52 10 38 Z" fill={a.url} {...OUTLINE} />
          <Ellipse cx="20" cy="27" rx="6" ry="3.5" fill="#FFFFFF" opacity={0.3} transform="rotate(-20 20 27)" />
          <Path d="M18 40 Q24 44 32 40" stroke={darken('#C8553D', 0.3)} strokeWidth={1.4} strokeLinecap="round" fill="none" />
        </G>
      )}

      {id === 'freeze' && (
        <G>
          <Path d="M32 6 L54 18 L54 44 L32 56 L10 44 L10 18 Z" fill={a.url} {...OUTLINE} />
          <Path d="M32 18 V44 M21 24 L43 38 M43 24 L21 38" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
          <Path d="M16 20 L30 12" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" />
        </G>
      )}
      </G>
    </Svg>
  );
}
