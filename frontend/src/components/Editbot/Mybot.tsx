import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { ApiClient } from "../../services/api";
import { Bot } from "../../types/bot";
import { useToast } from "@/hooks/use-toast";

type MybotProps = {
  onEdit: (id: string) => void;
};

export interface MybotRef {
  refreshBots: () => void;
}

const Mybot = forwardRef<MybotRef, MybotProps>(({ onEdit }, ref) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [botList, setBotList] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const apiClient = ApiClient.getInstance();

  const handleDelete = async (botId: string, botName: string) => {
    if (!confirm(`確定要刪除機器人「${botName}」嗎？此操作無法撤銷。`)) {
      return;
    }

    try {
      const response = await apiClient.deleteBot(botId);
      
      if (response.error) {
        toast({
          variant: "destructive",
          title: "刪除失敗",
          description: response.error,
        });
      } else {
        toast({
          title: "刪除成功",
          description: `機器人「${botName}」已成功刪除`,
        });
        
        // 刪除成功後重新載入Bot列表
        await fetchBots();
        
        // 如果刪除的Bot正在被選中，則清除選中狀態
        if (selectedId === botId) {
          setSelectedId(null);
        }
      }
    } catch (error) {
      console.error('刪除Bot發生錯誤:', error);
      toast({
        variant: "destructive",
        title: "刪除失敗",
        description: "刪除機器人時發生錯誤",
      });
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getBots();
      
      if (response.error) {
        console.error('獲取Bot列表失敗:', response.error);
        toast({
          variant: "destructive",
          title: "錯誤",
          description: response.error,
        });
        setBotList([]);
      } else {
        setBotList(response.data || []);
      }
    } catch (error) {
      console.error('獲取Bot列表發生錯誤:', error);
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "無法載入Bot列表",
      });
      setBotList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  };

  // 暴露刷新方法給父組件
  useImperativeHandle(ref, () => ({
    refreshBots: fetchBots
  }));

  // 過濾 bot 列表
  const filteredBots = botList.filter(bot =>
    bot.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full xs:w-[520px] sm:w-[580px] md:w-[624px] h-[360px] xs:h-[400px] sm:h-[460px] md:h-[520px] rounded-[12px] xs:rounded-[15px] sm:rounded-[20px] md:rounded-[25px] bg-white border border-black shadow-[-6px_6px_0_#819780] xs:shadow-[-8px_8px_0_#819780] sm:shadow-[-12px_12px_0_#819780] md:shadow-[-15px_15px_0_#819780] p-2 xs:p-3 sm:p-4 md:p-5 flex-shrink-0 flex flex-col transition-all duration-300">
      <h2 className="text-center text-[20px] sm:text-[26px] font-bold text-[#383A45] mb-3 sm:mb-4">我的LINE Bot</h2>

      <input 
        type="text" 
        placeholder="搜尋" 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 border rounded mb-4" 
      />

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#5A2C1D]">載入中...</div>
          </div>
        ) : (
          <table className="w-full text-left border-t border-gray-300">
            <thead>
              <tr className="text-[#5A2C1D] font-bold border-b border-gray-300">
                <th className="py-2">編號</th>
                <th className="py-2">Bot 名稱</th>
                <th className="py-2">操作</th>
                <th className="py-2">修改</th>
                <th className="py-2">刪除</th>
              </tr>
            </thead>
            <tbody>
              {filteredBots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">
                    {botList.length === 0 ? "尚無Bot資料" : "沒有找到符合的Bot"}
                  </td>
                </tr>
              ) : (
                filteredBots.map((bot, index) => (
                  <tr key={bot.id} className="border-b border-gray-200 hover:bg-[#f9f3f1] transition">
                    <td className="py-2">{index + 1}</td>
                    <td className="py-2">{bot.name}</td>
                    <td className="py-2">
                      <button
                        onClick={() => handleSelect(bot.id)}
                        className={`px-3 py-1 rounded transition font-bold ${
                          selectedId === bot.id ? "bg-[#F6B1B1] text-white" : "bg-[#FFD59E] text-[#5A2C1D] hover:brightness-90"
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
                            ? "bg-[#A0D6B4] text-white hover:brightness-90" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                      >
                        修改
                      </button>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => selectedId === bot.id && handleDelete(bot.id, bot.name)}
                        disabled={selectedId !== bot.id}
                        className={`px-3 py-1 rounded transition font-bold
                          ${selectedId === bot.id 
                            ? "bg-[#F6B1B1] text-white hover:brightness-90" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});

Mybot.displayName = 'Mybot';

export default Mybot;
