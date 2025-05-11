const EditOptions = () => {
  return (
    <div className="w-full sm:w-[320px] h-[520px] rounded-[25px] bg-white border border-black shadow-[-15px_15px_0_#819780] p-6 flex flex-col justify-between items-center">
      <h2 className="text-[22px] font-bold text-[#383A45] text-center">選擇您要修改的項目</h2>

      <div className="flex flex-col w-full items-stretch space-y-4 my-4">
        <button className="h-12 flex items-center justify-center gap-3 bg-[#F9C6BA] text-[#5A2C1D] rounded-md shadow-md hover:bg-[#f4b1a5] transition">
          <span className="text-xl">✏️</span>
          <span className="text-base font-semibold">修改名字</span>
        </button>
        <button className="h-12 flex items-center justify-center gap-3 bg-[#F9C6BA] text-[#5A2C1D] rounded-md shadow-md hover:bg-[#f4b1a5] transition">
          <span className="text-xl">📧</span>
          <span className="text-base font-semibold">修改訊息</span>
        </button>
        <button className="h-12 flex items-center justify-center gap-3 bg-[#F9C6BA] text-[#5A2C1D] rounded-md shadow-md hover:bg-[#f4b1a5] transition">
          <span className="text-xl">🤖</span>
          <span className="text-base font-semibold">Bot 邏輯</span>
        </button>
      </div>

      <div className="flex justify-between w-full space-x-4 pt-2">
        <button className="flex-1 bg-[#E9B9CF] text-white py-2 rounded-md font-bold shadow hover:brightness-90 transition">取消</button>
        <button className="flex-1 bg-[#BC8C65] text-white py-2 rounded-md font-bold shadow hover:brightness-90 transition">確定</button>
      </div>
    </div>
  );
};

export default EditOptions;
