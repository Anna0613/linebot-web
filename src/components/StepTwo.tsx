import React from 'react';

const StepTwo = () => {
  return (
    <div className="relative w-full flex flex-col items-center pt-0 pb-16 bg-[#FFFDFA]">

      <img
        src="/專題圖片/step2.svg"
        alt="Step 2 Background"
        className="max-w-[1296px] w-full h-auto"
      />

      <div className="absolute top-[4%] w-full flex justify-center items-start gap-x-6">
        <img
          src="/專題圖片/p3.png"
          alt="Photo 3"
          className="w-[770px] animate__animated animate__fadeIn"
        />
        <img
          src="/專題圖片/p4.png"
          alt="Photo 4"
          className="w-[460px] h-[230px] animate__animated animate__fadeIn"
        />
      </div>

      <div className="absolute top-[64.8%] left-[112px] text-[#41624f] text-left">
        <h2 className="text-[80px] lg:text-[130px] font-bold leading-none mb-2 min-h-[160px]">Step 2.</h2>
      </div>
      <div className="absolute top-[62%] right-[100px] text-[#e8e4dd] text-left space-y-3">
        <h3 className="text-[36px] lg:text-[40px] font-semibold">建立 Provider</h3>
        <p className="text-[24px] lg:text-[30px] leading-relaxed">
          登入 LINE Developers 網站後，點選 Create 建立一個
        </p>
        <p className="text-[24px] lg:text-[30px] leading-relaxed">
          Provider，輸入名稱，點擊 Create 就能建立 Provider。
        </p>
      </div>
    </div>
  );
};

export default StepTwo;
