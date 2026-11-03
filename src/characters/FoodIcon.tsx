import Svg, { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import { Ball, darken, Drop, Glow, OUTLINE, useGradientIds } from './paint';

/** Shaded food and boost icons for the shop and the feeding sheet. */
export function FoodIcon({ id, size = 56 }: { id: string; size?: number }) {
  const g = useGradientIds();
  const a = g('a');
  const b = g('b');
  const c = g('c');
  const shadow = g('shadow');

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
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
            <Drop id={a.id} color="#7A4A2A" from={0.2} to={0.3} />
            <Drop id={b.id} color="#B67CFF" from={0.3} to={0.2} />
            <Drop id={c.id} color="#E7E7F2" from={0.6} to={0.1} />
          </>
        )}
        {id === 'cake' && (
          <>
            <Drop id={a.id} color="#FFD9A8" />
            <Drop id={b.id} color="#FF8CC4" from={0.3} to={0.15} />
            <Ball id={c.id} color="#FF4D5E" />
          </>
        )}
        {id === 'freeze' && <Ball id={a.id} color="#7CC6FF" />}
        <Glow id={shadow.id} color="#1A1028" opacity={0.3} />
      </Defs>

      <Ellipse cx="32" cy="58" rx="20" ry="4" fill={shadow.url} />

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
        <G transform="rotate(-12 32 34)">
          <Rect x="12" y="14" width="40" height="40" rx="4" fill={a.url} {...OUTLINE} />
          {[0, 1].map((col) =>
            [0, 1, 2].map((row) => (
              <Rect
                key={`${col}${row}`}
                x={16 + col * 17}
                y={18 + row * 11}
                width={15}
                height={9}
                rx={2}
                fill={darken('#7A4A2A', 0.15)}
                stroke="#FFFFFF"
                strokeOpacity={0.15}
              />
            )),
          )}
          {/* foil wrapper and a purple label with a star */}
          <Path d="M10 40 L54 40 L54 56 L10 56 Z" fill={c.url} {...OUTLINE} />
          <Path d="M10 34 L54 34 L54 44 L10 44 Z" fill={b.url} {...OUTLINE} />
          <Path d="M32 35.5 l1.6 3.2 3.5.5-2.5 2.5.6 3.5-3.2-1.7-3.2 1.7.6-3.5-2.5-2.5 3.5-.5z" fill="#FFC233" />
        </G>
      )}

      {id === 'cake' && (
        <G>
          <Path d="M10 30 L54 30 L54 52 Q32 57 10 52 Z" fill={a.url} {...OUTLINE} />
          <Path d="M10 40 L54 40" stroke={darken('#FF8CC4', 0.1)} strokeWidth={4} />
          <Path d="M8 30 Q8 20 32 20 Q56 20 56 30 Q52 36 46 31 Q40 37 34 31 Q28 37 22 31 Q16 37 8 30 Z" fill={b.url} {...OUTLINE} />
          <Rect x="30" y="8" width="4" height="13" rx="1.5" fill="#7C5CFF" />
          <Path d="M32 2 Q36 6 32 9 Q28 6 32 2 Z" fill="#FFC233" />
          <Circle cx="44" cy="22" r="4" fill={c.url} {...OUTLINE} />
          <Path d="M16 26 Q24 22 32 23" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" fill="none" />
        </G>
      )}

      {id === 'freeze' && (
        <G>
          <Path d="M32 6 L54 18 L54 44 L32 56 L10 44 L10 18 Z" fill={a.url} {...OUTLINE} />
          <Path d="M32 18 V44 M21 24 L43 38 M43 24 L21 38" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
          <Path d="M16 20 L30 12" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}
