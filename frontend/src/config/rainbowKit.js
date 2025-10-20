import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { metaMask, injected } from 'wagmi/connectors'

// 本地 Hardhat 网络配置
const localhost = {
  id: 31337,
  name: 'Hardhat Localhost',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
}

// 支持的链配置
const chains = [hardhat, sepolia, mainnet]

// 创建Wagmi配置 (仅支持浏览器钱包)
export const config = createConfig({
  chains,
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})

// 默认网络配置
export const defaultChain = hardhat
export const defaultChainId = import.meta.env.VITE_DEFAULT_CHAIN_ID
  ? Number(import.meta.env.VITE_DEFAULT_CHAIN_ID)
  : hardhat.id

// 默认链配置
export const DEFAULT_CHAIN = localhost

// 支持的链列表
export const SUPPORTED_CHAINS = {
  localhost: {
    id: 31337,
    name: '本地测试',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
    blockExplorers: { default: { name: 'Local', url: 'http://localhost:8545' } },
    testnet: true,
  }
}

// 钱包类型常量
export const WALLET_TYPES = {
  METAMASK: 'metamask',
  INJECTED: 'injected'
}

// 钱包配置
export const WALLET_CONFIGS = {
  [WALLET_TYPES.METAMASK]: {
    name: 'MetaMask',
    icon: '🦊',
    description: '最流行的以太坊钱包',
    color: '#F6851B',
    downloadUrl: 'https://metamask.io/download/'
  },
  [WALLET_TYPES.INJECTED]: {
    name: '其他钱包',
    icon: '🔗',
    description: '支持多种浏览器扩展钱包',
    color: '#6366F1',
    downloadUrl: 'https://ethereum.org/en/wallets/'
  }
}