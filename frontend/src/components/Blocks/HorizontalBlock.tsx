const HorizontalBlock = () => {
    return (
      <div className="relative flex items-start">
      {/* 左側連接條 */}
      <div className="w-[20px] h-[80px] bg-[#2A9D8F] mr-[-20px] z-0 mt-[8px]"></div>

      <div className="flex flex-col z-10">
        {/* 上段塊 */}
        <div className="relative w-[140px] h-[40px] bg-[#2A9D8F] rounded-[8px] flex items-center justify-center">
          <p className="text-sm font-sans">橫向排列</p>

          {/* 頂部白色凹槽 */}
          <div className="absolute top-[-8px] left-[49px] -translate-x-1/2 w-[16px] h-[16px] bg-white rounded-full z-20" />
          {/* 底部綠色凸出 */}
          <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-[16px] h-[16px] bg-[#2A9D8F] rounded-full z-20" />
        </div>

        {/* 下段塊 */}
        <div className="relative w-[140px] h-[40px] bg-[#2A9D8F] rounded-[8px] mt-[20px]">
          {/* 頂部白色凹槽 */}
          <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-[16px] h-[16px] bg-white rounded-full z-20" />
        </div>
      </div>
    </div>
    );
  };
  
  export default HorizontalBlock;
  