/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_URL: string
  readonly VITE_API_TIMEOUT: string

  // Web3 Network Configuration
  readonly VITE_CHAIN_ID: string
  readonly VITE_RPC_URL: string
  readonly VITE_NETWORK_NAME: string
  readonly VITE_NETWORK_EXPLORER: string

  // Contract Configuration
  readonly VITE_DEFAULT_CHAIN_ID: string
  readonly VITE_ENABLE_TEST_MODE: string
  readonly VITE_AUTO_CONNECT_WALLET: string

  // Application Configuration
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_DESCRIPTION: string

  // Development Configuration
  readonly VITE_DEV_MODE: string
  readonly VITE_DEBUG_MODE: string
  readonly VITE_ENABLE_CONSOLE_LOGS: string

  // Feature Flags
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_ENABLE_ERROR_REPORTING: string
  readonly VITE_ENABLE_PERFORMANCE_MONITORING: string

  // Vite内置变量
  readonly BASE_URL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// 扩展Window接口，用于全局变量
declare global {
  interface Window {
    // Web3相关
    ethereum?: any
    viem?: any
    ethers?: any

    // 应用全局配置
    __APP_VERSION__?: string

    // 开发工具
    __VITE_DEV_MODE__?: boolean
    __VITE_DEBUG_MODE__?: boolean
  }
}

export {}