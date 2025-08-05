/**
 * 積木系統共用模組統一匯出
 */

// 配置系統
export * from './BlockConfig';
export * from './BlockFactory';

// 基礎組件
export { default as BaseBlock } from './BaseBlock';
export * from './BaseBlock';

// 預設匯出工廠實例
export { globalBlockFactory as blockFactory } from './BlockFactory';