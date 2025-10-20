import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import App from './App'
import { config } from './config/rainbowKit'
import './i18n'
import './index.css'

const queryClient = new QueryClient()

// 简单的钱包兼容性检查
const setupWalletCompatibility = () => {
  if (typeof window !== 'undefined') {
    // 基本的 MetaMask 修复
    if (!window.ethereum && window.web3?.currentProvider?.isMetaMask) {
      window.ethereum = window.web3.currentProvider;
    }

    // 将配置暴露到全局
    window.wagmiConfig = config;
  }
}

// 立即渲染应用，不等待钱包注入
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);

// 应用加载后进行钱包兼容性设置
setupWalletCompatibility();