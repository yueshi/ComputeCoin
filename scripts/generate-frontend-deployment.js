#!/usr/bin/env node

/**
 * 前端部署文件生成脚本
 * 自动从Hardhat部署文件生成前端所需的合约地址配置
 */

const fs = require('fs');
const path = require('path');

// 配置路径
const DEPLOYMENTS_DIR = path.join(__dirname, '../deployments');
const FRONTEND_PUBLIC_DIR = path.join(__dirname, '../frontend/public/deployments');
const FRONTEND_CONFIG_DIR = path.join(__dirname, '../frontend/src/config');

// 合约名称映射
const CONTRACT_NAME_MAP = {
  'CCToken': 'CC_TOKEN',
  'CustomerNFT': 'CUSTOMER_NFT',
  'ProviderNFT': 'PROVIDER_NFT',
  'StakingPool': 'STAKING_POOL',
  'ComputeMarket': 'COMPUTE_MARKET',
  'ProviderIncentive': 'PROVIDER_INCENTIVE',
  'MockUSDC': 'CCSD_TOKEN',
  'CCUSDReservePool': 'CCUSD_RESERVE_POOL',
  'EthToCCUSDConverter': 'ETH_CCUSD_CONVERTER',
  'RiskManagement': 'RISK_MANAGEMENT'
};

/**
 * 读取部署文件
 */
function readDeploymentFile(network, contractName) {
  try {
    const filePath = path.join(DEPLOYMENTS_DIR, network, `${contractName}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  部署文件不存在: ${filePath}`);
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const deployment = JSON.parse(content);
    return deployment;
  } catch (error) {
    console.error(`❌ 读取部署文件失败 ${network}/${contractName}:`, error.message);
    return null;
  }
}

/**
 * 获取网络的所有部署
 */
function getNetworkDeployments(network) {
  const networkDir = path.join(DEPLOYMENTS_DIR, network);
  if (!fs.existsSync(networkDir)) {
    console.warn(`⚠️  网络目录不存在: ${networkDir}`);
    return {};
  }

  const deployments = {};
  const files = fs.readdirSync(networkDir);

  for (const file of files) {
    if (file.endsWith('.json') && !file.includes('solcInputs')) {
      const contractName = path.basename(file, '.json');
      const deployment = readDeploymentFile(network, contractName);
      if (deployment && deployment.address) {
        deployments[contractName] = deployment;
      }
    }
  }

  return deployments;
}

/**
 * 生成deployment-complete.json文件
 */
function generateDeploymentComplete(network, deployments) {
  const contracts = {};

  // 映射合约地址
  for (const [contractName, deployment] of Object.entries(deployments)) {
    const configKey = CONTRACT_NAME_MAP[contractName];
    if (configKey) {
      contracts[configKey] = deployment.address;
    }
  }

  // 读取第一个部署文件来获取部署者信息
  const firstDeployment = Object.values(deployments)[0];
  const deployer = firstDeployment?.deployer || '0x0000000000000000000000000000000000000000';

  const deploymentComplete = {
    network,
    chainId: getChainId(network),
    deployer,
    timestamp: new Date().toISOString(),
    contracts,
    tokenInfo: getTokenInfo(network, deployments),
    testData: getTestData(network, deployments)
  };

  return deploymentComplete;
}

/**
 * 获取网络链ID
 */
function getChainId(network) {
  const chainIds = {
    'localhost': 1337,
    'hardhat': 31337,
    'polygon': 137,
    'mumbai': 80001,
    'bsc': 56,
    'bsc_testnet': 97,
    'mainnet': 1,
    'goerli': 5,
    'sepolia': 11155111
  };

  return chainIds[network] || 1337;
}

/**
 * 获取代币信息
 */
function getTokenInfo(network, deployments) {
  const ccToken = deployments['CCToken'];
  const usdcToken = deployments['MockUSDC'];

  const tokenInfo = {};

  if (ccToken) {
    tokenInfo.ccToken = {
      name: "$CC",
      symbol: "CC",
      decimals: 18,
      totalSupply: "1000000000.0"
    };
  }

  if (usdcToken) {
    tokenInfo.usdcToken = {
      name: "Mock USD Coin",
      symbol: "mUSDC",
      decimals: 6,
      totalSupply: "10000100000.0"
    };
  }

  return tokenInfo;
}

/**
 * 获取测试数据
 */
function getTestData(network, deployments) {
  if (network !== 'localhost' && network !== 'hardhat') {
    return {};
  }

  // 仅为本地区域提供测试数据
  return {
    deployerCCBalance: "1000000000.0",
    deployerUSDCBalance: "10000100000.0"
  };
}

/**
 * 生成前端合约配置文件
 */
function generateContractConfig(network, deploymentComplete) {
  const { contracts } = deploymentComplete;

  const config = {
    // 网络配置
    network: deploymentComplete.network,
    chainId: deploymentComplete.chainId,

    // 合约地址
    addresses: {
      ...contracts
    },

    // 生成时间
    generatedAt: deploymentComplete.timestamp,
    deployer: deploymentComplete.deployer,

    // 合约验证状态
    verified: false // 可以添加验证逻辑
  };

  return config;
}

/**
 * 确保目录存在
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 创建目录: ${dirPath}`);
  }
}

/**
 * 写入文件
 */
function writeFile(filePath, content, description) {
  try {
    const jsonString = JSON.stringify(content, null, 2);
    fs.writeFileSync(filePath, jsonString, 'utf8');
    console.log(`✅ ${description}: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ 写入文件失败 ${filePath}:`, error.message);
    return false;
  }
}

/**
 * 复制单个合约部署文件到前端
 */
function copySingleContractFiles(network, deployments) {
  const frontendNetworkDir = path.join(FRONTEND_PUBLIC_DIR, network);
  ensureDirectoryExists(frontendNetworkDir);

  let copiedCount = 0;
  for (const [contractName, deployment] of Object.entries(deployments)) {
    const sourcePath = path.join(DEPLOYMENTS_DIR, network, `${contractName}.json`);
    const targetPath = path.join(frontendNetworkDir, `${contractName}.json`);

    if (fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, targetPath);
        copiedCount++;
      } catch (error) {
        console.error(`❌ 复制合约文件失败 ${contractName}:`, error.message);
      }
    }
  }

  if (copiedCount > 0) {
    console.log(`✅ 复制了 ${copiedCount} 个合约部署文件到前端`);
  }
}

/**
 * 生成网络索引文件
 */
function generateNetworkIndex(networks) {
  const index = {
    networks: networks.map(network => ({
      name: network,
      chainId: getChainId(network),
      hasDeployment: true
    })),
    defaultNetwork: 'localhost',
    lastUpdated: new Date().toISOString()
  };

  const indexPath = path.join(FRONTEND_PUBLIC_DIR, 'networks.json');
  writeFile(indexPath, index, '生成网络索引文件');
}

/**
 * 主要处理函数
 */
function generateFrontendDeployment() {
  console.log('🚀 开始生成前端部署文件...\n');

  // 确保目标目录存在
  ensureDirectoryExists(FRONTEND_PUBLIC_DIR);
  ensureDirectoryExists(FRONTEND_CONFIG_DIR);

  // 获取所有网络
  const availableNetworks = fs.readdirSync(DEPLOYMENTS_DIR)
    .filter(item => {
      const itemPath = path.join(DEPLOYMENTS_DIR, item);
      return fs.statSync(itemPath).isDirectory();
    })
    .filter(network => network !== 'solcInputs');

  console.log(`📋 发现网络: ${availableNetworks.join(', ')}\n`);

  const processedNetworks = [];

  // 处理每个网络
  for (const network of availableNetworks) {
    console.log(`\n🌐 处理网络: ${network}`);

    const deployments = getNetworkDeployments(network);

    if (Object.keys(deployments).length === 0) {
      console.warn(`⚠️  网络 ${network} 没有找到部署文件`);
      continue;
    }

    console.log(`📦 找到 ${Object.keys(deployments).length} 个已部署合约`);

    // 1. 生成deployment-complete.json
    const deploymentComplete = generateDeploymentComplete(network, deployments);
    const completePath = path.join(FRONTEND_PUBLIC_DIR, network, 'deployment-complete.json');
    ensureDirectoryExists(path.dirname(completePath));
    writeFile(completePath, deploymentComplete, `生成 ${network} 部署摘要文件`);

    // 2. 生成合约配置文件
    const contractConfig = generateContractConfig(network, deploymentComplete);
    const configPath = path.join(FRONTEND_CONFIG_DIR, `contracts-${network}.js`);
    const configContent = `// 自动生成的合约配置 - ${network}
// 生成时间: ${new Date().toISOString()}

export const CONTRACT_ADDRESSES = ${JSON.stringify(contractConfig.addresses, null, 2)};

export const NETWORK_CONFIG = {
  name: "${network}",
  chainId: ${deploymentComplete.chainId},
  deployer: "${deploymentComplete.deployer}",
  generatedAt: "${deploymentComplete.timestamp}"
};

export default {
  CONTRACT_ADDRESSES,
  NETWORK_CONFIG
};
`;
    writeFile(configPath, configContent, `生成 ${network} 合约配置文件`);

    // 3. 复制单个合约文件
    copySingleContractFiles(network, deployments);

    processedNetworks.push(network);
    console.log(`✅ 网络 ${network} 处理完成`);
  }

  // 4. 生成网络索引文件
  if (processedNetworks.length > 0) {
    generateNetworkIndex(processedNetworks);
  }

  // 5. 生成使用说明
  generateUsageInstructions(processedNetworks);

  console.log('\n🎉 前端部署文件生成完成！');
  console.log(`\n📋 处理的网络: ${processedNetworks.join(', ')}`);
  console.log('\n📖 使用方法:');
  console.log('1. 前端代码会自动从 /deployments 目录读取最新的合约地址');
  console.log('2. 支持多网络环境切换');
  console.log('3. 包含缓存机制以提高性能');
  console.log('4. 具备备用地址机制确保稳定性');
}

/**
 * 生成使用说明
 */
function generateUsageInstructions(networks) {
  const instructions = `# 合约地址自动管理使用说明

## 概述
本系统自动从Hardhat部署文件生成前端所需的合约地址配置，避免手动维护硬编码地址。

## 文件结构
\`\`\`
frontend/
├── public/
│   └── deployments/
│       ├── ${networks.join('/\n│       ├── ')}
│       │   ├── deployment-complete.json  # 部署摘要
│       │   └── *.json                    # 单个合约部署文件
│       └── networks.json                # 网络索引
└── src/
    └── config/
        ├── contractAddressManager.js     # 地址管理器
        └── contracts-*.js                # 网络特定配置
\`\`\`

## 使用方法

### 1. 在组件中使用
\`\`\`javascript
import { getContractAddress, getAllContractAddresses } from '@/config/contractAddressManager';

// 获取单个合约地址
const ccTokenAddress = await getContractAddress('CC_TOKEN');

// 获取所有合约地址
const allAddresses = await getAllContractAddresses();
\`\`\`

### 2. 在不同网络中切换
\`\`\`javascript
// 获取特定网络的合约地址
const polygonAddress = await getContractAddress('CC_TOKEN', 137);

// 获取当前网络的合约地址
const currentAddress = await getContractAddress('CC_TOKEN');
\`\`\`

### 3. 环境变量配置
可以在.env文件中设置备用地址:
\`\`\`
REACT_APP_CONTRACT_CC_TOKEN_1337=0x5FbDB2315678afecb367f032d93F642f64180aa3
REACT_APP_CONTRACT_CC_TOKEN_137=0x...
\`\`\`

## 更新流程
1. 运行合约部署: \`npm run deploy:localhost\`
2. 生成前端配置: \`node scripts/generate-frontend-deployment.js\`
3. 重启前端应用

## 缓存机制
- 地址缓存5分钟自动过期
- 支持手动清除缓存: \`clearContractAddressCache()\`
- 网络切换时自动清除缓存

## 故障排除
1. 检查部署文件是否存在: \`/deployments/{network}/\`
2. 检查前端public目录是否有对应文件
3. 查看控制台日志获取详细错误信息
4. 使用备用地址机制确保应用正常运行

## 网络支持
当前支持的网络: ${networks.map(n => getChainId(n)).join(', ')}
`;

  const readmePath = path.join(FRONTEND_CONFIG_DIR, 'CONTRACT_ADDRESSES.md');
  writeFile(readmePath, instructions, '生成使用说明文档');
}

// 运行脚本
if (require.main === module) {
  generateFrontendDeployment();
}

module.exports = {
  generateFrontendDeployment,
  readDeploymentFile,
  getNetworkDeployments,
  generateDeploymentComplete
};