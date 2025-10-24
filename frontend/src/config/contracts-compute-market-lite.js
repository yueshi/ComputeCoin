// ComputeMarketLite 合约专用配置
// 提取的 ABI 和地址配置

import ComputeMarketLiteABI from './compute-market-lite-abi.json';

// 合约地址配置 (根据实际部署更新)
export const COMPUTE_MARKET_LITE_ADDRESSES = {
  LOCALHOST: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", // 本地部署地址
  // 其他网络地址需要根据实际部署情况更新
};

// 主要合约ABI
export const COMPUTE_MARKET_LITE_ABI = ComputeMarketABI;

// 支付代币类型枚举 (与合约中的enum对应)
export const PAYMENT_TOKEN = {
  NONE: 0,
  CC: 1,
  CCUSD: 2
};

// 订单状态枚举 (与合约中的enum对应)
export const ORDER_STATUS = {
  CREATED: 0,
  PAID: 1,
  ACTIVE: 2,
  COMPLETED: 3,
  CONFIRMED: 4,
  CANCELLED: 5
};

// Gas限制配置 (针对ComputeMarketLite优化)
export const COMPUTE_MARKET_LITE_GAS_LIMITS = {
  CREATE_ORDER: 200000,
  MAKE_PAYMENT: 300000,
  CANCEL_ORDER: 150000,
  START_SERVICE: 100000,
  COMPLETE_ORDER: 100000,
  CONFIRM_ORDER: 100000,
  GET_ORDER: 50000,
  GET_ORDER_PAYMENT: 50000
};

// 合约方法映射
export const COMPUTE_MARKET_LITE_METHODS = {
  CREATE_ORDER: 'createOrder',
  MAKE_PARTIAL_PAYMENT: 'makePartialPayment',
  CANCEL_ORDER: 'cancelOrder',
  START_SERVICE: 'startService',
  COMPLETE_ORDER: 'completeOrder',
  CONFIRM_ORDER: 'confirmOrder',
  GET_ORDER: 'getOrder',
  GET_ORDER_PAYMENT: 'getOrderPayment',
  SET_PLATFORM_FEE: 'setPlatformFee',
  SET_BURN_RATE: 'setBurnRate',
  SET_CC_PRICE: 'setCCPrice',
  SET_TREASURY: 'setTreasury',
  OWNER: 'owner',
  NEXT_ORDER_ID: 'nextOrderId',
  CC_TOKEN: 'ccToken',
  CCUSD_TOKEN: 'ccusdToken',
  CUSTOMER_NFT: 'customerNFT',
  TOTAL_ORDERS: 'totalOrders',
  TOTAL_CC_PAYMENTS: 'totalCCPayments',
  TOTAL_CCUSD_PAYMENTS: 'totalCCUSDPayments',
  TOTAL_VOLUME_USD: 'totalVolumeUSD',
  PLATFORM_FEE_BPS: 'platformFeeBps',
  BURN_RATE_BPS: 'burnRateBps',
  CC_TOKEN_PRICE: 'ccTokenPrice',
  TREASURY: 'treasury'
};

// 默认汇率配置 (与合约中的默认值一致)
export const DEFAULT_EXCHANGE_RATE = {
  CC_TO_CCUSD: 0.1, // 1 CC = 0.1 CCUSD
  CCUSD_TO_CC: 10    // 1 CCUSD = 10 CC
};

// 错误代码映射
export const ERROR_CODES = {
  ORDER_NOT_CREATED: 'Order not in payment state',
  NOT_ORDER_CLIENT: 'Not order client',
  INVALID_AMOUNT: 'Invalid payment amount',
  INVALID_TOKEN_TYPE: 'Invalid token type',
  INSUFFICIENT_ALLOWANCE: 'Insufficient token allowance',
  INSUFFICIENT_BALANCE: 'Insufficient token balance',
  PAYMENT_TOO_FREQUENT: 'Payment too frequent',
  MAXIMUM_PAYMENTS: 'Maximum payment records reached',
  DUPLICATE_PAYMENT: 'Duplicate payment detected',
  OVERPAYMENT: 'Overpayment',
  INVALID_CALCULATION: 'Invalid calculation',
  INVALID_CONVERSION_RATE: 'Invalid conversion rate'
};

// 事件名称映射
export const EVENTS = {
  ORDER_CREATED: 'OrderCreated',
  PAYMENT_RECEIVED: 'PaymentReceived',
  ORDER_COMPLETED: 'OrderCompleted',
  ORDER_CONFIRMED: 'OrderConfirmed',
  ORDER_CANCELLED: 'OrderCancelled'
};

// 验证工具函数
export const validatePaymentAmount = (amount, tokenType) => {
  if (!amount || amount <= 0) {
    throw new Error(ERROR_CODES.INVALID_AMOUNT);
  }

  // 根据代币类型验证范围
  if (tokenType === PAYMENT_TOKEN.CCUSD) {
    if (amount < 1 * 1e6 || amount > 10000 * 1e6) {
      throw new Error('CCUSD amount must be between 1 and 10000');
    }
  } else if (tokenType === PAYMENT_TOKEN.CC) {
    if (amount < 1 * 1e18 || amount > 1000000 * 1e18) {
      throw new Error('CC amount must be between 1 and 1000000');
    }
  }
};

export const validateOrderData = (orderData) => {
  if (!orderData.provider || orderData.provider === '0x0') {
    throw new Error('Invalid provider address');
  }

  if (!orderData.usdPrice || orderData.usdPrice <= 0) {
    throw new Error('Invalid USD price');
  }

  if (orderData.usdPrice < 1 * 1e6 || orderData.usdPrice > 10000 * 1e6) {
    throw new Error('USD price must be between 1 and 10000');
  }
};

// 汇率计算函数
export const calculateCCFromUSD = (usdAmount, exchangeRate = DEFAULT_EXCHANGE_RATE.CC_TO_CCUSD) => {
  if (!usdAmount || usdAmount <= 0) return '0';
  return (parseFloat(usdAmount) / exchangeRate).toFixed(4);
};

export const calculateUSDFromCC = (ccAmount, exchangeRate = DEFAULT_EXCHANGE_RATE.CC_TO_CCUSD) => {
  if (!ccAmount || ccAmount <= 0) return '0';
  return (parseFloat(ccAmount) * exchangeRate).toFixed(2);
};

// 格式化工具函数
export const formatAmount = (amount, decimals = 18, displayDecimals = 4) => {
  if (!amount || amount === '0') return '0';
  const num = parseFloat(amount);
  return num.toFixed(displayDecimals);
};

export const formatTokenAmount = (amount, tokenType, decimals = null) => {
  const tokenDecimals = decimals !== null ? decimals :
    (tokenType === PAYMENT_TOKEN.CC ? 18 : 6);
  return formatAmount(amount, tokenDecimals, tokenType === PAYMENT_TOKEN.CC ? 4 : 2);
};

// 合约实例创建函数
export const createComputeMarketLiteContract = (signer, address) => {
  if (!signer || !address) {
    throw new Error('Signer and address are required');
  }

  return {
    address,
    abi: COMPUTE_MARKET_LITE_ABI,
    signer,
    // 合约实例方法将自动可用
  };
};

// 网络配置
export const getNetworkConfig = (chainId) => {
  const networks = {
    1337: { // Local Hardhat
      name: 'Localhost',
      rpcUrl: 'http://127.0.0.1:8545',
      chainId: 1337,
      contractAddress: COMPUTE_MARKET_LITE_ADDRESSES.LOCALHOST
    },
    // 可以添加其他网络配置
  };

  return networks[chainId] || networks[1337];
};

export default {
  COMPUTE_MARKET_LITE_ABI,
  COMPUTE_MARKET_LITE_ADDRESSES,
  PAYMENT_TOKEN,
  ORDER_STATUS,
  COMPUTE_MARKET_LITE_GAS_LIMITS,
  COMPUTE_MARKET_LITE_METHODS,
  DEFAULT_EXCHANGE_RATE,
  ERROR_CODES,
  EVENTS,
  validatePaymentAmount,
  validateOrderData,
  calculateCCFromUSD,
  calculateUSDFromCC,
  formatAmount,
  formatTokenAmount,
  createComputeMarketLiteContract,
  getNetworkConfig
};