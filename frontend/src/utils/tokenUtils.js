/**
 * Token 相关工具函数
 * 处理 CC/CCUSD 的精度、汇率转换和格式化显示
 */

import { formatEther, formatUnits } from 'viem'

// 合约常量 - 必须与 ComputeMarket.sol 保持一致
export const PAYMENT_TOKEN = {
  NONE: 0,
  CC: 1,
  CCUSD: 2
}

export const PAYMENT_TOKEN_NAME = {
  [PAYMENT_TOKEN.NONE]: 'paymentToken.none',
  [PAYMENT_TOKEN.CC]: 'paymentToken.cc',
  [PAYMENT_TOKEN.CCUSD]: 'paymentToken.ccusd'
}

/**
 * 获取支付方式显示名称（支持国际化）
 * @param {number} tokenType 支付token类型
 * @param {function} t 翻译函数
 * @returns {string} 支付方式名称
 */
export function getPaymentMethodName(tokenType, t) {
  const key = PAYMENT_TOKEN_NAME[tokenType]
  return t ? t(`orders.${key}`) : 'Not Paid'
}

// Token 精度配置
export const TOKEN_DECIMALS = {
  [PAYMENT_TOKEN.CC]: 18,    // CC 代币使用标准 ERC-20 精度
  [PAYMENT_TOKEN.CCUSD]: 6    // CCUSD 使用 6 位精度（与合约 PRICE_PRECISION 一致）
}

// 汇率配置 - 基于合约定义 ccTokenPrice = 1 * 10**17
// 1 CC = 0.1 CCUSD，即 1 CCUSD = 10 CC
export const EXCHANGE_RATE = {
  CC_TO_USD: 0.1,      // 1 CC = 0.1 CCUSD
  USD_TO_CC: 10        // 1 CCUSD = 10 CC
}

// 费率配置
export const FEE_RATES = {
  PLATFORM: 0.025,      // 2.5% 平台费
  BURN: 0.015          // 1.5% 燃烧费
}

/**
 * 格式化代币金额显示
 * @param {number|string|bigint} amount 原始金额
 * @param {number} tokenType 代币类型 (PAYMENT_TOKEN)
 * @param {boolean} isRawPrecision 是否为原始精度数据
 * @returns {string} 格式化后的金额字符串
 */
export function formatTokenAmount(amount, tokenType, isRawPrecision = false) {
  if (!amount || amount === 0) return '0'

  const numAmount = Number(amount)
  const decimals = TOKEN_DECIMALS[tokenType] || 6

  switch (tokenType) {
    case PAYMENT_TOKEN.CC:
      // CC代币使用18位精度，但为了人类可读，使用更友好的格式化
      return formatCCAmount(numAmount, isRawPrecision)
    case PAYMENT_TOKEN.CCUSD:
      // 🔧 关键修复：CCUSD需要区分是否为wei单位
      if (isRawPrecision) {
        // 原始wei单位，需要转换为可读格式
        return formatUnits(numAmount, decimals)
      } else {
        // 已经是可读格式，直接使用
        return numAmount.toFixed(decimals).replace(/\.?0+$/, '')
      }
    default:
      return formatUnits(numAmount, decimals)
  }
}

/**
 * 格式化CC代币金额为人类可读的格式
 * @param {number|string|bigint} amount CC代币数量
 * @param {boolean} isRawPrecision 是否为原始18位精度数据（默认false）
 * @returns {string} 格式化后的金额字符串
 */
export function formatCCAmount(amount, isRawPrecision = false) {
  const ccAmount = Number(amount)

  if (ccAmount === 0) return '0'

  // 根据数据源决定是否需要精度转换
  let readableAmount
  if (isRawPrecision) {
    // 原始18位精度数据，需要转换为可读格式
    readableAmount = ccAmount / 1e18
  } else {
    // 已经是处理过的可读数据，直接使用
    readableAmount = ccAmount
  }

  // 对于非常大的数值，使用缩写
  if (readableAmount >= 1e9) {
    // 超过10亿，使用B (Billion)
    return (readableAmount / 1e9).toFixed(2) + 'B'
  } else if (readableAmount >= 1e6) {
    // 超过100万，使用M (Million)
    return (readableAmount / 1e6).toFixed(2) + 'M'
  } else if (readableAmount >= 1e3) {
    // 超过1000，使用K (Thousand)
    return (readableAmount / 1e3).toFixed(2) + 'K'
  } else if (readableAmount >= 1) {
    // 1-1000之间，保留2位小数
    return readableAmount.toFixed(2)
  } else if (readableAmount >= 0.01) {
    // 0.01-1之间，保留4位小数
    return readableAmount.toFixed(4)
  } else if (readableAmount >= 0.000001) {
    // 0.000001-0.01之间，保留6位小数
    return readableAmount.toFixed(6)
  } else {
    // 很小的数值，使用科学计数法
    return readableAmount.toExponential(4)
  }
}

/**
 * 获取代币单位符号
 * @param {number} tokenType 代币类型
 * @returns {string} 代币符号
 */
export function getTokenSymbol(tokenType) {
  switch (tokenType) {
    case PAYMENT_TOKEN.CC:
      return 'CC'
    case PAYMENT_TOKEN.CCUSD:
      return 'CCUSD'
    default:
      return ''
  }
}


/**
 * CC 代币转换为 CCUSD 等值
 * @param {number|string} ccAmount CC 代币数量
 * @returns {number} CCUSD 等值
 */
export function convertCCtoUSD(ccAmount) {
  const cc = Number(ccAmount || 0)
  return cc * EXCHANGE_RATE.CC_TO_USD
}

/**
 * CCUSD 转换为 CC 代币等值
 * @param {number|string} usdAmount CCUSD 数量
 * @returns {number} CC 代币等值
 */
export function convertUSDtoCC(usdAmount) {
  const usd = Number(usdAmount || 0)
  return usd * EXCHANGE_RATE.USD_TO_CC
}

/**
 * 格式化显示金额（包含代币符号）
 * @param {number|string} amount 金额
 * @param {number} tokenType 代币类型
 * @param {boolean} includeSymbol 是否包含代币符号
 * @param {boolean} isRawPrecision 是否为原始精度数据
 * @returns {string} 格式化的金额显示
 */
export function formatPaymentAmount(amount, tokenType, includeSymbol = true, isRawPrecision = false) {
  if (!amount || amount === 0) return includeSymbol ? '0' : '0'

  const formattedAmount = formatTokenAmount(amount, tokenType, isRawPrecision)
  const symbol = getTokenSymbol(tokenType)

  return includeSymbol ? `${formattedAmount} ${symbol}` : formattedAmount
}

/**
 * 计算平台费用
 * @param {number} amount 基础金额
 * @returns {number} 平台费用
 */
export function calculatePlatformFee(amount) {
  return Number(amount || 0) * FEE_RATES.PLATFORM
}

/**
 * 计算 CC 代币的燃烧费用
 * @param {number} ccAmount CC 代币数量
 * @returns {number} 燃烧费用
 */
export function calculateBurnAmount(ccAmount) {
  return Number(ccAmount || 0) * FEE_RATES.BURN
}

/**
 * 计算提供商实际收入（扣除平台费和燃烧费）
 * @param {number} totalAmount 总支付金额
 * @param {number} tokenType 支付token类型
 * @returns {object} 包含各金额明细的对象
 */
export function calculateProviderRevenue(totalAmount, tokenType) {
  const amount = Number(totalAmount || 0)

  if (tokenType === PAYMENT_TOKEN.CC) {
    // CC 支付：需要扣除燃烧费
    const burnAmount = calculateBurnAmount(amount)
    const afterBurn = amount - burnAmount
    const platformFee = calculatePlatformFee(afterBurn)
    const providerRevenue = afterBurn - platformFee

    return {
      totalAmount: amount,
      burnAmount,
      platformFee,
      providerRevenue,
      symbol: 'CC'
    }
  } else {
    // CCUSD 支付：无燃烧费
    const platformFee = calculatePlatformFee(amount)
    const providerRevenue = amount - platformFee

    return {
      totalAmount: amount,
      burnAmount: 0,
      platformFee,
      providerRevenue,
      symbol: 'CCUSD'
    }
  }
}

/**
 * 获取订单状态显示信息
 * @param {number} status 订单状态码
 * @param {function} t 翻译函数
 * @returns {object} 状态信息对象
 */
export function getOrderStatusInfo(status, t) {
  // 🔧 修复：ComputeMarketLite只有0-5状态，移除不存在的状态6和7
  const statusMap = {
    0: { key: 'status.created', color: 'yellow', type: 'pending' },
    1: { key: 'status.paid', color: 'blue', type: 'paid' },
    2: { key: 'status.inService', color: 'indigo', type: 'active' },
    3: { key: 'status.completed', color: 'green', type: 'completed' },
    4: { key: 'status.confirmed', color: 'emerald', type: 'confirmed' },
    5: { key: 'status.cancelled', color: 'red', type: 'cancelled' }
    // 注意：ComputeMarketLite没有EXPIRED(6)和DISPUTED(7)状态
  }

  const statusInfo = statusMap[status] || { key: 'status.unknown', color: 'gray', type: 'unknown' }

  return {
    ...statusInfo,
    name: t ? t(`orders.${statusInfo.key}`) : 'Unknown'
  }
}

/**
 * 验证支付token类型是否有效
 * @param {number} tokenType 支付token类型
 * @returns {boolean} 是否有效
 */
export function isValidPaymentToken(tokenType) {
  return Object.values(PAYMENT_TOKEN).includes(tokenType)
}

/**
 * 获取订单的支付状态信息
 * @param {object} order 订单对象
 * @returns {object} 支付状态信息
 */
export function getOrderPaymentInfo(order) {
  const {
    primaryPaymentToken,
    totalPaidAmount,
    finalPrice,
    status,
    exchangeRate
  } = order

  const tokenType = Number(primaryPaymentToken || 0)
  const paidAmount = Number(totalPaidAmount || 0)
  const finalAmount = Number(finalPrice || 0)

  const isPaid = paidAmount > 0
  const isFullyPaid = paidAmount >= finalAmount
  const paymentTokenName = getPaymentMethodName(tokenType, null)
  // 🔧 修复：totalPaidAmount 在这里是USD等值，不是原始CC数据，所以CC需要转换
  let formattedPaidAmount
  if (tokenType === PAYMENT_TOKEN.CC) {
    // 如果是CC支付，totalPaidAmount是USD等值，需要转换为CC数量进行显示
    const ccAmount = convertUSDtoCC(paidAmount) // 11 CCUSD -> 110 CC
    formattedPaidAmount = formatPaymentAmount(ccAmount, PAYMENT_TOKEN.CC, true, false)
  } else {
    // CCUSD支付，直接使用
    formattedPaidAmount = formatPaymentAmount(paidAmount, PAYMENT_TOKEN.CCUSD)
  }
  const formattedFinalPrice = formatPaymentAmount(finalAmount, PAYMENT_TOKEN.CCUSD)

  return {
    isPaid,
    isFullyPaid,
    tokenType,
    paymentTokenName,
    paidAmount,
    finalAmount,
    formattedPaidAmount,
    formattedFinalPrice,
    exchangeRate: Number(exchangeRate || 0),
    hasDiscount: finalAmount < finalPrice // 如果有折扣
  }
}