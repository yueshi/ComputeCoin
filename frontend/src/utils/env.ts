/**
 * 环境变量工具类
 * 提供类型安全的环境变量访问和默认值处理
 */

class EnvUtils {
  /**
   * 获取环境变量值，提供默认值
   */
  static get(key: keyof ImportMetaEnv, defaultValue?: string): string {
    return import.meta.env[key] || defaultValue || ''
  }

  /**
   * 获取布尔值环境变量
   */
  static getBoolean(key: keyof ImportMetaEnv, defaultValue = false): boolean {
    const value = this.get(key).toLowerCase()
    return value === 'true' || value === '1' || value === 'yes'
  }

  /**
   * 获取数字环境变量
   */
  static getNumber(key: keyof ImportMetaEnv, defaultValue = 0): number {
    const value = this.get(key)
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? defaultValue : parsed
  }

  /**
   * 获取API配置
   */
  static getApiConfig() {
    return {
      url: this.get('VITE_API_URL', 'http://localhost:3001/api'),
      timeout: this.getNumber('VITE_API_TIMEOUT', 10000)
    }
  }

  /**
   * 获取网络配置
   */
  static getNetworkConfig() {
    return {
      chainId: this.getNumber('VITE_CHAIN_ID', 31337),
      rpcUrl: this.get('VITE_RPC_URL', 'http://127.0.0.1:8545'),
      networkName: this.get('VITE_NETWORK_NAME', 'localhost'),
      networkExplorer: this.get('VITE_NETWORK_EXPLORER', 'http://localhost:8545')
    }
  }

  /**
   * 获取应用配置
   */
  static getAppConfig() {
    return {
      name: this.get('VITE_APP_NAME', 'CC Compute Platform'),
      version: this.get('VITE_APP_VERSION', '1.0.0'),
      description: this.get('VITE_APP_DESCRIPTION', 'Decentralized Compute Marketplace'),
      isDev: this.getBoolean('VITE_DEV_MODE', import.meta.env.DEV),
      isDebug: this.getBoolean('VITE_DEBUG_MODE', false)
    }
  }

  /**
   * 获取功能开关
   */
  static getFeatureFlags() {
    return {
      testMode: this.getBoolean('VITE_ENABLE_TEST_MODE', true),
      autoConnectWallet: this.getBoolean('VITE_AUTO_CONNECT_WALLET', false),
      analytics: this.getBoolean('VITE_ENABLE_ANALYTICS', false),
      errorReporting: this.getBoolean('VITE_ENABLE_ERROR_REPORTING', false),
      performanceMonitoring: this.getBoolean('VITE_ENABLE_PERFORMANCE_MONITORING', false),
      consoleLogs: this.getBoolean('VITE_ENABLE_CONSOLE_LOGS', true)
    }
  }

  /**
   * 验证必需的环境变量
   */
  static validateRequired(): { isValid: boolean; missing: string[] } {
    const required = ['VITE_API_URL', 'VITE_CHAIN_ID', 'VITE_RPC_URL']
    const missing: string[] = []

    for (const key of required as const) {
      if (!this.get(key)) {
        missing.push(key)
      }
    }

    return {
      isValid: missing.length === 0,
      missing
    }
  }

  /**
   * 打印当前环境配置（仅在开发模式下）
   */
  static logConfig() {
    if (!this.getBoolean('VITE_DEBUG_MODE') && !import.meta.env.DEV) {
      return
    }

    console.group('🔧 Environment Configuration')
    console.log('API:', this.getApiConfig())
    console.log('Network:', this.getNetworkConfig())
    console.log('App:', this.getAppConfig())
    console.log('Features:', this.getFeatureFlags())
    console.groupEnd()
  }
}

export default EnvUtils

// 导出便捷方法
export const {
  get,
  getBoolean,
  getNumber,
  getApiConfig,
  getNetworkConfig,
  getAppConfig,
  getFeatureFlags,
  validateRequired,
  logConfig
} = EnvUtils