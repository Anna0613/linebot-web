import React from 'react';
import './AnimatedOrbs.css';

/**
 * AnimatedOrbs 組件
 * 為亮色主題提供動態背景球體效果
 * - 包含黃色和綠色的漸層球體
 * - 球體在背景中緩慢移動
 * - 具有立體感和毛玻璃效果
 * - 只在亮色主題下顯示
 */
const AnimatedOrbs: React.FC = () => {
  return (
    <div className="animated-orbs-container">
      {/* 毛玻璃效果層 */}
      <div className="orbs-blur-overlay" />
      
      {/* 球體容器 */}
      <div className="orbs-wrapper">
        {/* 黃色球體 1 - 大 */}
        <div className="orb orb-yellow orb-1" />
        
        {/* 綠色球體 1 - 中 */}
        <div className="orb orb-green orb-2" />
        
        {/* 黃色球體 2 - 中 */}
        <div className="orb orb-yellow orb-3" />
        
        {/* 綠色球體 2 - 大 */}
        <div className="orb orb-green orb-4" />
        
        {/* 黃色球體 3 - 小 */}
        <div className="orb orb-yellow orb-5" />
      </div>
    </div>
  );
};

export default AnimatedOrbs;

