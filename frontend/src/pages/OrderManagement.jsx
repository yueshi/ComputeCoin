import React, { useState, useEffect } from 'react'
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

// 订单状态枚举
const ORDER_STATUS = {
  0: { name: 'Created', color: 'yellow', icon: ClockIcon },
  1: { name: 'Accepted', color: 'blue', icon: CurrencyDollarIcon },
  2: { name: 'Completed', color: 'green', icon: CheckCircleIcon },
  3: { name: 'Cancelled', color: 'red', icon: XCircleIcon }
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

  // 获取市场统计信息
  const { data: statsData } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ORDER_ABI,
    functionName: 'getMarketStats'
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
    if (statsData) {
      setMarketStats({
        totalOrders: statsData[0],
        totalVolumeUSD: statsData[1],
        totalVolumeCC: statsData[2],
        totalBurnedCC: statsData[3],
        totalPlatformFees: statsData[4]
      })
    }
  }, [statsData])

  // 获取用户订单列表
  const { data: userOrderIds } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ORDER_ABI,
    functionName: 'getUserOrders',
    args: [address || '0x0000000000000000000000000000000000000000', 0], // 0 = OrderStatus.CREATED (表示所有状态)
    enabled: !!address && !isAdmin
  })

  // 简化的订单获取逻辑 - 使用单个hook查询多个订单
  const fetchOrdersForAdmin = () => {
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
  }

  // 批量查询管理员订单
  const { data: adminOrdersData, isLoading: adminOrdersLoading } = useReadContracts({
    contracts: isAdmin && marketStats ? fetchOrdersForAdmin() : [],
    enabled: isAdmin && !!marketStats && marketStats.totalOrders > 0
  })

  // 批量查询用户订单（如果用户有订单ID）
  const { data: userOrdersData, isLoading: userOrdersLoading } = useReadContracts({
    contracts: !isAdmin && userOrderIds ? userOrderIds.slice(0, 20).map(orderId => ({
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
      orderData = userOrderIds
        .slice(0, 20) // 只处理前20个订单
        .map((orderId, index) => {
          const result = userOrdersData[index]
          return result && result.result ? {
            id: orderId,
            ...result.result
          } : null
        })
        .filter(order => order !== null)
    }

    // 过滤订单
    const filteredOrders = filter === 'all'
      ? orderData
      : orderData.filter(order => order.status === parseInt(filter))

    // 按创建时间倒序排列
    filteredOrders.sort((a, b) => b.createTime - a.createTime)
    setOrders(filteredOrders)

    // 调试信息
    setDebugInfo({
      isAdmin,
      totalOrders: marketStats?.totalOrders || 0,
      userOrderIdsCount: userOrderIds?.length || 0,
      rawOrderDataLength: orderData.length,
      filteredOrdersLength: filteredOrders.length,
      contractAddress: CONTRACT_ADDRESSES.COMPUTE_MARKET,
      networkId: window.ethereum?.networkVersion
    })
  }, [adminOrdersData, userOrdersData, isAdmin, userOrderIds, filter, marketStats, adminOrdersLoading, userOrdersLoading])

  // 计算资金流向信息
  const calculateFundFlow = (order) => {
    const { finalPrice, ccPaymentAmount, status } = order

    if (status === 0) { // Created
      return {
        status: 'pending',
        customerLocked: 0,
        providerReceivable: 0,
        platformFee: 0,
        burnAmount: 0,
        message: '等待支付'
      }
    }

    if (status === 1) { // Accepted
      if (ccPaymentAmount > 0) {
        return {
          status: 'locked',
          customerLocked: ccPaymentAmount,
          providerReceivable: ccPaymentAmount * 0.9625, // 96.25% after burn and fee
          platformFee: ccPaymentAmount * 0.025,
          burnAmount: ccPaymentAmount * 0.015,
          message: '资金已锁定，等待完成'
        }
      } else {
        return {
          status: 'locked',
          customerLocked: finalPrice,
          providerReceivable: finalPrice * 0.975,
          platformFee: finalPrice * 0.025,
          burnAmount: 0,
          message: '资金已锁定，等待完成'
        }
      }
    }

    if (status === 2) { // Completed
      if (ccPaymentAmount > 0) {
        const burnAmount = ccPaymentAmount * 0.015
        const platformFee = (ccPaymentAmount - burnAmount) * 0.025
        const providerReceivable = ccPaymentAmount - burnAmount - platformFee

        return {
          status: 'distributed',
          customerLocked: 0,
          providerReceivable,
          platformFee,
          burnAmount,
          message: '资金已分配完成'
        }
      } else {
        const platformFee = finalPrice * 0.025
        const providerReceivable = finalPrice - platformFee

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

    if (status === 3) { // Cancelled
      return {
        status: 'refunded',
        customerLocked: 0,
        providerReceivable: 0,
        platformFee: 0,
        burnAmount: 0,
        message: '订单已取消，资金已退还'
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
                  <div>用户订单ID数量: {debugInfo.userOrderIdsCount}</div>
                  <div>原始订单数据长度: {debugInfo.rawOrderDataLength}</div>
                  <div>过滤后订单长度: {debugInfo.filteredOrdersLength}</div>
                  <div>合约地址: {debugInfo.contractAddress}</div>
                  <div>网络ID: {debugInfo.networkId}</div>
                  <div>统计信息状态: {marketStats ? '已加载' : '未加载'}</div>
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

        {/* 市场统计信息 */}
        {marketStats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">总订单数</p>
                  <p className="text-xl font-bold text-gray-900">
                    {marketStats.totalOrders.toString()}
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
                    {formatUnits(marketStats.totalVolumeUSD, 6)} CCUSD
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
                    {formatEther(marketStats.totalVolumeCC)} CC
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
                    {formatEther(marketStats.totalBurnedCC)} CC
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
                    {formatEther(marketStats.totalPlatformFees)} CC
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
                <option value="0">待支付</option>
                <option value="1">已支付</option>
                <option value="2">已完成</option>
                <option value="3">已取消</option>
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
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}>
                            <StatusIcon className="h-4 w-4 mr-1" />
                            {statusInfo.name}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          创建时间: {new Date(Number(order.createTime) * 1000).toLocaleString()}
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
                            <div>客户: {order.client.slice(0, 6)}...{order.client.slice(-4)}</div>
                            <div>提供商: {order.provider.slice(0, 6)}...{order.provider.slice(-4)}</div>
                            <div>原始价格: {formatUnits(order.usdPrice, 6)} CCUSD</div>
                            <div>最终价格: {formatUnits(order.finalPrice, 6)} CCUSD</div>
                            {order.customerNftId > 0 && (
                              <div>客户NFT: #{order.customerNftId}</div>
                            )}
                          </div>
                        </div>

                        {/* 支付信息 */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">支付信息</h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            {order.ccPaymentAmount > 0 ? (
                              <>
                                <div>支付方式: CC代币</div>
                                <div>支付数量: {formatEther(order.ccPaymentAmount)} CC</div>
                                <div>USD价值: {formatUnits(order.finalPrice, 6)} CCUSD</div>
                              </>
                            ) : (
                              <>
                                <div>支付方式: CCUSD</div>
                                <div>支付数量: {formatUnits(order.finalPrice, 6)} CCUSD</div>
                                <div>CC数量: 0 CC</div>
                              </>
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
                                  {order.ccPaymentAmount > 0
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
                                  {order.ccPaymentAmount > 0
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