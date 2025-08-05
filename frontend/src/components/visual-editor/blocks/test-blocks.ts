/**
 * 積木系統測試檔案
 * 用於驗證模組化積木系統的功能
 */

import { 
  allBlockGroups, 
  initializeBlockFactory, 
  globalBlockFactory,
  getBlockStatistics 
} from './index';

/**
 * 測試積木系統基本功能
 */
export const testBlockSystem = () => {
  console.log('🧪 開始測試積木系統...');
  
  try {
    // 測試 1: 初始化積木工廠
    console.log('1️⃣ 測試積木工廠初始化...');
    initializeBlockFactory();
    console.log('✅ 積木工廠初始化成功');
    
    // 測試 2: 檢查積木分組
    console.log('2️⃣ 測試積木分組...');
    console.log(`積木分組數量: ${allBlockGroups.length}`);
    allBlockGroups.forEach(group => {
      console.log(`  - ${group.groupName} (${group.blocks.length} 個積木)`);
    });
    
    // 測試 3: 測試積木工廠功能
    console.log('3️⃣ 測試積木工廠功能...');
    const allBlocks = globalBlockFactory.getAllBlocks();
    console.log(`總積木數量: ${allBlocks.length}`);
    
    // 測試 4: 測試積木創建
    console.log('4️⃣ 測試積木創建...');
    const eventBlock = globalBlockFactory.createBlock('event', { customData: 'test' });
    if (eventBlock) {
      console.log('✅ 事件積木創建成功:', eventBlock);
    }
    
    // 測試 5: 測試統計功能
    console.log('5️⃣ 測試統計功能...');
    const statistics = getBlockStatistics();
    console.log('積木統計:', statistics);
    
    console.log('🎉 所有測試通過！');
    return true;
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    return false;
  }
};

/**
 * 測試積木相容性
 */
export const testBlockCompatibility = () => {
  console.log('🧪 測試積木相容性...');
  
  try {
    const allBlocks = globalBlockFactory.getAllBlocks();
    
    allBlocks.forEach(block => {
      console.log(`${block.name}:`, {
        category: block.category,
        compatibility: block.compatibility,
        blockType: block.blockType
      });
    });
    
    console.log('✅ 相容性測試完成');
    return true;
    
  } catch (error) {
    console.error('❌ 相容性測試失敗:', error);
    return false;
  }
};

// 注意：測試函數已定義，可手動調用
// 避免在模組載入時自動執行測試