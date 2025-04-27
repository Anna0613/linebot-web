import { useState } from 'react';

const MessageOneBlock = () => {
  const [selectedUnit, setSelectedUnit] = useState('超大');
  const options = ['超級小', '超小', '小', '中', '大', '超大', '超級大'];

  return (
    <div className="relative w-[160px] h-[40px] bg-[#F4A261] rounded-[5px] flex items-center justify-between px-3 z-20">
      {/* 左邊文字 */}
      <p className="text-sm font-sans">多重訊息</p>

      {/* 右側選單 */}
      <div className="relative">
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value)}
          className="w-[70px] h-[28px] bg-white rounded-full text-black text-xs pl-2 pr-5 appearance-none cursor-pointer"
        >
          {options.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>

        {/* 小箭頭 */}
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 底下小橘圓（正常大 16x16） */}
      <div className="absolute bottom-[-8px] left-[30px] w-[16px] h-[16px] bg-[#F4A261] rounded-full z-30" />
    </div>
  );
};

export default MessageOneBlock;
