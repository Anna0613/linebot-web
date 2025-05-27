import { Link } from 'react-router-dom';

const AddServerPage = () => {
  return (
    <div className="bg-[#DFECF4] mt-[105px] mb-[60px] mx-auto py-10 px-8 rounded-[10px] shadow-[0_0_10px_rgba(0,0,0,0.1)] w-[60%] text-center">
      <h2 className="text-[#32376F] text-[28px] font-bold mb-8">建立LINE Bot</h2>
      <form className="w-full">
        <div className="mb-6 text-left">
          <label htmlFor="server-name" className="block mb-3 text-[18px] font-bold pl-2">
          LINE Bot名稱：
          </label>
          <input
            type="text"
            id="server-name"
            name="server-name"
            className="w-full py-2 px-3 border border-gray-300 rounded"
          />
        </div>

        <div className="mb-6 text-left">
          <label htmlFor="api-key" className="block mb-3 text-[18px] font-bold pl-2">
            輸入 Channel access token：
          </label>
          <input
            type="text"
            id="api-key"
            name="api-key"
            className="w-full py-2 px-3 border border-gray-300 rounded"
          />
        </div>

        <div className="mb-8 text-left">
          <label htmlFor="channel-secret" className="block mb-3 text-[18px] font-bold pl-2">
            輸入 Channel secret：
          </label>
          <input
            type="text"
            id="channel-secret"
            name="channel-secret"
            className="w-full py-2 px-3 border border-gray-300 rounded"
          />
        </div>

      <Link
          to="/how to establish"
          className="inline-block bg-white p-2 rounded-full shadow hover:bg-gray-100 transition"
          title="上一頁"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-[#F4B8AD]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
        </Link>
        {/* 右箭頭（下一頁） */}
        <Link
          to="/block"
          className="inline-block bg-[#F4B8AD] p-2 rounded-full shadow hover:bg-[#e6998a] transition"
          title="下一頁"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14m-6-6l6 6-6 6" />
          </svg>
        </Link>
      </form>
    </div>
  );
};

export default AddServerPage;
