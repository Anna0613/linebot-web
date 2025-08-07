/**
 * 積木系統完整性檢查
 * 用於驗證模組化重構是否正常運作
 */

import { 
  allBlockGroups, 
  getBlockStatistics,
  globalBlockFactory
} from './index';

/**
 * 系統完整性檢查結果
 */
export interface SystemCheckResult {
  success: boolean;
  checks: {
    name: string;
    passed: boolean;
    message: string;
    details?: Record<string, unknown>;
  }[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
  };
}

/**
 * 執行系統完整性檢查
 */
export const runSystemCheck = (): SystemCheckResult => {
  const checks: SystemCheckResult['checks'] = [];
  
  // 檢查 1: 積木分組是否正確載入
  try {
    const groupCount = allBlockGroups.length;
    checks.push({
      name: '積木分組載入',
      passed: groupCount === 7,
      message: `載入了 ${groupCount} 個積木分組（預期 7 個）`,
      details: allBlockGroups.map(g => ({ id: g.groupId, name: g.groupName, blockCount: g.blocks.length }))
    });
  } catch (error) {
    checks.push({
      name: '積木分組載入',
      passed: false,
      message: `積木分組載入失敗: ${error}`,
    });
  }

  // 檢查 2: 積木工廠是否正常
  try {
    const allBlocks = globalBlockFactory.getAllBlocks();
    const expectedMinBlocks = 20; // 至少應該有 20 個積木
    checks.push({
      name: '積木工廠功能',
      passed: allBlocks.length >= expectedMinBlocks,
      message: `積木工廠包含 ${allBlocks.length} 個積木（預期至少 ${expectedMinBlocks} 個）`,
      details: { totalBlocks: allBlocks.length }
    });
  } catch (error) {
    checks.push({
      name: '積木工廠功能',
      passed: false,
      message: `積木工廠測試失敗: ${error}`,
    });
  }

  // 檢查 3: 統計功能是否正常
  try {
    const stats = getBlockStatistics();
    checks.push({
      name: '統計功能',
      passed: stats.totalGroups === 7 && stats.totalBlocks > 0,
      message: `統計功能正常 - ${stats.totalGroups} 個分組，${stats.totalBlocks} 個積木`,
      details: stats
    });
  } catch (error) {
    checks.push({
      name: '統計功能',
      passed: false,
      message: `統計功能測試失敗: ${error}`,
    });
  }

  // 檢查 4: 積木創建功能
  try {
    const testBlock = globalBlockFactory.createBlock('event', { test: true });
    checks.push({
      name: '積木創建功能',
      passed: testBlock !== null && testBlock.blockType === 'event',
      message: testBlock ? '積木創建功能正常' : '積木創建失敗',
      details: testBlock
    });
  } catch (error) {
    checks.push({
      name: '積木創建功能',
      passed: false,
      message: `積木創建測試失敗: ${error}`,
    });
  }

  // 檢查 5: 積木配置完整性
  try {
    let configErrors = 0;
    let totalConfigs = 0;
    
    allBlockGroups.forEach(group => {
      group.blocks.forEach(block => {
        totalConfigs++;
        
        // 檢查必要屬性
        if (!block.blockType || !block.name || !block.category || !block.compatibility) {
          configErrors++;
        }
        
        // 檢查 defaultData
        if (!block.defaultData || typeof block.defaultData !== 'object') {
          configErrors++;
        }
      });
    });
    
    checks.push({
      name: '積木配置完整性',
      passed: configErrors === 0,
      message: `檢查了 ${totalConfigs} 個積木配置，發現 ${configErrors} 個錯誤`,
      details: { totalConfigs, configErrors }
    });
  } catch (error) {
    checks.push({
      name: '積木配置完整性',
      passed: false,
      message: `配置完整性檢查失敗: ${error}`,
    });
  }

  // 檢查 6: 相容性系統
  try {
    const logicBlocks = globalBlockFactory.getBlocksByCompatibility('logic');
    const flexBlocks = globalBlockFactory.getBlocksByCompatibility('flex');
    
    checks.push({
      name: '相容性系統',
      passed: logicBlocks.length > 0 && flexBlocks.length > 0,
      message: `相容性系統正常 - 邏輯積木: ${logicBlocks.length}，Flex積木: ${flexBlocks.length}`,
      details: { logicBlocks: logicBlocks.length, flexBlocks: flexBlocks.length }
    });
  } catch (error) {
    checks.push({
      name: '相容性系統',
      passed: false,
      message: `相容性系統測試失敗: ${error}`,
    });
  }

  // 計算總結
  const passedChecks = checks.filter(c => c.passed).length;
  const failedChecks = checks.length - passedChecks;
  
  const result: SystemCheckResult = {
    success: failedChecks === 0,
    checks,
    summary: {
      totalChecks: checks.length,
      passedChecks,
      failedChecks
    }
  };

  return result;
};

/**
 * 格式化檢查結果為控制台輸出
 */
export const formatCheckResult = (result: SystemCheckResult): void => {
  console.log('\n🔍 積木系統完整性檢查結果');
  console.log('='.repeat(50));
  
  result.checks.forEach((check, index) => {
    const status = check.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${check.name}: ${check.message}`);
    
    if (check.details && !check.passed) {
      console.log('   詳細資訊:', check.details);
    }
  });
  
  console.log('='.repeat(50));
  console.log(`📊 總結: ${result.summary.passedChecks}/${result.summary.totalChecks} 項檢查通過`);
  
  if (result.success) {
    console.log('🎉 系統完整性檢查全部通過！積木模組化重構成功！');
  } else {
    console.log('⚠️  發現問題，請檢查失敗的項目');
  }
  
  return;
};

/**
 * 執行完整的系統檢查並輸出結果
 */
export const performFullSystemCheck = (): boolean => {
  try {
    const result = runSystemCheck();
    formatCheckResult(result);
    return result.success;
  } catch (error) {
    console.error('❌ 系統檢查執行失敗:', error);
    return false;
  }
};

// 注意：檢查函數已定義，可手動調用
// 避免在模組載入時自動執行檢查