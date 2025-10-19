// 智能合约配置 - 修复版本，基于实际合约ABI
export const CONTRACT_ADDRESSES = {
  // 基于实际部署的合约地址 (最新localhost部署)
  CC_TOKEN: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  CUSTOMER_NFT: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", 
  PROVIDER_NFT: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  STAKING_POOL: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  COMPUTE_MARKET: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  PROVIDER_INCENTIVE: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
  CCSD_TOKEN: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  // 新增的储备池和兑换合约
  CCUSD_RESERVE_POOL: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853", // CCUSD储备池合约地址
  ETH_CCUSD_CONVERTER: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6", // ETH兑换CCUSD合约地址
  RISK_MANAGEMENT: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318", // 风险管理合约地址
};

// 使用实际提取的ABI
export const ACTUAL_ABIS = {
  CCToken: require('../../contract_abis/CCToken_abi.json'),
  CustomerNFT: require('../../contract_abis/CustomerNFT_abi.json'),
  StakingPool: require('../../contract_abis/StakingPool_abi.json'),
  ProviderNFT: require('../../contract_abis/ProviderNFT_abi.json'),
  ComputeMarket: require('../../contract_abis/ComputeMarket_abi.json'),
};

export const CONTRACT_ABI = {
  // 基础代币ABI
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

  // CCToken ABI - 完整版本
  CC_TOKEN_ABI: ACTUAL_ABIS.CCToken.filter(item => item.type === 'function').map(item => {
    // 保留常用函数的简化版本
    if (['balanceOf', 'transfer', 'approve', 'allowance', 'totalSupply', 'decimals', 'symbol', 'name', 'burnFrom'].includes(item.name)) {
      return {
        name: item.name,
        type: item.type,
        inputs: item.inputs,
        outputs: item.outputs,
        stateMutability: item.stateMutability
      };
    }
    // 保留ETH相关函数
    if (['purchaseWithETH', 'getCCForETH', 'getETHForCC', 'withdrawETH'].includes(item.name)) {
      return {
        name: item.name,
        type: item.type,
        inputs: item.inputs,
        outputs: item.outputs,
        stateMutability: item.stateMutability
      };
    }
    return null;
  }).filter(Boolean),

  // CustomerNFT ABI - 修复版本
  CUSTOMER_NFT_ABI: ACTUAL_ABIS.CustomerNFT.filter(item => item.type === 'function').map(item => {
    // 保留核心函数
    if (['mintWithCCUSD', 'mintWithCC', 'getDiscount', 'getNFTInfo', 'getMonthlyReward', 
         'ownerOf', 'balanceOf', 'tokenOfOwnerByIndex', 'getClaimStatus', 
         'upgradeTier', 'ccToken', 'claimRewards'].includes(item.name)) {
      return {
        name: item.name,
        type: item.type,
        inputs: item.inputs,
        outputs: item.outputs,
        stateMutability: item.stateMutability
      };
    }
    return null;
  }).filter(Boolean),

  // StakingPool ABI - 修复版本
  STAKING_POOL_ABI: ACTUAL_ABIS.StakingPool.filter(item => item.type === 'function').map(item => {
    // 保留核心函数
    if (['stakeCC', 'stakeETH', 'getUserStakes', 'getAvailableRewards', 'unstake', 
         'claimRewards', 'getCurrentAPR', 'ccToken', 'customerNFT', 'providerNFT',
         'totalETHStaked', 'totalCCStaked'].includes(item.name)) {
      return {
        name: item.name,
        type: item.type,
        inputs: item.inputs,
        outputs: item.outputs,
        stateMutability: item.stateMutability
      };
    }
    return null;
  }).filter(Boolean),

  // ProviderNFT ABI - 修复版本
  PROVIDER_NFT_ABI: ACTUAL_ABIS.ProviderNFT.filter(item => item.type === 'function').map(item => {
    // 保留核心函数，修复getProviderStats参数
    if (['mintNFT', 'getNFTInfo', 'getBonusMultiplier', 'getProviderStats', 'getPerformanceScore',
         'completeJob', 'upgradeTier', 'ownerOf', 'balanceOf', 'tokenOfOwnerByIndex',
         'ccToken', 'stakingPool'].includes(item.name)) {
      // 修复getProviderStats函数签名
      if (item.name === 'getProviderStats') {
        return {
          name: item.name,
          type: item.type,
          inputs: [{internalType: "address", name: "provider", type: "address"}], // 修复参数类型
          outputs: item.outputs,
          stateMutability: item.stateMutability
        };
      }
      return {
        name: item.name,
        type: item.type,
        inputs: item.inputs,
        outputs: item.outputs,
        stateMutability: item.stateMutability
      };
    }
    return null;
  }).filter(Boolean),

  // ComputeMarket ABI - 修复版本
  COMPUTE_MARKET_ABI: ACTUAL_ABIS.ComputeMarket.filter(item => item.type === 'function').map(item => {
    // 保留核心函数，修复签名不匹配
    if (['createOrder', 'completeOrder', 'cancelOrder', 'getOrder', 'getUserOrders',
         'ccToken', 'customerNFT', 'ccusdToken', 'estimateCCPayment'].includes(item.name)) {
      // 修复createOrder函数签名
      if (item.name === 'createOrder') {
        return {
          name: item.name,
          type: item.type,
          inputs: [
            {internalType: "address", name: "_provider", type: "address"},
            {internalType: "uint256", name: "_usdPrice", type: "uint256"},
            {internalType: "bool", name: "_payWithCC", type: "bool"}
          ],
          outputs: item.outputs,
          stateMutability: item.stateMutability
        };
      }
      // 修复getUserOrders函数签名
      if (item.name === 'getUserOrders') {
        return {
          name: item.name,
          type: item.type,
          inputs: [
            {internalType: "address", name: "_user", type: "address"},
            {internalType: "uint8", name: "_status", type: "uint8"}
          ],
          outputs: item.outputs,
          stateMutability: item.stateMutability
        };
      }
      return {
        name: item.name,
        type: item.type,
        inputs: item.inputs,
        outputs: item.outputs,
        stateMutability: item.stateMutability
      };
    }
    return null;
  }).filter(Boolean),

  // 提供商激励ABI
  PROVIDER_INCENTIVE_ABI: [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_provider",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_nftId",
          "type": "uint256"
        }
      ],
      "name": "calculateRewards",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "rewards",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "claimRewards",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "provider",
          "type": "address"
        }
      ],
      "name": "getPendingRewards",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "ccToken",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "providerNFT",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ],

  // CCSD代币ABI (MockUSDC/CCUSD)
  CCSD_ABI: [
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "mint",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    }
  ]
};

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
    // 本地网络部署地址
    contractAddresses: {
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
  COMPLETE_ORDER: 180000,
  CANCEL_ORDER: 160000,
  
  // 提供商激励
  CLAIM_PROVIDER_REWARDS: 200000,
  
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