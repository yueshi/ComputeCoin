import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useWatchContractEvent, useBalance } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useNavigate } from 'react-router-dom'
import { formatEther, parseEther } from 'viem'
import { 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
  WalletIcon,
  BoltIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { CONTRACT_ADDRESSES, CONTRACT_ABI, GAS_LIMITS } from '../config/contracts'
import { useActivityManager } from '../hooks/useActivityManager'
import { useToast } from '../hooks/useToast'

// 动态获取汇率：1 ETH = 3500 CCUSD (基于合约默认汇率)
const DEFAULT_EXCHANGE_RATE = 3500

export default function Exchange() {
  const { t } = useTranslation()
  const { isConnected, address } = useAccount()
  const navigate = useNavigate()
  const { addToast, showExchangeSuccess, showExchangeError } = useToast()
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [fromToken, setFromToken] = useState('ETH')
  const [toToken, setToToken] = useState('CCUSD')

  // 交易状态 - 精简后的状态管理
  const [isProcessing, setIsProcessing] = useState(false)
  const [userActionInProgress, setUserActionInProgress] = useState(false)
  const [userActionType, setUserActionType] = useState(null)

  // 用户数据状态
  const [ethBalance, setEthBalance] = useState('0')
  const [ccusdBalance, setCcusdBalance] = useState('0')
  const [exchangeCcusdBalance, setExchangeCcusdBalance] = useState('0') // 兑换获得的CCUSD余额
  const [ccusdAllowance, setCcusdAllowance] = useState('0')
  const [needApproval, setNeedApproval] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  // 兑换历史和统计
  const [exchangeHistory, setExchangeHistory] = useState([])
  const [totalVolume, setTotalVolume] = useState('0')
  const [todayVolume, setTodayVolume] = useState('0')
  const [exchangeCount, setExchangeCount] = useState(0)
  
  // 兑换合约状态
  const [currentExchangeRate, setCurrentExchangeRate] = useState(DEFAULT_EXCHANGE_RATE)
  const [converterBalance, setConverterBalance] = useState('0')
  const [isConverterReady, setIsConverterReady] = useState(false)
  const [lastExchangeEvent, setLastExchangeEvent] = useState(null)

  // 组件挂载状态追踪 - 在React Strict Mode下需要正确处理
  const isMountedRef = useRef(true)

  // 数据刷新触发器
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 通知和状态管理 - 修复缺失的状态变量
  const [showStatus, setShowStatus] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState(null)
  const [processedErrors, setProcessedErrors] = useState(new Set())
  const [lastNotificationTime, setLastNotificationTime] = useState(0)
  const [recentEvents, setRecentEvents] = useState(new Set())
  
  // 确保组件挂载时正确设置状态并处理清理
  useEffect(() => {
    isMountedRef.current = true
    console.log('✅ 组件已挂载，设置 isMountedRef.current = true')
    
    // 确保总是设置为ETH -> CCUSD兑换方向
    setFromToken('ETH')
    setToToken('CCUSD')
    setFromAmount('')
    setToAmount('')
    
    return () => {
      console.log('🗑️ 组件即将卸载，开始清理...')
      
      // 标记组件为已卸载
      isMountedRef.current = false
      
      // 清理通知和UI相关状态
      setTransactionStatus(null)
      setShowStatus(false)
      setIsProcessing(false)
      setProcessedErrors(new Set())
      setLastNotificationTime(0)
      setUserActionInProgress(false)
      setUserActionType(null)
      
      // 注意：不清理事件历史和存储数据，支持页面刷新后的功能
      
      console.log('🧹 组件卸载清理完成')
    }
  }, [])

  // Wagmi hooks
  const { writeContract } = useWriteContract()
  const { addExchangeActivity } = useActivityManager()

  // 合约读取 - 添加 refreshTrigger 作为强制刷新机制
  const { data: rawEthBalance, refetch: refetchEthBalance } = useBalance({
    address: address,
    watch: true,
    query: {
      refetchOnWindowFocus: false,
    }
  })

  const { data: ccusdBalanceData, refetch: refetchCcusdBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.CCSD_TOKEN,
    abi: CONTRACT_ABI.CCSD_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    watch: true,
    query: {
      refetchOnWindowFocus: false,
    }
  })

  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.CCSD_TOKEN,
    abi: CONTRACT_ABI.CCSD_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER] : undefined,
    watch: true,
    query: {
      refetchOnWindowFocus: false,
    }
  })

  // 读取兑换合约状态
  const { data: exchangeRateData, refetch: refetchExchangeRate } = useReadContract({
    address: CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER,
    abi: CONTRACT_ABI.ETH_CCUSD_CONVERTER_ABI,
    functionName: 'currentRate',
    watch: true,
    query: {
      refetchOnWindowFocus: false,
    }
  })

  const { data: converterBalanceData, refetch: refetchConverterBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER,
    abi: CONTRACT_ABI.ETH_CCUSD_CONVERTER_ABI,
    functionName: 'getContractBalances',
    watch: true,
    query: {
      refetchOnWindowFocus: false,
    }
  })

  const { data: converterStatsData, refetch: refetchConverterStats } = useReadContract({
    address: CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER,
    abi: CONTRACT_ABI.ETH_CCUSD_CONVERTER_ABI,
    functionName: 'getStats',
    watch: true,
    query: {
      refetchOnWindowFocus: false,
    }
  })

  const { data: emergencyModeData, refetch: refetchEmergencyMode } = useReadContract({
    address: CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER,
    abi: CONTRACT_ABI.ETH_CCUSD_CONVERTER_ABI,
    functionName: 'emergencyMode',
    watch: true,
    query: {
      refetchOnWindowFocus: false,
    }
  })

  // 使用储备池合约获取用户CCUSD兑换相关信息
  const { data: reserveStatsData, refetch: refetchReserveStats } = useReadContract({
    address: CONTRACT_ADDRESSES.CCUSD_RESERVE_POOL,
    abi: CONTRACT_ABI.CCUSD_RESERVE_POOL_ABI,
    functionName: 'getStats',
    watch: true,
    query: {
      refetchOnWindowFocus: false,
    }
  })

  // ✅ 优化：分阶段数据刷新函数
  const refreshAllData = useCallback(async () => {
    console.log('🔄 开始分阶段刷新数据...')
    
    try {
      // 第一阶段：立即刷新关键余额数据
      console.log('📊 第一阶段：刷新余额数据...')
      await Promise.all([
        refetchEthBalance(),
        refetchCcusdBalance(),
        refetchAllowance()
      ])
      
      // 立即触发界面更新
      setRefreshTrigger(prev => prev + 1)
      
      // 第二阶段：延迟1秒后刷新合约统计数据
      setTimeout(async () => {
        try {
          console.log('📈 第二阶段：刷新合约统计数据...')
          await Promise.all([
            refetchExchangeRate(),
            refetchConverterBalance(),
            refetchConverterStats(),
            refetchEmergencyMode(),
            refetchReserveStats()
          ])
          
          // 第三阶段：再次触发界面更新
          setRefreshTrigger(prev => prev + 1)
          console.log('✅ 所有数据刷新完成')
        } catch (error) {
          console.error('❌ 第二阶段数据刷新失败:', error)
        }
      }, 1000)
      
    } catch (error) {
      console.error('❌ 第一阶段数据刷新失败:', error)
    }
  }, [
    refetchEthBalance,
    refetchCcusdBalance,
    refetchAllowance,
    refetchReserveStats,
    refetchExchangeRate,
    refetchConverterBalance,
    refetchConverterStats,
    refetchEmergencyMode
  ])

  // 快捷操作处理函数
  const handleBuyComputeService = () => {
    console.log('🛒 跳转到购买算力服务页面')
    // 显示加载状态或提示信息
    if (!isConnected) {
      showNotification('error', t('exchange.notifications.error.title'), t('exchange.notifications.error.connectWallet'))
      return
    }
    navigate('/marketplace')
  }

  const handleParticipateStaking = () => {
    console.log('💰 跳转到质押页面')
    // 显示加载状态或提示信息
    if (!isConnected) {
      showNotification('error', t('exchange.notifications.error.title'), t('exchange.notifications.error.connectWallet'))
      return
    }
    navigate('/staking')
  }

  const handleViewTransactionHistory = () => {
    console.log('📊 跳转到个人中心查看交易历史')
    navigate('/profile')
  }

  const handleFromAmountChange = (value) => {
    setFromAmount(value)
    // 只处理ETH -> CCUSD的兑换计算
    if (value && fromToken === 'ETH' && toToken === 'CCUSD') {
      setToAmount((parseFloat(value) * currentExchangeRate).toString())
    } else {
      setToAmount('')
    }
  }

  const handleSwapTokens = () => {
    // 只允许ETH -> CCUSD的兑换，不允许CCUSD -> ETH
    if (fromToken === 'CCUSD' && toToken === 'ETH') {
      // 如果当前是CCUSD -> ETH，切换到ETH -> CCUSD
      setFromToken('ETH')
      setToToken('CCUSD')
    } else if (fromToken === 'ETH' && toToken === 'CCUSD') {
      // 如果当前是ETH -> CCUSD，保持不变（或可以显示提示）
      return
    }
    
    // 清空输入金额，因为汇率可能不同
    setFromAmount('')
    setToAmount('')
  }

  // 更新兑换合约状态数据
  useEffect(() => {
    if (exchangeRateData) {
      const rate = Number(exchangeRateData.toString())
      setCurrentExchangeRate(rate)
    }
    
    if (converterBalanceData) {
      const balance = parseFloat(converterBalanceData[1].toString()) / 1e6 // CCUSD余额
      setConverterBalance(balance.toFixed(6))
      setIsConverterReady(balance > 0 && !emergencyModeData)
    }
    
    if (converterStatsData) {
      const totalEth = parseFloat(formatEther(converterStatsData[0]))
      const totalCCUSD = parseFloat(converterStatsData[1].toString()) / 1e6
      const count = Number(converterStatsData[2])
      
      setTotalVolume(totalEth.toFixed(2))
      setTodayVolume(totalCCUSD.toFixed(2))
      setExchangeCount(count)
    }
  }, [exchangeRateData, converterBalanceData, converterStatsData, emergencyModeData])

  // 更新余额数据
  useEffect(() => {
    if (rawEthBalance) {
      setEthBalance(parseFloat(formatEther(rawEthBalance.value)).toFixed(6))
    }
    if (ccusdBalanceData) {
      const userBalance = (parseFloat(ccusdBalanceData.toString()) / 1e6).toFixed(2)
      setCcusdBalance(userBalance)
      // 设置用户兑换获得的CCUSD余额（用户的实际CCSD余额）
      setExchangeCcusdBalance(userBalance)
    }
    if (reserveStatsData) {
      // 保留储备池统计，用于其他统计显示
      const totalMinted = parseFloat(reserveStatsData.minted.toString()) / 1e6
      // 可以保留用于全局统计，但不显示在用户余额中
    }
    if (allowanceData) {
      const allowance = parseFloat(allowanceData.toString()) / 1e6
      setCcusdAllowance(allowance.toFixed(6))
      
      // 检查是否需要授权
      if (fromToken === 'CCUSD' && parseFloat(fromAmount) > allowance) {
        setNeedApproval(true)
      } else {
        setNeedApproval(false)
      }
    }
  }, [rawEthBalance, ccusdBalanceData, reserveStatsData, allowanceData, fromAmount, fromToken])

  // 监听CCUSD转账事件 - 确认CCUSD是否转入用户钱包
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.CCSD_TOKEN,
    abi: CONTRACT_ABI.CCSD_ABI,
    eventName: 'Transfer',
    onLogs: (logs) => {
      console.log('💰 检测到CCUSD转账事件:', logs.length, '个事件')
      
      logs.forEach(transferEvent => {
        const isToCurrentUser = transferEvent.args.to?.toLowerCase() === address?.toLowerCase()
        const isFromConverter = transferEvent.args.from?.toLowerCase() === CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER.toLowerCase()
        
        // 只处理从兑换合约转到当前用户的转账
        if (isToCurrentUser && isFromConverter) {
          console.log('✅ 用户收到CCUSD转账:', {
            from: transferEvent.args.from,
            to: transferEvent.args.to,
            amount: transferEvent.args.value?.toString(),
            transactionHash: transferEvent.transactionHash
          })
          
          // 立即刷新CCUSD余额
          setTimeout(() => {
            refetchCcusdBalance()
            console.log('🔄 CCUSD余额已刷新')
          }, 1000)
        }
      })
    },
    enabled: !!address && isConnected,
  })

  // 清理状态和错误记录
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setProcessedErrors(prev => {
        if (prev.size > 50) {
          const errorArray = Array.from(prev)
          return new Set(errorArray.slice(-25))
        }
        return prev
      })
    }, 300000) // 每5分钟清理一次

    return () => clearInterval(cleanupInterval)
  }, [])

  
  // ✅ 统一的通知显示函数 - 只使用Toast系统
  const showNotification = useCallback((type, title, message, duration = 3000) => {
    // 检查组件挂载状态和钱包连接
    if (!isMountedRef.current || !isConnected) {
      return
    }
    
    // 使用统一的Toast通知系统
    addToast({
      title,
      message,
      type
    }, type, { duration })
  }, [isConnected, addToast])
  
  // 页面初始化时记录加载时间并恢复事件历史，清理通知相关状态
  useEffect(() => {
    console.log('🔄 兑换页面开始初始化，恢复事件历史...')
    
    // 记录页面加载时间，用于判断新交易
    const pageLoadTime = Math.floor(Date.now() / 1000)
    sessionStorage.setItem('exchange-page-load-time', pageLoadTime.toString())
    
    // 从 sessionStorage 恢复事件历史
    try {
      const storedEvents = sessionStorage.getItem('exchange-processed-events')
      if (storedEvents) {
        const parsedEvents = JSON.parse(storedEvents)
        setRecentEvents(new Set(parsedEvents))
        console.log('📦 恢复事件历史:', parsedEvents.length, '个事件')
      }
    } catch (error) {
      console.log('⚠️ 恢复事件历史失败:', error)
    }
    
    // 只重置通知和UI相关状态，不清理数据状态
    setTransactionStatus(null)
    setShowStatus(false)
    setIsProcessing(false)
    setProcessedErrors(new Set())
    setLastNotificationTime(0)
    setUserActionInProgress(false)
    setUserActionType(null)
    
    // 清理输入状态
    setFromAmount('')
    setToAmount('')
    setFromToken('ETH')
    setToToken('CCUSD')
    
    // 清除通知相关的sessionStorage数据，但保留事件历史和加载时间
    sessionStorage.removeItem('exchange-page-action-time')
    sessionStorage.removeItem('exchange-last-notification')
    // 注意：保留 'exchange-page-load-time' 和 'exchange-processed-events'
    
    console.log('🧹 兑换页面初始化完成，已恢复事件历史，页面加载时间:', pageLoadTime)
  }, []) // 空依赖数组，只在组件首次挂载时执行

  // 当钱包地址变化时清理通知和UI状态
  useEffect(() => {
    if (address) {
      console.log('🔄 钱包地址变化，清理通知状态:', address)
      
      // 重置通知和UI相关状态
      setTransactionStatus(null)
      setShowStatus(false)
      setIsProcessing(false)
      setProcessedErrors(new Set())
      // 注意：钱包地址变化时需要清理 recentEvents，因为不同用户的事件历史不应该共享
      setRecentEvents(new Set())
      // 清理持久化的事件历史，因为切换用户了
      sessionStorage.removeItem('exchange-processed-events')
      setLastNotificationTime(0)
      setUserActionInProgress(false)
      setUserActionType(null)
      
      // 重置用户特定的数据
      setExchangeHistory([])
      setLastExchangeEvent(null)
      
      // 清理输入状态
      setFromAmount('')
      setToAmount('')
      setFromToken('ETH')
      setToToken('CCUSD')
      
      // 清除通知相关的存储数据
      sessionStorage.removeItem('exchange-page-action-time')
      sessionStorage.removeItem('exchange-page-load-time')
      sessionStorage.removeItem('exchange-last-notification')
      sessionStorage.removeItem('exchange-processed-events')
      
      console.log('🧹 钱包地址变化，通知状态已清理，数据状态保留用于重新加载')
    }
  }, [address])

  // 当连接状态变化时，重置数据显示
  useEffect(() => {
    if (!isConnected) {
      // 钱包断开连接时，重置数据显示为默认值
      console.log('🔌 钱包断开连接，重置数据显示')
      setEthBalance('0')
      setCcusdBalance('0')
      setExchangeCcusdBalance('0')
      setCcusdAllowance('0')
      setNeedApproval(false)
      setIsApproving(false)
      setCurrentExchangeRate(DEFAULT_EXCHANGE_RATE)
      setConverterBalance('0')
      setIsConverterReady(false)
      setTotalVolume('0')
      setTodayVolume('0')
      setExchangeCount(0)
    }
    // 钱包连接时，数据会通过useEffect自动更新
  }, [isConnected])

  // 监听页面可见性变化，页面隐藏时清理通知状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('👀 页面隐藏，清理通知状态')
        setShowStatus(false)
        setTransactionStatus(null)
      } else if (document.visibilityState === 'visible' && isConnected) {
        console.log('👀 页面重新可见，检查是否需要清理状态')
        // 页面重新可见时，如果通知状态还存在，则清理它
        setTimeout(() => {
          if (showStatus) {
            setShowStatus(false)
            setTransactionStatus(null)
            console.log('🧹 页面重新可见，清理残留通知')
          }
        }, 1000) // 延迟1秒清理，确保不是正常的显示
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [showStatus, isConnected])

  // 定期清理事件集合，防止内存泄漏 - 参考staking页面
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setRecentEvents(prev => {
        if (prev.size > 100) {
          const eventArray = Array.from(prev)
          console.log('清理过期兑换事件，当前数量:', prev.size, '清理后数量:', eventArray.slice(-50).length)
          return new Set(eventArray.slice(-50)) // 保留最近50个事件
        }
        return prev
      })
      
      // 清理过期的错误记录
      setProcessedErrors(prev => {
        if (prev.size > 50) {
          const errorArray = Array.from(prev)
          return new Set(errorArray.slice(-25)) // 保留最近25个错误
        }
        return prev
      })
    }, 300000) // 每5分钟清理一次
    
    return () => clearInterval(cleanupInterval)
  }, [])

  // ✅ 简化的错误处理机制
  const handleError = useCallback((error, context) => {
    console.error(`${context}失败:`, error)
    
    // 结构化错误处理
    let errorType = 'unknown'
    let errorMessage = t('exchange.notifications.error.unknown')
    
    if (error.message.includes('insufficient funds')) {
      errorType = 'insufficientBalance'
      errorMessage = t('exchange.notifications.error.insufficientBalance')
    } else if (error.message.includes('user rejected')) {
      errorType = 'userRejected'
      errorMessage = t('exchange.notifications.error.userRejected')
    } else if (error.message.includes('allowance')) {
      errorType = 'insufficientAllowance'
      errorMessage = t('exchange.notifications.error.insufficientAllowance')
    }

    // 使用Toast显示错误通知
    addToast({
      title: t('exchange.notifications.error.title'),
      message: errorMessage,
      errorType
    }, 'error', { duration: 6000 })
  }, [t, addToast])

  // ✅ 简化的事件监听器 - 只监听当前用户事件，使用精确过滤
  const processedEvents = useRef(new Set())
  
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER,
    abi: CONTRACT_ABI.ETH_CCUSD_CONVERTER_ABI,
    eventName: 'Exchanged',
    args: { user: address }, // 精确过滤：只监听当前用户的事件
    onLogs: (logs) => {
      logs.forEach(exchangeEvent => {
        const eventKey = `${exchangeEvent.transactionHash}_${exchangeEvent.logIndex || '0'}`
        
        // 简单可靠的去重检查
        if (processedEvents.current.has(eventKey)) {
          return
        }
        
        // 标记事件已处理
        processedEvents.current.add(eventKey)
        
        // 限制内存使用 - 保持最近100个事件
        if (processedEvents.current.size > 100) {
          const oldest = Array.from(processedEvents.current)[0]
          processedEvents.current.delete(oldest)
        }
        
        // ✅ 创建兑换成功通知
        const ethAmount = formatEther(exchangeEvent.args.ethAmount)
        const ccusdAmount = (parseFloat(exchangeEvent.args.ccusdAmount.toString()) / 1e6).toFixed(6)
        const rateText = exchangeEvent.args.rate ? `1 ETH = ${(parseFloat(exchangeEvent.args.rate.toString()) / 1e6).toFixed(6)} CCUSD` : 'N/A'
        
        const successMessage = {
          dynamic: true,
          title: t('exchange.notifications.exchangeSuccess.title'),
          details: {
            [t('exchange.notifications.exchangeSuccess.details.amount')]: `${ethAmount} ETH`,
            [t('exchange.notifications.exchangeSuccess.details.received')]: `${ccusdAmount} CCUSD`,
            [t('exchange.notifications.exchangeSuccess.details.rate')]: rateText
          },
          transactionHash: exchangeEvent.transactionHash
        }
        
        addToast(successMessage, 'success', { duration: 5000 })
        
        // 刷新数据和更新状态
        refreshAllData()
        
        // 重置用户操作状态
        if (userActionInProgress && userActionType === 'exchange') {
          setTimeout(() => {
            setUserActionInProgress(false)
            setUserActionType(null)
          }, 2000)
        }
        
        // 更新兑换历史（保持最近10条）
        const newExchange = {
          id: Date.now(),
          fromToken: 'ETH',
          toToken: 'CCUSD',
          fromAmount: ethAmount,
          toAmount: ccusdAmount,
          rate: exchangeEvent.args.rate.toString(),
          txHash: exchangeEvent.transactionHash,
          timestamp: new Date().toISOString(),
          status: 'completed'
        }
        
        setExchangeHistory(prev => [newExchange, ...prev.slice(0, 9)])
      })
    },
    enabled: !!address && isConnected,
  })
  
  // 注意：CCUSD金库功能已移除，相关事件监听已禁用

  const handleExchange = async () => {
    if (!isConnected || !fromAmount || parseFloat(fromAmount) <= 0) {
      showNotification('error', t('exchange.notifications.error.title'), t('exchange.notifications.error.invalidAmount'))
      return
    }

    // 检查兑换合约状态
    if (!isConverterReady) {
      showNotification('error', t('exchange.notifications.error.title'), t('exchange.notifications.error.converterNotReady'))
      return
    }

    // 检查流动性是否充足
    const requiredCCUSD = parseFloat(fromAmount) * currentExchangeRate
    if (requiredCCUSD > parseFloat(converterBalance)) {
      showNotification('error', t('exchange.notifications.error.title'), t('exchange.notifications.error.insufficientLiquidity', {
        required: requiredCCUSD.toFixed(6),
        available: converterBalance
      }))
      return
    }

    setIsProcessing(true)
    setShowStatus(false)
    setUserActionInProgress(true)
    setUserActionType('exchange')
    const actionTime = Date.now().toString()
    sessionStorage.setItem('exchange-page-action-time', actionTime)
    console.log('🚀 开始用户兑换操作:', {
      actionTime: new Date(parseInt(actionTime)),
      fromAmount,
      fromToken,
      address
    })

    try {
      let txHash
      const exchangeAmount = fromToken === 'ETH' 
        ? parseEther(fromAmount)
        : (parseFloat(fromAmount) * 1e6).toString()

      if (fromToken === 'ETH') {
        // ETH -> CCUSD 兑换 (使用EthToCCUSDConverter合约)
        txHash = await writeContract({
          address: CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER,
          abi: CONTRACT_ABI.ETH_CCUSD_CONVERTER_ABI,
          functionName: 'quickExchange',
          value: exchangeAmount,
          gas: GAS_LIMITS.QUICK_EXCHANGE,
        })
      } else {
        // 注意：EthToCCUSDConverter合约只支持ETH->CCUSD兑换
        // 不支持CCUSD->ETH兑换，显示错误消息
        showNotification('error', t('exchange.notifications.error.title'), t('exchange.notifications.error.unsupportedDirection'))
        setIsProcessing(false)
        return
      }

      // 添加到活动记录
      addExchangeActivity({
        fromToken,
        toToken,
        amount: fromAmount,
        receivedAmount: toAmount,
        rate: currentExchangeRate,
        txHash,
        status: 'pending'
      })

      // 更新兑换历史
      const newExchange = {
        id: Date.now(),
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        rate: currentExchangeRate,
        txHash,
        timestamp: new Date().toLocaleString(),
        status: 'pending'
      }
      setExchangeHistory(prev => [newExchange, ...prev])

      // 不再显示交易提交通知，等待区块链事件确认后再显示成功通知

      // 清空输入
      setFromAmount('')
      setToAmount('')

    } catch (error) {
      handleError(error, t('exchange.notifications.exchangeSubmitted.context'))
      setUserActionInProgress(false)
      setUserActionType(null)
      sessionStorage.removeItem('exchange-page-action-time')
      console.log('兑换操作失败，已重置用户操作状态')
    } finally {
      setIsProcessing(false)
    }
  }

  // 授权CCUSD
  const handleApprove = async () => {
    if (!isConnected) return

    setIsApproving(true)
    setShowStatus(false)

    try {
      const amount = (parseFloat(fromAmount) * 1e6).toString()
      
      const txHash = await writeContract({
        address: CONTRACT_ADDRESSES.CCSD_TOKEN,
        abi: CONTRACT_ABI.CCSD_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER, amount],
        gas: GAS_LIMITS.APPROVE,
      })

      showNotification(
        'success',
        t('exchange.notifications.approveSuccess.title'),
        t('exchange.notifications.approveSuccess.message')
      )

    } catch (error) {
      handleError(error, t('exchange.notifications.approveFailed.context'))
    } finally {
      setIsApproving(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="space-y-16">
        {/* 连接钱包提示区域 */}
        <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-theme-bg to-teal-50 dark:from-emerald-900/20 dark:via-theme-bg dark:to-teal-900/20"></div>
          <div className="relative max-w-7xl mx-auto text-center">
            <div className="space-y-8">
              {/* 主标题 */}
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-full text-lg font-medium">
                  <ArrowsRightLeftIcon className="w-4 h-4" />
                  <span>{t('exchange.title')}</span>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold text-theme-primary">
                  <span className="block">{t('exchange.wallet.connect')}</span>
                  <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent mt-2">
                    {t('exchange.wallet.startSwap')}
                  </span>
                </h1>
                
                <p className="text-xl text-theme-secondary max-w-3xl mx-auto leading-relaxed">
                  {t('exchange.wallet.description')}
                </p>
              </div>
              
              {/* 连接钱包按钮 */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="transform hover:scale-105 transition-all duration-200">
                  <ConnectButton.Custom>
                    {({
                      account,
                      chain,
                      openAccountModal,
                      openChainModal,
                      openConnectModal,
                      authenticationStatus,
                      mounted,
                    }) => {
                      const ready = mounted && authenticationStatus !== 'loading'
                      const connected =
                        ready &&
                        account &&
                        chain &&
                        (!authenticationStatus || authenticationStatus === 'authenticated')

                      return (
                        <div
                          {...(!ready && {
                            'aria-hidden': true,
                            'style': {
                              opacity: 0,
                              pointerEvents: 'none',
                              userSelect: 'none',
                            },
                          })}
                        >
                          {(() => {
                            if (!connected) {
                              return (
                                <button
                                  onClick={openConnectModal}
                                  className="group relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                                >
                                  <span className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                                  <span className="relative flex items-center space-x-2">
                                    <WalletIcon className="w-5 h-5" />
                                    <span>{t('exchange.wallet.connectStart')}</span>
                                  </span>
                                </button>
                              )
                            }
                            return null
                          })()}
                        </div>
                      )
                    }}
                  </ConnectButton.Custom>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 功能介绍区域 */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-theme-primary mb-4">{t('exchange.features.title')}</h2>
            <p className="text-xl text-theme-secondary max-w-3xl mx-auto">
              {t('exchange.features.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group relative bg-theme-card dark:bg-gray-800 border border-theme rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-600">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:shadow-xl group-hover:shadow-emerald-500/30 transition-all duration-300">
                  <ArrowsRightLeftIcon className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('exchange.features.directSwap.title')}</h3>
                <p className="text-theme-secondary leading-relaxed">
                  {t('exchange.features.directSwap.description')}
                </p>
              </div>
            </div>

            <div className="group relative bg-theme-card dark:bg-gray-800 border border-theme rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:border-green-300 dark:hover:border-green-600">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:shadow-xl group-hover:shadow-emerald-500/30 transition-all duration-300">
                  <CurrencyDollarIcon className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('exchange.features.fixedRate.title')}</h3>
                <p className="text-theme-secondary leading-relaxed">
                  {t('exchange.features.fixedRate.description')}
                </p>
              </div>
            </div>

            <div className="group relative bg-theme-card dark:bg-gray-800 border border-theme rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-600">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:shadow-xl group-hover:shadow-emerald-500/30 transition-all duration-300">
                  <ShieldCheckIcon className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('exchange.features.secure.title')}</h3>
                <p className="text-theme-secondary leading-relaxed">
                  {t('exchange.features.secure.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 兑换说明区域 */}
        <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-full text-lg font-medium mb-4">
                <BoltIcon className="w-4 h-4" />
                <span>{t('exchange.info.tagline')}</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('exchange.info.title')}</h2>
              <p className="text-gray-600 dark:text-gray-400 text-xl">{t('exchange.info.subtitle')}</p>
            </div>
            
            <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <CurrencyDollarIcon className="w-6 h-6 text-white drop-shadow-sm" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('exchange.info.ethToCcsd.title')}</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      {t('exchange.info.ethToCcsd.description')}
                    </p>
                    <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                      <li className="flex items-start space-x-2">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{t('exchange.info.ethToCcsd.benefit1')}</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{t('exchange.info.ethToCcsd.benefit2')}</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{t('exchange.info.ethToCcsd.benefit3')}</span>
                      </li>
                    </ul>
                  </div>
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/25">
                      <ArrowsRightLeftIcon className="w-12 h-12 text-white drop-shadow-md" />
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">1 ETH = 3000 CCUSD</div>
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{t('exchange.info.fixedRate')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-16">
      {/* 固定位置的通知组件 - 参考staking页面 */}
      {showStatus && transactionStatus && (
        <div className={`fixed top-20 lg:top-24 xl:top-28 right-4 px-4 py-3 rounded-lg z-50 shadow-lg max-w-sm transition-all duration-300 transform animate-slide-in-right notification-hover ${
          transactionStatus.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300' 
            : 'bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300'
        }`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {transactionStatus.type === 'success' ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-medium mb-1 ${
                transactionStatus.type === 'success'
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {transactionStatus.title}
              </h4>
              <p className={`text-xs ${
                transactionStatus.type === 'success'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {transactionStatus.message}
              </p>
              {/* 自动隐藏进度条 */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1 dark:bg-gray-600">
                <div 
                  className="bg-blue-600 h-1 rounded-full transition-all duration-[3000ms] ease-linear"
                  style={{ 
                    width: '100%',
                    animation: 'shrink-width 3s linear forwards'
                  }}
                ></div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowStatus(false)
                setTransactionStatus(null)
              }}
              className={`flex-shrink-0 p-1 rounded-md hover:bg-gray-100 hover:bg-gray-700 transition-colors ${
                transactionStatus.type === 'success'
                  ? 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200'
                  : 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200'
              }`}
              title={t('exchange.notifications.closeNotification')}
            >
              <XCircleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* 统计卡片 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-theme-card rounded-xl shadow-sm border border-theme p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <ArrowTrendingUpIcon className="w-6 h-6 text-white drop-shadow-md" />
              </div>
              {!isConverterReady && (
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              )}
            </div>
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1">{totalVolume}</div>
              <div className="text-sm text-theme-secondary">{t('exchange.stats.ethTotal')}</div>
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-3">
              {exchangeCount} {t('exchange.stats.exchanges')}
            </div>
          </div>

          <div className="bg-theme-card rounded-xl shadow-sm border border-theme p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <CurrencyDollarIcon className="w-6 h-6 text-white drop-shadow-md" />
              </div>
              {!isConverterReady && (
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              )}
            </div>
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1">{todayVolume}</div>
              <div className="text-sm text-theme-secondary">{t('exchange.stats.ccusdTotal')}</div>
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-3">
              {converterBalance} {t('exchange.stats.available')}
            </div>
          </div>

          <div className="bg-theme-card rounded-xl shadow-sm border border-theme p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <ChartBarIcon className="w-6 h-6 text-white drop-shadow-md" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1">{currentExchangeRate}</div>
              <div className="text-sm text-theme-secondary">{t('exchange.stats.exchangeRateLabel')}</div>
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-3">
              1 ETH = {currentExchangeRate} CCUSD
            </div>
          </div>

          <div className="bg-theme-card rounded-xl shadow-sm border border-theme p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <CheckCircleIcon className="w-6 h-6 text-white drop-shadow-md" />
              </div>
              {emergencyModeData && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1">
                {emergencyModeData ? t('exchange.stats.paused') : t('exchange.stats.active')}
              </div>
              <div className="text-sm text-theme-secondary">{t('exchange.stats.serviceAvailability')}</div>
            </div>
            <div className={`text-xs mt-3 ${emergencyModeData ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {emergencyModeData ? t('exchange.stats.emergencyMode') : t('exchange.stats.normalOperation')}
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：兑换表单和业务介绍 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 兑换表单 */}
            <div className="bg-theme-card rounded-2xl shadow-lg border border-theme p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-theme-primary mb-2">{t('exchange.swap.title')}</h2>
                <p className="text-theme-secondary">{t('exchange.swap.subtitle')}</p>
              </div>

              {/* 汇率信息 */}
              <div className={`bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-4 mb-6 ${
                !isConverterReady ? 'border border-amber-200 dark:border-amber-700' : ''
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BoltIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {t('exchange.swap.exchangeRate')}
                    </span>
                    {!isConverterReady && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
                        {t('exchange.swap.lowLiquidity')}
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    1 ETH = {currentExchangeRate} CCUSD
                  </span>
                </div>
                {!isConverterReady && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    {t('exchange.swap.liquidityWarning', { available: converterBalance })}
                  </div>
                )}
              </div>

              {/* 兑换表单 */}
              <div className="space-y-6">
                {/* From 输入 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-theme-primary">{t('exchange.swap.from')}</label>
                    <div className="text-sm text-theme-secondary">
                      {t('exchange.swap.balance')}: {fromToken === 'ETH' ? ethBalance : ccusdBalance} {fromToken}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder={t('exchange.stats.amountPlaceholder')}
                      value={fromAmount}
                      onChange={(e) => handleFromAmountChange(e.target.value)}
                      className="w-full px-4 py-3 pr-24 border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-theme-input text-theme-primary text-lg"
                    />
                    <button
                      onClick={() => {
                        // 只允许从ETH切换到CCUSD，不允许反向
                        if (fromToken === 'ETH') {
                          showNotification('info', '提示', '当前只支持 ETH → CCUSD 兑换')
                          return
                        }
                        // 如果当前状态异常，重置为ETH -> CCUSD
                        setFromToken('ETH')
                        setToToken('CCUSD')
                        setFromAmount('')
                        setToAmount('')
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium"
                    >
                      {fromToken}
                    </button>
                  </div>
                </div>

                {/* 兑换按钮 */}
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      showNotification('info', '提示', '当前只支持 ETH → CCUSD 单向兑换')
                    }}
                    className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl cursor-not-allowed"
                    disabled
                  >
                    <ArrowsRightLeftIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* To 输入 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-theme-primary">{t('exchange.swap.to')}</label>
                    <div className="text-sm text-theme-secondary">
                      {t('exchange.swap.balance')}: {toToken === 'ETH' ? ethBalance : ccusdBalance} {toToken}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder={t('exchange.stats.amountPlaceholder')}
                      value={toAmount}
                      readOnly
                      className="w-full px-4 py-3 pr-24 border border-theme rounded-xl bg-theme-secondary text-theme-primary text-lg"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium">
                      {toToken}
                    </div>
                  </div>
                </div>

                {/* 授权按钮 (当需要授权时显示) */}
                {needApproval && (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 mb-4 ${
                      isApproving
                        ? 'bg-amber-500 text-white cursor-wait'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    {isApproving 
                      ? `${t('exchange.notifications.approvePending.title')}...`
                      : t('exchange.notifications.approvePending.button')
                    }
                  </button>
                )}

                {/* 兑换按钮 */}
                <button
                  onClick={needApproval ? handleApprove : handleExchange}
                  disabled={isProcessing || (needApproval ? isApproving : (!fromAmount || parseFloat(fromAmount) <= 0))}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                    isProcessing || (needApproval && isApproving)
                      ? 'bg-gray-500 text-white cursor-wait'
                      : fromAmount && parseFloat(fromAmount) > 0 && !needApproval
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:scale-105'
                        : 'bg-theme-secondary text-theme-tertiary cursor-not-allowed'
                  }`}
                >
                  {isProcessing 
                    ? t('exchange.notifications.exchanging.title')
                    : needApproval
                      ? t('exchange.notifications.approvePending.button')
                      : fromAmount && parseFloat(fromAmount) > 0 
                        ? `${t('exchange.swap.button')} ${fromAmount} ${fromToken} → ${toAmount} ${toToken}`
                        : t('exchange.swap.enterAmount')
                  }
                </button>

                </div>
            </div>

            {/* 服务优势 */}
            <div className="bg-theme-card rounded-xl border border-theme p-8">
              <h3 className="text-xl font-semibold text-theme-primary mb-6 flex items-center space-x-2">
                <ShieldCheckIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <span>{t('exchange.advantages.title')}</span>
              </h3>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
                    <ArrowTrendingUpIcon className="w-7 h-7 text-white drop-shadow-sm" />
                  </div>
                  <h4 className="font-semibold text-theme-primary mb-3">{t('exchange.advantages.fixedRate')}</h4>
                  <p className="text-sm text-theme-secondary">{t('exchange.advantages.fixedRateDesc')}</p>
                </div>
                
                <div className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
                    <BoltIcon className="w-7 h-7 text-white drop-shadow-sm" />
                  </div>
                  <h4 className="font-semibold text-theme-primary mb-3">{t('exchange.advantages.instantArrival')}</h4>
                  <p className="text-sm text-theme-secondary">{t('exchange.advantages.instantArrivalDesc')}</p>
                </div>
                
                <div className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
                    <CheckCircleIcon className="w-7 h-7 text-white drop-shadow-sm" />
                  </div>
                  <h4 className="font-semibold text-theme-primary mb-3">{t('exchange.advantages.zeroFees')}</h4>
                  <p className="text-sm text-theme-secondary">{t('exchange.advantages.zeroFeesDesc')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：用户信息和快速操作 */}
          <div className="space-y-8">
            {/* 用户资产卡片 */}
            <div className="bg-theme-card rounded-xl border border-theme p-6">
              <h3 className="text-lg font-semibold text-theme-primary mb-6">{t('exchange.stats.myAssets')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-theme-secondary">{t('exchange.stats.ethBalance')}</div>
                    <div className="text-xl font-bold text-theme-primary">{ethBalance}</div>
                  </div>
                  <div className="text-sm text-theme-secondary">ETH</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-theme-secondary">{t('exchange.stats.exchangedCcusdBalance')}</div>
                    <div className="text-xl font-bold text-theme-primary">{exchangeCcusdBalance}</div>
                  </div>
                  <div className="text-sm text-theme-secondary">CCUSD</div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-theme">
                  <div>
                    <div className="text-sm text-theme-secondary">{t('exchange.stats.totalValue')}</div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {t('exchange.stats.currencySymbol')}{(parseFloat(ethBalance) * 2670 + parseFloat(exchangeCcusdBalance)).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm text-emerald-600 dark:text-emerald-400">{t('exchange.stats.priceChange')}</div>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700 p-6">
              <h3 className="text-lg font-semibold text-theme-primary mb-4">{t('exchange.stats.quickActions')}</h3>
              <div className="space-y-3">
                <button 
                  onClick={handleBuyComputeService}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <CurrencyDollarIcon className="w-5 h-5" />
                  <span>{t('exchange.stats.buyComputeService')}</span>
                </button>
                <button 
                  onClick={handleParticipateStaking}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <ArrowTrendingUpIcon className="w-5 h-5" />
                  <span>{t('exchange.stats.participateStaking')}</span>
                </button>
                <button 
                  onClick={handleViewTransactionHistory}
                  className="w-full bg-theme-card hover:bg-theme-tertiary text-theme-primary font-medium py-3 px-4 rounded-lg border border-theme transition-colors flex items-center justify-center space-x-2"
                >
                  <ChartBarIcon className="w-5 h-5" />
                  <span>{t('exchange.stats.viewTransactionHistory')}</span>
                </button>
              </div>
            </div>

            {/* 安全提示 */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-700">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">{t('exchange.security.title')}</h4>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                    <li>{t('exchange.security.tip1')}</li>
                    <li>{t('exchange.security.tip2')}</li>
                    <li>{t('exchange.security.tip3')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}