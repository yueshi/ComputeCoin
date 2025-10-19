/**
 * 智能合约配置 - 动态地址管理版本
 * 自动从部署文件获取最新合约地址，避免硬编码
 */

import {
  getContractAddress,
  getAllContractAddresses,
  getDeploymentInfo,
  isContractDeployed
} from './contractAddressManager';

// 基础配置
export const CONTRACT_CONFIG = {
  // 合约名称映射
  NAMES: {
    CC_TOKEN: 'CCToken',
    CUSTOMER_NFT: 'CustomerNFT',
    PROVIDER_NFT: 'ProviderNFT',
    STAKING_POOL: 'StakingPool',
    COMPUTE_MARKET: 'ComputeMarket',
    PROVIDER_INCENTIVE: 'ProviderIncentive',
    CCSD_TOKEN: 'MockUSDC',
    CCUSD_RESERVE_POOL: 'CCUSDReservePool',
    ETH_CCUSD_CONVERTER: 'EthToCCUSDConverter',
    RISK_MANAGEMENT: 'RiskManagement'
  },

  // 网络配置
  NETWORKS: {
    1337: { name: 'localhost', rpcUrl: 'http://127.0.0.1:8545' },
    31337: { name: 'hardhat', rpcUrl: 'http://127.0.0.1:8545' },
    137: { name: 'polygon', rpcUrl: 'https://polygon-rpc.com' },
    80001: { name: 'mumbai', rpcUrl: 'https://rpc-mumbai.maticvigil.com' },
    56: { name: 'bsc', rpcUrl: 'https://bsc-dataseed.binance.org' },
    97: { name: 'bsc_testnet', rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545' }
  }
};

// 向后兼容的静态地址映射 (作为备用)
export const FALLBACK_ADDRESSES = {
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

/**
 * 动态获取合约地址
 * @param {string} contractName - 合约名称
 * @param {number} networkId - 网络ID (可选)
 * @returns {Promise<string>} 合约地址
 */
export async function getDynamicContractAddress(contractName, networkId = null) {
  try {
    const address = await getContractAddress(contractName, networkId);
    console.log(`🎯 获取合约地址 ${contractName}:`, address);
    return address;
  } catch (error) {
    console.error(`❌ 获取合约地址失败 ${contractName}:`, error.message);
    // 使用备用地址
    const fallbackAddress = FALLBACK_ADDRESSES[contractName];
    if (fallbackAddress) {
      console.warn(`⚠️ 使用备用地址 ${contractName}:`, fallbackAddress);
      return fallbackAddress;
    }
    throw error;
  }
}

/**
 * 获取所有合约地址
 * @param {number} networkId - 网络ID (可选)
 * @returns {Promise<Object>} 所有合约地址
 */
export async function getDynamicAllContractAddresses(networkId = null) {
  try {
    const addresses = await getAllContractAddresses(networkId);
    console.log(`📋 获取所有合约地址:`, addresses);
    return addresses;
  } catch (error) {
    console.error(`❌ 获取所有合约地址失败:`, error.message);
    // 使用备用地址
    console.warn(`⚠️ 使用备用地址配置`);
    return FALLBACK_ADDRESSES;
  }
}

/**
 * 检查合约是否已部署
 * @param {string} contractName - 合约名称
 * @param {number} networkId - 网络ID (可选)
 * @returns {Promise<boolean>} 是否已部署
 */
export async function checkContractDeployment(contractName, networkId = null) {
  try {
    const isDeployed = await isContractDeployed(contractName, networkId);
    console.log(`🔍 检查合约部署状态 ${contractName}:`, isDeployed);
    return isDeployed;
  } catch (error) {
    console.error(`❌ 检查合约部署状态失败 ${contractName}:`, error.message);
    return false;
  }
}

/**
 * 获取部署信息
 * @param {number} networkId - 网络ID (可选)
 * @returns {Promise<Object>} 部署信息
 */
export async function getContractDeploymentInfo(networkId = null) {
  try {
    const info = await getDeploymentInfo(networkId);
    console.log(`📊 获取部署信息:`, info);
    return info;
  } catch (error) {
    console.error(`❌ 获取部署信息失败:`, error.message);
    return {
      networkId: networkId || 1337,
      error: error.message,
      contracts: FALLBACK_ADDRESSES
    };
  }
}

/**
 * 验证合约地址配置
 * @param {number} networkId - 网络ID (可选)
 * @returns {Promise<Object>} 验证结果
 */
export async function validateContractAddresses(networkId = null) {
  console.log(`🔍 开始验证合约地址配置...`);

  const results = {
    valid: true,
    totalContracts: 0,
    deployedContracts: 0,
    failedContracts: [],
    networkId: networkId || 'current',
    timestamp: new Date().toISOString()
  };

  try {
    const addresses = await getDynamicAllContractAddresses(networkId);
    results.totalContracts = Object.keys(addresses).length;

    for (const [contractName, address] of Object.entries(addresses)) {
      try {
        const isDeployed = await checkContractDeployment(contractName, networkId);
        if (isDeployed) {
          results.deployedContracts++;
        } else {
          results.failedContracts.push({
            contract: contractName,
            address,
            error: 'Contract not deployed'
          });
          results.valid = false;
        }
      } catch (error) {
        results.failedContracts.push({
          contract: contractName,
          address,
          error: error.message
        });
        results.valid = false;
      }
    }

    console.log(`✅ 验证完成: ${results.deployedContracts}/${results.totalContracts} 合约已部署`);

    if (results.failedContracts.length > 0) {
      console.warn(`⚠️ 未部署的合约:`, results.failedContracts);
    }

  } catch (error) {
    console.error(`❌ 验证过程失败:`, error.message);
    results.valid = false;
    results.error = error.message;
  }

  return results;
}

// 导出便捷方法
export const CONTRACT_ADDRESSES = new Proxy({}, {
  get(target, prop) {
    // 异步获取地址，为了向后兼容提供Promise
    return getDynamicContractAddress(prop);
  }
});

// 导出同步版本的地址 (仅用于初始化等特殊情况)
export const STATIC_CONTRACT_ADDRESSES = FALLBACK_ADDRESSES;

/**
 * 合约地址Hook (用于React组件)
 */
export function useContractAddresses(networkId = null) {
  const [addresses, setAddresses] = React.useState(FALLBACK_ADDRESSES);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    async function loadAddresses() {
      try {
        setLoading(true);
        const dynamicAddresses = await getDynamicAllContractAddresses(networkId);
        setAddresses(dynamicAddresses);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('加载合约地址失败:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAddresses();
  }, [networkId]);

  return { addresses, loading, error, refetch: () => loadAddresses() };
}

/**
 * 合约地址管理器类
 */
export class ContractAddressManager {
  constructor(networkId = null) {
    this.networkId = networkId;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存
  }

  async getAddress(contractName) {
    const cacheKey = `${contractName}-${this.networkId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.address;
    }

    const address = await getDynamicContractAddress(contractName, this.networkId);
    this.cache.set(cacheKey, {
      address,
      timestamp: Date.now()
    });

    return address;
  }

  async getAllAddresses() {
    return await getDynamicAllContractAddresses(this.networkId);
  }

  clearCache() {
    this.cache.clear();
  }

  async validate() {
    return await validateContractAddresses(this.networkId);
  }

  getFallbackAddresses() {
    return FALLBACK_ADDRESSES;
  }
}

// 导出默认实例
export const defaultContractManager = new ContractAddressManager();

// 向后兼容的导出
export const CONTRACT_ABI = {
  // ERC20基础ABI
  ERC20_ABI: [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
  ],

  // 其他ABI定义可以从原始contracts.js复制...
  // 为了简洁，这里只展示部分
};

export default {
  getDynamicContractAddress,
  getDynamicAllContractAddresses,
  checkContractDeployment,
  getContractDeploymentInfo,
  validateContractAddresses,
  CONTRACT_ADDRESSES,
  STATIC_CONTRACT_ADDRESSES,
  CONTRACT_CONFIG,
  FALLBACK_ADDRESSES,
  ContractAddressManager,
  defaultContractManager,
  useContractAddresses
};