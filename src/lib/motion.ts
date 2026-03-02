export const motionTiming = {
  fast: 0.12,
  base: 0.22,
  expressive: 0.36,
};

const easeOut = [0.22, 1, 0.36, 1] as const;

export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: motionTiming.base, ease: easeOut },
};

export const fadeSlideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: { duration: motionTiming.base, ease: easeOut },
};

export const listStagger = (index: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: index * 0.06, duration: motionTiming.base, ease: easeOut },
});
