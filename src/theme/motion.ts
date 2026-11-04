import { Easing } from 'react-native-reanimated';

// Shared motion: calm, barely-there springs. Raise damping before reaching for a lower one —
// low damping makes things wobble several times before they settle.

/** Settles with at most a tiny overshoot (swipe rows, list reflow). */
export const SPRING = { damping: 28, stiffness: 220 };

/** The little "pop" when something is completed: grows a touch and settles once. */
export const POP = { damping: 20, stiffness: 260 };
export const POP_SCALE = 1.1;

/** Sheets and toasts sliding in. */
export const SLIDE_MS = 280;
export const EASE_OUT = Easing.out(Easing.cubic);
