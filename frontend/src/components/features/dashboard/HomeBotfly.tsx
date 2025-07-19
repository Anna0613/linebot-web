import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Plus, Settings, FileText, Edit, Trash2 } from 'lucide-react';
import { useBotManagement } from '@/hooks/useBotManagement';
import { Loader } from "@/components/ui/loader";

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string;
  isLineUser?: boolean;
}

interface HomeBotflyProps {
  user: User | null;
}

const HomeBotfly: React.FC<HomeBotflyProps> = ({ user }) => {
  const { bots, isLoading, error, fetchBots, deleteBot } = useBotManagement();

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  const handleDeleteBot = async (botId: string) => {
    if (window.confirm('確定要刪除這個 Bot 嗎？')) {
      await deleteBot(botId);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          歡迎回來，{user?.display_name || user?.username || '用戶'}！
        </h1>
        <p className="text-lg text-gray-600">
          管理您的 LINE Bot，創建智能對話體驗
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">創建新 Bot</CardTitle>
            <Plus className="h-6 w-6 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              快速創建一個新的 LINE Bot 專案
            </p>
            <Button asChild className="w-full">
              <Link to="/bots/create">開始創建</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Bot 編輯器</CardTitle>
            <Bot className="h-6 w-6 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              設計和編輯您的 Bot 對話流程
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/bots/editor">進入編輯器</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">設定</CardTitle>
            <Settings className="h-6 w-6 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              管理您的帳戶和 Bot 設定
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/setting">前往設定</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bot List Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">我的 Bot</h2>
          <Button asChild size="sm">
            <Link to="/bots/create">
              <Plus className="h-4 w-4 mr-2" />
              新增 Bot
            </Link>
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : bots.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">還沒有任何 Bot</p>
            <Button asChild>
              <Link to="/bots/create">創建第一個 Bot</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map((bot) => (
              <Card key={bot.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{bot.name}</CardTitle>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link to={`/bots/${bot.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteBot(bot.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {bot.description && (
                    <p className="text-sm text-gray-600 mt-2">{bot.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">狀態:</span>
                      <span className={`font-medium ${bot.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                        {bot.is_active ? '啟用' : '停用'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">建立時間:</span>
                      <span className="text-gray-800">
                        {new Date(bot.created_at).toLocaleDateString('zh-TW')}
                      </span>
                    </div>
                    {bot.channel_access_token && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">頻道已設定:</span>
                        <span className="text-green-600 font-medium">是</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Button asChild className="w-full" size="sm">
                      <Link to={`/bots/${bot.id}`}>查看詳情</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <FileText className="h-6 w-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-blue-900">需要幫助？</h3>
        </div>
        <p className="text-blue-700 mb-4">
          查看我們的建立教學，了解如何快速開始您的 LINE Bot 開發之旅。
        </p>
        <Button asChild variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
          <Link to="/how-to-establish">查看教學</Link>
        </Button>
      </div>
    </div>
  );
};

export default HomeBotfly;