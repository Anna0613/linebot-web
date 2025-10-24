import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import type { RichMenu } from '@/types/richMenu';

type Props = {
  menus: RichMenu[];
  onEdit: (menu: RichMenu) => void;
  onDelete: (menu: RichMenu) => void;
  onPublish: (menu: RichMenu) => void;
  onCreateNew: () => void;
  publishingMenuId?: string | null;
};

const RichMenuList: React.FC<Props> = ({ menus, onEdit, onDelete, onPublish, onCreateNew, publishingMenuId = null }) => {
  return (
    <div className="space-y-4">
      {/* 頂部操作區域 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">功能選單列表</h3>
        <Button onClick={onCreateNew} size="sm">
          新增選單
        </Button>
      </div>

      {!menus.length ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">尚未建立任何選單</p>
              <p className="text-sm">點擊上方「新增選單」按鈕即可開始建立您的第一個功能選單</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {menus.map((menu, index) => (
            <Card key={menu.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* 左側：選單信息 */}
                  <div className="flex items-center space-x-4 flex-1">
                    {/* 選單縮圖 */}
                    <div className="w-16 h-10 rounded border overflow-hidden bg-muted flex-shrink-0">
                      {menu.image_url ? (
                        <img
                          src={menu.image_url}
                          alt={menu.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          無圖片
                        </div>
                      )}
                    </div>

                    {/* 選單詳情 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{menu.name}</h4>
                        {menu.selected && (
                          <Badge variant="default" className="text-xs">當前功能選單</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        聊天室按鈕：{menu.chat_bar_text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        區域數量：{Array.isArray(menu.areas) ? menu.areas.length : 0} 個
                      </p>
                    </div>
                  </div>

                  {/* 右側：操作按鈕 */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(menu)}
                      disabled={publishingMenuId === menu.id}
                    >
                      編輯
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPublish(menu)}
                      disabled={!menu.image_url || publishingMenuId === menu.id}
                      title={!menu.image_url ? "請先上傳選單圖片" : "發佈到 LINE 並設為預設功能選單"}
                    >
                      {publishingMenuId === menu.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          發佈中...
                        </>
                      ) : (
                        '發佈到 LINE'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(menu)}
                      disabled={publishingMenuId === menu.id}
                    >
                      刪除
                    </Button>
                  </div>
                </div>
              </CardContent>
              {index < menus.length - 1 && <Separator />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RichMenuList;
