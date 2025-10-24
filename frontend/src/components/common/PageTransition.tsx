import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  mode?: 'fade' | 'slide' | 'scale';
  duration?: number;
}

/**
 * 頁面過渡動畫組件
 * 為路由切換提供流暢的動畫效果
 */
export const PageTransition = ({ 
  children, 
  mode = 'fade',
  duration = 0.3 
}: PageTransitionProps) => {
  const location = useLocation();

  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slide: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
    },
  };

  const selectedVariant = variants[mode];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={selectedVariant.initial}
        animate={selectedVariant.animate}
        exit={selectedVariant.exit}
        transition={{
          duration,
          ease: [0.4, 0, 0.2, 1], // cubic-bezier for smooth easing
        }}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * 簡化版的淡入動畫組件
 * 用於單個元素的淡入效果
 */
export const FadeIn = ({ 
  children, 
  delay = 0,
  duration = 0.3 
}: { 
  children: ReactNode; 
  delay?: number;
  duration?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * 列表項目的交錯動畫
 * 用於列表項目依序淡入
 */
export const StaggerChildren = ({
  children,
  staggerDelay = 0.05,
  _duration = 0.3
}: {
  children: ReactNode;
  staggerDelay?: number;
  _duration?: number;
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * 列表項目組件
 * 配合 StaggerChildren 使用
 */
export const StaggerItem = ({ 
  children,
  duration = 0.3
}: { 
  children: ReactNode;
  duration?: number;
}) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            duration,
            ease: [0.4, 0, 0.2, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * 滑入動畫組件
 * 用於側邊欄、抽屜等滑入效果
 */
export const SlideIn = ({ 
  children,
  direction = 'left',
  duration = 0.3
}: { 
  children: ReactNode;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  duration?: number;
}) => {
  const directionOffset = {
    left: { x: -20, y: 0 },
    right: { x: 20, y: 0 },
    top: { x: 0, y: -20 },
    bottom: { x: 0, y: 20 },
  };

  const offset = directionOffset[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...offset }}
      transition={{
        duration,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * 縮放動畫組件
 * 用於模態視窗、彈出框等
 */
export const ScaleIn = ({ 
  children,
  duration = 0.2
}: { 
  children: ReactNode;
  duration?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        duration,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

