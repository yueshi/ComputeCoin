/**
 * RainbowKit 连接器刷新工具
 * 解决钱包注入时机问题
 */

import { reconnect } from 'wagmi/actions'
import { config } from '../config/rainbowKit'

/**
 * 强制刷新 RainbowKit 连接器
 * 当钱包注入时机有问题时使用
 */
export function refreshRainbowKitConnectors() {
  try {
    // 检查当前钱包状态
    if (window.ethereum?.isMetaMask) {
      // 强制重新连接已连接的账户
      reconnect(config).catch(() => {
        // 忽略错误
      });
    }
  } catch (error) {
    // 忽略错误
  }
}