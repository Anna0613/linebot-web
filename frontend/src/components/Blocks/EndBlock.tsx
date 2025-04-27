const EndBlock = ({
  topCircleVisible = true,
  topCircleColor = 'white', // 這裡新增 topCircleColor
}: { topCircleVisible?: boolean; topCircleColor?: 'white' | 'green' }) => {
    return (
      <div className="relative w-[100px] h-[40px] bg-[#2A9D8F] rounded-[5px] flex items-center justify-start pl-3">
        <p className="text-sm font-sans">結束</p>
        {/* 頂部圈圈，根據 topCircleColor 決定白色或綠色 */}
        {topCircleVisible && (
            <div
              className={`absolute top-[-8px] left-[30px] w-[16px] h-[16px] rounded-full z-10 ${
                topCircleColor === 'white' ? 'bg-white' : 'bg-[#2A9D8F]'
              }`}
            />
          )}
      </div>
    );
  };
  
  export default EndBlock;