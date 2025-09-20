import React from 'react';

interface ResponsiveImageProps {
  /** 圖片檔案名稱（不含副檔名） */
  src: string;
  /** 圖片替代文字 */
  alt: string;
  /** CSS 類名 */
  className?: string;
  /** 載入策略 */
  loading?: 'lazy' | 'eager';
  /** 圖片解碼策略 */
  decoding?: 'async' | 'sync' | 'auto';
  /** 圖片格式（預設為 png） */
  fallbackFormat?: 'png' | 'jpg' | 'jpeg';
  /** 是否使用響應式圖片 */
  responsive?: boolean;
  /** 自定義尺寸 */
  sizes?: string;
}

/**
 * 響應式圖片組件
 * 
 * 自動處理 WebP 格式優先載入，並提供 PNG/JPG 後備
 * 支援響應式圖片載入以優化不同螢幕尺寸的性能
 * 
 * @example
 * ```tsx
 * // 基本使用
 * <ResponsiveImage src="LOGO" alt="LineBot-Web Logo" />
 * 
 * // 響應式圖片
 * <ResponsiveImage 
 *   src="p1" 
 *   alt="專題圖片" 
 *   responsive={true}
 *   className="w-full h-auto"
 * />
 * 
 * // 自定義尺寸
 * <ResponsiveImage 
 *   src="LOGO" 
 *   alt="Logo" 
 *   sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
 * />
 * ```
 */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  className = '',
  loading = 'lazy',
  decoding = 'async',
  fallbackFormat = 'png',
  responsive = true,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
}) => {
  // 基礎路徑
  const webpBasePath = '/assets/images/webp';
  const originBasePath = '/assets/images/origin';
  
  if (!responsive) {
    // 非響應式圖片：只使用原始尺寸
    return (
      <picture className={className}>
        <source 
          srcSet={`${webpBasePath}/${src}.webp`} 
          type="image/webp"
        />
        <img 
          src={`${originBasePath}/${src}.${fallbackFormat}`} 
          alt={alt}
          loading={loading}
          decoding={decoding}
          className="w-full h-auto"
        />
      </picture>
    );
  }

  // 響應式圖片：使用多種尺寸
  return (
    <picture className={className}>
      {/* WebP 格式 - 響應式 */}
      <source 
        media="(min-width: 1200px)" 
        srcSet={`${webpBasePath}/${src}-lg.webp`} 
        type="image/webp"
        sizes={sizes}
      />
      <source 
        media="(min-width: 768px)" 
        srcSet={`${webpBasePath}/${src}-md.webp`} 
        type="image/webp"
        sizes={sizes}
      />
      <source 
        media="(max-width: 767px)" 
        srcSet={`${webpBasePath}/${src}-sm.webp`} 
        type="image/webp"
        sizes={sizes}
      />
      
      {/* WebP 格式 - 原始尺寸後備 */}
      <source 
        srcSet={`${webpBasePath}/${src}.webp`} 
        type="image/webp"
        sizes={sizes}
      />
      
      {/* 原始格式後備 */}
      <img 
        src={`${originBasePath}/${src}.${fallbackFormat}`} 
        alt={alt}
        loading={loading}
        decoding={decoding}
        className="w-full h-auto"
        sizes={sizes}
      />
    </picture>
  );
};

/**
 * 簡化的圖片組件，只使用 WebP 格式
 */
export const WebPImage: React.FC<Omit<ResponsiveImageProps, 'responsive' | 'fallbackFormat'>> = ({
  src,
  alt,
  className = '',
  loading = 'lazy',
  decoding = 'async'
}) => {
  return (
    <img 
      src={`/assets/images/webp/${src}.webp`}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={className}
    />
  );
};

/**
 * 專題圖片組件，專門用於顯示專題相關圖片
 */
export const ProjectImage: React.FC<{
  projectNumber: number;
  alt?: string;
  className?: string;
  responsive?: boolean;
}> = ({
  projectNumber,
  alt,
  className = '',
  responsive = true
}) => {
  const src = `p${projectNumber}`;
  const defaultAlt = alt || `專題圖片 ${projectNumber}`;
  
  return (
    <ResponsiveImage 
      src={src}
      alt={defaultAlt}
      className={className}
      responsive={responsive}
    />
  );
};

export default ResponsiveImage;
