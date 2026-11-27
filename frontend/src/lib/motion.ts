import type { Transition, Variants } from "framer-motion";

export const pageTransitionConfig: Transition = {
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1],
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: pageTransitionConfig },
  exit: { opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};

export const listStagger: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};
