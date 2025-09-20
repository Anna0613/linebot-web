#!/usr/bin/env node

/**
 * 圖片優化腳本
 * 將 PNG 圖片轉換為 WebP 格式以減少檔案大小
 * 使用 sharp 庫進行高效能圖片處理
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 配置
const CONFIG = {
  // 輸入目錄
  inputDirs: [
    path.join(__dirname, '../frontend/public/專題圖片'),
    path.join(__dirname, '../assets/images')
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
  ],
  // 是否保留原始檔案
  keepOriginal: true
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
async function optimizeImage(inputPath, outputDir) {
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
    
    // 生成 WebP 版本
    const webpPath = path.join(outputDir, `${filename}.webp`);
    await sharp(inputPath)
      .webp({ 
        quality: CONFIG.webpQuality,
        effort: 6 // 最高壓縮努力等級
      })
      .toFile(webpPath);
    
    const webpSize = fs.statSync(webpPath).size;
    const webpSavings = ((originalSize - webpSize) / originalSize * 100).toFixed(1);
    console.log(`  WebP 大小: ${(webpSize / 1024).toFixed(2)} KB (節省 ${webpSavings}%)`);
    
    // 如果是 PNG，也優化原始檔案
    if (ext === '.png') {
      const optimizedPngPath = path.join(outputDir, `${filename}_optimized.png`);
      await sharp(inputPath)
        .png({ 
          compressionLevel: CONFIG.pngCompressionLevel,
          adaptiveFiltering: true,
          palette: true
        })
        .toFile(optimizedPngPath);
      
      const optimizedPngSize = fs.statSync(optimizedPngPath).size;
      const pngSavings = ((originalSize - optimizedPngSize) / originalSize * 100).toFixed(1);
      console.log(`  優化 PNG 大小: ${(optimizedPngSize / 1024).toFixed(2)} KB (節省 ${pngSavings}%)`);
      
      // 如果優化後的 PNG 更小，替換原始檔案
      if (optimizedPngSize < originalSize && !CONFIG.keepOriginal) {
        fs.renameSync(optimizedPngPath, inputPath);
        console.log(`  已替換原始 PNG 檔案`);
      } else if (!CONFIG.keepOriginal) {
        fs.unlinkSync(optimizedPngPath);
      }
    }
    
    console.log(`  ✅ 完成處理: ${filename}`);
    return {
      original: originalSize,
      webp: webpSize,
      savings: webpSavings
    };
    
  } catch (error) {
    console.error(`❌ 處理失敗 ${inputPath}:`, error.message);
    return null;
  }
}

/**
 * 生成響應式圖片版本
 */
async function generateResponsiveImages(inputPath, outputDir) {
  try {
    const filename = path.basename(inputPath, path.extname(inputPath));
    const metadata = await sharp(inputPath).metadata();
    
    // 只為大圖片生成響應式版本
    if (metadata.width <= 400) {
      return;
    }
    
    const sizes = [
      { width: 400, suffix: '-sm' },
      { width: 800, suffix: '-md' },
      { width: 1200, suffix: '-lg' }
    ].filter(size => size.width < metadata.width);
    
    for (const size of sizes) {
      const responsivePath = path.join(outputDir, `${filename}${size.suffix}.webp`);
      await sharp(inputPath)
        .resize(size.width, null, { 
          withoutEnlargement: true,
          fastShrinkOnLoad: true
        })
        .webp({ quality: CONFIG.webpQuality })
        .toFile(responsivePath);
      
      console.log(`  生成響應式版本: ${size.width}px`);
    }
  } catch (error) {
    console.error(`生成響應式圖片失敗:`, error.message);
  }
}

/**
 * 主要執行函數
 */
async function main() {
  console.log('🖼️  開始圖片優化...\n');
  
  let totalOriginalSize = 0;
  let totalWebpSize = 0;
  let processedCount = 0;
  
  for (let i = 0; i < CONFIG.inputDirs.length; i++) {
    const inputDir = CONFIG.inputDirs[i];
    const outputDir = CONFIG.outputDirs[i];
    
    console.log(`處理目錄: ${inputDir}`);
    
    // 確保輸出目錄存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const imageFiles = getImageFiles(inputDir);
    console.log(`找到 ${imageFiles.length} 個圖片檔案\n`);
    
    for (const imagePath of imageFiles) {
      const result = await optimizeImage(imagePath, outputDir);
      if (result) {
        totalOriginalSize += result.original;
        totalWebpSize += result.webp;
        processedCount++;
        
        // 生成響應式版本
        await generateResponsiveImages(imagePath, outputDir);
      }
      console.log(''); // 空行分隔
    }
  }
  
  // 顯示總結
  console.log('📊 優化總結:');
  console.log(`處理檔案數: ${processedCount}`);
  console.log(`原始總大小: ${(totalOriginalSize / 1024).toFixed(2)} KB`);
  console.log(`WebP 總大小: ${(totalWebpSize / 1024).toFixed(2)} KB`);
  
  if (totalOriginalSize > 0) {
    const totalSavings = ((totalOriginalSize - totalWebpSize) / totalOriginalSize * 100).toFixed(1);
    console.log(`總節省空間: ${totalSavings}%`);
  }
  
  console.log('\n✅ 圖片優化完成！');
}

// 檢查是否安裝了 sharp
try {
  require.resolve('sharp');
} catch (error) {
  console.error('❌ 請先安裝 sharp: npm install sharp');
  process.exit(1);
}

// 執行主函數
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 優化過程中發生錯誤:', error);
    process.exit(1);
  });
}

module.exports = { optimizeImage, generateResponsiveImages };
