#!/usr/bin/env node

/**
 * 圖片優化腳本 - 新版本
 * 將圖片分別存放到 webp 和 origin 目錄
 * 支援響應式圖片生成
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 配置
const CONFIG = {
  // 輸入目錄
  inputDirs: [
    path.join(__dirname, '../assets/images/origin')
  ],
  // 輸出目錄
  webpOutputDir: path.join(__dirname, '../assets/images/webp'),
  originOutputDir: path.join(__dirname, '../assets/images/origin'),
  // WebP 品質設定
  webpQuality: 85,
  // PNG 壓縮等級
  pngCompressionLevel: 9,
  // 支援的圖片格式
  supportedFormats: ['.png', '.jpg', '.jpeg'],
  // 響應式圖片尺寸
  responsiveSizes: [
    { suffix: '', width: null, quality: 85 }, // 原始大小
    { suffix: '-lg', width: 1200, quality: 85 }, // 大螢幕
    { suffix: '-md', width: 768, quality: 85 },  // 平板
    { suffix: '-sm', width: 480, quality: 90 }   // 手機
  ]
};

/**
 * 獲取目錄中的所有圖片檔案
 */
function getImageFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`目錄不存在: ${dir}`);
    return [];
  }

  const files = fs.readdirSync(dir);
  return files
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return CONFIG.supportedFormats.includes(ext);
    })
    .map(file => path.join(dir, file));
}

/**
 * 優化單個圖片檔案
 */
async function optimizeImage(inputPath) {
  try {
    const filename = path.basename(inputPath, path.extname(inputPath));
    const ext = path.extname(inputPath).toLowerCase();
    
    console.log(`處理圖片: ${inputPath}`);
    
    // 獲取圖片資訊
    const metadata = await sharp(inputPath).metadata();
    console.log(`  原始尺寸: ${metadata.width}x${metadata.height}`);
    console.log(`  原始格式: ${metadata.format}`);
    
    const originalSize = fs.statSync(inputPath).size;
    console.log(`  原始大小: ${(originalSize / 1024).toFixed(2)} KB`);
    
    // 確保輸出目錄存在
    if (!fs.existsSync(CONFIG.webpOutputDir)) {
      fs.mkdirSync(CONFIG.webpOutputDir, { recursive: true });
    }
    if (!fs.existsSync(CONFIG.originOutputDir)) {
      fs.mkdirSync(CONFIG.originOutputDir, { recursive: true });
    }
    
    let totalWebpSize = 0;
    
    // 生成響應式 WebP 圖片
    for (const size of CONFIG.responsiveSizes) {
      const webpFilename = `${filename}${size.suffix}.webp`;
      const webpPath = path.join(CONFIG.webpOutputDir, webpFilename);
      
      let sharpInstance = sharp(inputPath);
      
      // 如果指定了寬度，進行縮放
      if (size.width && metadata.width > size.width) {
        sharpInstance = sharpInstance.resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }
      
      await sharpInstance
        .webp({ 
          quality: size.quality,
          effort: 6
        })
        .toFile(webpPath);
      
      const webpSize = fs.statSync(webpPath).size;
      totalWebpSize += webpSize;
      console.log(`  生成 WebP: ${webpFilename} (${(webpSize / 1024).toFixed(2)} KB)`);
    }
    
    // 複製優化的原始圖片到 origin 目錄
    const originPath = path.join(CONFIG.originOutputDir, `${filename}${ext}`);
    
    if (ext === '.png') {
      // 優化 PNG
      await sharp(inputPath)
        .png({ 
          compressionLevel: CONFIG.pngCompressionLevel,
          adaptiveFiltering: true,
          palette: true
        })
        .toFile(originPath);
    } else {
      // 對於 JPG，進行質量優化
      await sharp(inputPath)
        .jpeg({ 
          quality: 90,
          progressive: true
        })
        .toFile(originPath);
    }
    
    const optimizedSize = fs.statSync(originPath).size;
    const totalSavings = ((originalSize - totalWebpSize) / originalSize * 100).toFixed(1);
    
    console.log(`  優化原圖: ${filename}${ext} (${(optimizedSize / 1024).toFixed(2)} KB)`);
    console.log(`  總節省: ${totalSavings}%`);
    console.log(`  ✅ 完成處理: ${filename}`);
    
    return {
      original: originalSize,
      webp: totalWebpSize,
      optimized: optimizedSize,
      savings: totalSavings
    };
    
  } catch (error) {
    console.error(`處理 ${inputPath} 時發生錯誤:`, error.message);
    return null;
  }
}

/**
 * 處理目錄中的所有圖片
 */
async function processDirectory(dir) {
  console.log(`\n處理目錄: ${dir}`);
  const imageFiles = getImageFiles(dir);
  
  if (imageFiles.length === 0) {
    console.log('  沒有找到圖片檔案');
    return [];
  }
  
  console.log(`找到 ${imageFiles.length} 個圖片檔案\n`);
  
  const results = [];
  for (const imagePath of imageFiles) {
    const result = await optimizeImage(imagePath);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

/**
 * 生成使用指南
 */
function generateUsageGuide() {
  const guidePath = path.join(CONFIG.webpOutputDir, '../README.md');
  const guide = `# 圖片使用指南

## 目錄結構

- \`webp/\` - WebP 格式圖片（優先使用）
  - \`image.webp\` - 原始尺寸
  - \`image-lg.webp\` - 大螢幕版本 (1200px)
  - \`image-md.webp\` - 平板版本 (768px)
  - \`image-sm.webp\` - 手機版本 (480px)
- \`origin/\` - 優化後的原始格式圖片（後備使用）

## React 響應式圖片組件

建議創建以下組件來自動處理圖片載入：

\`\`\`jsx
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
        srcSet={\`/assets/images/webp/\${src}-lg.webp\`} 
        type="image/webp"
      />
      <source 
        media="(min-width: 768px)" 
        srcSet={\`/assets/images/webp/\${src}-md.webp\`} 
        type="image/webp"
      />
      <source 
        media="(max-width: 767px)" 
        srcSet={\`/assets/images/webp/\${src}-sm.webp\`} 
        type="image/webp"
      />
      <source 
        srcSet={\`/assets/images/webp/\${src}.webp\`} 
        type="image/webp"
      />
      <img 
        src={\`/assets/images/origin/\${src}.png\`} 
        alt={alt}
        loading={loading}
        decoding="async"
        className="w-full h-auto"
      />
    </picture>
  );
};
\`\`\`

## 使用範例

\`\`\`jsx
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
\`\`\`

## 重新生成圖片

執行以下命令重新優化所有圖片：

\`\`\`bash
npm run optimize-images
\`\`\`
`;

  fs.writeFileSync(guidePath, guide);
  console.log(`📖 使用指南已生成: ${guidePath}`);
}

/**
 * 主函數
 */
async function main() {
  console.log('🚀 開始圖片優化...');
  
  const startTime = Date.now();
  let totalResults = [];
  
  // 處理所有輸入目錄
  for (const inputDir of CONFIG.inputDirs) {
    const results = await processDirectory(inputDir);
    totalResults = totalResults.concat(results);
  }
  
  // 生成統計報告
  if (totalResults.length > 0) {
    const totalOriginal = totalResults.reduce((sum, r) => sum + r.original, 0);
    const totalWebp = totalResults.reduce((sum, r) => sum + r.webp, 0);
    const totalSavings = ((totalOriginal - totalWebp) / totalOriginal * 100).toFixed(1);
    
    console.log('\n📊 優化總結:');
    console.log(`處理檔案數: ${totalResults.length}`);
    console.log(`原始總大小: ${(totalOriginal / 1024).toFixed(2)} KB`);
    console.log(`WebP 總大小: ${(totalWebp / 1024).toFixed(2)} KB`);
    console.log(`總節省空間: ${totalSavings}%`);
  }
  
  // 生成使用指南
  generateUsageGuide();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`\n✅ 圖片優化完成！耗時: ${duration} 秒`);
}

// 執行主函數
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { optimizeImage, processDirectory };
