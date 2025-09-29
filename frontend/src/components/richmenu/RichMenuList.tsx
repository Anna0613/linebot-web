import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { RichMenu } from '@/types/richMenu';

type Props = {
  menus: RichMenu[];
  onEdit: (menu: RichMenu) => void;
  onDelete: (menu: RichMenu) => void;
  onSetDefault: (menu: RichMenu) => void;
};

const RichMenuList: React.FC<Props> = ({ menus, onEdit, onDelete, onSetDefault }) => {
  if (!menus.length) {
    return (
      <Card>
        <CardHeader><CardTitle>功能選單列表（Rich Menu）</CardTitle></CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">尚未建立任何選單，點右上角「新增選單」即可開始。</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {menus.map(m => (
        <Card key={m.id} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{m.name}</CardTitle>
            {m.selected && <Badge title="所有人預設看到">預設</Badge>}
          </CardHeader>
          <CardContent className="space-y-2">
            {m.image_url ? (
              <img src={m.image_url} className="w-full rounded border" alt={m.name} />
            ) : (
              <div className="w-full h-24 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">尚未上傳選單圖片</div>
            )}
            <div className="text-xs text-muted-foreground">聊天室下方按鈕：{m.chat_bar_text}</div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="secondary" onClick={() => onEdit(m)}>編輯</Button>
              {!m.selected && <Button variant="outline" onClick={() => onSetDefault(m)}>設為大家預設</Button>}
              <Button variant="destructive" onClick={() => onDelete(m)}>刪除</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RichMenuList;
