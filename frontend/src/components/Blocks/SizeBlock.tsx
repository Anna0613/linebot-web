import { useState } from 'react';

const SizeBlock = () => {
  const options = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', '3xl', '4xl', '5xl'];
  const [selectedSize, setSelectedSize] = useState('md');

  return (
    <div className="relative w-[110px] h-[28px] rounded-full bg-[#CDB4DB] flex items-center justify-between px-3 cursor-pointer text-sm font-sans">
      <p className="text-sm font-sans">尺寸</p>
      <div className="relative">
        <select
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
          className="w-[50px] h-[28px] bg-[#CDB4DB] rounded-full text-black text-xs pl-2 pr-5 appearance-none cursor-pointer"
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
    </div>
  );
};

export default SizeBlock;
