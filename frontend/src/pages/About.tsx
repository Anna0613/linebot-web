
const About = () => {
  return (
    <div className="bg-[#DFECF4] mt-[105px] mb-[60px] mx-auto py-10 px-8 rounded-[10px] shadow-[0_0_10px_rgba(0,0,0,0.1)] w-[60%] text-center">
      <h2 className="text-[#32376F] text-[28px] font-bold mb-6">關於本網站</h2>
      <p className="text-[18px] text-gray-700 leading-8 text-left">
        本網站旨在協助使用者快速建立與設計 LINE Bot，無需撰寫複雜程式碼，即可透過圖形化介面完成機器人邏輯設計。
        <br /><br />
        使用者可以透過簡單的步驟輸入必要資訊（如 Channel access token 和 Channel secret），接著拖拉元件設計回應流程，最後部署上線。
        <br /><br />
        我們的目標是降低技術門檻，讓更多人能發揮創意並建立屬於自己的聊天機器人。
      </p>
    </div>
  );
};

export default About;