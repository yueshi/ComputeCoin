/**
 * 订单计算相关工具函数
 * 基于修复后的汇率和精度进行正确的资金流向计算
 */

import {
  PAYMENT_TOKEN,
  PAYMENT_TOKEN_NAME,
  FEE_RATES,
  calculateProviderRevenue,
  convertCCtoUSD,
  convertUSDtoCC,
  formatPaymentAmount,
  getOrderStatusInfo
} from './tokenUtils.js'

/**
 * 获取CC支付的实际原始数量（与getPaymentDetails中的逻辑一致）
 * @param {object} order 订单对象
 * @returns {number} CC代币原始数量
 */
function getActualCCPaidForFlow(order) {
  if (!order || !order.payments || !Array.isArray(order.payments)) {
    // 🔧 关键修复：totalPaidAmount已经是可读的CCUSD格式
    const usdEquivalent = Number(order.totalPaidAmount || 0)  // 如：11 CCUSD
    const ccAmount = convertUSDtoCC(usdEquivalent)  // 11 × 10 = 110 CC
    return ccAmount
  }

  // 从支付记录中累加CC数量（如果有支付记录的话）
  return order.payments
    .filter(payment => Number(payment.tokenType) === PAYMENT_TOKEN.CC)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
}

/**
 * 计算订单资金流向
 * @param {object} order 订单对象
 * @param {function} t 翻译函数
 * @returns {object} 资金流向信息
 */
export function calculateFundFlow(order, t) {
  if (!order) {
    return {
      status: 'unknown',
      customerLocked: 0,
      providerReceivable: 0,
      platformFee: 0,
      burnAmount: 0,
      message: t ? t('orders.fundFlow.invalidOrder') : '订单信息无效'
    }
  }

  const {
    status: orderStatus,
    finalPrice,
    totalPaidAmount,
    primaryPaymentToken,
    exchangeRate
  } = order

  // 获取订单状态信息
  const statusInfo = getOrderStatusInfo(Number(orderStatus), t)
  const finalAmount = Number(finalPrice || 0)
  const tokenType = Number(primaryPaymentToken || PAYMENT_TOKEN.NONE)

  // 🔧 关键修正：根据token类型选择正确的数据源
  let actualPaidAmount, paidAmountForCalc

  if (tokenType === PAYMENT_TOKEN.CC) {
    // CC支付：从USD等值转换回CC数量（可读格式）
    actualPaidAmount = getActualCCPaidForFlow(order)
    paidAmountForCalc = actualPaidAmount // 使用CC数量进行计算
  } else {
    // CCUSD支付：直接使用totalPaidAmount（已经是USD等值，6位精度）
    actualPaidAmount = Number(totalPaidAmount || 0)
    paidAmountForCalc = actualPaidAmount
  }

  // 根据订单状态计算资金流向
  switch (statusInfo.type) {
    case 'pending':
    case 'created':
      return calculatePendingOrderFlow(finalAmount, tokenType, t)

    case 'paid':
    case 'active':
      return calculateActiveOrderFlow(paidAmountForCalc, finalAmount, tokenType, statusInfo.type, t)

    case 'completed':
    case 'confirmed':
      return calculateCompletedOrderFlow(paidAmountForCalc, finalAmount, tokenType, t)

    case 'cancelled':
    case 'expired':
      return calculateCancelledOrderFlow(t)

    case 'disputed':
      return calculateDisputedOrderFlow(actualPaidAmount, t)

    default:
      return {
        status: 'unknown',
        customerLocked: 0,
        providerReceivable: 0,
        platformFee: 0,
        burnAmount: 0,
        message: t ? t('orders.fundFlow.unknown') : '未知订单状态'
      }
  }
}

/**
 * 计算待支付订单的资金流向
 */
function calculatePendingOrderFlow(finalAmount, tokenType, t) {
  return {
    status: 'pending',
    customerLocked: 0,
    providerReceivable: 0,
    platformFee: 0,
    burnAmount: 0,
    message: t ? t('orders.fundFlow.pending') : '等待支付',
    tokenType,
    finalAmount,
    // 🔧 修复：确保finalAmount为0时也正确显示CCUSD单位
    formattedFinalAmount: finalAmount > 0 ? formatPaymentAmount(finalAmount, PAYMENT_TOKEN.CCUSD) : '0 CCUSD'
  }
}

/**
 * 计算进行中订单的资金流向
 */
function calculateActiveOrderFlow(paidAmount, finalAmount, tokenType, statusType, t) {
  const revenue = calculateProviderRevenue(paidAmount, tokenType)

  return {
    status: statusType === 'active' ? 'active' : 'locked',
    customerLocked: paidAmount,
    providerReceivable: revenue.providerRevenue,
    platformFee: revenue.platformFee,
    burnAmount: revenue.burnAmount,
    message: statusType === 'active'
      ? (t ? t('orders.fundFlow.active') : '服务进行中')
      : (t ? t('orders.fundFlow.locked') : '资金已锁定，等待服务完成'),
    tokenType,
    paidAmount,
    finalAmount,
    isFullyPaid: paidAmount >= finalAmount,
    revenue,
    formattedPaidAmount: formatPaymentAmount(paidAmount, tokenType, true, tokenType === PAYMENT_TOKEN.CC ? false : false),
    formattedProviderRevenue: formatPaymentAmount(revenue.providerRevenue, tokenType, true, tokenType === PAYMENT_TOKEN.CC ? false : false),
    formattedPlatformFee: formatPaymentAmount(revenue.platformFee, tokenType, true, tokenType === PAYMENT_TOKEN.CC ? false : false),
    formattedBurnAmount: revenue.burnAmount > 0 ? formatPaymentAmount(revenue.burnAmount, PAYMENT_TOKEN.CC, true, false) : null
  }
}

/**
 * 计算已完成订单的资金流向
 */
function calculateCompletedOrderFlow(paidAmount, finalAmount, tokenType, t) {
  const revenue = calculateProviderRevenue(paidAmount, tokenType)

  return {
    status: 'distributed',
    customerLocked: 0,
    providerReceivable: revenue.providerRevenue,
    platformFee: revenue.platformFee,
    burnAmount: revenue.burnAmount,
    message: t ? t('orders.fundFlow.completed') : '资金已分配完成',
    tokenType,
    paidAmount,
    finalAmount,
    revenue,
    formattedPaidAmount: formatPaymentAmount(paidAmount, tokenType, true, tokenType === PAYMENT_TOKEN.CC ? false : false),
    formattedProviderRevenue: formatPaymentAmount(revenue.providerRevenue, tokenType, true, tokenType === PAYMENT_TOKEN.CC ? false : false),
    formattedPlatformFee: formatPaymentAmount(revenue.platformFee, tokenType, true, tokenType === PAYMENT_TOKEN.CC ? false : false),
    formattedBurnAmount: revenue.burnAmount > 0 ? formatPaymentAmount(revenue.burnAmount, PAYMENT_TOKEN.CC, true, false) : null
  }
}

/**
 * 计算已取消订单的资金流向
 */
function calculateCancelledOrderFlow(t) {
  return {
    status: 'refunded',
    customerLocked: 0,
    providerReceivable: 0,
    platformFee: 0,
    burnAmount: 0,
    message: t ? t('orders.fundFlow.cancelled') : '订单已取消，资金已退还'
  }
}

/**
 * 计算争议中订单的资金流向
 */
function calculateDisputedOrderFlow(paidAmount, t) {
  return {
    status: 'disputed',
    customerLocked: paidAmount,
    providerReceivable: 0,
    platformFee: 0,
    burnAmount: 0,
    message: t ? t('orders.fundFlow.disputed') : '订单争议处理中，资金已冻结',
    formattedLockedAmount: formatPaymentAmount(paidAmount, PAYMENT_TOKEN.CCUSD)
  }
}

/**
 * 获取CC支付的实际原始数量（从支付记录中获取）
 * @param {object} order 订单对象
 * @returns {number} CC代币原始数量
 */
function getActualCCPaid(order) {
  if (!order || !order.payments || !Array.isArray(order.payments)) {
    // 🔧 关键修复：totalPaidAmount已经是可读的CCUSD格式
    const usdEquivalent = Number(order.totalPaidAmount || 0)  // 如：11 CCUSD
    const ccAmount = convertUSDtoCC(usdEquivalent)  // 11 × 10 = 110 CC
    return ccAmount
  }

  // 从支付记录中累加CC数量（如果有支付记录的话）
  return order.payments
    .filter(payment => Number(payment.tokenType) === PAYMENT_TOKEN.CC)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
}

/**
 * 获取支付详情信息
 * @param {object} order 订单对象
 * @param {function} t 翻译函数
 * @returns {object} 支付详情
 */
export function getPaymentDetails(order, t) {
  if (!order) return null

  const {
    primaryPaymentToken,
    totalPaidAmount,    // USD等值 (6位精度)
    finalPrice,
    // 🔧 修复：ComputeMarketLite没有usdPrice字段，使用finalPrice作为基准
    customerNftId,
    paymentCount,
    exchangeRate,
    // 🔧 修复：ComputeMarketLite的getOrder不返回payments数组，需要单独获取
    payments
  } = order

  const tokenType = Number(primaryPaymentToken || PAYMENT_TOKEN.NONE)
  // 🔧 关键修复：数据现在已经是可读的CCUSD格式，不需要再转换
  const finalAmount = Number(finalPrice || 0)  // 已经是可读CCUSD，如：11
  const originalPrice = finalPrice // 在ComputeMarketLite中，折扣已经在finalPrice中体现
  const nftId = Number(customerNftId || 0)
  const paymentCountNum = Number(paymentCount || 0)

  // 🔧 关键修正：根据token类型选择正确的数据源
  let paidAmount, paidAmountDisplay, usdEquivalentValue

  if (tokenType === PAYMENT_TOKEN.CC) {
    // CC支付：totalPaidAmount是USD等值（已转换为可读格式），需要转换为CC数量
    const usdEquivalent = Number(totalPaidAmount || 0)  // 如：11 CCUSD
    paidAmount = convertUSDtoCC(usdEquivalent)  // 11 × 10 = 110 CC

    // 🔧 格式化CC显示
    paidAmountDisplay = formatPaymentAmount(paidAmount, PAYMENT_TOKEN.CC, true, false)

    // USD等值：直接使用totalPaidAmount
    usdEquivalentValue = usdEquivalent
  } else {
    // CCUSD支付：直接使用totalPaidAmount（已经是可读的CCUSD格式）
    paidAmount = Number(totalPaidAmount || 0)
    paidAmountDisplay = formatPaymentAmount(paidAmount, PAYMENT_TOKEN.CCUSD)
    usdEquivalentValue = paidAmount
  }

  // 🔧 修复：ComputeMarketLite的折扣计算逻辑
  // 由于没有usdPrice字段，我们需要通过NFT是否存在来判断是否有折扣
  const hasDiscount = nftId > 0
  const discountAmount = 0 // 在ComputeMarketLite中，折扣已经体现在finalPrice中
  const discountPercentage = hasDiscount ? 5 : 0 // 简化处理，有NFT就认为有5%折扣

  // 支付进度（基于USD等值）
  const usdEquivalent = Number(totalPaidAmount || 0)
  const paymentProgress = finalAmount > 0 ? Math.min((usdEquivalent / finalAmount) * 100, 100) : 0

  const paymentTokenKey = PAYMENT_TOKEN_NAME[tokenType]

  return {
    tokenType,
    paymentTokenName: t ? t(`orders.${paymentTokenKey}`) : 'Not Paid',
    paidAmount,              // 实际支付数量（CC为原始数量，CCUSD为USD等值）
    finalAmount,
    originalPrice,
    hasDiscount,
    discountAmount,
    discountPercentage,
    paymentProgress,
    isFullyPaid: usdEquivalent >= finalAmount,
    paymentCount: paymentCountNum,
    nftId,
    exchangeRate: Number(exchangeRate || 0),
    formattedPaidAmount: paidAmountDisplay,
    // 🔧 修复：确保finalAmount为0时也正确显示CCUSD单位
    formattedFinalAmount: finalAmount > 0 ? formatPaymentAmount(finalAmount, PAYMENT_TOKEN.CCUSD) : '0 CCUSD',
    formattedOriginalPrice: formatPaymentAmount(originalPrice, PAYMENT_TOKEN.CCUSD),
    formattedDiscountAmount: formatPaymentAmount(discountAmount, PAYMENT_TOKEN.CCUSD),
    // USD等值（用于统一显示和计算）
    usdEquivalent: usdEquivalentValue,
    formattedUsdEquivalent: formatPaymentAmount(usdEquivalentValue, PAYMENT_TOKEN.CCUSD),
    // 支付记录（显示原始数据）
    payments: Array.isArray(payments) ? payments.map(payment => {
      const paymentTokenType = Number(payment.tokenType || 0)
      const paymentAmount = Number(payment.amount || 0)

      return {
        amount: paymentAmount,
        tokenType: paymentTokenType,
        timestamp: Number(payment.timestamp || 0),
        exchangeRate: Number(payment.exchangeRate || 0),
        description: payment.description || '',
        // 🔧 修复：CC支付记录中的amount是原始18位精度数据，需要指定isRawPrecision=true
        formattedAmount: formatPaymentAmount(
          paymentAmount,
          paymentTokenType,
          paymentTokenType === PAYMENT_TOKEN.CC ? true : false
        )
      }
    }) : []
  }
}

/**
 * 获取订单操作按钮配置
 * @param {object} order 订单对象
 * @param {boolean} isCurrentUserOrder 是否为当前用户的订单
 * @param {string} userRole 用户角色 (client/provider/admin)
 * @param {function} t 翻译函数
 * @returns {object} 操作按钮配置
 */
export function getOrderActions(order, isCurrentUserOrder = true, userRole = 'client', t) {
  if (!order || !isCurrentUserOrder) {
    return { availableActions: [], disabled: true }
  }

  const statusInfo = getOrderStatusInfo(Number(order.status || 0), t)
  const actions = []

  const actionLabels = {
    'pay': t ? t('orders.actions.payOrder') : 'Pay Order',
    'cancel': t ? t('orders.actions.cancelOrder') : 'Cancel Order',
    'start': t ? t('orders.actions.startService') : 'Start Service',
    'requestRefund': t ? t('orders.actions.requestRefund') : 'Request Refund',
    'complete': t ? t('orders.actions.completeService') : 'Complete Service',
    'update-progress': t ? t('orders.actions.updateProgress') : 'Update Progress',
    'confirm': t ? t('orders.actions.confirm') : 'Confirm',
    'resolve': t ? t('orders.actions.resolveDispute') : 'Resolve Dispute',
    'view-details': t ? t('orders.actions.viewDetails') : 'View Details'
  }

  switch (statusInfo.type) {
    case 'created':
      if (userRole === 'client') {
        actions.push({ type: 'pay', label: actionLabels.pay, style: 'primary' })
        actions.push({ type: 'cancel', label: actionLabels.cancel, style: 'danger' })
      }
      break

    case 'paid':
      if (userRole === 'provider') {
        actions.push({ type: 'start', label: actionLabels.start, style: 'success' })
      }
      if (userRole === 'client') {
        actions.push({ type: 'cancel', label: actionLabels.requestRefund, style: 'warning' })
      }
      break

    case 'active':
      if (userRole === 'provider') {
        actions.push({ type: 'complete', label: actionLabels.complete, style: 'success' })
        actions.push({ type: 'update-progress', label: actionLabels['update-progress'], style: 'secondary' })
      }
      break

    case 'completed':
      if (userRole === 'client') {
        actions.push({ type: 'confirm', label: actionLabels.confirm, style: 'success' })
      }
      break

    case 'confirmed':
      // 已确认的订单只能查看详情
      break

    case 'cancelled':
    case 'expired':
      // 已取消/过期的订单只能查看详情
      break

    case 'disputed':
      if (userRole === 'admin') {
        actions.push({ type: 'resolve', label: actionLabels.resolve, style: 'warning' })
      }
      break

    default:
      break
  }

  // 总是添加查看详情按钮
  actions.push({ type: 'view-details', label: actionLabels['view-details'], style: 'secondary' })

  return {
    availableActions: actions,
    disabled: false,
    status: statusInfo
  }
}

/**
 * 计算订单统计信息
 * @param {array} orders 订单数组
 * @param {function} t 翻译函数
 * @returns {object} 统计信息
 */
export function calculateOrderStats(orders, t) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return {
      totalOrders: 0,
      totalVolume: 0,
      totalFees: 0,
      totalBurned: 0,
      statusBreakdown: {}
    }
  }

  let totalOrders = 0
  let totalVolumeCC = 0
  let totalVolumeUSD = 0
  let totalFees = 0
  let totalBurned = 0
  const statusBreakdown = {}

  orders.forEach(order => {
    if (!order) return

    totalOrders++

    const statusInfo = getOrderStatusInfo(Number(order.status || 0), t)
    statusBreakdown[statusInfo.type] = (statusBreakdown[statusInfo.type] || 0) + 1

    const fundFlow = calculateFundFlow(order, t)

    if (order.primaryPaymentToken === PAYMENT_TOKEN.CC) {
      // 🔧 修复：totalPaidAmount已经是USD等值，不是原始CC数量
      const ccAmount = getActualCCPaid(order)
      totalVolumeCC += ccAmount
      totalBurned += fundFlow.burnAmount || 0
      totalFees += fundFlow.platformFee || 0
    } else if (order.primaryPaymentToken === PAYMENT_TOKEN.CCUSD) {
      totalVolumeUSD += Number(order.totalPaidAmount || 0)
      totalFees += fundFlow.platformFee || 0
    }
  })

  return {
    totalOrders,
    totalVolumeCC,
    totalVolumeUSD,
    totalFees,
    totalBurned,
    statusBreakdown,
    // 🔧 修复：CC相关统计，totalVolumeCC已经是可读格式，不需要原始精度处理
    formattedTotalVolumeCC: formatPaymentAmount(totalVolumeCC, PAYMENT_TOKEN.CC, true, false),
    formattedTotalVolumeUSD: formatPaymentAmount(totalVolumeUSD, PAYMENT_TOKEN.CCUSD),
    formattedTotalFees: formatPaymentAmount(totalFees, PAYMENT_TOKEN.CC, true, false),
    formattedTotalBurned: formatPaymentAmount(totalBurned, PAYMENT_TOKEN.CC, true, false)
  }
}