import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath, URL } from "node:url";
import { componentTagger } from "lovable-tagger";
import fs from "fs";
import type { ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
// import { performanceOptimizationPlugin, criticalCSSPlugin } from './vite-plugins/performance-optimization';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // 確保 assets 目錄被正確複製到 dist
  publicDir: false, // 禁用默認的 public 目錄，我們將手動處理靜態資源
  // 確保 React 使用 production 版本
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
    __DEV__: mode !== 'production',
  },
  // 優化依賴預構建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      // 強制預構建 recharts 和相關 lodash 模組
      'recharts',
      'lodash/get',
      'lodash/isString',
      'lodash/isNaN',
      'lodash/isNumber',
      'lodash/isNil'
    ],
    exclude: [
      // 排除大型依賴，讓它們按需載入
      'framer-motion'
    ]
  },
  server: {
    host: "::",
    port: 8080,
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: false,
    allowedHosts: [
      "linebot.jkl921102.org",
      "localhost",
      "10.1.1.184",
      "172.22.0.3"
    ]
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // 自定義靜態資源插件
    {
      name: 'assets-middleware',
      configureServer(server: ViteDevServer) {
        server.middlewares.use('/assets', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const assetsPath = path.join(fileURLToPath(new URL('.', import.meta.url)), '../assets', req.url || '');

          if (fs.existsSync(assetsPath) && fs.statSync(assetsPath).isFile()) {
            const ext = path.extname(assetsPath).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.webp': 'image/webp',
              '.svg': 'image/svg+xml',
              '.gif': 'image/gif',
              '.js': 'application/javascript',
              '.mjs': 'application/javascript',
              '.jsx': 'application/javascript',
              '.ts': 'application/javascript',
              '.tsx': 'application/javascript',
              '.css': 'text/css',
              '.json': 'application/json'
            };

            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            fs.createReadStream(assetsPath).pipe(res);
          } else {
            next();
          }
        });
      }
    },
    // 開發環境和預覽環境提供 manifest.json，避免瀏覽器解析錯誤
    {
      name: 'manifest-middleware',
      configureServer(server: ViteDevServer) {
        server.middlewares.use('/manifest.json', (_req: IncomingMessage, res: ServerResponse) => {
          const manifest = {
            name: 'LineBot-Web',
            short_name: 'LineBotWeb',
            start_url: '/',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#2563eb',
            icons: [
              { src: '/assets/images/logo.svg', sizes: 'any', type: 'image/svg+xml' },
              { src: '/assets/images/webp/LOGO-sm.webp', sizes: '192x192', type: 'image/webp' },
              { src: '/assets/images/webp/LOGO-md.webp', sizes: '384x384', type: 'image/webp' },
              { src: '/assets/images/webp/LOGO.webp', sizes: '512x512', type: 'image/webp' },
              { src: '/assets/images/webp/LOGO-lg.webp', sizes: '1024x1024', type: 'image/webp' }
            ]
          };
          res.setHeader('Content-Type', 'application/manifest+json');
          res.end(JSON.stringify(manifest));
        });
      },
      configurePreviewServer(server: ViteDevServer) {
        server.middlewares.use('/manifest.json', (_req: IncomingMessage, res: ServerResponse) => {
          const manifest = {
            name: 'LineBot-Web',
            short_name: 'LineBotWeb',
            start_url: '/',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#2563eb',
            icons: [
              { src: '/assets/images/logo.svg', sizes: 'any', type: 'image/svg+xml' },
              { src: '/assets/images/webp/LOGO-sm.webp', sizes: '192x192', type: 'image/webp' },
              { src: '/assets/images/webp/LOGO-md.webp', sizes: '384x384', type: 'image/webp' },
              { src: '/assets/images/webp/LOGO.webp', sizes: '512x512', type: 'image/webp' },
              { src: '/assets/images/webp/LOGO-lg.webp', sizes: '1024x1024', type: 'image/webp' }
            ]
          };
          res.setHeader('Content-Type', 'application/manifest+json');
          res.end(JSON.stringify(manifest));
        });
      }
    },
    // 只在生產建置時啟用性能優化插件
    // mode === 'production' && performanceOptimizationPlugin(),
    // mode === 'production' && criticalCSSPlugin()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(fileURLToPath(new URL('.', import.meta.url)), "./src"),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // 啟用 CSS 代碼分割
    cssCodeSplit: true,
    // 設定 chunk 大小警告限制
    chunkSizeWarningLimit: 1000,
    // 啟用壓縮
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        // 簡化的代碼分割策略
        manualChunks: {
          // React 核心
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 圖表庫
          'charts': ['recharts'],
          // UI 組件
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          // 圖標
          'icons': ['lucide-react']
        },
        // 文件命名策略
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
}));
