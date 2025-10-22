#!/usr/bin/env node

/**
 * 生成前端ABI配置文件
 * 从编译的artifacts中提取ABI并生成前端可用的配置
 */

const fs = require('fs');
const path = require('path');

console.log('🔨 开始生成前端ABI配置文件...');

// 合约映射
const contractMapping = {
  'CCToken': 'CC_TOKEN_ABI',
  'CustomerNFT': 'CUSTOMER_NFT_ABI',
  'ProviderNFT': 'PROVIDER_NFT_ABI',
  'StakingPool': 'STAKING_POOL_ABI',
  'ComputeMarket': 'COMPUTE_MARKET_ORDER_ABI',
  'ProviderIncentive': 'PROVIDER_INCENTIVE_ABI',
  'CCUSDTokenVault': 'CCSD_ABI',
  'EthToCCUSDConverter': 'ETH_CCUSD_CONVERTER_ABI',
  'CCUSDReservePool': 'CCUSD_RESERVE_POOL_ABI',
  'RiskManagement': 'RISK_MANAGEMENT_ABI'
};

// 读取并处理每个合约的ABI
const generatedABIs = {};

Object.entries(contractMapping).forEach(([contractName, configKey]) => {
  const artifactPath = path.join(__dirname, `../artifacts/contracts/${contractName}.sol/${contractName}.json`);

  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      generatedABIs[configKey] = artifact.abi;
      console.log(`✅ ${contractName} ABI 提取成功 (${artifact.abi.length} 个函数/事件)`);
    } catch (error) {
      console.error(`❌ ${contractName} ABI 提取失败:`, error.message);
    }
  } else {
    console.warn(`⚠️  ${contractName} 编译文件不存在，跳过`);
  }
});

// 生成前端配置文件内容
const configContent = `// 自动生成的智能合约ABI配置
// 生成时间: ${new Date().toISOString()}

export const CONTRACT_ABI = ${JSON.stringify(generatedABIs, null, 2)};

// 合约地址配置 (需要根据实际部署更新)
export const CONTRACT_ADDRESSES = {
  CC_TOKEN: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  CUSTOMER_NFT: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  PROVIDER_NFT: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  STAKING_POOL: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  COMPUTE_MARKET: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  PROVIDER_INCENTIVE: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
  CCSD_TOKEN: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  CCUSD_RESERVE_POOL: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  ETH_CCUSD_CONVERTER: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
  RISK_MANAGEMENT: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318"
};
`;

// 写入前端配置文件
const frontendConfigPath = path.join(__dirname, '../frontend/src/config/contracts-generated.js');
fs.writeFileSync(frontendConfigPath, configContent);

console.log('🎉 前端ABI配置文件生成完成!');
console.log(`📁 文件位置: ${frontendConfigPath}`);
console.log('\n📊 生成统计:');
Object.entries(generatedABIs).forEach(([key, abi]) => {
  const functions = abi.filter(item => item.type === 'function').length;
  const events = abi.filter(item => item.type === 'event').length;
  console.log(`  ${key}: ${functions} 个函数, ${events} 个事件`);
});

console.log('\n💡 使用说明:');
console.log('1. 将生成的 contracts-generated.js 导入到前端项目中');
console.log('2. 替换或合并现有的 contracts.js 配置');
console.log('3. 确保合约地址与实际部署地址一致');