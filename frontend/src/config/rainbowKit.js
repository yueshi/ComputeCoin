import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'

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

// 使用官方推荐的 RainbowKit 配置方法
const config = getDefaultConfig({
  appName: 'CC De-Service市场',
  projectId: 'bc4cf0d5b4c9e9a3c8a2b9e7f6d5e4c3b', // 使用示例projectId
  chains: [localhost],
  transports: {
    [localhost.id]: http('http://127.0.0.1:8545'),
  },
})


export { config }

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