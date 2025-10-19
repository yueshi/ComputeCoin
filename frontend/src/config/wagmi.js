import { http, createConfig } from 'wagmi'
import { metaMask } from 'wagmi/connectors'

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

// 简化配置 - 只支持本地 Hardhat 网络和 MetaMask
export const config = createConfig({
  chains: [localhost],
  connectors: [
    metaMask({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [localhost.id]: http('http://127.0.0.1:8545'),
  },
})

// 默认链配置
export const DEFAULT_CHAIN = localhost

// 支持的链列表 - 只支持本地 Hardhat 网络
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