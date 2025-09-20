# 圖片使用指南

## 目錄結構

- `webp/` - WebP 格式圖片（優先使用）
  - `image.webp` - 原始尺寸
  - `image-lg.webp` - 大螢幕版本 (1200px)
  - `image-md.webp` - 平板版本 (768px)
  - `image-sm.webp` - 手機版本 (480px)
- `origin/` - 優化後的原始格式圖片（後備使用）

## React 響應式圖片組件

建議創建以下組件來自動處理圖片載入：

```jsx
// src/components/ui/ResponsiveImage.tsx
import React from 'react';

interface ResponsiveImageProps {
  src: string; // 不含副檔名的檔案名稱
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  className,
  loading = 'lazy'
}) => {
  return (
    <picture className={className}>
      <source 
        media="(min-width: 1200px)" 
        srcSet={`/assets/images/webp/${src}-lg.webp`} 
        type="image/webp"
      />
      <source 
        media="(min-width: 768px)" 
        srcSet={`/assets/images/webp/${src}-md.webp`} 
        type="image/webp"
      />
      <source 
        media="(max-width: 767px)" 
        srcSet={`/assets/images/webp/${src}-sm.webp`} 
        type="image/webp"
      />
      <source 
        srcSet={`/assets/images/webp/${src}.webp`} 
        type="image/webp"
      />
      <img 
        src={`/assets/images/origin/${src}.png`} 
        alt={alt}
        loading={loading}
        decoding="async"
        className="w-full h-auto"
      />
    </picture>
  );
};
```

## 使用範例

```jsx
// 使用響應式圖片組件
<ResponsiveImage 
  src="LOGO" 
  alt="LineBot-Web Logo" 
  className="w-32 h-32"
/>

// 直接使用 WebP（推薦）
<img 
  src="/assets/images/webp/LOGO.webp" 
  alt="Logo" 
  loading="lazy"
/>
```

## 重新生成圖片

執行以下命令重新優化所有圖片：

```bash
npm run optimize-images
```
