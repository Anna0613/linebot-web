import React, { useEffect, useRef, useState } from 'react';
import type { RichMenuArea } from '@/types/richMenu';

export interface RichMenuPreviewData {
  name: string;
  chat_bar_text: string;
  size: { width: 2500; height: 1686 | 843 };
  areas: RichMenuArea[];
  image_url?: string;
}

type Props = {
  data?: RichMenuPreviewData | null;
};

const RichMenuPreview: React.FC<Props> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dim, setDim] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const widthBase = 2500;
  const heightBase = data?.size?.height || 1686;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const width = el.clientWidth;
      const height = Math.max(180, Math.round(width * (heightBase / widthBase)));
      setDim({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [heightBase]);

  const scaleX = dim.width / widthBase;
  const scaleY = dim.height / heightBase;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">即時預覽</h3>
        {data?.chat_bar_text && (
          <div className="text-xs text-muted-foreground">聊天室按鈕：{data.chat_bar_text}</div>
        )}
      </div>
      <div ref={containerRef} className="flex-1 w-full">
        <div
          className="relative w-full h-full border rounded-md overflow-hidden bg-muted"
          style={{ height: `${dim.height}px` }}
        >
          {/* 背景圖片或佔位 */}
          {data?.image_url ? (
            <img
              src={data.image_url}
              alt="richmenu"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
              尚未上傳選單圖片
            </div>
          )}

          {/* 區塊覆蓋 */}
          {(data?.areas || []).map((a, idx) => {
            const { x, y, width, height } = a.bounds;
            const left = Math.round(x * scaleX);
            const top = Math.round(y * scaleY);
            const w = Math.max(1, Math.round(width * scaleX));
            const h = Math.max(1, Math.round(height * scaleY));
            return (
              <div
                key={idx}
                className="absolute border-2 border-blue-500/70 bg-blue-500/10"
                style={{ left, top, width: w, height: h }}
                title={`區塊 ${idx + 1}`}
              >
                <div className="absolute -top-5 left-0 text-[10px] bg-blue-600 text-white px-1 rounded">
                  #{idx + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RichMenuPreview;

