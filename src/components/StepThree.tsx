import 'animate.css';

const StepThree = () => {
  return (
    <section className="relative w-full flex flex-col items-center justify-center py-10 px-4 bg-[#e8e4dd]">
      <img
        src="/\u5c08\u984c\u5716\u7247/step3.svg"
        alt="Step 3 Background"
        className="w-[1296px] h-[729px] object-contain"
      />

      <div className="absolute top-[51%] left-[255px] flex flex-col items-center gap-2">
        <img
          src="/\u5c08\u984c\u5716\u7247/p5.png"
          alt="Photo 5"
          className="w-[610px] animate__animated animate__slideInDown"
        />
        <img
          src="/\u5c08\u984c\u5716\u7247/p6.png"
          alt="Photo 6"
          className="w-[610px] animate__animated animate__slideInUp"
        />
      </div>

      <div className="absolute top-[53.6%] left-[150px] text-[#41624f] text-left">
        <div className="text-[100px] font-bold mb-6 typing">Step 3.</div>
        <div className="text-[40px] mb-6 typing">建立 Channel</div>
        <p className="text-[30px] mb-1 typing">建立好 Provider 之後，選擇 Channels，</p>
        <p className="text-[30px] mb-1 typing">點選「Create a Messaging API channel」，</p>
        <p className="text-[30px] mb-1 typing">建立時需要輸入頻道的名稱和描述，</p>
        <p className="text-[30px] mb-1 typing">以及使用下拉選擇所在的地區與類別。</p>
      </div>

      <div className="absolute top-[200px] left-[670px] w-[180px] h-[90px] border-[4px] border-red-600 rounded-full animate__animated animate__heartBeat" />
    </section>
  );
};

export default StepThree;
