import { useState } from "react";

type MybotProps = {
  onEdit: (id: number) => void;
};

const Mybot = ({ onEdit }: MybotProps) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const botList = [
    { id: 1, name: "小幫手Bot" },
    { id: 2, name: "客服Bot" },
    { id: 3, name: "提醒Bot" },
  ];

  const handleSelect = (id: number) => {
    setSelectedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="relative w-full xs:w-[520px] sm:w-[580px] md:w-[624px] h-[360px] xs:h-[400px] sm:h-[460px] md:h-[520px] rounded-[12px] xs:rounded-[15px] sm:rounded-[20px] md:rounded-[25px] bg-white border border-black shadow-[-6px_6px_0_#819780] xs:shadow-[-8px_8px_0_#819780] sm:shadow-[-12px_12px_0_#819780] md:shadow-[-15px_15px_0_#819780] p-2 xs:p-3 sm:p-4 md:p-5 flex-shrink-0 flex flex-col transition-all duration-300">
      <h2 className="text-center text-[20px] sm:text-[26px] font-bold text-[#383A45] mb-3 sm:mb-4">我的LINE Bot</h2>

      <input type="text" placeholder="搜尋" className="w-full p-2 border rounded mb-4" />

      <table className="w-full text-left border-t border-gray-300">
        <thead>
          <tr className="text-[#5A2C1D] font-bold border-b border-gray-300">
            <th className="py-2">編號</th>
            <th className="py-2">Bot 名稱</th>
            <th className="py-2">操作</th>
            <th className="py-2"> </th>
          </tr>
        </thead>
        <tbody>
          {botList.map((bot, index) => (
            <tr key={bot.id} className="border-b border-gray-200 hover:bg-[#f9f3f1] transition">
              <td className="py-2">{index + 1}</td>
              <td className="py-2">{bot.name}</td>
              <td className="py-2">
                <button
                  onClick={() => handleSelect(bot.id)}
                  className={`px-3 py-1 rounded transition font-bold ${
                    selectedId === bot.id ? "bg-[#BC8C65] text-white" : "bg-[#E9B9CF] text-white hover:brightness-90"
                  }`}
                >
                  {selectedId === bot.id ? "取消" : "選擇"}
                </button>
              </td>
              <td className="py-2">
              <button
              onClick={() => selectedId === bot.id && onEdit(bot.id)}
              disabled={selectedId !== bot.id}
              className={`px-3 py-1 rounded transition font-bold
                ${selectedId === bot.id 
                  ? "bg-[#819780] text-white hover:brightness-90" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  修改
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Mybot;