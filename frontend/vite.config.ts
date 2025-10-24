import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath, URL } from "node:url";
// import { componentTagger } from "lovable-tagger"; // 已禁用以避免不必要的網路連接
import fs from "fs";
import type { ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
// import { performanceOptimizationPlugin, criticalCSSPlugin } from './vite-plugins/performance-optimization';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // ========================================
  // 🔧 從環境變數讀取配置
  // ========================================
  // 後端 API URL
  const BACKEND_BASE = env.VITE_UNIFIED_API_URL || "http://127.0.0.1:8000";

  // 開發伺服器配置
  const DEV_SERVER_HOST = env.VITE_DEV_SERVER_HOST || "::";
  const DEV_SERVER_PORT = parseInt(env.VITE_DEV_SERVER_PORT || "8080", 10);

  // 允許的主機名稱（從逗號分隔的字串轉換為陣列）
  const ALLOWED_HOSTS = env.VITE_ALLOWED_HOSTS
    ? env.VITE_ALLOWED_HOSTS.split(',').map(host => host.trim())
    : ["localhost", "127.0.0.1"];

  // 代理配置
  const PROXY_SECURE = env.VITE_PROXY_SECURE === "true";
  const PROXY_CHANGE_ORIGIN = env.VITE_PROXY_CHANGE_ORIGIN !== "false"; // 預設為 true
  // ========================================

  return {
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
      // 確保所有 Radix UI 組件被正確預構建，特別是 TooltipProvider
      '@radix-ui/react-tooltip',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-toast'
    ],
    exclude: [
      // 排除大型依賴，讓它們按需載入
      'framer-motion'
    ]
  },
  server: {
    // ========================================
    // 🌐 開發伺服器配置（從環境變數讀取）
    // ========================================
    host: DEV_SERVER_HOST,
    port: DEV_SERVER_PORT,

    // ========================================
    // 🔄 API 代理配置（從環境變數讀取）
    // ========================================
    proxy: {
      // 代理 API 請求到後端服務
      // 目標 URL 由 VITE_UNIFIED_API_URL 環境變數決定
      '/api': {
        target: BACKEND_BASE,
        changeOrigin: PROXY_CHANGE_ORIGIN,
        secure: PROXY_SECURE,
      },
      // 代理媒體資源請求到後端
      '/media': {
        target: BACKEND_BASE,
        changeOrigin: PROXY_CHANGE_ORIGIN,
        secure: PROXY_SECURE,
      }
    },

    // ========================================
    // 🔐 允許的主機名稱（從環境變數讀取）
    // ========================================
    allowedHosts: ALLOWED_HOSTS,

    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: false,
    allowedHosts: ALLOWED_HOSTS
  },
  plugins: [
    react(),
    // 禁用 lovable-tagger 以避免不必要的網路連接錯誤
    // mode === 'development' && componentTagger(),
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
              '.gif': 'image/gif'
            };

            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            fs.createReadStream(assetsPath).pipe(res);
          } else {
            next();
          }
        });
      }
    },
    // 開發環境提供 manifest.json，避免瀏覽器解析錯誤
    {
      name: 'manifest-middleware',
      apply: 'serve' as const,
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
  };
});
