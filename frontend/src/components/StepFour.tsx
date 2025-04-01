import React from "react";
import "animate.css";

const StepFour = () => {
  return (
    <div className="relative text-white text-left w-full flex flex-col items-center pt-20">
      <img
        src="/\u5c08\u984c\u5716\u7247/step4.svg"
        alt="Step 4 Background"
        className="w-[1296px] h-[729px]"
      />

      {/* Overlay Images */}
      <div className="absolute top-[74.74%] right-0 flex flex-col gap-5 pr-[70px]">
        <img
          src="/\u5c08\u984c\u5716\u7247/p7.png"
          alt="Image 7"
          className="w-[690px] animate__animated animate__fadeInTopRight"
        />
        <img
          src="/\u5c08\u984c\u5716\u7247/p8.png"
          alt="Image 8"
          className="w-[620px] animate__animated animate__fadeInBottomRight"
        />
      </div>

      {/* Red Rectangles */}
      <div className="absolute top-[150px] left-[645px] w-[100px] h-[50px] border-4 border-red-600 rounded-full animate__animated animate__heartBeat"></div>
      <div className="absolute top-[540px] left-[770px] w-[180px] h-[90px] border-4 border-red-600 rounded-full animate__animated animate__heartBeat"></div>

      {/* Texts */}
      <div className="absolute top-[77.5%] left-[83px] text-[#e8e4dd] flex flex-col items-start w-fit">
        <h2 className="text-[100px] font-bold mb-6">Step 4.</h2>
        <p className="text-[36px] mb-1">取得 LINE Channel secret</p>
        <p className="text-[36px] mb-8">和 Channel access token</p>
        <p className="text-[28px] mb-1">進入 Basic settings，往下滑找到 Channel secret。</p>
        <p className="text-[28px] mb-1">前往 Messaging API settings，往下滑找到</p>
        <p className="text-[28px] mb-1">Channel access token，點選 Issue 產生。</p>
        <p className="text-[28px] mb-6">把這兩個都複製下來，並貼到我們網站裡。</p>
      </div>

      {/* NEXT Button */}
      <div className="pt-10">
        <a
          href="/add-server"
          className="inline-block text-white bg-[#F4B8AD] hover:bg-[#e6998a] px-6 py-3 rounded-md font-bold text-lg"
        >
          NEXT
        </a>
      </div>
    </div>
  );
};

export default StepFour;