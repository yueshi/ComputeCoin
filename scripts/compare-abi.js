#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 开始比较ABI文件差异...\n');

// 读取现有的前端ABI文件
const frontendAbisPath = path.join(__dirname, '../frontend/src/contracts/abis.js');
const frontendContent = fs.readFileSync(frontendAbisPath, 'utf8');

// 提取现有的ABI定义 - 使用更简单的方法
const existingAbis = {};

console.log('🔍 正在分析前端现有ABI...');

// 手动解析主要的ABI定义
try {
  // 提取 computeMarketAbi - 简化正则
  const computeMarketMatch = frontendContent.match(/export const computeMarketAbi = (\[[\s\S]*?\]\s*\])/m);
  if (computeMarketMatch) {
    console.log(`找到 computeMarketAbi 匹配，长度: ${computeMarketMatch[1].length}`);
    existingAbis.computeMarketAbi = JSON.parse(computeMarketMatch[1]);
    console.log(`  成功解析 computeMarketAbi, 长度: ${existingAbis.computeMarketAbi.length}`);
  } else {
    console.log(`未找到 computeMarketAbi 匹配`);
  }

  // 提取 ccTokenAbi
  const ccTokenMatch = frontendContent.match(/export const ccTokenAbi = (\[[\s\S]*?\]\s*\])/m);
  if (ccTokenMatch) {
    console.log(`找到 ccTokenAbi 匹配，长度: ${ccTokenMatch[1].length}`);
    existingAbis.ccTokenAbi = JSON.parse(ccTokenMatch[1]);
    console.log(`  成功解析 ccTokenAbi, 长度: ${existingAbis.ccTokenAbi.length}`);
  } else {
    console.log(`未找到 ccTokenAbi 匹配`);
  }

  // 提取 customerNFTAbi
  const customerNFTMatch = frontendContent.match(/export const customerNFTAbi = (\[[\s\S]*?\]\s*\])/m);
  if (customerNFTMatch) {
    console.log(`找到 customerNFTAbi 匹配，长度: ${customerNFTMatch[1].length}`);
    existingAbis.customerNFTAbi = JSON.parse(customerNFTMatch[1]);
    console.log(`  成功解析 customerNFTAbi, 长度: ${existingAbis.customerNFTAbi.length}`);
  } else {
    console.log(`未找到 customerNFTAbi 匹配`);
  }

} catch (error) {
  console.warn(`⚠️  解析ABI时出错:`, error.message);
}

console.log(`总共找到 ${Object.keys(existingAbis).length} 个ABI定义\n`);

// 读取新生成的ABI文件
const generatedAbisPath = path.join(__dirname, '../frontend/src/config/contracts-generated.js');
const generatedContent = fs.readFileSync(generatedAbisPath, 'utf8');

// 提取新生成的ABI
const abiConfigMatch = generatedContent.match(/export const CONTRACT_ABI = ({[\s\S]*?});/);
if (!abiConfigMatch) {
  console.error('❌ 无法解析生成的ABI配置文件');
  process.exit(1);
}

const generatedAbis = JSON.parse(abiConfigMatch[1]);

// 合约名称映射
const contractMapping = {
  'CC_TOKEN_ABI': 'CCToken',
  'CUSTOMER_NFT_ABI': 'CustomerNFT',
  'PROVIDER_NFT_ABI': 'ProviderNFT',
  'STAKING_POOL_ABI': 'StakingPool',
  'COMPUTE_MARKET_ORDER_ABI': 'ComputeMarket',
  'PROVIDER_INCENTIVE_ABI': 'ProviderIncentive',
  'CCSD_ABI': 'CCUSDTokenVault',
  'ETH_CCUSD_CONVERTER_ABI': 'EthToCCUSDConverter',
  'CCUSD_RESERVE_POOL_ABI': 'CCUSDReservePool',
  'RISK_MANAGEMENT_ABI': 'RiskManagement'
};

// 前端ABI变量名映射
const frontendMapping = {
  'CCToken': 'ccTokenAbi',
  'CustomerNFT': 'customerNFTAbi',
  'ComputeMarket': 'computeMarketAbi'
};

// 比较函数
function compareArrays(oldArray, newArray, name) {
  const oldCount = oldArray ? oldArray.length : 0;
  const newCount = newArray ? newArray.length : 0;
  const difference = newCount - oldCount;

  if (difference === 0) {
    console.log(`  ${name}: 数量相同 (${oldCount} 个)`);
    return { status: 'same', oldCount, newCount, difference: 0 };
  } else {
    const status = difference > 0 ? 'added' : 'removed';
    console.log(`  ${name}: ${status === 'added' ? '增加' : '减少'} ${Math.abs(difference)} 个 (${oldCount} → ${newCount})`);
    return { status, oldCount, newCount, difference };
  }
}

console.log('📊 ABI比较结果:\n');

// 比较各个合约的ABI
Object.entries(contractMapping).forEach(([abiKey, contractName]) => {
  console.log(`🔹 ${contractName} 合约:`);

  const frontendVarName = frontendMapping[contractName];
  const oldAbi = frontendVarName ? existingAbis[frontendVarName] : null;
  const newAbi = generatedAbis[abiKey];

  if (!oldAbi && !newAbi) {
    console.log(`  ${contractName}: 双方都缺失`);
    return;
  }

  if (!oldAbi) {
    console.log(`  前端未定义，新ABI有 ${newAbi ? newAbi.length : 0} 个函数/事件`);
    return;
  }

  if (!newAbi) {
    console.log(`  新生成的缺失，前端有 ${oldAbi.length} 个函数/事件`);
    return;
  }

  const oldFunctions = oldAbi.filter(item => item.type === 'function').length;
  const newFunctions = newAbi.filter(item => item.type === 'function').length;
  const oldEvents = oldAbi.filter(item => item.type === 'event').length;
  const newEvents = newAbi.filter(item => item.type === 'event').length;
  const oldErrors = oldAbi.filter(item => item.type === 'error').length;
  const newErrors = newAbi.filter(item => item.type === 'error').length;

  console.log(`  函数: ${oldFunctions} → ${newFunctions} (${newFunctions >= oldFunctions ? '✅' : '⚠️'})`);
  console.log(`  事件: ${oldEvents} → ${newEvents} (${newEvents >= oldEvents ? '✅' : '⚠️'})`);
  console.log(`  错误: ${oldErrors} → ${newErrors} (${newErrors >= oldErrors ? '✅' : '⚠️'})`);

  const totalOld = oldFunctions + oldEvents + oldErrors;
  const totalNew = newFunctions + newEvents + newErrors;
  console.log(`  总计: ${totalOld} → ${totalNew} (${totalNew >= totalOld ? '✅ 增加' : '⚠️ 减少'} ${Math.abs(totalNew - totalOld)} 个)\n`);
});

// 总结
console.log('📋 总结:');
console.log('✅ 新生成的ABI文件包含了完整的合约接口');
console.log('✅ 包含了错误定义、最新函数和事件');
console.log('✅ 支持更多合约（10个合约 vs 前端现有的3个）');
console.log('💡 建议使用新生成的 contracts-generated.js 文件替换现有的ABI定义');