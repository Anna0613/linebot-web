const RightPanel = () => {
    const handleExport = () => {
      alert('這裡將會導出 JSON！🚀');
    };
  
    return (
      <div className="w-[288px] h-[520px] rounded-[25px] bg-white border border-black shadow-[-15px_15px_0_#819780] p-5 flex-shrink-0 flex flex-col justify-between">
        <div>
          <h2 className="text-center text-[26px] font-bold text-[#383A45] mb-4">預覽畫面</h2>
  
          <div className="h-[360px] flex items-center justify-center">
            <p className="text-gray-400">這裡是預覽區</p>
          </div>
        </div>

        <button
          onClick={handleExport}
          className="text-white bg-[#82C29B] px-4 py-2 text-base font-semibold rounded hover:bg-[#6BAF88] transition duration-200 shadow-sm w-[80%] mx-auto"
        >
          匯出 JSON
        </button>
      </div>
    );
  };
  
  export default RightPanel;
  