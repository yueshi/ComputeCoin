// 智能合约配置 - 使用自动生成的ABI定义
// 导入自动生成的完整ABI配置
import { CONTRACT_ABI as GENERATED_ABI, CONTRACT_ADDRESSES as GENERATED_ADDRESSES } from './contracts-generated.js';

// 使用生成的合约地址
export const CONTRACT_ADDRESSES = GENERATED_ADDRESSES;

// 使用生成的ABI定义，确保与编译的合约完全一致
export const CONTRACT_ABI = GENERATED_ABI;

// 网络配置
export const NETWORK_CONFIG = {
  137: { // Polygon Mainnet
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    blockExplorer: "https://polygonscan.com",
    chainId: 137,
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 }
  },
  80001: { // Polygon Mumbai Testnet
    name: "Mumbai",
    rpcUrl: "https://rpc-mumbai.maticvigil.com",
    blockExplorer: "https://mumbai.polygonscan.com",
    chainId: 80001,
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 }
  },
  56: { // BSC Mainnet
    name: "BSC",
    rpcUrl: "https://bsc-dataseed.binance.org",
    blockExplorer: "https://bscscan.com",
    chainId: 56,
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }
  },
  97: { // BSC Testnet
    name: "BSC Testnet",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    blockExplorer: "https://testnet.bscscan.com",
    chainId: 97,
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }
  },
  1337: { // Local Hardhat
    name: "Localhost",
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: "http://localhost:8545",
    chainId: 1337,
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    // 本地网络部署地址 - 从生成的配置中获取
    contractAddresses: GENERATED_ADDRESSES
  }
};

// DEX配置（用于代币交换）
export const DEX_CONFIG = {
  // Uniswap V2 Router地址（各网络）
  routers: {
    137: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", // QuickSwap
    80001: "0x8954AfA98594b838bda56FE4C868aD98401EA3Cf", // QuickSwap Testnet
    56: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PancakeSwap
    97: "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3", // PancakeSwap Testnet
  },

  // 常用交易对
  commonPairs: {
    // CC/USDC 交易对（需要实际部署后更新）
    CC_USDC: {
      address: "0x...", // 实际交易对地址
      fee: 3000 // 0.3%
    }
  }
};

// Gas限制配置
export const GAS_LIMITS = {
  // 基础操作
  APPROVE: 50000,
  TRANSFER: 65000,

  // 质押操作
  STAKE: 250000,
  UNSTAKE: 200000,
  CLAIM_REWARDS: 220000,

  // NFT操作
  MINT_NFT: 400000,
  DIRECT_MINT_NFT: 450000,

  // 计算市场操作
  CREATE_ORDER: 250000,
  ACCEPT_ORDER: 200000,
  COMPLETE_ORDER: 180000,
  CANCEL_ORDER: 160000,

  // 提供商激励
  CLAIM_PROVIDER_REWARDS: 200000,

  // ETH兑换CCUSD操作
  ETH_TO_CCUSD_EXCHANGE: 350000,
  QUICK_EXCHANGE: 350000,
  GET_EXCHANGE_ESTIMATE: 100000,

  // 复杂操作
  BATCH_TRANSFER: 400000,
  STAKE_FOR_NFT: 650000,

  // 安全缓冲（额外30%）
  BUFFER: 1.3
};

// 应用配置
export const APP_CONFIG = {
  // 支持的NFT等级配置
  nftTiers: {
    customer: [
      { tier: 1, name: "BRONZE", discount: 5, monthlyReward: "200", color: "#CD7F32", stakeReq: { eth: 0.5, cc: 100 } },
      { tier: 2, name: "SILVER", discount: 8, monthlyReward: "400", color: "#C0C0C0", stakeReq: { eth: 1.0, cc: 200 } },
      { tier: 3, name: "GOLD", discount: 12, monthlyReward: "700", color: "#FFD700", stakeReq: { eth: 2.0, cc: 500 } },
      { tier: 4, name: "PLATINUM", discount: 15, monthlyReward: "1000", color: "#E5E4E2", stakeReq: { eth: 5.0, cc: 1000 } }
    ],
    provider: [
      { tier: 1, name: "BRONZE", multiplier: 105, color: "#CD7F32", stakeReq: { eth: 0.2, cc: 200 }, deviceReq: 5 },
      { tier: 2, name: "SILVER", multiplier: 108, color: "#C0C0C0", stakeReq: { eth: 1.0, cc: 1000 }, deviceReq: 25 },
      { tier: 3, name: "GOLD", multiplier: 112, color: "#FFD700", stakeReq: { eth: 3.0, cc: 5000 }, deviceReq: 100 },
      { tier: 4, name: "PLATINUM", multiplier: 115, color: "#E5E4E2", stakeReq: { eth: 8.0, cc: 10000 }, deviceReq: 500 }
    ]
  },

  // 质押要求配置
  stakingRequirements: {
    customer: {
      bronze: { eth: "0.1", cc: "100" },
      silver: { eth: "0.5", cc: "500" },
      gold: { eth: "2.0", cc: "2000" },
      platinum: { eth: "5.0", cc: "5000" }
    },
    provider: {
      bronze: { eth: "0.2", cc: "200" },
      silver: { eth: "1.0", cc: "1000" },
      gold: { eth: "3.0", cc: "3000" },
      platinum: { eth: "8.0", cc: "8000" }
    }
  },

  // 计算服务配置
  computeServices: {
    categories: [
      { id: "ai", name: "AI/ML计算", icon: "🤖" },
      { id: "render", name: "3D渲染", icon: "🎨" },
      { id: "science", name: "科学计算", icon: "🔬" },
      { id: "crypto", name: "区块链计算", icon: "⛓️" },
      { id: "video", name: "视频处理", icon: "🎬" }
    ],

    basePrices: {
      "ai": { cpu: "0.5", gpu: "2.0", memory: "0.1" }, // 每小时价格(USDC)
      "render": { cpu: "0.3", gpu: "1.5", memory: "0.08" },
      "science": { cpu: "0.4", gpu: "1.8", memory: "0.09" },
      "crypto": { cpu: "0.6", gpu: "2.5", memory: "0.12" },
      "video": { cpu: "0.35", gpu: "1.6", memory: "0.07" }
    }
  },

  // 经济模型参数
  economics: {
    // CC燃烧率（1.5%）
    burnRate: 150, // 150 = 1.5%
    // 平台费率（2.5%）
    platformFeeRate: 250, // 250 = 2.5%
    // 基础质押APR（8%）
    baseStakingAPR: 800, // 800 = 8%
    // 日释放率（~1.1M CC）
    dailyReleaseRate: "1095890000000000000000000", // 1,095,890 CC (wei格式)
    // 代币价格（1 CC = 1 USDC）
    ccTokenPrice: "1.0"
  }
};