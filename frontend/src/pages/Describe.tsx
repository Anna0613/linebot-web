import Footer from '../components/Index/Footer';
const DescribePage = () => {
  return (
    <>
      <div className="bg-[#DFECF4] mt-[105px] mb-[60px] mx-auto py-10 px-8 rounded-[10px] shadow-[0_0_10px_rgba(0,0,0,0.1)] w-[60%] text-center">
        <h2 className="text-[#32376F] text-[28px] font-bold mb-6">系統說明</h2>
        <p className="text-[18px] text-gray-700 leading-8 text-left">
          本系統是一個專為設計 LINE Bot 所打造的線上平台，使用者可透過圖形化的介面快速完成：
          <ul className="list-disc ml-6 my-4 text-left">
            <li>輸入機器人基本資料（名稱、Token、Secret）</li>
            <li>拖拉元件建立聊天流程</li>
            <li>測試與部署機器人功能</li>
          </ul>
          本系統特點如下：
          <ul className="list-disc ml-6 my-4 text-left">
            <li>操作簡單，適合無程式背景的使用者</li>
            <li>支援多種互動元件（文字、圖片、按鈕等）</li>
            <li>提供視覺化邏輯編輯，輕鬆設計對話流程</li>
          </ul>
          本平台適合用於教育用途、行銷推廣、自動化客服等場景。
        </p>
      </div>

      <Footer />
    </>
  );
};

export default DescribePage;
