import { ReactNode } from 'react';
import { motion } from 'framer-motion';

import { pageTransition } from '@/lib/motion';

interface PageContentWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * 頁面內容包裝器
 * 為頁面主要內容區域提供進場動畫，不包 Navbar/Footer，避免導航欄跟著淡入
 *
 * 使用方式：
 * ```tsx
 * <div className="min-h-screen flex flex-col">
 *   <Navbar />
 *   <PageContentWrapper>
 *     <main>頁面內容</main>
 *   </PageContentWrapper>
 *   <Footer />
 * </div>
 * ```
 */
export const PageContentWrapper = ({ children, className = '' }: PageContentWrapperProps) => {
  return (
    <motion.div
      className={className}
      variants={pageTransition}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
};

export default PageContentWrapper;
