import { http, createConfig } from 'wagmi'
import { metaMask, injected } from 'wagmi/connectors'
import { rainbowkitSimpleWallets } from '@rainbow-me/rainbowkit/wallets'

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

// Wagmi 配置
export const config = createConfig({
  chains: [localhost],
  connectors: [
    metaMask(),
    injected(),
  ],
  transports: {
    [localhost.id]: http('http://127.0.0.1:8545'),
  },
})

// RainbowKit 的 wallets 配置
export const wallets = [
  {
    groupName: 'Recommended',
    wallets: [
      metaMask(),
      injected(),
    ],
  },
]

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