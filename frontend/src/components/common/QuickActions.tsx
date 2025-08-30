import React, { useEffect, useState, useCallback } from "react";

const QuickActions: React.FC = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  const onScroll = useCallback(() => {
    setShowBackToTop(window.scrollY > 300);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const bottomOffset = "calc(env(safe-area-inset-bottom, 0px) + 16px)";

  return (
    <>
      {showBackToTop && (
        <button
          aria-label="回到頂部"
          onClick={scrollToTop}
          style={{ bottom: bottomOffset }}
          className="fixed right-4 z-[1001] w-12 h-12 bg-[#919191] text-center rounded-full cursor-pointer items-center justify-center hover:bg-[#575757] hover:scale-110 transition-all duration-300 shadow-lg text-white hidden sm:flex"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-6 h-6 fill-white">
            <path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" />
          </svg>
        </button>
      )}

      <a
        href="https://line.me/ti/p/OQV3UIgmr7"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="聯絡 LINE"
        style={{ bottom: bottomOffset }}
        className="fixed right-4 z-[1001]"
      >
        <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-300">
          <img src="/images/line-logo.svg" alt="Line icon" className="w-full h-full object-cover" />
        </div>
      </a>
    </>
  );
};

export default QuickActions;

