/**
 * 钱包兼容性修复工具
 * 解决 MetaMask 和其他钱包的注入兼容性问题
 */

// 在应用加载时自动运行钱包兼容性修复
export function initializeWalletCompatibility() {
  // 检查并修复 MetaMask 注入问题
  fixMetaMaskInjection();

  // 检查其他钱包兼容性
  fixOtherWallets();

  // 监听钱包连接状态变化
  setupWalletEventListeners();
}

/**
 * 修复 MetaMask 注入问题
 * 解决某些情况下 window.ethereum 未正确设置的问题
 */
function fixMetaMaskInjection() {
  // 情况1: window.ethereum 不存在，但 window.web3.currentProvider 是 MetaMask
  if (!window.ethereum && window.web3?.currentProvider?.isMetaMask) {
    window.ethereum = window.web3.currentProvider;
    return true;
  }

  // 情况2: window.ethereum 存在但不是 MetaMask，检查 providers 数组
  if (window.ethereum?.providers && !window.ethereum.isMetaMask) {
    const metaMaskProvider = window.ethereum.providers.find(p => p.isMetaMask);

    if (metaMaskProvider) {
      window.ethereum = metaMaskProvider;
      return true;
    }
  }

  // 情况3: 检查 window.ethereum 是否是 MetaMask 但被其他钱包覆盖
  if (window.ethereum && !window.ethereum.isMetaMask) {
    // 尝试从 window.web3 恢复
    if (window.web3?.currentProvider?.isMetaMask) {
      // 保存原有的 providers 数组（如果存在）
      const existingProviders = window.ethereum.providers;
      window.ethereum = window.web3.currentProvider;

      // 恢复 providers 数组
      if (existingProviders && !window.ethereum.providers) {
        window.ethereum.providers = existingProviders;
      }

      return true;
    }
  }

  // 情况4: MetaMask 已正确注入
  if (window.ethereum?.isMetaMask) {
    return true;
  }

  return false;
}

/**
 * 修复其他钱包的兼容性问题
 */
function fixOtherWallets() {
  // Coinbase Wallet 检测
  if (window.coinbaseWalletExtension) {
    // Coinbase Wallet 检测到
  }

  // Trust Wallet 检测
  if (window.ethereum?.isTrust) {
    // Trust Wallet 检测到
  }

  // Brave Wallet 检测
  if (window.ethereum?.isBraveWallet) {
    // Brave Wallet 检测到
  }
}

/**
 * 设置钱包事件监听器
 */
function setupWalletEventListeners() {
  if (!window.ethereum) return;

  // 监听账户变化
  if (typeof window.ethereum.on === 'function') {
    window.ethereum.on('accountsChanged', (accounts) => {
      // 钱包账户变化事件
    });

    // 监听网络变化
    window.ethereum.on('chainChanged', (chainId) => {
      // 链ID变化事件
    });

    // 监听连接状态变化
    window.ethereum.on('connect', (connectInfo) => {
      // 钱包已连接事件
    });

    window.ethereum.on('disconnect', (error) => {
      // 钱包已断开事件
    });
  }
}

/**
 * 检测所有可用的钱包
 */
export function detectWallets() {
  const wallets = {
    metamask: {
      detected: !!window.ethereum?.isMetaMask || !!window.web3?.currentProvider?.isMetaMask,
      provider: window.ethereum?.isMetaMask ? window.ethereum : (window.web3?.currentProvider?.isMetaMask ? window.web3.currentProvider : null),
      version: window.ethereum?.version || 'unknown'
    },
    coinbase: {
      detected: !!window.coinbaseWalletExtension,
      provider: window.coinbaseWalletExtension
    },
    trust: {
      detected: !!window.ethereum?.isTrust,
      provider: window.ethereum?.isTrust ? window.ethereum : null
    },
    brave: {
      detected: !!window.ethereum?.isBraveWallet,
      provider: window.ethereum?.isBraveWallet ? window.ethereum : null
    },
    rabby: {
      detected: !!window.ethereum?.isRabby,
      provider: window.ethereum?.isRabby ? window.ethereum : null
    }
  };

  return wallets;
}

/**
 * 强制刷新钱包连接状态
 */
export function refreshWalletConnection() {
  // 重新运行兼容性检查
  const fixed = fixMetaMaskInjection();

  return fixed;
}

// 自动初始化（如果直接导入此文件）
if (typeof window !== 'undefined') {
  // 等待页面完全加载并延迟检查，确保钱包有足够时间注入
  const delayedInitialize = () => {
    // 先等待一段时间让钱包注入
    setTimeout(() => {
      initializeWalletCompatibility();

      // 再次延迟检查，处理某些钱包注入较慢的情况
      setTimeout(() => {
        initializeWalletCompatibility();
      }, 2000);
    }, 1000);
  };

  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', delayedInitialize);
  } else {
    // DOM 已经加载完成
    delayedInitialize();
  }
}