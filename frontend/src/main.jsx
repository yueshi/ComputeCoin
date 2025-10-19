import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

import App from './App'
import { config } from './config/rainbowKit'
import './i18n'
import './index.css'
import { initializeWalletCompatibility } from './utils/walletCompatibility'
import './utils/rainbowKitRefresh'

const queryClient = new QueryClient()

// 立即进行钱包兼容性修复（在 React 应用初始化之前）
if (typeof window !== 'undefined') {
  // 立即检查并修复 MetaMask 注入
  if (!window.ethereum && window.web3?.currentProvider?.isMetaMask) {
    window.ethereum = window.web3.currentProvider;
  }

  // 检查 providers 数组中的 MetaMask
  if (window.ethereum?.providers && !window.ethereum.isMetaMask) {
    const metaMaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
    if (metaMaskProvider) {
      window.ethereum = metaMaskProvider;
    }
  }
}

// 确保在 React 渲染前 MetaMask 可用
function ensureMetaMaskAvailable() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    // 如果 MetaMask 已经可用，直接返回
    if (window.ethereum?.isMetaMask) {
      resolve();
      return;
    }

    // 等待 MetaMask 注入
    let attempts = 0;
    const maxAttempts = 10;
    const interval = 100;

    const checkInterval = setInterval(() => {
      attempts++;

      // 尝试从 web3.currentProvider 获取
      if (window.web3?.currentProvider?.isMetaMask) {
        window.ethereum = window.web3.currentProvider;
        clearInterval(checkInterval);
        resolve();
        return;
      }

      // 尝试从 providers 数组获取
      if (window.ethereum?.providers) {
        const metaMaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
        if (metaMaskProvider) {
          window.ethereum = metaMaskProvider;
          clearInterval(checkInterval);
          resolve();
          return;
        }
      }

      // 检查是否直接注入到 window.ethereum
      if (window.ethereum?.isMetaMask) {
        clearInterval(checkInterval);
        resolve();
        return;
      }

      // 超时
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        resolve();
      }
    }, interval);
  });
}

// 确保 MetaMask 可用后再初始化 React 应用
ensureMetaMaskAvailable().then(() => {
  // 将 wagmi 配置暴露到全局，供调试和兼容性工具使用
  if (typeof window !== 'undefined') {
    window.wagmiConfig = config;
  }

  // 初始化钱包兼容性修复（用于持续监控和延迟修复）
  initializeWalletCompatibility();

  ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
});