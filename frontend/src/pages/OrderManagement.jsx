import React, { useState, useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { formatEther, formatUnits } from 'viem'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  FireIcon,
  BanknotesIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { useReadContract, useReadContracts } from 'wagmi'
import { CONTRACT_ADDRESSES, CONTRACT_ABI } from '../config/contracts'
import { readContract } from '@wagmi/core'
import { useConfig } from 'wagmi'

// 导入新的工具函数
import {
  PAYMENT_TOKEN,
  PAYMENT_TOKEN_NAME,
  formatPaymentAmount,
  getTokenSymbol,
  getPaymentMethodName,
  convertCCtoUSD,
  convertUSDtoCC,
  getOrderStatusInfo
} from '../utils/tokenUtils.js'

import {
  calculateFundFlow,
  getPaymentDetails,
  getOrderActions,
  calculateOrderStats
} from '../utils/orderCalculations.js'


// 订单状态图标映射
const STATUS_ICONS = {
  yellow: ClockIcon,
  blue: CurrencyDollarIcon,
  indigo: ChartBarIcon,
  green: CheckCircleIcon,
  emerald: CheckCircleIcon,
  red: XCircleIcon,
  orange: ExclamationTriangleIcon,
  purple: ExclamationTriangleIcon,
  gray: ClockIcon
}

export default function OrderManagement() {
  const { address, isConnected } = useAccount()
  const { t } = useTranslation()
  const config = useConfig()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [isAdmin, setIsAdmin] = useState(false)
  const [marketStats, setMarketStats] = useState(null)
  const [error, setError] = useState(null)
  
  // 获取市场统计信息 - 使用单独的统计函数
  const { data: totalOrdersData } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET_LITE,
    abi: CONTRACT_ABI.COMPUTE_MARKET_LITE_ABI,
    functionName: 'totalOrders'
  })

  const { data: totalVolumeUSDData } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET_LITE,
    abi: CONTRACT_ABI.COMPUTE_MARKET_LITE_ABI,
    functionName: 'totalVolumeUSD'
  })

  const { data: totalVolumeCCData } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET_LITE,
    abi: CONTRACT_ABI.COMPUTE_MARKET_LITE_ABI,
    functionName: 'totalCCPayments'
  })

  // 🔧 修复：ComputeMarketLite没有totalBurnedCC字段，使用burnRateBps代替
  const { data: totalBurnedCCData } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET_LITE,
    abi: CONTRACT_ABI.COMPUTE_MARKET_LITE_ABI,
    functionName: 'burnRateBps'
  })

  // 🔧 修复：使用platformFeeBps获取平台费率
  const { data: totalPlatformFeesData } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET_LITE,
    abi: CONTRACT_ABI.COMPUTE_MARKET_LITE_ABI,
    functionName: 'platformFeeBps'
  })

  // 检查是否为管理员（合约所有者）
  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET_LITE,
    abi: CONTRACT_ABI.COMPUTE_MARKET_LITE_ABI,
    functionName: 'owner'
  })

  useEffect(() => {
    if (owner && address) {
      setIsAdmin(owner.toLowerCase() === address.toLowerCase())
    }
  }, [owner, address])

  useEffect(() => {
    // 手动组合市场统计数据
    if (totalOrdersData !== undefined &&
        totalVolumeUSDData !== undefined &&
        totalVolumeCCData !== undefined &&
        totalBurnedCCData !== undefined &&
        totalPlatformFeesData !== undefined) {
      setMarketStats({
        totalOrders: totalOrdersData,
        // 🔧 关键修复：totalVolumeUSD也是wei单位，需要转换为可读格式
        totalVolumeUSD: Number(totalVolumeUSDData || 0) / 1e6,  // CCUSD wei -> 可读CCUSD
        totalVolumeCC: totalVolumeCCData,
        totalBurnedCC: totalBurnedCCData,
        totalPlatformFees: totalPlatformFeesData
      })
    }
  }, [totalOrdersData, totalVolumeUSDData, totalVolumeCCData, totalBurnedCCData, totalPlatformFeesData])

  // 获取用户订单列表 - 通过遍历所有订单并筛选出与用户相关的订单
  const { data: totalOrdersCount } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET_LITE,
    abi: CONTRACT_ABI.COMPUTE_MARKET_LITE_ABI,
    functionName: 'totalOrders',
    enabled: !!address && !isAdmin
  })

  // 获取用户订单的订单ID列表 - 通过遍历查询
  const fetchUserOrderIds = useMemo(() => {
    if (!totalOrdersCount || !address) return []

    const totalOrders = Number(totalOrdersCount)
    if (totalOrders === 0) return []

    // 生成要查询的订单ID列表
    const orderIds = []
    for (let i = 1; i <= Math.min(totalOrders, 50); i++) { // 限制最多查询50个订单以提高性能
      orderIds.push(i)
    }
    return orderIds
  }, [totalOrdersCount, address])

  // 🔧 修复：管理员订单获取逻辑 - 不依赖marketStats，直接使用totalOrdersData
  const fetchOrdersForAdmin = useMemo(() => {
    // 🔧 修复：直接使用totalOrdersData，不依赖marketStats
    if (!totalOrdersData) return { contracts: [], orderIds: [] }

    const totalOrders = Number(totalOrdersData)
    if (totalOrders === 0) return { contracts: [], orderIds: [] }

    // 使用useReadContracts批量查询订单
    const contracts = []
    const orderIds = []
    for (let i = 1; i <= Math.min(totalOrders, 20); i++) { // 限制最多查询20个订单
      contracts.push({
        address: CONTRACT_ADDRESSES.COMPUTE_MARKET_LITE,
        abi: CONTRACT_ABI.COMPUTE_MARKET_LITE_ABI,
        functionName: 'getOrder',
        args: [i]
      })
      orderIds.push(i)
    }

    return { contracts, orderIds }
  }, [totalOrdersData])  // 🔧 修复：依赖totalOrdersData而不是marketStats

  // 批量查询管理员订单
  const { data: adminOrdersData, isLoading: adminOrdersLoading } = useReadContracts({
    contracts: isAdmin && totalOrdersData ? fetchOrdersForAdmin.contracts : [],
    enabled: isAdmin && !!totalOrdersData && totalOrdersData > 0
  })

  // 批量查询用户订单 - 查询所有订单并筛选用户相关的
  const userOrderIds = fetchUserOrderIds
  const { data: userOrdersData, isLoading: userOrdersLoading } = useReadContracts({
    contracts: !isAdmin && userOrderIds ? userOrderIds.map(orderId => ({
      address: CONTRACT_ADDRESSES.COMPUTE_MARKET_LITE,
      abi: CONTRACT_ABI.COMPUTE_MARKET_LITE_ABI,
      functionName: 'getOrder',
      args: [orderId]
    })) : [],
    enabled: !isAdmin && !!userOrderIds && userOrderIds.length > 0
  })

  // 处理订单数据
  useEffect(() => {
    setLoading(adminOrdersLoading || userOrdersLoading)

    let orderData = []

    if (isAdmin && adminOrdersData) {
      orderData = adminOrdersData
        .filter(result => result.result !== undefined)
        .map((result, index) => {
          // 🔧 修复：使用新的转换函数处理元组数据
          const order = convertOrderTupleToObject(result.result)
          if (!order) return null

          // 始终使用查询的ID，因为这是我们实际查询的订单ID
          const orderId = fetchOrdersForAdmin.orderIds[index]
          return {
            ...order,
            id: orderId || 0
          }
        })
        .filter(order => order && order.id && order.id > 0) // 过滤掉无效订单
    } else if (!isAdmin && userOrdersData) {
      // 筛选出与当前用户相关的订单（作为客户或提供商）
      orderData = userOrdersData
        .map((result, index) => {
          if (!result || !result.result) return null

          // 🔧 修复：使用新的转换函数处理元组数据
          const order = convertOrderTupleToObject(result.result)
          if (!order) return null

          // 使用正确的订单ID映射，确保与查询的ID一致
          order.id = Number(userOrderIds[index])

          // 🔧 修复：支持没有提供商的订单，客户应该能看到自己创建的订单
          if (order.client &&
              (order.client.toLowerCase() === address.toLowerCase() ||
               (order.provider && order.provider.toLowerCase() === address.toLowerCase()))) {
            return order
          }
          return null
        })
        .filter(order => order !== null && order.id && order.id > 0) // 确保有效的订单ID
    }

    // 过滤订单
    const filteredOrders = filter === 'all'
      ? orderData
      : orderData.filter(order => order.status === parseInt(filter))

    // 按创建时间倒序排列 - 处理 BigInt 类型
    filteredOrders.sort((a, b) => {
      const timeA = Number(a.createTime || 0)
      const timeB = Number(b.createTime || 0)
      return timeB - timeA
    })
    setOrders(filteredOrders)
  }, [adminOrdersData, userOrdersData, isAdmin, userOrderIds, fetchOrdersForAdmin.orderIds, filter, address, adminOrdersLoading, userOrdersLoading])

  // 清理函数，防止内存泄漏
  useEffect(() => {
    return () => {
      setOrders([])
      setLoading(false)
      setError(null)
    }
  }, [])

  // 错误处理
  useEffect(() => {
    if (error) {
      console.error('OrderManagement Error:', error)
      // 可以在这里添加错误通知逻辑
    }
  }, [error])

  // 🔧 修复：将ComputeMarketLite的getOrder返回的元组转换为对象
  const convertOrderTupleToObject = (orderTuple) => {
    if (!orderTuple || !Array.isArray(orderTuple)) return null

    try {
      // ComputeMarketLite的getOrder返回12个参数：
      // 0: id, 1: client, 2: provider, 3: finalPrice, 4: status, 5: createTime,
      // 6: paymentTime, 7: customerNftId, 8: primaryPaymentToken, 9: totalPaidAmount, 10: exchangeRate, 11: paymentCount
      const [
        id,
        client,
        provider,
        finalPrice,
        status,
        createTime,
        paymentTime,
        customerNftId,
        primaryPaymentToken,
        totalPaidAmount,
        exchangeRate,
        paymentCount
      ] = orderTuple

      // 转换为对象，并处理BigInt和wei单位
      return {
        id: Number(id),
        client: client,
        provider: provider,
        // 🔧 关键修复：finalPrice是CCUSD的wei单位，需要转换为可读格式
        finalPrice: Number(finalPrice) / 1e6,  // CCUSD wei -> 可读CCUSD
        status: Number(status),
        createTime: Number(createTime),
        paymentTime: Number(paymentTime),
        customerNftId: Number(customerNftId),
        primaryPaymentToken: Number(primaryPaymentToken),
        // 🔧 关键修复：totalPaidAmount也是USD等值的wei单位
        totalPaidAmount: Number(totalPaidAmount) / 1e6,  // USD等值wei -> 可读CCUSD
        exchangeRate: Number(exchangeRate),
        paymentCount: Number(paymentCount)
      }
    } catch (error) {
      console.error('convertOrderTupleToObject error:', error, orderTuple)
      return null
    }
  }

  // 确保所有BigInt字段都转换为数字类型（保留用于其他场景）
  const convertBigIntFields = (order) => {
    if (!order) return order

    try {
      const convertedOrder = { ...order }
      Object.keys(order).forEach(key => {
        if (typeof order[key] === 'bigint') {
          convertedOrder[key] = Number(order[key])
        }
      })
      return convertedOrder
    } catch (error) {
      console.error('convertBigIntFields error:', error)
      return order
    }
  }

  
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-theme-secondary flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-theme-primary mb-2">{t('orders.connectWalletPrompt')}</h2>
          <p className="text-theme-secondary">{t('orders.connectWalletDescription')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-secondary py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题和用户身份信息 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-theme-primary flex items-center">
              <ChartBarIcon className="h-8 w-8 mr-3 text-blue-600" />
              {t('orders.title')}
              {isAdmin && (
                <span className="ml-3 px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-sm font-semibold rounded-full shadow-sm dark:bg-red-900/40 dark:text-red-300 dark:border-red-700">
                  {t('orders.admin')}
                </span>
              )}
            </h1>
          </div>

          {/* 用户身份和地址信息 */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isAdmin ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <span className="text-sm font-medium text-theme-primary">
                  {isAdmin ? t('orders.userIdentity.admin') : t('orders.userIdentity.user')}
                </span>
              </div>
              <div className="text-sm text-theme-secondary">
                {t('orders.userIdentity.currentAddress')}: {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
            <div className="mt-2 text-xs text-theme-tertiary">
              {isAdmin
                ? t('orders.userIdentity.adminDescription')
                : t('orders.userIdentity.userDescription')
              }
            </div>
            {owner && (
              <div className="mt-2 text-xs text-theme-tertiary">
                {t('orders.userIdentity.contractOwner')}: {owner.slice(0, 6)}...{owner.slice(-4)}
              </div>
            )}

            </div>

          <p className="text-theme-secondary">
            {isAdmin
              ? t('orders.userIdentity.adminDescription')
              : t('orders.userIdentity.userDescription')
            }
          </p>
        </div>

  
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-800 dark:text-red-300 font-medium">{t('common.error')}: {error.message || t('orders.errors.loadFailed')}</span>
            </div>
          </div>
        )}

        {/* 市场统计信息 */}
        {marketStats && !error && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-theme-card rounded-lg shadow-md hover:shadow-lg dark:shadow-xl transition-shadow duration-200 p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm text-theme-secondary">{t('orders.marketStats.totalOrders')}</p>
                  <p className="text-xl font-bold text-theme-primary">
                    {marketStats.totalOrders?.toString() || '0'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-theme-card rounded-lg shadow-md hover:shadow-lg dark:shadow-xl transition-shadow duration-200 p-6">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm text-theme-secondary">{t('orders.marketStats.totalVolumeUSD')}</p>
                  <p className="text-xl font-bold text-theme-primary">
                    {formatPaymentAmount(marketStats.totalVolumeUSD, PAYMENT_TOKEN.CCUSD)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-theme-card rounded-lg shadow-md hover:shadow-lg dark:shadow-xl transition-shadow duration-200 p-6">
              <div className="flex items-center">
                <BanknotesIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm text-theme-secondary">{t('orders.marketStats.totalVolumeCC')}</p>
                  <p className="text-xl font-bold text-theme-primary">
                    {formatPaymentAmount(marketStats.totalVolumeCC, PAYMENT_TOKEN.CC, true, marketStats.totalVolumeCC > 1e12)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-theme-card rounded-lg shadow-md hover:shadow-lg dark:shadow-xl transition-shadow duration-200 p-6">
              <div className="flex items-center">
                <FireIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm text-theme-secondary">{t('orders.marketStats.burnRate')}</p>
                  <p className="text-xl font-bold text-theme-primary">
                    {marketStats.totalBurnedCC ? `${(Number(marketStats.totalBurnedCC) / 100).toFixed(2)}%` : '1.5%'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-theme-card rounded-lg shadow-md hover:shadow-lg dark:shadow-xl transition-shadow duration-200 p-6">
              <div className="flex items-center">
                <BanknotesIcon className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm text-theme-secondary">{t('orders.marketStats.platformFee')}</p>
                  <p className="text-xl font-bold text-theme-primary">
                    {marketStats.totalPlatformFees ? `${(Number(marketStats.totalPlatformFees) / 100).toFixed(2)}%` : '2.5%'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 筛选器 */}
        <div className="bg-theme-card rounded-lg shadow-md hover:shadow-lg dark:shadow-xl transition-all duration-200 mb-4 p-4 hover:border-blue-200 border border-transparent">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-theme-primary">{t('orders.filter.title')}</h3>
            <div className="flex space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 bg-theme-input border border-theme rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-theme-primary hover:border-blue-400 transition-colors"
              >
                <option value="all">{t('orders.filter.allOrders')}</option>
                <option value="0">{t('orders.filter.created')}</option>
                <option value="1">{t('orders.filter.paid')}</option>
                <option value="2">{t('orders.filter.inService')}</option>
                <option value="3">{t('orders.filter.completed')}</option>
                <option value="4">{t('orders.filter.confirmed')}</option>
                <option value="5">{t('orders.filter.cancelled')}</option>
                {/* 🔧 修复：ComputeMarketLite没有过期和争议状态 */}
              </select>
            </div>
          </div>
        </div>

        {/* 订单列表 */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-theme-card rounded-lg shadow-md hover:shadow-lg dark:shadow-xl transition-shadow duration-200 p-8 text-center">
                <ExclamationTriangleIcon className="h-16 w-16 text-theme-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-theme-primary mb-2">{t('orders.noOrders.title')}</h3>
                <p className="text-theme-secondary">
                  {isAdmin ? t('orders.noOrders.adminDescription') : t('orders.noOrders.userDescription')}
                </p>
              </div>
            ) : (
              orders.map((order) => {
                // 使用新的工具函数获取状态和资金信息
                const statusInfo = getOrderStatusInfo(Number(order.status || 0), t)
                const StatusIcon = STATUS_ICONS[statusInfo.color] || STATUS_ICONS.gray
                // 🔧 修复：订单数据已经是转换后的对象，无需再次转换
                const fundFlow = calculateFundFlow(order, t)
                const paymentDetails = getPaymentDetails(order, t)
                const orderActions = getOrderActions(order, true, address === order.client ? 'client' : address === order.provider ? 'provider' : 'admin', t)

                return (
                  <div key={`order-${order.id}-${order.createTime}`} className="bg-theme-card rounded-lg shadow-md hover:shadow-lg dark:shadow-xl transition-all duration-200 overflow-hidden border border-theme">
                    {/* 订单头部 */}
                    <div className="bg-theme-secondary px-6 py-4 border-b border-theme">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium text-theme-tertiary">
                            {t('marketplace.myOrders')} #{order.id}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border shadow-sm backdrop-blur-sm ${
                            statusInfo.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700' :
                            statusInfo.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700' :
                            statusInfo.color === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700' :
                            statusInfo.color === 'green' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700' :
                            statusInfo.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700' :
                            statusInfo.color === 'red' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700' :
                            statusInfo.color === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700' :
                            statusInfo.color === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700' :
                            'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-700/40 dark:text-gray-200 dark:border-gray-600'
                          }`}>
                            <StatusIcon className="h-4 w-4 mr-1" />
                            {statusInfo.name}
                          </span>
                        </div>
                        <div className="text-sm text-theme-tertiary">
                          {t('orders.orderDetails.createTime')}: {order.createTime ? new Date(Number(order.createTime) * 1000).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* 订单详情 */}
                    <div className="p-6">
                      {/* 关键信息概览行 */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 pb-4 border-b border-theme dark:border-gray-600">
                        {/* 订单金额和支付状态 */}
                        <div className="bg-theme-secondary rounded-lg p-4 border border-theme shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-theme-primary">{t('orders.orderDetails.finalPrice')}</span>
                            <CurrencyDollarIcon className="h-5 w-5 text-theme-secondary" />
                          </div>
                          <div className="text-lg font-bold text-theme-primary">
                            {paymentDetails?.formattedFinalAmount || '0 CCUSD'}
                          </div>
                          <div className="text-xs text-theme-secondary mt-1">
                            {t('orders.orderDetails.paymentProgress')}: {paymentDetails?.paymentProgress?.toFixed(1)}%
                          </div>
                        </div>

                        {/* 客户和提供商信息 */}
                        <div className="bg-theme-secondary rounded-lg p-4 border border-theme shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-theme-primary">{t('orders.orderDetails.basicInfo')}</span>
                            <UserIcon className="h-5 w-5 text-theme-secondary" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-theme-secondary">{t('orders.orderDetails.customer')}:</span>
                              <span className="ml-1 font-mono text-theme-primary text-xs">
                                {order.client ? order.client.slice(0, 6) + '...' + order.client.slice(-4) : 'N/A'}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-theme-secondary">{t('orders.orderDetails.provider')}:</span>
                              <span className="ml-1 font-mono text-theme-primary text-xs">
                                {order.provider ? order.provider.slice(0, 6) + '...' + order.provider.slice(-4) : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 资金流向概览 */}
                        <div className="bg-theme-secondary rounded-lg p-4 border border-theme shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-theme-primary">{t('orders.orderDetails.fundFlow')}</span>
                            <BanknotesIcon className="h-5 w-5 text-theme-secondary" />
                          </div>
                          <div className={`text-sm font-semibold px-2 py-1 rounded-md inline-block ${
                            fundFlow.status === 'distributed' ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' :
                            fundFlow.status === 'active' || fundFlow.status === 'locked' ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' :
                            fundFlow.status === 'refunded' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700' :
                            fundFlow.status === 'disputed' ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' :
                            'bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-600'
                          }`}>
                            {fundFlow.message}
                          </div>
                          {(fundFlow.providerReceivable > 0 || fundFlow.platformFee > 0 || fundFlow.burnAmount > 0) && (
                            <div className="mt-2 space-y-1 text-xs">
                              {fundFlow.providerReceivable > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-theme-secondary">{t('orders.orderDetails.providerRevenue')}:</span>
                                  <span className="font-semibold text-theme-primary">
                                    {fundFlow.formattedProviderRevenue || formatPaymentAmount(fundFlow.providerReceivable, fundFlow.tokenType)}
                                  </span>
                                </div>
                              )}
                              {fundFlow.platformFee > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-theme-secondary">{t('orders.orderDetails.platformFee')}:</span>
                                  <span className="font-semibold text-theme-primary">
                                    {fundFlow.formattedPlatformFee || formatPaymentAmount(fundFlow.platformFee, fundFlow.tokenType)}
                                  </span>
                                </div>
                              )}
                              {fundFlow.burnAmount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-theme-secondary">{t('orders.orderDetails.burnAmount')}:</span>
                                  <span className="font-semibold text-theme-primary">
                                    {fundFlow.formattedBurnAmount || formatPaymentAmount(fundFlow.burnAmount, PAYMENT_TOKEN.CC)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 详细信息网格 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* 价格和优惠信息 */}
                        <div>
                          <h4 className="text-sm font-medium text-theme-primary mb-2">{t('orders.orderDetails.paymentInfo')}</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-theme-secondary">{t('orders.orderDetails.originalPrice')}:</span>
                              <span className="font-medium text-theme-primary">{paymentDetails?.formattedOriginalPrice || '0 CCUSD'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-theme-secondary">{t('orders.orderDetails.finalPrice')}:</span>
                              <span className="font-bold text-lg text-theme-primary">{paymentDetails?.formattedFinalAmount || '0 CCUSD'}</span>
                            </div>
                            {paymentDetails?.hasDiscount && (
                              <div className="bg-theme-hover rounded-md p-2 border border-theme">
                                <div className="flex justify-between items-center">
                                  <span className="text-theme-primary font-medium">{t('orders.orderDetails.discount')}:</span>
                                  <span className="text-theme-primary font-bold">
                                    {paymentDetails.discountPercentage}% (-{paymentDetails.formattedDiscountAmount})
                                  </span>
                                </div>
                              </div>
                            )}
                            {order.customerNftId && Number(order.customerNftId) > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-theme-secondary">{t('orders.orderDetails.customerNFT')}:</span>
                                <span className="font-medium text-theme-primary">#{order.customerNftId}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 支付详情 */}
                        <div>
                          <h4 className="text-sm font-medium text-theme-primary mb-2">{t('orders.orderDetails.paymentDetails')}</h4>
                          <div className="space-y-3 text-sm">
                            <div className="bg-theme-hover rounded-lg p-3 border border-theme">
                              <div className="flex justify-between items-center">
                                <span className="text-theme-secondary font-medium">{t('orders.orderDetails.paymentMethod')}</span>
                                <span className="font-bold text-theme-primary">{paymentDetails?.paymentTokenName || t('orders.orderDetails.notPaid')}</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center py-1">
                                <span className="text-theme-secondary">{t('orders.orderDetails.paidAmount')}</span>
                                <span className="font-medium text-theme-primary">{paymentDetails?.formattedPaidAmount || '0'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1">
                                <span className="text-theme-secondary">{t('orders.orderDetails.targetAmount')}</span>
                                <span className="font-medium text-theme-primary">{paymentDetails?.formattedFinalAmount || '0'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1">
                                <span className="text-theme-secondary">{t('orders.orderDetails.paymentCount')}</span>
                                <span className="font-medium text-theme-primary">{paymentDetails?.paymentCount || 0} 次</span>
                              </div>
                            </div>

                            {(paymentDetails?.tokenType === PAYMENT_TOKEN.CC && paymentDetails?.paidAmount > 0) && (
                              <div className="bg-theme-hover rounded-lg p-3 border border-theme">
                                <div className="flex justify-between items-center">
                                  <span className="text-theme-secondary font-medium">{t('orders.orderDetails.usdEquivalent')}</span>
                                  <span className="font-bold text-theme-primary">{paymentDetails?.formattedUsdEquivalent}</span>
                                </div>
                              </div>
                            )}

                            {paymentDetails?.exchangeRate > 0 && (
                              <div className="flex justify-between items-center text-xs text-theme-tertiary bg-theme-hover rounded px-2 py-1">
                                <span>{t('orders.orderDetails.exchangeRate')}</span>
                                <span>{(paymentDetails.exchangeRate / 10**18).toFixed(4)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="lg:col-span-3">
                          <h4 className="text-sm font-medium text-theme-primary mb-3">{t('orders.orderDetails.actions')}</h4>
                          <div className="flex flex-wrap gap-2">
                            {orderActions.availableActions.map((action) => {
                              const buttonStyle = action.style === 'primary' ? 'bg-theme-primary hover:bg-opacity-90 text-white shadow-sm' :
                                              action.style === 'success' ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm' :
                                              action.style === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm' :
                                              action.style === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm' :
                                              'border border-theme text-theme-secondary hover:bg-theme-hover'

                              return (
                                <button
                                  key={action.type}
                                  className={`px-4 py-2 text-sm rounded-md font-medium transition-all duration-200 ${buttonStyle}`}
                                >
                                  {action.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
  )}
      </div>
    </div>
  )
}