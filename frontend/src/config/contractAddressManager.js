/**
 * 合约地址自动管理器
 * 从Hardhat部署文件中自动读取最新的合约地址，避免硬编码
 */

import axios from 'axios';

// 网络配置映射
const NETWORK_MAP = {
  1337: 'localhost',
  31337: 'hardhat',
  137: 'polygon',
  80001: 'mumbai',
  56: 'bsc',
  97: 'bsc_testnet'
};

// 合约名称映射 (部署文件名 -> 配置键名)
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

class ContractAddressManager {
  constructor() {
    this.addressCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存
    this.deploymentBaseUrl = process.env.REACT_APP_DEPLOYMENT_API_URL || '/deployments';
  }

  /**
   * 获取当前网络ID
   */
  getCurrentNetworkId() {
    // 从window.ethereum或配置中获取网络ID
    if (window.ethereum && window.ethereum.chainId) {
      return parseInt(window.ethereum.chainId, 16);
    }
    return process.env.REACT_APP_DEFAULT_NETWORK_ID || 1337;
  }

  /**
   * 获取网络名称
   */
  getNetworkName(chainId) {
    return NETWORK_MAP[chainId] || 'localhost';
  }

  /**
   * 从本地部署文件读取合约地址
   */
  async loadDeploymentFromLocal(networkName) {
    try {
      // 尝试从本地public目录读取部署文件
      const response = await fetch(`${this.deploymentBaseUrl}/${networkName}/deployment-complete.json`);
      if (!response.ok) {
        throw new Error(`Failed to load deployment: ${response.status}`);
      }

      const deployment = await response.json();
      console.log(`✅ 成功加载部署文件: ${networkName}`, deployment);
      return deployment;
    } catch (error) {
      console.warn(`⚠️ 无法加载本地部署文件 ${networkName}:`, error.message);
      return null;
    }
  }

  /**
   * 从单个合约部署文件读取地址
   */
  async loadSingleContractAddress(networkName, contractName) {
    try {
      const response = await fetch(`${this.deploymentBaseUrl}/${networkName}/${contractName}.json`);
      if (!response.ok) {
        throw new Error(`Contract ${contractName} not found`);
      }

      const contractData = await response.json();
      return contractData.address;
    } catch (error) {
      console.warn(`⚠️ 无法读取合约 ${contractName} 地址:`, error.message);
      return null;
    }
  }

  /**
   * 从Hardhat部署目录聚合所有合约地址
   */
  async loadAllContractAddresses(networkName) {
    const addresses = {};
    const loadPromises = [];

    // 并行加载所有合约地址
    for (const [fileName, configKey] of Object.entries(CONTRACT_NAME_MAP)) {
      const promise = this.loadSingleContractAddress(networkName, fileName)
        .then(address => {
          if (address) {
            addresses[configKey] = address;
          }
        })
        .catch(error => {
          console.warn(`加载合约 ${fileName} 失败:`, error.message);
        });

      loadPromises.push(promise);
    }

    await Promise.all(loadPromises);
    return addresses;
  }

  /**
   * 缓存合约地址
   */
  setCachedAddress(networkId, contractName, address) {
    const cacheKey = `${networkId}-${contractName}`;
    this.addressCache.set(cacheKey, {
      address,
      timestamp: Date.now()
    });
  }

  /**
   * 获取缓存的地址
   */
  getCachedAddress(networkId, contractName) {
    const cacheKey = `${networkId}-${contractName}`;
    const cached = this.addressCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.address;
    }

    return null;
  }

  /**
   * 获取合约地址 (主要方法)
   */
  async getContractAddress(contractName, networkId = null) {
    const targetNetworkId = networkId || this.getCurrentNetworkId();
    const networkName = this.getNetworkName(targetNetworkId);

    // 检查缓存
    const cachedAddress = this.getCachedAddress(targetNetworkId, contractName);
    if (cachedAddress) {
      console.log(`📦 从缓存获取 ${contractName} 地址:`, cachedAddress);
      return cachedAddress;
    }

    console.log(`🔍 正在查找 ${contractName} 地址 (${networkName}, ${targetNetworkId})...`);

    try {
      // 方法1: 尝试从deployment-complete.json读取
      let deployment = await this.loadDeploymentFromLocal(networkName);
      if (deployment && deployment.contracts && deployment.contracts[contractName]) {
        const address = deployment.contracts[contractName];
        this.setCachedAddress(targetNetworkId, contractName, address);
        console.log(`✅ 从部署摘要获取 ${contractName} 地址:`, address);
        return address;
      }

      // 方法2: 尝试从单个合约文件读取
      const fileName = Object.keys(CONTRACT_NAME_MAP).find(key =>
        CONTRACT_NAME_MAP[key] === contractName
      );

      if (fileName) {
        const address = await this.loadSingleContractAddress(networkName, fileName);
        if (address) {
          this.setCachedAddress(targetNetworkId, contractName, address);
          console.log(`✅ 从合约文件获取 ${contractName} 地址:`, address);
          return address;
        }
      }

      // 方法3: 使用备用地址 (从环境变量或默认配置)
      const fallbackAddress = this.getFallbackAddress(contractName, targetNetworkId);
      if (fallbackAddress) {
        console.warn(`⚠️ 使用备用地址 ${contractName}:`, fallbackAddress);
        return fallbackAddress;
      }

      throw new Error(`无法找到合约 ${contractName} 的地址`);

    } catch (error) {
      console.error(`❌ 获取合约 ${contractName} 地址失败:`, error.message);

      // 最后的备用方案
      const fallbackAddress = this.getFallbackAddress(contractName, targetNetworkId);
      if (fallbackAddress) {
        console.warn(`🚨 使用最后备用地址 ${contractName}:`, fallbackAddress);
        return fallbackAddress;
      }

      throw error;
    }
  }

  /**
   * 获取所有合约地址
   */
  async getAllContractAddresses(networkId = null) {
    const targetNetworkId = networkId || this.getCurrentNetworkId();
    const networkName = this.getNetworkName(targetNetworkId);

    console.log(`🔍 正在加载所有合约地址 (${networkName})...`);

    try {
      // 方法1: 从deployment-complete.json获取
      const deployment = await this.loadDeploymentFromLocal(networkName);
      if (deployment && deployment.contracts) {
        console.log(`✅ 从部署摘要获取所有合约地址`);
        return deployment.contracts;
      }

      // 方法2: 聚合所有单独的合约文件
      console.log(`📁 聚合单独合约文件地址...`);
      const addresses = await this.loadAllContractAddresses(networkName);

      if (Object.keys(addresses).length > 0) {
        console.log(`✅ 聚合获取到 ${Object.keys(addresses).length} 个合约地址`);
        return addresses;
      }

      // 方法3: 使用备用配置
      const fallbackAddresses = this.getFallbackAddresses(targetNetworkId);
      console.warn(`⚠️ 使用备用地址配置`);
      return fallbackAddresses;

    } catch (error) {
      console.error(`❌ 获取所有合约地址失败:`, error.message);
      return this.getFallbackAddresses(targetNetworkId);
    }
  }

  /**
   * 获取备用地址 (环境变量或默认配置)
   */
  getFallbackAddress(contractName, networkId) {
    // 优先使用环境变量
    const envVarName = `REACT_APP_CONTRACT_${contractName}_${networkId}`;
    const envAddress = process.env[envVarName];
    if (envAddress) {
      return envAddress;
    }

    // 使用默认配置 (作为最后备用)
    const defaultAddresses = this.getFallbackAddresses(networkId);
    return defaultAddresses[contractName];
  }

  /**
   * 获取备用地址配置
   */
  getFallbackAddresses(networkId) {
    // 基于网络ID的默认地址 (主要用于本地开发)
    const defaults = {
      1337: { // localhost
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
      }
    };

    return defaults[networkId] || defaults[1337] || {};
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.addressCache.clear();
    console.log(`🧹 已清除合约地址缓存`);
  }

  /**
   * 检查合约是否部署
   */
  async isContractDeployed(contractName, networkId = null) {
    try {
      const address = await this.getContractAddress(contractName, networkId);
      return address && address !== '0x0000000000000000000000000000000000000000';
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取部署信息
   */
  async getDeploymentInfo(networkId = null) {
    const targetNetworkId = networkId || this.getCurrentNetworkId();
    const networkName = this.getNetworkName(targetNetworkId);

    try {
      const deployment = await this.loadDeploymentFromLocal(networkName);
      return {
        networkId: targetNetworkId,
        networkName,
        timestamp: deployment?.timestamp,
        deployer: deployment?.deployer,
        contracts: deployment?.contracts || {}
      };
    } catch (error) {
      return {
        networkId: targetNetworkId,
        networkName,
        error: error.message,
        contracts: this.getFallbackAddresses(targetNetworkId)
      };
    }
  }
}

// 创建全局实例
const contractAddressManager = new ContractAddressManager();

// 导出便捷方法
export const getContractAddress = (contractName, networkId) =>
  contractAddressManager.getContractAddress(contractName, networkId);

export const getAllContractAddresses = (networkId) =>
  contractAddressManager.getAllContractAddresses(networkId);

export const isContractDeployed = (contractName, networkId) =>
  contractAddressManager.isContractDeployed(contractName, networkId);

export const getDeploymentInfo = (networkId) =>
  contractAddressManager.getDeploymentInfo(networkId);

export const clearContractAddressCache = () =>
  contractAddressManager.clearCache();

// 导出管理器实例
export default contractAddressManager;