import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type TabIconName = 'today' | 'hero' | 'shop' | 'settings';

type Props = { name: TabIconName; color: string; focused: boolean; size?: number };

/**
 * Hand-drawn SVG tab icons. Focused = solid shape in the tab's colour with white details;
 * unfocused = outline only. SVG needs no icon font, so it always renders.
 */
export function TabIcon({ name, color, focused, size = 26 }: Props) {
  const stroke = focused ? 'none' : color;
  const fill = focused ? color : 'none';
  const detail = focused ? '#FFFFFF' : color;
  const sw = 2.2;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'today' && (
        <>
          <Rect x="3.5" y="4.5" width="17" height="16" rx="3.5" fill={fill} stroke={stroke} strokeWidth={sw} />
          <Path d="M8 3 V6.5 M16 3 V6.5" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M8.2 13.4 L10.8 16 L15.8 11" stroke={detail} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}

      {name === 'hero' && (
        <>
          <Path
            d="M12 2.8 L19.5 5.6 V11.4 C19.5 16 16.4 19.6 12 21.2 C7.6 19.6 4.5 16 4.5 11.4 V5.6 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path d="M12 7.5 L13.4 10.4 L16.5 10.8 L14.2 13 L14.8 16 L12 14.5 L9.2 16 L9.8 13 L7.5 10.8 L10.6 10.4 Z" fill={detail} />
        </>
      )}

      {name === 'shop' && (
        <>
          <Path
            d="M4.5 8.5 H19.5 L18.4 19.2 A2 2 0 0 1 16.4 21 H7.6 A2 2 0 0 1 5.6 19.2 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path d="M8.5 8.5 V7 A3.5 3.5 0 0 1 15.5 7 V8.5" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
          <Path d="M9 13 Q12 16 15 13" stroke={detail} strokeWidth={sw} strokeLinecap="round" fill="none" />
        </>
      )}

      {name === 'settings' && (
        <>
          <Path
            d="M12 2.8 L14 4.8 H17.2 A2 2 0 0 1 19.2 6.8 V10 L21.2 12 L19.2 14 V17.2 A2 2 0 0 1 17.2 19.2 H14 L12 21.2 L10 19.2 H6.8 A2 2 0 0 1 4.8 17.2 V14 L2.8 12 L4.8 10 V6.8 A2 2 0 0 1 6.8 4.8 H10 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="12" r="3.2" fill={focused ? '#FFFFFF' : 'none'} stroke={detail} strokeWidth={focused ? 0 : sw} />
        </>
      )}
    </Svg>
  );
}
