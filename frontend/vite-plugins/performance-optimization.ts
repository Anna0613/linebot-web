import { Plugin } from 'vite';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import type { OutputAsset, OutputChunk } from 'rollup';

/**
 * Vite 性能優化插件
 * 提供額外的建置時優化功能
 */
export function performanceOptimizationPlugin(): Plugin {
  return {
    name: 'performance-optimization',
    apply: 'build',
    
    generateBundle(_options, bundle) {
      // 分析包大小並生成報告
      generateSizeReport(bundle);

      // 優化 CSS
      optimizeCSS(bundle);

      // 添加資源提示
      addResourceHints(bundle);
    }
  };

  // 將方法移到外部
  interface ChunkInfo { name: string; size: number; sizeKB: string; type: 'entry' | 'dynamic'; }
  interface AssetInfo { name: string; size: number; sizeKB: string; }
  interface SizeReport { total: number; chunks: ChunkInfo[]; assets: AssetInfo[] }

  type BundleMap = Record<string, OutputAsset | OutputChunk>;

  function generateSizeReport(bundle: BundleMap) {
      const sizeReport: SizeReport = { total: 0, chunks: [], assets: [] };
      
      for (const [fileName, chunk] of Object.entries(bundle)) {
        let size = 0;
        if (chunk.type === 'chunk') {
          size = chunk.code.length;
        } else {
          const src = chunk.source;
          size = typeof src === 'string' ? src.length : src.byteLength;
        }

        sizeReport.total += size;

        if (chunk.type === 'chunk' && (chunk.isEntry || chunk.isDynamicEntry)) {
          sizeReport.chunks.push({
            name: fileName,
            size,
            sizeKB: (size / 1024).toFixed(2),
            type: chunk.isEntry ? 'entry' : 'dynamic'
          });
        } else {
          sizeReport.assets.push({
            name: fileName,
            size,
            sizeKB: (size / 1024).toFixed(2)
          });
        }
      }
      
      // 排序並顯示最大的檔案
      sizeReport.chunks.sort((a, b) => b.size - a.size);
      sizeReport.assets.sort((a, b) => b.size - a.size);
      
      console.log('\n📊 建置大小分析:');
      console.log(`總大小: ${(sizeReport.total / 1024).toFixed(2)} KB`);
      
      console.log('\n🎯 主要 Chunks:');
      sizeReport.chunks.slice(0, 5).forEach((chunk) => {
        console.log(`  ${chunk.name}: ${chunk.sizeKB} KB (${chunk.type})`);
      });
      
      console.log('\n📦 最大資源:');
      sizeReport.assets.slice(0, 5).forEach((asset) => {
        console.log(`  ${asset.name}: ${asset.sizeKB} KB`);
      });
      
      // 警告大型檔案
      const largeChunks = sizeReport.chunks.filter((chunk) => chunk.size > 500000); // 500KB
      if (largeChunks.length > 0) {
        console.log('\n⚠️  大型 Chunks (>500KB):');
        largeChunks.forEach((chunk) => {
          console.log(`  ${chunk.name}: ${chunk.sizeKB} KB`);
        });
      }
      
      // 保存報告到檔案
      writeFileSync(
        resolve(process.cwd(), 'dist/size-report.json'),
        JSON.stringify(sizeReport, null, 2)
      );
  }

  function optimizeCSS(bundle: BundleMap) {
      // 尋找 CSS 檔案並進行額外優化
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.css')) {
          if (chunk.type !== 'asset') continue;
          const src = chunk.source;
          if (typeof src !== 'string') continue;
          let css = src;
          
          // 移除多餘的空白和註釋
          css = css
            .replace(/\/\*[\s\S]*?\*\//g, '') // 移除註釋
            .replace(/\s+/g, ' ') // 壓縮空白
            .replace(/;\s*}/g, '}') // 移除最後一個分號
            .replace(/\s*{\s*/g, '{') // 壓縮大括號
            .replace(/\s*}\s*/g, '}')
            .replace(/\s*,\s*/g, ',') // 壓縮逗號
            .replace(/\s*:\s*/g, ':') // 壓縮冒號
            .replace(/\s*;\s*/g, ';') // 壓縮分號
            .trim();
          
          chunk.source = css;
          
          console.log(`✅ 優化 CSS: ${fileName} (${(css.length / 1024).toFixed(2)} KB)`);
        }
      }
  }

  function addResourceHints(bundle: BundleMap) {
      // 生成資源提示清單
      const resourceHints = {
        preload: [] as string[],
        prefetch: [] as string[],
        preconnect: [] as string[]
      };
      
      for (const [fileName, chunk] of Object.entries(bundle)) {
        
        // 關鍵資源應該 preload
        if (chunk.type === 'chunk' && chunk.isEntry) {
          resourceHints.preload.push(fileName);
        }
        
        // 動態導入的資源可以 prefetch
        if (chunk.type === 'chunk' && chunk.isDynamicEntry) {
          resourceHints.prefetch.push(fileName);
        }
      }
      
      // 保存資源提示到檔案
      writeFileSync(
        resolve(process.cwd(), 'dist/resource-hints.json'),
        JSON.stringify(resourceHints, null, 2)
      );
      
      console.log('\n🔗 資源提示生成完成');
      console.log(`Preload: ${resourceHints.preload.length} 個檔案`);
      console.log(`Prefetch: ${resourceHints.prefetch.length} 個檔案`);
  }
}

/**
 * 關鍵 CSS 提取插件
 */
function criticalCSSPlugin(): Plugin {
  return {
    name: 'critical-css',
    apply: 'build',
    
    generateBundle(_options, bundle) {
      // 提取關鍵 CSS（首屏渲染需要的樣式）
      const criticalCSS = extractCriticalCSS(bundle);

      if (criticalCSS) {
        // 將關鍵 CSS 內聯到 HTML 中
        inlineCriticalCSS(bundle, criticalCSS);
      }
    }
  };

  function extractCriticalCSS(_bundle: BundleMap): string {
      // 這裡可以實施更複雜的關鍵 CSS 提取邏輯
      // 目前返回基本的重置樣式
      return `
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{line-height:1.15;-webkit-text-size-adjust:100%}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;background-color:#ffffff;color:#1f2937}
        .loading-container{display:flex;align-items:center;justify-content:center;min-height:100vh;background-color:#f9fafb}
        .loading-spinner{width:2rem;height:2rem;border:2px solid #e5e7eb;border-top:2px solid #2563eb;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 0.75rem}
        @keyframes spin{to{transform:rotate(360deg)}}
        .loading-text{font-size:0.875rem;color:#6b7280;text-align:center}
      `.replace(/\s+/g, ' ').trim();
  }

  function inlineCriticalCSS(bundle: BundleMap, criticalCSS: string) {
      // 尋找 HTML 檔案並內聯關鍵 CSS
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.html')) {
          if (chunk.type !== 'asset') continue;
          const src = chunk.source;
          if (typeof src !== 'string') continue;
          let html = src;
          
          // 在 </head> 前插入關鍵 CSS
          const styleTag = `<style>${criticalCSS}</style>`;
          html = html.replace('</head>', `${styleTag}</head>`);
          
          chunk.source = html;
          
          console.log(`✅ 關鍵 CSS 已內聯到 ${fileName}`);
        }
      }
  }
}

export { performanceOptimizationPlugin, criticalCSSPlugin };
