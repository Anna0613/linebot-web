import { useEffect, useState } from "react";
import CreativeLoader from "./CreativeLoader";
import NeonLoader from "./NeonLoader";

interface LoaderProps {
  fullPage?: boolean;
  text?: string;
  web3Style?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Loader({ fullPage = false, text, web3Style = true, size = "md" }: LoaderProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 檢查當前主題
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    // 初始檢查
    checkTheme();

    // 監聽主題變化
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // 如果是 fullPage 模式，直接返回對應的 loader
  if (fullPage) {
    return isDark ? <NeonLoader /> : <CreativeLoader />;
  }

  // 小型 loader - 淺色主題（黃綠色系）
  const lightSmallLoader = (
    <>
      <div className="relative w-12 h-12">
        {/* 外圈 */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-lime-400 border-r-lime-400 animate-spin shadow-md shadow-lime-400/50"></div>

        {/* 中圈 */}
        <div
          className="absolute inset-1 rounded-full border-2 border-transparent border-b-emerald-400 border-l-emerald-400 shadow-md shadow-emerald-400/50"
          style={{animation: 'spin-reverse 1.5s linear infinite'}}
        ></div>

        {/* 內圈 */}
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-yellow-400 border-r-yellow-400 animate-spin shadow-md shadow-yellow-400/50" style={{animationDuration: '0.8s'}}></div>

        {/* 中心點 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-gradient-to-br from-lime-400 via-emerald-400 to-yellow-400 rounded-full animate-pulse shadow-lg shadow-lime-400/80"></div>
        </div>

        {/* 光環 */}
        <div className="absolute inset-[-3px] rounded-full border border-lime-400/20 animate-ping" style={{animationDuration: '2s'}}></div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}} />
    </>
  );

  // 小型 loader - 深色主題（藍紫霓虹）
  const darkSmallLoader = (
    <>
      <div className="relative w-12 h-12">
        {/* 外圈 */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-400 animate-spin shadow-md shadow-cyan-400/50"></div>

        {/* 中圈 */}
        <div
          className="absolute inset-1 rounded-full border-2 border-transparent border-b-blue-500 border-l-blue-500 shadow-md shadow-blue-500/50"
          style={{animation: 'spin-reverse 1.5s linear infinite'}}
        ></div>

        {/* 內圈 */}
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-purple-500 border-r-purple-500 animate-spin shadow-md shadow-purple-500/50" style={{animationDuration: '0.8s'}}></div>

        {/* 中心點 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 rounded-full animate-pulse shadow-lg shadow-purple-500/80"></div>
        </div>

        {/* 光環 */}
        <div className="absolute inset-[-3px] rounded-full border border-cyan-400/20 animate-ping" style={{animationDuration: '2s'}}></div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}} />
    </>
  );

  // 返回小型 loader（根據主題）
  const smallLoaderContent = isDark ? darkSmallLoader : lightSmallLoader;

  if (text) {
    return (
      <div className="flex flex-col items-center gap-2">
        {smallLoaderContent}
        <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-emerald-400'}`}>
          {text}
        </span>
      </div>
    );
  }

  return smallLoaderContent;
}
