import { ReactNode, useEffect, useState } from 'react';

interface PageContentWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * 頁面內容包裝器
 * 為頁面主要內容區域提供淡入動畫效果，不影響 Navbar 和 Footer
 * 使用 CSS 動畫而非 framer-motion，避免導航欄閃爍
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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 組件掛載後觸發淡入動畫
    setIsVisible(false);
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`transition-opacity duration-300 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      style={{
        willChange: 'opacity',
      }}
    >
      {children}
    </div>
  );
};

export default PageContentWrapper;

