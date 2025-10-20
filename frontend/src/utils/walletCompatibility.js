/**
 * 简化的钱包兼容性修复工具
 * 解决 MetaMask 注入兼容性问题
 */

// 简单的钱包兼容性检查
export function initializeWalletCompatibility() {
  if (typeof window === 'undefined') return;

  // 基本的 MetaMask 修复
  fixMetaMaskInjection();

  // 设置基本事件监听器
  setupBasicEventListeners();
}

/**
 * 简单的 MetaMask 注入修复
 */
function fixMetaMaskInjection() {
  try {
    // 情况1: window.ethereum 不存在，但 window.web3.currentProvider 是 MetaMask
    if (!window.ethereum && window.web3?.currentProvider?.isMetaMask) {
      window.ethereum = window.web3.currentProvider;
      return true;
    }

    // 情况2: 检查 providers 数组中的 MetaMask
    if (window.ethereum?.providers && !window.ethereum.isMetaMask) {
      const metaMaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
      if (metaMaskProvider) {
        window.ethereum = metaMaskProvider;
        return true;
      }
    }

    // 情况3: MetaMask 已正确注入
    if (window.ethereum?.isMetaMask) {
      return true;
    }

    return false;
  } catch (error) {
    console.warn('钱包兼容性检查出错:', error);
    return false;
  }
}

/**
 * 设置基本事件监听器
 */
function setupBasicEventListeners() {
  if (!window.ethereum || typeof window.ethereum.on !== 'function') return;

  try {
    // 监听账户变化
    window.ethereum.on('accountsChanged', (accounts) => {
      console.log('钱包账户变化:', accounts);
      // 刷新页面以更新状态
      if (accounts.length === 0) {
        window.location.reload();
      }
    });

    // 监听网络变化
    window.ethereum.on('chainChanged', (chainId) => {
      console.log('链ID变化:', chainId);
      // 刷新页面以更新状态
      window.location.reload();
    });
  } catch (error) {
    console.warn('设置钱包事件监听器出错:', error);
  }
}

/**
 * 检测所有可用的钱包（简化版）
 */
export function detectWallets() {
  if (typeof window === 'undefined') return {};

  try {
    return {
      metamask: {
        detected: !!window.ethereum?.isMetaMask,
        provider: window.ethereum?.isMetaMask ? window.ethereum : null,
      },
      injected: {
        detected: !!window.ethereum && !window.ethereum.isMetaMask,
        provider: window.ethereum,
      }
    };
  } catch (error) {
    console.warn('检测钱包时出错:', error);
    return {};
  }
}

/**
 * 强制刷新钱包连接状态（简化版）
 */
export function refreshWalletConnection() {
  return fixMetaMaskInjection();
}

// 立即初始化（不延迟）
if (typeof window !== 'undefined') {
  initializeWalletCompatibility();
}