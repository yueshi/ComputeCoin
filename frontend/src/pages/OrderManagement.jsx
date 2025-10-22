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

// 订单状态枚举 - 基于新的合约 OrderStatus 枚举
const ORDER_STATUS = {
  0: { name: '已创建', color: 'yellow', icon: ClockIcon },
  1: { name: '已支付', color: 'blue', icon: CurrencyDollarIcon },
  2: { name: '服务中', color: 'indigo', icon: ChartBarIcon },
  3: { name: '已完成', color: 'green', icon: CheckCircleIcon },
  4: { name: '已确认', color: 'emerald', icon: CheckCircleIcon },
  5: { name: '已取消', color: 'red', icon: XCircleIcon },
  6: { name: '已过期', color: 'orange', icon: ExclamationTriangleIcon },
  7: { name: '争议中', color: 'purple', icon: ExclamationTriangleIcon }
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
  const [debugInfo, setDebugInfo] = useState({})
  const [error, setError] = useState(null)

  // 获取市场统计信息 - 使用单独的统计函数
  const { data: totalOrdersData } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ORDER_ABI,
    functionName: 'totalOrders'
  })

  const { data: totalVolumeUSDData } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ORDER_ABI,
    functionName: 'totalVolumeUSD'
  })

  const { data: totalVolumeCCData } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ORDER_ABI,
    functionName: 'totalVolumeCC'
  })

  const { data: totalBurnedCCData } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ORDER_ABI,
    functionName: 'totalBurnedCC'
  })

  const { data: totalPlatformFeesData } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ORDER_ABI,
    functionName: 'totalPlatformFees'
  })

  // 检查是否为管理员（合约所有者）
  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ORDER_ABI,
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
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ORDER_ABI,
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

  // 管理员订单获取逻辑
  const fetchOrdersForAdmin = useMemo(() => {
    if (!marketStats) return []

    const totalOrders = Number(marketStats.totalOrders)
    if (totalOrders === 0) return []

    // 使用useReadContracts批量查询订单
    const contracts = []
    for (let i = 1; i <= Math.min(totalOrders, 20); i++) { // 限制最多查询20个订单
      contracts.push({
        address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
        abi: CONTRACT_ABI.COMPUTE_MARKET_ORDER_ABI,
        functionName: 'getOrder',
        args: [i]
      })
    }

    return contracts
  }, [marketStats])

  // 批量查询管理员订单
  const { data: adminOrdersData, isLoading: adminOrdersLoading } = useReadContracts({
    contracts: isAdmin && marketStats ? fetchOrdersForAdmin : [],
    enabled: isAdmin && !!marketStats && marketStats.totalOrders > 0
  })

  // 批量查询用户订单 - 查询所有订单并筛选用户相关的
  const userOrderIds = fetchUserOrderIds
  const { data: userOrdersData, isLoading: userOrdersLoading } = useReadContracts({
    contracts: !isAdmin && userOrderIds ? userOrderIds.map(orderId => ({
      address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
      abi: CONTRACT_ABI.COMPUTE_MARKET_ORDER_ABI,
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
        .map((result, index) => ({
          id: index + 1,
          ...result.result
        }))
        .filter(order => order.id > 0) // 过滤掉无效订单
    } else if (!isAdmin && userOrdersData) {
      // 筛选出与当前用户相关的订单（作为客户或提供商）
      orderData = userOrdersData
        .map((result, index) => {
          if (!result || !result.result) return null
          const order = {
            id: userOrderIds[index],
            ...result.result
          }
          // 只返回与当前用户相关的订单
          if (order.client.toLowerCase() === address.toLowerCase() ||
              order.provider.toLowerCase() === address.toLowerCase()) {
            return order
          }
          return null
        })
        .filter(order => order !== null)
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

    // 调试信息
    setDebugInfo({
      isAdmin,
      totalOrders: marketStats?.totalOrders || 0,
      totalOrdersCount: totalOrdersCount || 0,
      userOrderIdsCount: userOrderIds?.length || 0,
      rawOrderDataLength: orderData.length,
      filteredOrdersLength: filteredOrders.length,
      contractAddress: CONTRACT_ADDRESSES.COMPUTE_MARKET,
      networkId: window.ethereum?.networkVersion,
      currentAddress: address
    })
  }, [adminOrdersData, userOrdersData, isAdmin, userOrderIds, filter, marketStats, totalOrdersCount, address, adminOrdersLoading, userOrdersLoading])

  // 清理函数，防止内存泄漏
  useEffect(() => {
    return () => {
      setOrders([])
      setDebugInfo({})
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

  // 计算资金流向信息 - 基于新的合约结构
  const calculateFundFlow = (order) => {
    const {
      status,
      finalPrice,
      totalPaidAmount,
      escrow,
      primaryPaymentToken,
      payments
    } = order

    // 将状态数字转换为可读状态 (OrderStatus enum)
    const statusMap = {
      0: 'CREATED',
      1: 'PAID',
      2: 'ACTIVE',
      3: 'COMPLETED',
      4: 'CONFIRMED',
      5: 'CANCELLED',
      6: 'EXPIRED',
      7: 'DISPUTED'
    }

    const orderStatus = statusMap[status] || 'UNKNOWN'

    if (orderStatus === 'CREATED') {
      return {
        status: 'pending',
        customerLocked: 0,
        providerReceivable: 0,
        platformFee: 0,
        burnAmount: 0,
        message: '等待支付'
      }
    }

    if (orderStatus === 'PAID' || orderStatus === 'ACTIVE') {
      const platformFeeRate = 0.025 // 2.5%
      const burnRate = 0.015 // 1.5% for CC payments

      // 确保 totalPaidAmount 是数字类型
      const paidAmount = Number(totalPaidAmount || 0)

      if (primaryPaymentToken === 2) { // CC Payment (PaymentToken.CC = 2)
        const ccPaid = paidAmount
        const burnAmount = ccPaid * burnRate
        const platformFee = (ccPaid - burnAmount) * platformFeeRate

        return {
          status: 'locked',
          customerLocked: paidAmount,
          providerReceivable: paidAmount - burnAmount - platformFee,
          platformFee,
          burnAmount,
          message: 'CC代币已锁定，等待服务完成'
        }
      } else {
        const platformFee = paidAmount * platformFeeRate
        return {
          status: 'locked',
          customerLocked: paidAmount,
          providerReceivable: paidAmount - platformFee,
          platformFee,
          burnAmount: 0,
          message: 'CCUSD已锁定，等待服务完成'
        }
      }
    }

    if (orderStatus === 'COMPLETED' || orderStatus === 'CONFIRMED') {
      const platformFeeRate = 0.025
      const burnRate = 0.015

      // 确保 totalPaidAmount 是数字类型
      const paidAmount = Number(totalPaidAmount || 0)

      if (primaryPaymentToken === 2) { // CC Payment
        const ccPaid = paidAmount
        const burnAmount = ccPaid * burnRate
        const platformFee = (ccPaid - burnAmount) * platformFeeRate
        const providerReceivable = ccPaid - burnAmount - platformFee

        return {
          status: 'distributed',
          customerLocked: 0,
          providerReceivable,
          platformFee,
          burnAmount,
          message: '资金已分配完成'
        }
      } else {
        const platformFee = paidAmount * platformFeeRate
        const providerReceivable = paidAmount - platformFee

        return {
          status: 'distributed',
          customerLocked: 0,
          providerReceivable,
          platformFee,
          burnAmount: 0,
          message: '资金已分配完成'
        }
      }
    }

    if (orderStatus === 'CANCELLED' || orderStatus === 'EXPIRED') {
      return {
        status: 'refunded',
        customerLocked: 0,
        providerReceivable: 0,
        platformFee: 0,
        burnAmount: 0,
        message: '订单已取消，资金已退还'
      }
    }

    if (orderStatus === 'DISPUTED') {
      return {
        status: 'disputed',
        customerLocked: escrow?.totalAmount || 0,
        providerReceivable: 0,
        platformFee: 0,
        burnAmount: 0,
        message: '订单争议处理中，资金已冻结'
      }
    }

    return { status: 'unknown', message: '未知状态' }
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

            {/* 调试信息 */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <div className="font-medium text-yellow-800 mb-2">调试信息:</div>
                <div className="space-y-1 text-gray-600">
                  <div>总订单数: {debugInfo.totalOrders}</div>
                  <div>总订单计数: {debugInfo.totalOrdersCount}</div>
                  <div>查询的订单ID数量: {debugInfo.userOrderIdsCount}</div>
                  <div>原始订单数据长度: {debugInfo.rawOrderDataLength}</div>
                  <div>过滤后订单长度: {debugInfo.filteredOrdersLength}</div>
                  <div>合约地址: {debugInfo.contractAddress}</div>
                  <div>网络ID: {debugInfo.networkId}</div>
                  <div>当前地址: {debugInfo.currentAddress?.slice(0, 6)}...{debugInfo.currentAddress?.slice(-4)}</div>
                  <div>统计信息状态: {marketStats ? '已加载' : '未加载'}</div>
                  <div>管理员状态: {debugInfo.isAdmin ? '是' : '否'}</div>
                </div>
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
                    {formatUnits(Number(marketStats.totalVolumeUSD), 6)} CCUSD
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
                    {formatEther(Number(marketStats.totalVolumeCC))} CC
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <FireIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">CC燃烧量</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatEther(Number(marketStats.totalBurnedCC))} CC
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <BanknotesIcon className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">平台费用</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatEther(Number(marketStats.totalPlatformFees))} CC
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
                <option value="6">已过期</option>
                <option value="7">争议中</option>
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
                const statusInfo = ORDER_STATUS[order.status]
                const StatusIcon = statusInfo.icon
                const fundFlow = calculateFundFlow(order)

                return (
                  <div key={order.id} className="bg-white rounded-lg shadow overflow-hidden">
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
                            <div>原始价格: {order.usdPrice ? formatUnits(Number(order.usdPrice), 6) : '0'} CCUSD</div>
                            <div>最终价格: {order.finalPrice ? formatUnits(Number(order.finalPrice), 6) : '0'} CCUSD</div>
                            {order.customerNftId && Number(order.customerNftId) > 0 && (
                              <div>客户NFT: #{order.customerNftId}</div>
                            )}
                            <div>已支付: {order.totalPaidAmount ? formatUnits(Number(order.totalPaidAmount), 6) : '0'} CCUSD</div>
                          </div>
                        </div>

                        {/* 支付信息 */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">支付信息</h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div>支付方式: {order.primaryPaymentToken === 2 ? 'CC代币' : order.primaryPaymentToken === 1 ? 'CCUSD' : '未支付'}</div>
                            <div>已支付金额: {order.totalPaidAmount ? formatUnits(Number(order.totalPaidAmount), 6) : '0'} CCUSD</div>
                            <div>支付次数: {Number(order.paymentCount || 0)}</div>
                            {order.primaryPaymentToken === 2 && order.totalPaidAmount > 0 && (
                              <div>CC数量: ~{formatEther(BigInt(order.totalPaidAmount) * BigInt(10))} CC</div>
                            )}
                            <div>汇率: {order.exchangeRate ? (Number(order.exchangeRate) / 10**18).toFixed(2) : 'N/A'}</div>
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
                                fundFlow.status === 'locked' ? 'text-blue-600' :
                                fundFlow.status === 'refunded' ? 'text-yellow-600' :
                                'text-gray-600'
                              }`}>
                                {fundFlow.message}
                              </span>
                            </div>
                            {fundFlow.providerReceivable > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">提供商收入:</span>
                                <span className="text-green-600">
                                  {order.primaryPaymentToken === 2
                                    ? `${formatEther(fundFlow.providerReceivable)} CC`
                                    : `${formatUnits(fundFlow.providerReceivable, 6)} CCUSD`
                                  }
                                </span>
                              </div>
                            )}
                            {fundFlow.platformFee > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">平台费用:</span>
                                <span className="text-yellow-600">
                                  {order.primaryPaymentToken === 2
                                    ? `${formatEther(fundFlow.platformFee)} CC`
                                    : `${formatUnits(fundFlow.platformFee, 6)} CCUSD`
                                  }
                                </span>
                              </div>
                            )}
                            {fundFlow.burnAmount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">燃烧销毁:</span>
                                <span className="text-red-600">
                                  {formatEther(fundFlow.burnAmount)} CC
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">操作</h4>
                          <div className="space-y-2">
                            {order.status === 0 && (
                              <button className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                                支付订单
                              </button>
                            )}
                            {order.status === 1 && (
                              <button className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                                完成订单
                              </button>
                            )}
                            {order.status < 2 && (
                              <button className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700">
                                取消订单
                              </button>
                            )}
                            <button className="w-full px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50">
                              查看详情
                            </button>
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