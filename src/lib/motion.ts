export const motionTiming = {
  fast: 0.12,
  base: 0.22,
  expressive: 0.36,
  silky: 0.48,
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
/** Butter smooth — mobile swipes, ultra-premium feel */
const easeButter = [0.25, 0.46, 0.45, 0.94] as const;
/** Elastic — playful bounce for rewards/achievements */
const easeElastic = [0.68, -0.55, 0.265, 1.55] as const;

export const easings = { easeOut, easeOvershoot, easeSpring, easeSettle, easeButter, easeElastic };

// ── Page & Tab Transitions ───────────────────────────────────
export const pageTransition = {
  initial: { opacity: 0, y: 8, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.998 },
  transition: { duration: 0.22, ease: easeOut },
};

export const fadeSlideUp = {
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.97 },
  transition: { duration: motionTiming.base, ease: easeOut },
};

// ── List & Stagger ──────────────────────────────────────────
export const listStagger = (index: number) => ({
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: {
    delay: Math.min(index * 0.04, 0.16),
    duration: 0.32,
    ease: easeOut,
  },
});

/** Stagger for timeline items with slight horizontal slide */
export const timelineStagger = (index: number) => ({
  initial: { opacity: 0, x: -14, y: 6 },
  animate: { opacity: 1, x: 0, y: 0 },
  transition: {
    delay: Math.min(index * 0.05 + 0.06, 0.2),
    duration: 0.34,
    ease: easeSettle,
  },
});

/** Mobile-first card entrance — slide up with a soft scale */
export const mobileCardEntrance = (index: number) => ({
  initial: { opacity: 0, y: 28, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: {
    delay: Math.min(index * 0.06, 0.24),
    duration: 0.4,
    ease: easeButter,
  },
});

/** Fluid slide from left — meal cards on mobile */
export const slideFromLeft = (index: number) => ({
  initial: { opacity: 0, x: -22, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  transition: {
    delay: Math.min(index * 0.05, 0.2),
    duration: 0.35,
    ease: easeSettle,
  },
});

// ── Micro-interaction Variants ──────────────────────────────
/** Checkbox / toggle reveal — scale bounce in */
export const checkBounce = {
  initial: { scale: 0.4, opacity: 0, rotate: -12 },
  animate: { scale: 1, opacity: 1, rotate: 0 },
  exit: { scale: 0.3, opacity: 0, rotate: 12 },
  transition: { duration: 0.28, ease: easeOvershoot },
};

/** Card lift on hover/focus */
export const cardLift = {
  rest: { y: 0, scale: 1 },
  hover: { y: -3, scale: 1.008 },
  tap: { y: 0, scale: 0.98 },
};

/** Tap haptic pulse — button scale ripple */
export const tapPulse = {
  whileTap: { scale: 0.95 },
  transition: { duration: 0.1, ease: easeSpring },
};

/** Mobile-optimized tap pulse — slightly smaller for touch precision */
export const mobileTap = {
  whileTap: { scale: 0.97 },
  transition: { type: 'spring' as const, stiffness: 500, damping: 30 },
};

/** Success burst — scale overshoot on save/complete */
export const successBurst = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.12, 0.95, 1.04, 1] },
  transition: { duration: 0.5, ease: easeSpring },
};

/** Exercise completion glow expand */
export const completionGlow = {
  initial: { opacity: 0, scale: 0.75 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.42, ease: easeOvershoot },
};

/** Slide-in from bottom sheet — smoother for mobile */
export const slideUpSheet = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: '100%' },
  transition: { type: 'spring' as const, stiffness: 280, damping: 30 },
};

/** Number counter roll — weight/stats change */
export const numberRoll = {
  initial: { opacity: 0, y: 14, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -14, filter: 'blur(4px)' },
  transition: { duration: 0.22, ease: easeOut },
};

/** Premium modal entrance — scale + blur reveal */
export const modalReveal = {
  initial: { opacity: 0, scale: 0.92, filter: 'blur(8px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.92, filter: 'blur(8px)' },
  transition: { duration: 0.3, ease: easeOvershoot },
};

/** Photo lightbox zoom-in animation */
export const lightboxZoom = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.85 },
  transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
};

/** Water cup fill — spring-based fluid animation */
export const waterFill = {
  transition: { type: 'spring' as const, stiffness: 80, damping: 12, mass: 0.8 },
};

/** Backdrop fade for modals */
export const backdropFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25, ease: easeButter },
};

/** Elastic pop for achievement/badge reveals */
export const elasticPop = {
  initial: { scale: 0.5, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring' as const, stiffness: 300, damping: 15, mass: 0.6 },
};

/** Smooth progress bar fill */
export const progressFill = (width: number) => ({
  initial: { width: 0 },
  animate: { width: `${width}%` },
  transition: { duration: 0.8, ease: easeOut, delay: 0.15 },
});
