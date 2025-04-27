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
          to="/block"
          className="inline-block text-white bg-[#F4B8AD] px-6 py-2 text-base font-semibold rounded hover:bg-[#e6998a] transition duration-200 shadow-sm"
        >
          NEXT
        </Link>
      </form>
    </div>
  );
};

export default AddServerPage;
