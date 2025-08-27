import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  Users, 
  Clock, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight,
  User,
  Activity,
  Filter
} from 'lucide-react';
import { useBotUsers, type BotUser, type PaginationParams } from '@/hooks/usePagination';

interface BotUsersListProps {
  botId: string;
  initialPage?: number;
}

const BotUsersList: React.FC<BotUsersListProps> = ({ 
  botId, 
  initialPage = 1 
}) => {
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // 使用 useMemo 來優化查詢參數
  const queryParams: PaginationParams = useMemo(() => ({
    page,
    limit: 20,
    search: search || undefined,
    active_only: activeOnly || undefined,
  }), [page, search, activeOnly]);

  const { 
    data: usersData, 
    isLoading, 
    error, 
    isFetching 
  } = useBotUsers(botId, queryParams, {
    // 保持前一頁資料以實現平滑切換
    keepPreviousData: true,
  });

  // 處理搜尋提交
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1); // 重置到第一頁
  };

  // 處理清除搜尋
  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  // 處理篩選切換
  const handleActiveToggle = (checked: boolean) => {
    setActiveOnly(checked);
    setPage(1); // 重置到第一頁
  };

  // 分頁控制
  const goToPage = (newPage: number) => {
    setPage(newPage);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-red-600">
            <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>載入用戶資料失敗</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="mt-2"
            >
              重新載入
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 搜尋和篩選區域 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            用戶管理
            {usersData && (
              <Badge variant="secondary">
                共 {usersData.total} 位用戶
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 搜尋框 */}
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜尋用戶名稱或 LINE ID..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 pr-24"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                  {search && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearch}
                      className="h-6 w-6 p-0"
                    >
                      ✕
                    </Button>
                  )}
                  <Button type="submit" size="sm" disabled={isFetching}>
                    搜尋
                  </Button>
                </div>
              </div>
            </form>

            {/* 活躍用戶篩選 */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium">只顯示活躍用戶</label>
              <Switch
                checked={activeOnly}
                onCheckedChange={handleActiveToggle}
                disabled={isFetching}
              />
            </div>
          </div>

          {/* 搜尋狀態顯示 */}
          {(search || activeOnly) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {search && (
                <Badge variant="outline">
                  搜尋: {search}
                </Badge>
              )}
              {activeOnly && (
                <Badge variant="outline">
                  僅活躍用戶
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 用戶列表 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            // 載入中狀態
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="w-16 h-6 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : !usersData?.items?.length ? (
            // 空狀態
            <div className="p-8 text-center">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {search || activeOnly ? '沒有符合條件的用戶' : '尚未有用戶互動'}
              </h3>
              <p className="text-gray-500 mb-4">
                {search || activeOnly 
                  ? '請嘗試調整搜尋條件或篩選設定'
                  : '當有用戶與 Bot 互動時，他們會出現在這裡'
                }
              </p>
              {(search || activeOnly) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    handleClearSearch();
                    setActiveOnly(false);
                  }}
                >
                  清除篩選
                </Button>
              )}
            </div>
          ) : (
            // 用戶列表
            <div className="divide-y">
              {usersData.items.map((user: BotUser) => (
                <div key={user.id} className={`p-4 hover:bg-gray-50 ${isFetching ? 'opacity-75' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={user.picture_url} />
                        <AvatarFallback>
                          {user.display_name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground truncate">
                            {user.display_name || '未知用戶'}
                          </h4>
                          <Badge variant={user.is_followed ? "default" : "secondary"}>
                            {user.is_followed ? "關注中" : "已取消關注"}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground font-mono">
                          {user.line_user_id}
                        </p>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {user.interaction_count} 次互動
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            最後活動: {user.last_interaction 
                              ? new Date(user.last_interaction).toLocaleString('zh-TW')
                              : '未知'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Activity className={`h-4 w-4 ${user.is_followed ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分頁控制 */}
      {usersData && usersData.pages > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                第 {usersData.page} 頁，共 {usersData.pages} 頁
                （顯示 {Math.min(usersData.limit, usersData.items.length)} / {usersData.total} 項）
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page - 1)}
                  disabled={!usersData.has_prev || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一頁
                </Button>
                
                <div className="flex items-center gap-1">
                  {/* 顯示頁碼 */}
                  {Array.from({ length: Math.min(5, usersData.pages) }, (_, i) => {
                    let pageNum;
                    if (usersData.pages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= usersData.pages - 2) {
                      pageNum = usersData.pages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        disabled={isFetching}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={!usersData.has_next || isFetching}
                >
                  下一頁
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BotUsersList;