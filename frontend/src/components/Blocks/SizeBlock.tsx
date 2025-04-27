import { useState } from 'react';

const SizeBlock = () => {
  const options = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', '3xl', '4xl', '5xl'];
  const [selectedSize, setSelectedSize] = useState('md');

  return (
    <div className="relative w-[70px] h-[28px] rounded-full bg-[#CDB4DB] flex items-center justify-between px-3 cursor-pointer text-sm font-sans">
      {/* 左邊顯示文字 */}
      <span>{selectedSize}</span>

      {/* 下拉小箭頭 */}
      <div className="pointer-events-none flex items-center">
        <svg
          className="w-3 h-3 text-black"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* 隱藏的 select，pointer-events-none 讓它不擋住拖曳 */}
      <select
        value={selectedSize}
        onChange={(e) => setSelectedSize(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto" // 保持能點
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SizeBlock;
