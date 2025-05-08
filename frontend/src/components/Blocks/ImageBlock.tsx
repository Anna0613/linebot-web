import { useState } from 'react';

const ImageBlock = () => {
  const [selectedSize, setSelectedSize] = useState('md'); // 預設 md
  const options = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', '3xl', '4xl', '5xl', 'full'];

  return (
    <div className="relative w-[110px] h-[40px] bg-[#8ECAE6] rounded-[5px] flex items-center justify-between px-3">
      {/* 左邊文字 */}
      <p className="text-sm font-sans">圖片</p>

      {/* 右側白色圓角選單 */}
      <div className="relative">
        <select
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
          className="w-[50px] h-[28px] bg-white rounded-full text-black text-xs pl-2 pr-5 appearance-none cursor-pointer"
        >
          {options.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        {/* 自訂小箭頭 */}
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <div className="absolute top-[-8px] left-[30px] -translate-x-1/2 w-[16px] h-[16px] bg-white rounded-full z-20" />        
      {/* 底下小圓 */}
      <div className="absolute bottom-[-8px] left-[20px] w-[16px] h-[16px] bg-[#8ECAE6] rounded-full"></div>
    </div>
  );
};

export default ImageBlock;
