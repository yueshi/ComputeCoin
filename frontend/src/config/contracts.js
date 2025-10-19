// 智能合约配置 - 基于最新部署更新CCSD地址
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

export const CONTRACT_ABI = {
  // 基础代币ABI
  ERC20_ABI: [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
  ],

  // CC代币ABI - 基于实际合约生成的完整ABI
  CC_TOKEN_ABI: [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
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
          "name": "value",
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
          "name": "value",
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
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "burnFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "purchaseWithETH",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ethAmount",
          "type": "uint256"
        }
      ],
      "name": "getCCForETH",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenAmount",
          "type": "uint256"
        }
      ],
      "name": "getETHForCC",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "withdrawETH",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "ethAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tokenAmount",
          "type": "uint256"
        }
      ],
      "name": "TokensPurchased",
      "type": "event"
    }
  ],

  // CCSD代币ABI (MockUSDC/CCUSD) - 增强版本包含储备管理功能
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
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "burn",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "asset",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "addReserve",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "asset",
          "type": "address"
        },
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
      "name": "withdrawReserve",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getReserveRatio",
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
      "name": "getBackingPerToken",
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
      "name": "getStats",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "supply",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "reserveValue",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "reserveRatio",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "minted",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "burned",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalReserveValue",
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
          "name": "",
          "type": "address"
        }
      ],
      "name": "assetBalances",
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
      "name": "reserveTreasury",
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
      "name": "mintingPaused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "burningPaused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "maxSupply",
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
      "name": "emergencyMode",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address[]",
          "name": "recipients",
          "type": "address[]"
        },
        {
          "internalType": "uint256[]",
          "name": "amounts",
          "type": "uint256[]"
        }
      ],
      "name": "bulkTransfer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "asset",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "ReserveAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "asset",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "ReserveWithdrawn",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "Minted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "Burned",
      "type": "event"
    }
  ],

  // 计算市场ABI
  COMPUTE_MARKET_ABI: [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_usdPrice",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_ccPaymentAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_customerNftId",
          "type": "uint256"
        }
      ],
      "name": "createOrder",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "orderId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderId",
          "type": "uint256"
        }
      ],
      "name": "acceptOrder",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderId",
          "type": "uint256"
        }
      ],
      "name": "completeOrder",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "orderId",
          "type": "uint256"
        }
      ],
      "name": "cancelOrder",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_orderId",
          "type": "uint256"
        }
      ],
      "name": "getOrder",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "client",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "provider",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "usdPrice",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "finalPrice",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "ccPaymentAmount",
              "type": "uint256"
            },
            {
              "internalType": "enum ComputeMarket.OrderStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "createTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "customerNftId",
              "type": "uint256"
            }
          ],
          "internalType": "struct ComputeMarket.ComputeOrder",
          "name": "order",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getUserOrders",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "client",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "provider",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "usdPrice",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "finalPrice",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "ccPaymentAmount",
              "type": "uint256"
            },
            {
              "internalType": "enum ComputeMarket.OrderStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "createTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "customerNftId",
              "type": "uint256"
            }
          ],
          "internalType": "struct ComputeMarket.ComputeOrder[]",
          "name": "",
          "type": "tuple[]"
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
      "name": "customerNFT",
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
      "name": "usdcToken",
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
    "event OrderCreated(uint256 orderId, address client, uint256 usdPrice)",
    "event OrderCompleted(uint256 orderId, uint256 ccBurnedAmount)",
    "event OrderAccepted(uint256 orderId, address provider)",
    "event OrderCancelled(uint256 orderId)"
  ],

  // 质押池ABI - 修复版本，基于实际合约StakingPool.sol
  STAKING_POOL_ABI: [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isForNFT",
          "type": "bool"
        },
        {
          "internalType": "enum CustomerNFT.Tier",
          "name": "customerTier",
          "type": "uint8"
        },
        {
          "internalType": "enum ProviderNFT.Tier",
          "name": "providerTier",
          "type": "uint8"
        }
      ],
      "name": "stakeCC",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bool",
          "name": "isForNFT",
          "type": "bool"
        },
        {
          "internalType": "enum CustomerNFT.Tier",
          "name": "customerTier",
          "type": "uint8"
        },
        {
          "internalType": "enum ProviderNFT.Tier",
          "name": "providerTier",
          "type": "uint8"
        }
      ],
      "name": "stakeETH",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_user",
          "type": "address"
        }
      ],
      "name": "getUserStakes",
      "outputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "user",
              "type": "address"
            },
            {
              "internalType": "enum StakingPool.AssetType",
              "name": "assetType",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lastClaimTime",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "isForNFT",
              "type": "bool"
            },
            {
              "internalType": "uint8",
              "name": "customerNftTier",
              "type": "uint8"
            },
            {
              "internalType": "uint8",
              "name": "providerNftTier",
              "type": "uint8"
            },
            {
              "internalType": "bool",
              "name": "isActive",
              "type": "bool"
            }
          ],
          "internalType": "struct StakingPool.Stake[]",
          "name": "stakes",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAvailableRewards",
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
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserPendingRewards",
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
          "internalType": "uint256",
          "name": "stakeIndex",
          "type": "uint256"
        }
      ],
      "name": "unstake",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "stakeIndex",
          "type": "uint256"
        }
      ],
      "name": "claimRewards",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCurrentAPR",
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
      "name": "customerNFT",
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
    },
    {
      "inputs": [],
      "name": "totalETHStaked",
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
      "name": "totalCCStaked",
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
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "assetType",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isForNFT",
          "type": "bool"
        }
      ],
      "name": "Staked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "RewardsClaimed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum CustomerNFT.Tier",
          "name": "tier",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "ethAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "ccAmount",
          "type": "uint256"
        }
      ],
      "name": "CustomerNFTMintedFromStake",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum ProviderNFT.Tier",
          "name": "tier",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stakeAmount",
          "type": "uint256"
        }
      ],
      "name": "ProviderNFTMintedFromStake",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum CustomerNFT.Tier",
          "name": "tier",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "usdcAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "ccAmount",
          "type": "uint256"
        }
      ],
      "name": "CustomerNFTDirectMinted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "enum StakingPool.AssetType",
          "name": "assetType",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "Unstaked",
      "type": "event"
    }
  ],
  // 客户NFT ABI
  // 客户NFT ABI - 标准JSON格式，确保wagmi正确解析
  CUSTOMER_NFT_ABI: [
    {
      "inputs": [
        {"internalType": "address", "name": "to", "type": "address"},
        {"internalType": "enum CustomerNFT.Tier", "name": "tier", "type": "uint8"},
        {"internalType": "uint256", "name": "ccusdAmount", "type": "uint256"}
      ],
      "name": "mintWithCCUSD",
      "outputs": [
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address", "name": "to", "type": "address"},
        {"internalType": "enum CustomerNFT.Tier", "name": "tier", "type": "uint8"},
        {"internalType": "uint256", "name": "ccAmount", "type": "uint256"}
      ],
      "name": "mintWithCC",
      "outputs": [
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address", "name": "to", "type": "address"},
        {"internalType": "enum CustomerNFT.Tier", "name": "tier", "type": "uint8"}
      ],
      "name": "publicMintNFT",
      "outputs": [
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address", "name": "user", "type": "address"}
      ],
      "name": "getDiscount",
      "outputs": [
        {"internalType": "uint256", "name": "", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
      ],
      "name": "getNFTInfo",
      "outputs": [
        {"internalType": "uint8", "name": "tier", "type": "uint8"},
        {"internalType": "uint256", "name": "discount", "type": "uint256"},
        {"internalType": "uint256", "name": "monthlyReward", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
      ],
      "name": "getMonthlyReward",
      "outputs": [
        {"internalType": "uint256", "name": "", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
      ],
      "name": "getTier",
      "outputs": [
        {"internalType": "uint8", "name": "", "type": "uint8"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
      ],
      "name": "ownerOf",
      "outputs": [
        {"internalType": "address", "name": "", "type": "address"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address", "name": "owner", "type": "address"}
      ],
      "name": "balanceOf",
      "outputs": [
        {"internalType": "uint256", "name": "", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address", "name": "owner", "type": "address"},
        {"internalType": "uint256", "name": "index", "type": "uint256"}
      ],
      "name": "tokenOfOwnerByIndex",
      "outputs": [
        {"internalType": "uint256", "name": "", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address", "name": "user", "type": "address"}
      ],
      "name": "getClaimStatus",
      "outputs": [
        {"internalType": "bool", "name": "canClaim", "type": "bool"},
        {"internalType": "uint256", "name": "timeRemaining", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
        {"internalType": "enum CustomerNFT.Tier", "name": "newTier", "type": "uint8"}
      ],
      "name": "upgradeTier",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "usdcToken",
      "outputs": [
        {"internalType": "address", "name": "", "type": "address"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "ccToken",
      "outputs": [
        {"internalType": "address", "name": "", "type": "address"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "address", "name": "from", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
        {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"}
      ],
      "name": "Transfer",
      "type": "event"
    }
  ],
  // 提供商NFT ABI
  PROVIDER_NFT_ABI: [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "enum ProviderNFT.Tier",
          "name": "tier",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "deviceCount",
          "type": "uint256"
        }
      ],
      "name": "mintNFT",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
        }
      ],
      "name": "getNFTInfo",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "tier",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "bonusMultiplier",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deviceRequirement",
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
          "name": "provider",
          "type": "address"
        }
      ],
      "name": "getBonusMultiplier",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "bps",
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
          "name": "provider",
          "type": "address"
        }
      ],
      "name": "getProviderStats",
      "outputs": [
        {
          "components": [
            {
              "internalType": "enum ProviderNFT.Tier",
              "name": "tier",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "completedJobs",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "totalRewards",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "performanceScore",
              "type": "uint256"
            }
          ],
          "internalType": "struct ProviderNFT.ProviderStats",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
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
      "name": "getPerformanceScore",
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
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "reward",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "customerRating",
          "type": "uint256"
        }
      ],
      "name": "completeJob",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "internalType": "enum ProviderNFT.Tier",
          "name": "newTier",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "deviceCount",
          "type": "uint256"
        }
      ],
      "name": "upgradeTier",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        }
      ],
      "name": "ownerOf",
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
        {"internalType": "address", "name": "owner", "type": "address"},
        {"internalType": "uint256", "name": "index", "type": "uint256"}
      ],
      "name": "tokenOfOwnerByIndex",
      "outputs": [
        {"internalType": "uint256", "name": "", "type": "uint256"}
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
      "name": "stakingPool",
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
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
        }
      ],
      "name": "getNFTData",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
            },
            {
              "internalType": "enum ProviderNFT.Tier",
              "name": "tier",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "activationTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lastActiveTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "qualityScore",
              "type": "uint256"
            }
          ],
          "internalType": "struct ProviderNFT.ProviderNFTData",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "tokenId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "provider",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "enum ProviderNFT.Tier",
          "name": "tier",
          "type": "uint8"
        }
      ],
      "name": "ProviderNFTMinted",
      "type": "event"
    }
  ],

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
      "inputs": [
        {
          "internalType": "address",
          "name": "provider",
          "type": "address"
        }
      ],
      "name": "getProviderInfo",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "nftId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "tier",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lastClaimTime",
              "type": "uint256"
            }
          ],
          "internalType": "struct ProviderIncentive.ProviderInfo",
          "name": "",
          "type": "tuple"
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
    },
    {
      "inputs": [],
      "name": "dailyReleaseRate",
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
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "provider",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "RewardsClaimed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newRate",
          "type": "uint256"
        }
      ],
      "name": "DailyReleaseRateUpdated",
      "type": "event"
    }
  ],

    
  // ETH兑换CCUSD合约ABI - 基于实际部署的EthToCCUSDConverter.sol
  ETH_CCUSD_CONVERTER_ABI: [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "customRate",
          "type": "uint256"
        }
      ],
      "name": "exchange",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "quickExchange",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ethAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "customRate",
          "type": "uint256"
        }
      ],
      "name": "getExchangeEstimate",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "grossAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "feeAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "netAmount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ethAmount",
          "type": "uint256"
        }
      ],
      "name": "estimateExchange",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "ccusdAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "fee",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getStats",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "_totalEthExchanged",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_totalCCUSDMinted",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_totalExchangeCount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_totalFeesCollected",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "contractAge",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getContractBalances",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "ethBalance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "ccusdBalance",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getExchangeInfo",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "currentExchangeRate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "fee",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "availableETH",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "availableCCUSD",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "reserveRatio",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getRateInfo",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "rate",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "enabled",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "reserveRatio",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "currentRate",
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
      "name": "exchangeFeeRate",
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
      "name": "ccusdToken",
      "outputs": [
        {
          "internalType": "contract IERC20",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "reservePool",
      "outputs": [
        {
          "internalType": "contract CCUSDReservePool",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "ethAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "ccusdAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "feeAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "rate",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "Exchanged",
      "type": "event"
    }
  ],

  // CCUSD储备池合约ABI - 基于实际部署的CCUSDReservePool.sol
  CCUSD_RESERVE_POOL_ABI: [
    {
      "inputs": [],
      "name": "getReserveRatio",
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
      "name": "getBackingPerCCUSD",
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
      "name": "totalEthReserves",
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
      "name": "totalCCReserves",
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
      "name": "totalCCUSDIssued",
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
      "name": "ETH_CCUSD_RATE",
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
      "name": "emergencyPause",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "ReserveAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "ReserveWithdrawn",
      "type": "event"
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
    // 本地网络部署地址 - 根据最新部署更新
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