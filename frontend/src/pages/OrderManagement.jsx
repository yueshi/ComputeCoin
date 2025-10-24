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
  BanknotesIcon
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
        totalVolumeUSD: totalVolumeUSDData,
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

      // 转换为对象，并处理BigInt
      return {
        id: Number(id),
        client: client,
        provider: provider,
        finalPrice: Number(finalPrice),
        status: Number(status),
        createTime: Number(createTime),
        paymentTime: Number(paymentTime),
        customerNftId: Number(customerNftId),
        primaryPaymentToken: Number(primaryPaymentToken),
        totalPaidAmount: Number(totalPaidAmount),
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">请连接钱包</h2>
          <p className="text-gray-600">请先连接钱包以查看订单信息</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题和用户身份信息 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="h-8 w-8 mr-3 text-blue-600" />
              订单管理中心
              {isAdmin && (
                <span className="ml-3 px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                  管理员
                </span>
              )}
            </h1>
          </div>

          {/* 用户身份和地址信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isAdmin ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <span className="text-sm font-medium text-gray-900">
                  {isAdmin ? '管理员身份' : '普通用户身份'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                当前地址: {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {isAdmin
                ? '可以查看所有订单信息和资金流向'
                : '只能查看与您相关的订单信息'
              }
            </div>
            {owner && (
              <div className="mt-2 text-xs text-gray-500">
                合约所有者: {owner.slice(0, 6)}...{owner.slice(-4)}
              </div>
            )}

            </div>

          <p className="text-gray-600">
            {isAdmin
              ? '查看所有订单信息和资金流向'
              : '查看您的订单信息和资金状态'
            }
          </p>
        </div>

  
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-800 font-medium">错误: {error.message || '数据加载失败'}</span>
            </div>
          </div>
        )}

        {/* 市场统计信息 */}
        {marketStats && !error && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">总订单数</p>
                  <p className="text-xl font-bold text-gray-900">
                    {marketStats.totalOrders?.toString() || '0'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">总交易额 (USD)</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatPaymentAmount(marketStats.totalVolumeUSD, PAYMENT_TOKEN.CCUSD)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <BanknotesIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">CC交易量</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatPaymentAmount(marketStats.totalVolumeCC, PAYMENT_TOKEN.CC)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <FireIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">燃烧费率</p>
                  <p className="text-xl font-bold text-gray-900">
                    {marketStats.totalBurnedCC ? `${(Number(marketStats.totalBurnedCC) / 100).toFixed(2)}%` : '1.5%'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <BanknotesIcon className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">平台费率</p>
                  <p className="text-xl font-bold text-gray-900">
                    {marketStats.totalPlatformFees ? `${(Number(marketStats.totalPlatformFees) / 100).toFixed(2)}%` : '2.5%'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 筛选器 */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">订单筛选</h3>
            <div className="flex space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部订单</option>
                <option value="0">已创建</option>
                <option value="1">已支付</option>
                <option value="2">服务中</option>
                <option value="3">已完成</option>
                <option value="4">已确认</option>
                <option value="5">已取消</option>
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
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无订单</h3>
                <p className="text-gray-600">
                  {isAdmin ? '当前没有任何订单记录' : '您还没有创建任何订单'}
                </p>
              </div>
            ) : (
              orders.map((order) => {
                // 使用新的工具函数获取状态和资金信息
                const statusInfo = getOrderStatusInfo(Number(order.status || 0))
                const StatusIcon = STATUS_ICONS[statusInfo.color] || STATUS_ICONS.gray
                // 🔧 修复：订单数据已经是转换后的对象，无需再次转换
                const fundFlow = calculateFundFlow(order)
                const paymentDetails = getPaymentDetails(order)
                const orderActions = getOrderActions(order, true, address === order.client ? 'client' : address === order.provider ? 'provider' : 'admin')

                return (
                  <div key={`order-${order.id}-${order.createTime}`} className="bg-white rounded-lg shadow overflow-hidden">
                    {/* 订单头部 */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium text-gray-500">
                            订单 #{order.id}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                            statusInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                            statusInfo.color === 'indigo' ? 'bg-indigo-100 text-indigo-800' :
                            statusInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                            statusInfo.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                            statusInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                            statusInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                            statusInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            <StatusIcon className="h-4 w-4 mr-1" />
                            {statusInfo.name}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          创建时间: {order.createTime ? new Date(Number(order.createTime) * 1000).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* 订单详情 */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* 基本信息 */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">基本信息</h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div>客户: {order.client ? order.client.slice(0, 6) + '...' + order.client.slice(-4) : 'N/A'}</div>
                            <div>提供商: {order.provider ? order.provider.slice(0, 6) + '...' + order.provider.slice(-4) : 'N/A'}</div>
                            <div>原始价格: {paymentDetails?.formattedOriginalPrice || '0 CCUSD'}</div>
                            <div>最终价格: {paymentDetails?.formattedFinalAmount || '0 CCUSD'}</div>
                            {paymentDetails?.hasDiscount && (
                              <div className="text-green-600">
                                折扣: {paymentDetails.discountPercentage}% (-{paymentDetails.formattedDiscountAmount})
                              </div>
                            )}
                            {order.customerNftId && Number(order.customerNftId) > 0 && (
                              <div>客户NFT: #{order.customerNftId}</div>
                            )}
                            <div>支付进度: {paymentDetails?.paymentProgress?.toFixed(1)}%</div>
                          </div>
                        </div>

                        {/* 支付信息 */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">支付信息</h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div>支付方式: {paymentDetails?.paymentTokenName || '未支付'}</div>
                            <div>已支付金额: {paymentDetails?.formattedPaidAmount || '0'}</div>
                            <div>目标金额: {paymentDetails?.formattedFinalAmount || '0'}</div>
                            <div>支付次数: {paymentDetails?.paymentCount || 0}</div>
                            {paymentDetails?.tokenType === PAYMENT_TOKEN.CC && paymentDetails?.paidAmount > 0 && (
                              <div>USD等值: {paymentDetails?.formattedUsdEquivalent}</div>
                            )}
                            {paymentDetails?.exchangeRate > 0 && (
                              <div>汇率: {(paymentDetails.exchangeRate / 10**18).toFixed(4)}</div>
                            )}
                          </div>
                        </div>

                        {/* 资金流向 */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">资金流向</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">状态:</span>
                              <span className={`font-medium ${
                                fundFlow.status === 'distributed' ? 'text-green-600' :
                                fundFlow.status === 'active' || fundFlow.status === 'locked' ? 'text-blue-600' :
                                fundFlow.status === 'refunded' ? 'text-yellow-600' :
                                fundFlow.status === 'disputed' ? 'text-red-600' :
                                'text-gray-600'
                              }`}>
                                {fundFlow.message}
                              </span>
                            </div>
                            {fundFlow.providerReceivable > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">提供商收入:</span>
                                <span className="text-green-600">
                                  {fundFlow.formattedProviderRevenue || formatPaymentAmount(fundFlow.providerReceivable, fundFlow.tokenType)}
                                </span>
                              </div>
                            )}
                            {fundFlow.platformFee > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">平台费用:</span>
                                <span className="text-yellow-600">
                                  {fundFlow.formattedPlatformFee || formatPaymentAmount(fundFlow.platformFee, fundFlow.tokenType)}
                                </span>
                              </div>
                            )}
                            {fundFlow.burnAmount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">燃烧销毁:</span>
                                <span className="text-red-600">
                                  {fundFlow.formattedBurnAmount || formatPaymentAmount(fundFlow.burnAmount, PAYMENT_TOKEN.CC)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">操作</h4>
                          <div className="space-y-2">
                            {orderActions.availableActions.map((action) => {
                              const buttonStyle = action.style === 'primary' ? 'bg-blue-600 hover:bg-blue-700' :
                                              action.style === 'success' ? 'bg-green-600 hover:bg-green-700' :
                                              action.style === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                                              action.style === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                                              'border border-gray-300 text-gray-700 hover:bg-gray-50'

                              return (
                                <button
                                  key={action.type}
                                  className={`w-full px-3 py-2 text-sm rounded-md ${
                                    action.style !== 'secondary' ? 'text-white' : ''
                                  } ${buttonStyle}`}
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