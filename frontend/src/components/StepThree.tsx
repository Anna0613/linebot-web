import React from 'react';

const StepThree = () => {
  return (
    <div className="relative w-full flex flex-col items-center pt-0 pb-0 bg-[#FFFDFA]">

      <img
        src="/專題圖片/step3.svg"
        alt="Step 3 Background"
        className="max-w-[1296px] w-full h-auto block"
      />

      <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0 translate-x-[-50px]">
        <img
          src="/專題圖片/p5.png"
          alt="Photo 5"
          className="w-[610px] animate__animated animate__fadeIn"
        />
        <img
          src="/專題圖片/p6.png"
          alt="Photo 6"
          className="w-[610px] animate__animated animate__fadeIn"
        />
      </div>

      <div className="absolute top-[45%] left-[49.5%] translate-x-[220px] translate-y-[-80px] w-[180px] h-[90px] border-4 border-red-500 rounded-[50%/50%]" />

      <div className="absolute top-[10.5%] left-[140px] text-[#e8e4dd] text-left space-y-3">
        <h2 className="text-[100px] lg:text-[130px] font-bold leading-none mb-2 min-h-[100px]">Step 3.</h2>
        <h3 className="text-[36px] lg:text-[40px] font-semibold">建立 Channel</h3>
        <p className="text-[24px] lg:text-[30px] leading-relaxed">建立好 Provider 之後，選擇</p>
        <p className="text-[24px] lg:text-[30px] leading-relaxed">Channels，點選「Create a</p>
        <p className="text-[24px] lg:text-[30px] leading-relaxed">Messaging API channel」，</p>
        <p className="text-[24px] lg:text-[30px] leading-relaxed">建立時需要輸入頻道的名稱和</p>
        <p className="text-[24px] lg:text-[30px] leading-relaxed">描述，以及使用下拉選擇所在</p>
        <p className="text-[24px] lg:text-[30px] leading-relaxed">的地區與類別。</p>
      </div>
    </div>
  );
};

export default StepThree;
