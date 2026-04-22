export const motionTiming = {
  fast: 0.12,
  base: 0.22,
  expressive: 0.36,
};

// ── Premium Easing Curves ────────────────────────────────────
/** Smooth deceleration — page reveals, cards */
const easeOut = [0.22, 1, 0.36, 1] as const;
/** Slight overshoot — interactive elements, chips, toggles */
const easeOvershoot = [0.34, 1.2, 0.64, 1] as const;
/** Spring-like feel — buttons, scale micro-interactions */
const easeSpring = [0.2, 0.9, 0.4, 1.1] as const;
/** Crisp settle — sidebar/sheet slides */
const easeSettle = [0.16, 1, 0.3, 1] as const;

export const easings = { easeOut, easeOvershoot, easeSpring, easeSettle };

// ── Page & Tab Transitions ───────────────────────────────────
export const pageTransition = {
  initial: { opacity: 0, y: 8, scale: 0.992 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.996 },
  transition: { duration: 0.26, ease: easeSettle },
};

export const fadeSlideUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: motionTiming.base, ease: easeOut },
};

// ── List & Stagger ──────────────────────────────────────────
export const listStagger = (index: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: {
    delay: Math.min(index * 0.035, 0.12),
    duration: 0.26,
    ease: easeOut,
  },
});

/** Stagger for timeline items with slight horizontal slide */
export const timelineStagger = (index: number) => ({
  initial: { opacity: 0, x: -12, y: 4 },
  animate: { opacity: 1, x: 0, y: 0 },
  transition: {
    delay: Math.min(index * 0.05 + 0.06, 0.18),
    duration: 0.3,
    ease: easeSettle,
  },
});

// ── Micro-interaction Variants ──────────────────────────────
/** Checkbox / toggle reveal — scale bounce in */
export const checkBounce = {
  initial: { scale: 0.5, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.4, opacity: 0 },
  transition: { duration: 0.22, ease: easeOvershoot },
};

/** Card lift on hover/focus */
export const cardLift = {
  rest: { y: 0, scale: 1 },
  hover: { y: -3, scale: 1.008 },
  tap: { y: 0, scale: 0.98 },
};

/** Tap haptic pulse — button scale ripple */
export const tapPulse = {
  whileTap: { scale: 0.96 },
  transition: { duration: 0.14, ease: easeSpring },
};

/** Success burst — scale overshoot on save/complete */
export const successBurst = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.08, 0.97, 1.02, 1] },
  transition: { duration: 0.45, ease: easeSpring },
};

/** Exercise completion glow expand */
export const completionGlow = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.38, ease: easeOvershoot },
};

/** Slide-in from bottom sheet */
export const slideUpSheet = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: '100%' },
  transition: { duration: 0.32, ease: easeSettle },
};

/** Number counter roll — weight/stats change */
export const numberRoll = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.18, ease: easeOut },
};
