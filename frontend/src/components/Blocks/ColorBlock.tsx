import { useState, useRef } from 'react';

const ColorBlock = () => {
  const [color, setColor] = useState('#CDB4DB');
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleBlockClick = () => {
    if (colorInputRef.current) {
      colorInputRef.current.click(); // 點積木打開 color picker
    }
  };

  // 計算亮度公式
  const getTextColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 150 ? 'black' : 'white';
  };

  return (
    <div className="relative">
      {/* 積木本體 */}
      <div
        className="w-[70px] h-[28px] rounded-full flex items-center justify-center cursor-pointer text-sm font-sans"
        style={{
          backgroundColor: color,
          color: getTextColor(color),
        }}
        onClick={handleBlockClick}
      >
        顏色
      </div>

      {/* 隱藏的 color input（不占版面！） */}
      <input
        type="color"
        ref={colorInputRef}
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="absolute top-[10px] left-0 opacity-0 w-[40px] h-[40px] cursor-pointer"
      />

    </div>
  );
};

export default ColorBlock;
