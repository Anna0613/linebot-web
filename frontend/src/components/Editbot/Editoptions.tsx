const editoptions = () => {
  return (
    <div className="bg-white shadow-md rounded-xl p-4 w-1/4 border flex flex-col justify-between">
      <h2 className="text-xl font-bold text-center mb-4">選擇您想修改的項目</h2>
      <div className="space-y-4">
        <button className="w-full bg-red-200 p-2 rounded flex items-center gap-2">
          ✏️ 修改名字
        </button>
        <button className="w-full bg-red-200 p-2 rounded flex items-center gap-2">
          📧 修改訊息
        </button>
        <button className="w-full bg-red-200 p-2 rounded flex items-center gap-2">
          🤖 Bot 邏輯
        </button>
      </div>
      <div className="flex justify-between mt-6">
        <button className="bg-pink-300 px-4 py-2 rounded">取消</button>
        <button className="bg-yellow-400 px-4 py-2 rounded">確定</button>
      </div>
    </div>
  );
};

export default editoptions;