import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { ApiClient } from "../../services/api";
import { Bot } from "../../types/bot";
import { useToast } from "@/hooks/use-toast";

type MybotProps = {
  onEdit: (id: string, editType: 'name' | 'token' | 'secret' | 'all') => void;
};

export interface MybotRef {
  refreshBots: () => void;
}

const Mybot = forwardRef<MybotRef, MybotProps>(({ onEdit }, ref) => {
  const [botList, setBotList] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
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
        
        // 如果刪除的Bot正在展開，則關閉展開狀態
        if (expandedBot === botId) {
          setExpandedBot(null);
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
        
        // 檢查是否為身份驗證錯誤
        if (response.status === 401 || response.status === 403) {
          toast({
            variant: "destructive",
            title: "身份驗證失敗",
            description: "請重新登入後再試",
          });
        } else {
          toast({
            variant: "destructive",
            title: "錯誤",
            description: response.error || "無法載入Bot列表",
          });
        }
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

  const toggleExpanded = (botId: string) => {
    setExpandedBot(prev => (prev === botId ? null : botId));
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
    <div className="w-full sm:w-[624px] h-[400px] sm:h-[520px] rounded-[15px] sm:rounded-[25px] bg-white border border-black shadow-[-8px_8px_0_#819780] sm:shadow-[-15px_15px_0_#819780] p-3 sm:p-5 flex-shrink-0 flex flex-col transition-all duration-300">
      <h2 className="text-center text-[20px] sm:text-[26px] font-bold text-[#383A45] mb-3 sm:mb-4">我的LINE Bot</h2>

      <input 
        type="text" 
        placeholder="搜尋Bot名稱..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#819780] transition" 
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-[#383A45] text-lg">載入中...</div>
          </div>
        ) : filteredBots.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500 text-center">
              {botList.length === 0 ? "尚無Bot資料" : "沒有找到符合的Bot"}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBots.map((bot, index) => (
              <div key={bot.id} className="border border-gray-200 rounded-lg overflow-hidden bg-gradient-to-r from-[#F8F9FA] to-[#E8F5E8] hover:shadow-md transition-all duration-200">
                {/* Bot 基本資訊 */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#819780] rounded-full flex items-center justify-center font-bold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#383A45] text-lg">{bot.name}</h3>
                        <p className="text-sm text-gray-600">ID: {bot.id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* 快速編輯按鈕 */}
                      <button
                        onClick={() => onEdit(bot.id, 'name')}
                        className="px-3 py-2 bg-[#82C29B] text-white rounded-lg hover:bg-[#6BAF88] transition-all duration-200 shadow-md text-sm font-bold"
                        title="快速修改名稱"
                      >
                        修改名稱
                      </button>
                      
                      <button
                        onClick={() => onEdit(bot.id, 'token')}
                        className="px-3 py-2 bg-[#6BAED6] text-white rounded-lg hover:bg-[#5B9BD5] transition-all duration-200 shadow-md text-sm font-bold"
                        title="修改Token"
                      >
                        修改Token
                      </button>
                      
                      <button
                        onClick={() => onEdit(bot.id, 'all')}
                        className="px-3 py-2 bg-[#A6A6A6] text-white rounded-lg hover:bg-[#8C8C8C] transition-all duration-200 shadow-md text-sm font-bold"
                        title="完整編輯"
                      >
                        完整編輯
                      </button>
                      
                      {/* 更多選項按鈕 */}
                      <button
                        onClick={() => toggleExpanded(bot.id)}
                        className="px-3 py-2 bg-[#F0F0F0] text-[#383A45] rounded-lg hover:bg-gray-300 transition-all duration-200 shadow-md text-sm font-bold"
                        title="更多選項"
                      >
                        {expandedBot === bot.id ? '收起' : '更多'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* 展開的詳細操作區域 */}
                {expandedBot === bot.id && (
                  <div className="border-t border-gray-300 bg-white p-4 animate-slide-down">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* 編輯選項 */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[#383A45] text-sm mb-2">編輯選項</h4>
                        <button
                          onClick={() => onEdit(bot.id, 'name')}
                          className="w-full p-2 bg-[#82C29B] text-white rounded-lg hover:bg-[#6BAF88] transition-all duration-200 shadow-sm text-sm font-bold"
                        >
                          修改名稱
                        </button>
                        <button
                          onClick={() => onEdit(bot.id, 'token')}
                          className="w-full p-2 bg-[#6BAED6] text-white rounded-lg hover:bg-[#5B9BD5] transition-all duration-200 shadow-sm text-sm font-bold"
                        >
                          修改Channel Token
                        </button>
                        <button
                          onClick={() => onEdit(bot.id, 'secret')}
                          className="w-full p-2 bg-[#D4A574] text-white rounded-lg hover:bg-[#C19660] transition-all duration-200 shadow-sm text-sm font-bold"
                        >
                          修改Channel Secret
                        </button>
                        <button
                          onClick={() => onEdit(bot.id, 'all')}
                          className="w-full p-2 bg-[#A6A6A6] text-white rounded-lg hover:bg-[#8C8C8C] transition-all duration-200 shadow-sm text-sm font-bold"
                        >
                          完整編輯
                        </button>
                      </div>
                      
                      {/* 危險操作區域 */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[#383A45] text-sm mb-2">危險操作</h4>
                        <button
                          onClick={() => handleDelete(bot.id, bot.name)}
                          className="w-full p-2 bg-[#E74C3C] text-white rounded-lg hover:bg-[#C0392B] transition-all duration-200 shadow-sm text-sm font-bold"
                        >
                          刪除Bot
                        </button>
                        
                        {/* Bot 資訊顯示 */}
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <h5 className="font-medium text-[#383A45] text-xs mb-2">Bot 資訊</h5>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div><span className="font-medium">Bot ID:</span> {bot.id}</div>
                            <div><span className="font-medium">使用者ID:</span> {bot.user_id}</div>
                            <div><span className="font-medium">狀態:</span> <span className="text-green-600">正常</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

Mybot.displayName = 'Mybot';

export default Mybot;
