import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../services/api';
import { Bot, BotUpdateData } from '../../types/bot';
import { useToast } from "@/hooks/use-toast";

interface BotEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  editType: 'name' | 'token' | 'secret' | 'all';
  onBotUpdated: () => void;
}

const BotEditModal: React.FC<BotEditModalProps> = ({ 
  isOpen, 
  onClose, 
  botId, 
  editType, 
  onBotUpdated 
}) => {
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    channel_token: '',
    channel_secret: ''
  });
  const { toast } = useToast();
  const apiClient = ApiClient.getInstance();

  useEffect(() => {
    if (isOpen && botId) {
      fetchBotData();
    }
  }, [isOpen, botId]);

  const fetchBotData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getBot(botId);
      
      if (response.error) {
        toast({
          variant: "destructive",
          title: "錯誤",
          description: response.error,
        });
        onClose();
        return;
      }

      const botData = response.data;
      setBot(botData);
      setFormData({
        name: botData.name || '',
        channel_token: botData.channel_token || '',
        channel_secret: botData.channel_secret || ''
      });
    } catch (error) {
      console.error('獲取Bot資料失敗:', error);
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "無法載入Bot資料",
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bot) return;

    try {
      setLoading(true);
      
      // 根據編輯類型準備更新資料
      const updateData: BotUpdateData = {};
      
      switch (editType) {
        case 'name':
          if (!formData.name.trim()) {
            toast({
              variant: "destructive",
              title: "錯誤",
              description: "Bot名稱不能為空",
            });
            return;
          }
          updateData.name = formData.name.trim();
          break;
        case 'token':
          if (!formData.channel_token.trim()) {
            toast({
              variant: "destructive",
              title: "錯誤",
              description: "Channel Token不能為空",
            });
            return;
          }
          updateData.channel_token = formData.channel_token.trim();
          break;
        case 'secret':
          if (!formData.channel_secret.trim()) {
            toast({
              variant: "destructive",
              title: "錯誤",
              description: "Channel Secret不能為空",
            });
            return;
          }
          updateData.channel_secret = formData.channel_secret.trim();
          break;
        case 'all':
          if (!formData.name.trim() || !formData.channel_token.trim() || !formData.channel_secret.trim()) {
            toast({
              variant: "destructive",
              title: "錯誤",
              description: "所有欄位都必須填寫",
            });
            return;
          }
          updateData.name = formData.name.trim();
          updateData.channel_token = formData.channel_token.trim();
          updateData.channel_secret = formData.channel_secret.trim();
          break;
      }

      const response = await apiClient.updateBot(botId, updateData);
      
      if (response.error) {
        toast({
          variant: "destructive",
          title: "錯誤",
          description: response.error,
        });
        return;
      }

      toast({
        title: "成功",
        description: "Bot資料已成功更新",
      });
      
      onBotUpdated();
      onClose();
    } catch (error) {
      console.error('更新Bot失敗:', error);
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "更新Bot失敗",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (editType) {
      case 'name': return '修改Bot名稱';
      case 'token': return '修改Channel Token';
      case 'secret': return '修改Channel Secret';
      case 'all': return '修改Bot資料';
      default: return '修改Bot';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-[15px] p-6 w-full max-w-md mx-4 shadow-[-8px_8px_0_#819780] animate-scale-in border border-black">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#383A45]">
            {getTitle()}
          </h2>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#E74C3C] text-white rounded-md text-sm font-bold hover:bg-[#C0392B] transition"
          >
            關閉
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-[#5A2C1D]">載入中...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {(editType === 'name' || editType === 'all') && (
              <div>
                <label className="block text-sm font-medium text-[#5A2C1D] mb-1">
                  Bot名稱
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#819780]"
                  placeholder="請輸入Bot名稱"
                  required
                />
              </div>
            )}
            
            {(editType === 'token' || editType === 'all') && (
              <div>
                <label className="block text-sm font-medium text-[#5A2C1D] mb-1">
                  Channel Token
                </label>
                <textarea
                  value={formData.channel_token}
                  onChange={(e) => setFormData({...formData, channel_token: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#819780] h-20 resize-none"
                  placeholder="請輸入Channel Token"
                  required
                />
              </div>
            )}
            
            {(editType === 'secret' || editType === 'all') && (
              <div>
                <label className="block text-sm font-medium text-[#5A2C1D] mb-1">
                  Channel Secret
                </label>
                <input
                  type="text"
                  value={formData.channel_secret}
                  onChange={(e) => setFormData({...formData, channel_secret: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#819780]"
                  placeholder="請輸入Channel Secret"
                  required
                />
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#E74C3C] text-white rounded-md font-bold hover:bg-[#C0392B] transition"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#82C29B] text-white rounded-md font-bold hover:bg-[#6BAF88] transition"
                disabled={loading}
              >
                {loading ? '更新中...' : '確認'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BotEditModal;
