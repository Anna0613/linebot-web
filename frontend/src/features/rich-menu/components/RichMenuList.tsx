import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader } from '@/components/ui/loader';
import type { RichMenu } from '@/features/rich-menu/types/richMenu';

type Props = {
  menus: RichMenu[];
  onEdit: (menu: RichMenu) => void;
  onDelete: (menu: RichMenu) => void;
  onPublish: (menu: RichMenu) => void;
  onCreateNew: () => void;
  onPreview?: (menu: RichMenu) => void;
  previewingMenuId?: string | null;
  publishingMenuId?: string | null;
};

const RichMenuList: React.FC<Props> = ({
  menus,
  onEdit,
  onDelete,
  onPublish,
  onCreateNew,
  onPreview,
  previewingMenuId = null,
  publishingMenuId = null,
}) => {
  const getPublishState = (menu: RichMenu) => {
    const isPublishing = publishingMenuId === menu.id;
    const needsContentPublish = !menu.line_rich_menu_id;
    const needsDefaultSwitch = !menu.selected;
    const canPublish = Boolean(menu.image_url) && (needsContentPublish || needsDefaultSwitch);

    if (!menu.image_url) {
      return { disabled: true, title: '請先上傳選單圖片' };
    }
    if (isPublishing) {
      return { disabled: true, title: '正在發佈到 LINE' };
    }
    if (!canPublish) {
      return { disabled: true, title: '此選單已是目前發佈版本，沒有需要發佈的更新' };
    }
    if (needsContentPublish) {
      return { disabled: false, title: '發佈更新到 LINE 並設為預設功能選單' };
    }
    return { disabled: false, title: '發佈到 LINE 並設為預設功能選單' };
  };

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
          {menus.map((menu, index) => {
            const publishState = getPublishState(menu);
            const isPreviewing = previewingMenuId === menu.id;

            return (
              <Card
                key={menu.id}
                role={onPreview ? 'button' : undefined}
                tabIndex={onPreview ? 0 : undefined}
                className={`overflow-hidden transition-colors ${onPreview ? 'cursor-pointer hover:border-primary/50 hover:bg-muted/30' : ''} ${isPreviewing ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => onPreview?.(menu)}
                onKeyDown={(event) => {
                  if (!onPreview) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onPreview(menu);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    {/* 左側：選單信息 */}
                    <div className="flex items-center space-x-4 flex-1">
                      {/* 選單縮圖 */}
                      <div className="h-10 w-16 flex-shrink-0 overflow-hidden rounded-sm border bg-muted">
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
                    <div
                      className="flex items-center space-x-2 flex-shrink-0"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
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
                        disabled={publishState.disabled}
                        title={publishState.title}
                      >
                        {publishingMenuId === menu.id ? (
                          <>
                            <Loader size="sm" className="mr-2" />
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RichMenuList;
