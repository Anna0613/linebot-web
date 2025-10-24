/**
 * 動畫工具函數和常量
 * 提供統一的動畫配置和輔助函數
 */

import { Variants } from 'framer-motion';

/**
 * 標準緩動函數
 */
export const easings = {
  // 標準緩動 - 適用於大多數情況
  standard: [0.4, 0, 0.2, 1] as const,
  // 進入緩動 - 元素進入畫面
  enter: [0, 0, 0.2, 1] as const,
  // 退出緩動 - 元素離開畫面
  exit: [0.4, 0, 1, 1] as const,
  // 彈性緩動 - 有輕微彈跳效果
  spring: [0.34, 1.56, 0.64, 1] as const,
};

/**
 * 標準動畫持續時間（秒）
 */
export const durations = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
  slower: 0.5,
};

/**
 * 淡入動畫變體
 */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easings.standard,
    },
  },
};

/**
 * 淡入並向上移動的動畫變體
 */
export const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.standard,
    },
  },
};

/**
 * 淡入並向下移動的動畫變體
 */
export const fadeInDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.standard,
    },
  },
};

/**
 * 縮放淡入動畫變體
 */
export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.standard,
    },
  },
};

/**
 * 從左側滑入的動畫變體
 */
export const slideInLeftVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: durations.normal,
      ease: easings.standard,
    },
  },
};

/**
 * 從右側滑入的動畫變體
 */
export const slideInRightVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: durations.normal,
      ease: easings.standard,
    },
  },
};

/**
 * 列表項目交錯動畫的容器變體
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

/**
 * 列表項目交錯動畫的項目變體
 */
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.standard,
    },
  },
};

/**
 * 頁面過渡動畫變體
 */
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.standard,
    },
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: {
      duration: durations.fast,
      ease: easings.exit,
    },
  },
};

/**
 * 模態視窗動畫變體
 */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.enter,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: {
      duration: durations.fast,
      ease: easings.exit,
    },
  },
};

/**
 * 抽屜/側邊欄動畫變體
 */
export const drawerVariants = {
  left: {
    hidden: { x: '-100%' },
    visible: { 
      x: 0,
      transition: {
        duration: durations.normal,
        ease: easings.standard,
      },
    },
    exit: { 
      x: '-100%',
      transition: {
        duration: durations.normal,
        ease: easings.exit,
      },
    },
  },
  right: {
    hidden: { x: '100%' },
    visible: { 
      x: 0,
      transition: {
        duration: durations.normal,
        ease: easings.standard,
      },
    },
    exit: { 
      x: '100%',
      transition: {
        duration: durations.normal,
        ease: easings.exit,
      },
    },
  },
  top: {
    hidden: { y: '-100%' },
    visible: { 
      y: 0,
      transition: {
        duration: durations.normal,
        ease: easings.standard,
      },
    },
    exit: { 
      y: '-100%',
      transition: {
        duration: durations.normal,
        ease: easings.exit,
      },
    },
  },
  bottom: {
    hidden: { y: '100%' },
    visible: { 
      y: 0,
      transition: {
        duration: durations.normal,
        ease: easings.standard,
      },
    },
    exit: { 
      y: '100%',
      transition: {
        duration: durations.normal,
        ease: easings.exit,
      },
    },
  },
};

/**
 * 創建自定義交錯動畫配置
 */
export const createStaggerConfig = (
  staggerDelay: number = 0.05,
  delayChildren: number = 0
) => ({
  staggerChildren: staggerDelay,
  delayChildren,
});

/**
 * 創建自定義過渡配置
 */
export const createTransition = (
  duration: number = durations.normal,
  ease: readonly number[] = easings.standard,
  delay: number = 0
) => ({
  duration,
  ease,
  delay,
});

