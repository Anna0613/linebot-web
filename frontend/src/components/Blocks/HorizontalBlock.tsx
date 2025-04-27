const HorizontalBlock = ({
  topCircleVisible = true,
  topCircleColor = 'white', // 這裡新增 topCircleColor
}: { topCircleVisible?: boolean; topCircleColor?: 'white' | 'green' }) => {
  return (
    <div className="relative flex items-start">
      {/* 左側長條 */}
      <div className="w-[20px] h-[80px] bg-[#2A9D8F] mr-[-20px] z-0 mt-[8px]" />

      <div className="flex flex-col z-10">
        {/* 上段 */}
        <div className="relative w-[160px] h-[40px] bg-[#2A9D8F] rounded-[8px] flex items-center justify-start pl-3">
          <p className="text-sm font-sans">水平排列</p>
          <div className="w-[70px] h-[28px] bg-white rounded-full ml-3" />

          {/* 頂部圈圈，根據 topCircleColor 決定白色或綠色 */}
          {topCircleVisible && (
            <div
              className={`absolute top-[-8px] left-[30px] w-[16px] h-[16px] rounded-full z-10 ${
                topCircleColor === 'white' ? 'bg-white' : 'bg-[#2A9D8F]'
              }`}
            />
          )}
          
          {/* 底部小綠圈 */}
          <div className="absolute bottom-[-8px] left-[50px] w-[16px] h-[16px] bg-[#2A9D8F] rounded-full z-20" />
        </div>

        {/* 下段 */}
        <div className="relative w-[160px] h-[40px] bg-[#2A9D8F] rounded-[8px] mt-[20px]">
          <div className="absolute top-[-8px] left-[50px] w-[16px] h-[16px] bg-white rounded-full z-20" />
          <div className="absolute bottom-[-8px] left-[30px] w-[16px] h-[16px] bg-[#2A9D8F] rounded-full z-30" />
        </div>
      </div>
    </div>
  );
};

export default HorizontalBlock;
