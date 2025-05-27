import React from 'react';
import { Link } from 'react-router-dom';

const StepFour = () => {
  return (
    <div className="relative w-full flex flex-col items-center pt-0 pb-0 bg-[#FFFDFA]">

      <img
        src="/專題圖片/step4.svg"
        alt="Step 4 Background"
        className="max-w-[1296px] w-full h-auto block"
        style={{ margin: 0, padding: 0 }}
      />

      <div className="absolute top-[7%] w-full flex flex-col items-end pr-[163px] gap-0">
        <img
          src="/專題圖片/p7.png"
          alt="Photo 7"
          className="w-[660px] animate__animated animate__fadeIn"
        />
        <img
          src="/專題圖片/p8.png"
          alt="Photo 8"
          className="w-[600px] animate__animated animate__fadeIn translate-x-[61.5px]"
        />
      </div>

      <div className="absolute top-[200px] left-[700px] w-[100px] h-[50px] border-4 border-red-500 rounded-[50%/50%]" />
      <div className="absolute top-[580px] left-[790px] w-[180px] h-[90px] border-4 border-red-500 rounded-[50%/50%]" />

      <div className="absolute top-[3.5%] left-[85px] text-[#e8e4dd] text-left space-y-7">
        <h2 className="text-[100px] lg:text-[130px] font-bold leading-none mb-2 min-h-[150px]">Step 4.</h2>
        <h3 className="text-[28px] lg:text-[40px] font-semibold">取得 LINE Channel secret</h3>
        <h3 className="text-[28px] lg:text-[40px] font-semibold">和 Channel access token</h3>
        <div className="space-y-4">
          <p className="text-[18px] lg:text-[30px] leading-relaxed">進入Basic settings，往下滑找到Channel</p>
          <p className="text-[18px] lg:text-[30px] leading-relaxed">secret。前往Messaging API settings，往</p>
          <p className="text-[18px] lg:text-[30px] leading-relaxed">下滑找到Channel access token，點選lssue</p>
          <p className="text-[18px] lg:text-[30px] leading-relaxed">產生。把這兩個都複製下來，並貼到我們網</p>
          <p className="text-[18px] lg:text-[30px] leading-relaxed">站裡。</p>
        </div>
      </div>

      <div className="mt-10 mb-10">
        <Link
          to="/add server"
          className="inline-block bg-[#F4B8AD] p-2 rounded-full shadow hover:bg-[#e6998a] transition"
          title="下一頁"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14m-6-6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default StepFour;
