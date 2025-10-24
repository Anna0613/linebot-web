/*
  全域前端日誌格式化（開發環境）
  - 在開發模式統一 console.* 呈現格式
  - 在生產建置已由 Vite/terser 移除 console 呼叫
*/

// 僅在開發模式啟用
declare const __DEV__: boolean;

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  const prefix = '[LineBot-Web]';

  const ts = () => new Date().toISOString();

  const wrap = <T extends keyof Console>(key: T) => {
    const original = console[key].bind(console);
    return (...args: any[]) => {
      try {
        // 統一格式: 時間 | 等級 | 前綴 | 訊息
        const level = key.toUpperCase();
        if (typeof args[0] === 'string') {
          original(`${ts()} | ${level} | ${prefix} | ${args[0]}`, ...args.slice(1));
        } else {
          original(`${ts()} | ${level} | ${prefix}`, ...args);
        }
      } catch {
        original(...args);
      }
    };
  };

  console.log = wrap('log');
  console.info = wrap('info');
  console.debug = wrap('debug');
  console.warn = wrap('warn');
  console.error = wrap('error');
}

export {};

