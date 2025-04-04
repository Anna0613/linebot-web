const StepOne = () => {
  return (
    <section className="py-8 px-0 flex justify-center bg-[#e8e4dd]">
      <div className="max-w-[1296px] w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center px-6">

        <div className="relative w-full max-w-[680px] mx-auto">
          <div className="flex flex-col items-center gap-0">
            <img
              src="/專題圖片/p1.png"
              alt="Photo 1"
              className="w-[820px] animate__animated animate__fadeIn"
            />
            <img
              src="/專題圖片/p2.png"
              alt="Photo 2"
              className="w-[820px] animate__animated animate__fadeIn"
            />
          </div>

          <div className="absolute top-[-10px] right-[-30px] w-[120px] h-[60px] border-4 border-red-500 rounded-[50%/50%]" />

          <div className="absolute top-0 right-[-35px] h-full border-r-4 border-dashed border-[#41624f]" />
        </div>

        <div className="text-[#41624f] text-left space-y-6 order-2 lg:pl-8">
          <h2 className="text-[100px] lg:text-[130px] font-bold leading-none mb-2 min-h-[160px]">Step 1.</h2>
          <h3 className="text-[36px] lg:text-[40px] font-semibold">註冊並登入LINE Developer</h3>
          <p className="text-[24px] lg:text-[30px] leading-relaxed">
            進到LINE Developers網站後，註冊或登入帳號。
          </p>
          <p className="text-[24px] lg:text-[30px] font-semibold">LINE Developers：</p>
          <a
            href="https://developers.line.biz/zh-hant/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[24px] lg:text-[30px] underline hover:text-[#1a1a40]"
          >
            https://developers.line.biz/zh-hant/
          </a>
        </div>
      </div>
    </section>
  );
};

export default StepOne;
