import React, { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useWatchContractEvent, useBalance } from 'wagmi'
import { useTranslation } from 'react-i18next'
import WalletConnectButton from '../components/WalletConnectButton'
import { formatEther, parseEther, formatUnits } from 'viem'
import { 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  TrophyIcon,
  StarIcon,
  CpuChipIcon,
  GiftIcon,
  ShoppingCartIcon,
  BoltIcon,
  FireIcon,
  ShieldCheckIcon,
  XCircleIcon,
  InformationCircleIcon,
  WalletIcon,
  ChartBarIcon,
  AcademicCapIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline'
import { CONTRACT_ADDRESSES, CONTRACT_ABI, GAS_LIMITS } from '../config/contracts'
import { CCUSD_CONFIG } from '../config/mockusdc-config'
import { useActivityManager } from '../hooks/useActivityManager'
import { getNFTTierIcon, getTierIcon, getTierIconByEnum } from '../config/nftIcons'

const STAKING_OPTIONS = (t) => [
  {
    id: 'cc',
    name: t('staking.ccStaking'),
    description: t('staking.features.ccStaking.description'),
    icon: CurrencyDollarIcon,
    color: 'from-emerald-500 to-emerald-600',
    apy: '8%',
    minAmount: '100',
    token: 'CC'
  },
  {
    id: 'eth',
    name: t('staking.ethStaking'),
    description: t('staking.features.ethStaking.description'),
    icon: CurrencyDollarIcon,
    color: 'from-emerald-500 to-emerald-600',
    apy: '8%',
    minAmount: '0.1',
    token: 'ETH'
  }
]

// NFT等级枚举值映射 - 与合约保持一致
const NFT_TIERS = [
  { tier: 1, name: 'BRONZE', color: 'from-yellow-600 to-yellow-700', discount: '5%', stakeCC: '100', stakeETH: '0.5' },
  { tier: 2, name: 'SILVER', color: 'from-gray-400 to-gray-500', discount: '8%', stakeCC: '200', stakeETH: '1.0' },
  { tier: 3, name: 'GOLD', color: 'from-yellow-400 to-yellow-500', discount: '12%', stakeCC: '500', stakeETH: '2.0' },
  { tier: 4, name: 'PLATINUM', color: 'from-slate-300 to-slate-400', discount: '15%', stakeCC: '1000', stakeETH: '5.0' }
]

const PROVIDER_NFT_TIERS = [
  {
    tier: 1,
    name: 'BRONZE',
    color: 'from-yellow-600 to-yellow-700',
    multiplier: '5%',
    stakeCC: '1000',
    stakeETH: null, // ProviderNFT 不支持 ETH 质押
    deviceCount: 1,
    bonus: '105%'
  },
  {
    tier: 2,
    name: 'SILVER',
    color: 'from-gray-400 to-gray-500',
    multiplier: '8%',
    stakeCC: '3000',
    stakeETH: null, // ProviderNFT 不支持 ETH 质押
    deviceCount: 3,
    bonus: '108%'
  },
  {
    tier: 3,
    name: 'GOLD',
    color: 'from-yellow-400 to-yellow-500',
    multiplier: '12%',
    stakeCC: '6000',
    stakeETH: null, // ProviderNFT 不支持 ETH 质押
    deviceCount: 5,
    bonus: '112%'
  },
  {
    tier: 4,
    name: 'PLATINUM',
    color: 'from-slate-300 to-slate-400',
    multiplier: '15%',
    stakeCC: '10000',
    stakeETH: null, // ProviderNFT 不支持 ETH 质押
    deviceCount: 10,
    bonus: '115%'
  }
]

// 合约中的NFT等级要求验证
const validateNFTRequirements = (tier, nftType, selectedOption, stakeAmount) => {
  const tierData = nftType === 'customer'
    ? NFT_TIERS.find(t => t.tier === tier)
    : PROVIDER_NFT_TIERS.find(t => t.tier === tier)

  if (!tierData) return false

  // ProviderNFT 只支持 CC 质押
  if (nftType === 'provider' && selectedOption === 'eth') {
    return false
  }

  const requiredAmount = selectedOption === 'cc' ? tierData.stakeCC : tierData.stakeETH
  return parseFloat(stakeAmount) >= parseFloat(requiredAmount)
}


export default function Staking() {
  const { t } = useTranslation()
  const { address, isConnected } = useAccount()
  const [selectedOption, setSelectedOption] = useState('cc')
  const [stakeAmount, setStakeAmount] = useState('')
  const [selectedTier, setSelectedTier] = useState(1) // 1 = BRONZE
  const [selectedProviderTier, setSelectedProviderTier] = useState(1) // 1 = BRONZE
  const [isForNFT, setIsForNFT] = useState(false)
  const [activeTab, setActiveTab] = useState('stake')
  const [nftType, setNftType] = useState('customer') // 'customer' or 'provider'
  
  // 事件驱动更新状态
  const [lastUpdateTime, setLastUpdateTime] = useState(null)
  
  // 交易状态管理 - 初始化时重置所有状态
  const [transactionStatus, setTransactionStatus] = useState(null)
  const [showStatus, setShowStatus] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 用于跟踪已处理的错误，避免重复通知
  const [processedErrors, setProcessedErrors] = useState(new Set())
  
  // 活动记录管理
  const { addStakeActivity, addUnstakeActivity, addClaimRewardsActivity, addMintNFTActivity } = useActivityManager()

  // 跟踪页面加载时间和通知状态
  const [pageLoadTime, setPageLoadTime] = useState(Date.now())
  const [recentEvents, setRecentEvents] = useState(new Set())
  const [lastNotificationTime, setLastNotificationTime] = useState(0)
  
  // 用户操作状态跟踪
  const [userActionInProgress, setUserActionInProgress] = useState(false)
  const [userActionType, setUserActionType] = useState(null)
  const [actionCompletionTime, setActionCompletionTime] = useState(null)

  // 页面初始化时重置所有状态 - 简化版本
  useEffect(() => {
    // 强制重置所有状态
    setTransactionStatus(null)
    setShowStatus(false)
    setIsProcessing(false)
    setProcessedErrors(new Set())
    setRecentEvents(new Set())
    setLastNotificationTime(0)
    setUserActionInProgress(false)
    setUserActionType(null)
    setActionCompletionTime(null)
    
    // 设置页面加载时间
    const currentPageLoad = Date.now()
    setPageLoadTime(currentPageLoad)
    
    // 清理sessionStorage中的旧数据
    sessionStorage.removeItem('staking-page-loaded')
    sessionStorage.removeItem('staking-page-load-time')
    sessionStorage.removeItem('staking-page-action-time')
    
    console.log('Staking页面状态已重置', { pageLoadTime: currentPageLoad })
  }, []) // 空依赖数组，只在组件首次挂载时执行

  // 当钱包地址变化时也重置通知状态
  useEffect(() => {
    if (address) {
      setTransactionStatus(null)
      setShowStatus(false)
      setIsProcessing(false)
      setProcessedErrors(new Set())
      setRecentEvents(new Set())
      setLastNotificationTime(0)
        }
  }, [address])

  
  // 当用户关闭NFT选项时，清除NFT相关状态
  useEffect(() => {
    if (!isForNFT && showStatus && transactionStatus?.type === 'info' && 
        (transactionStatus?.title === t('staking.nftStatus.customerNFT') || 
         transactionStatus?.title === t('staking.nftStatus.providerNFT'))) {
      setShowStatus(false)
      setTransactionStatus(null)
    }
  }, [isForNFT, showStatus, transactionStatus])

  // 当用户切换质押选项或修改金额时，清除错误状态
  useEffect(() => {
    if (showStatus && transactionStatus?.type === 'error') {
      // 清除所有错误状态，让用户可以重新尝试
      setShowStatus(false)
      setTransactionStatus(null)
    }
  }, [selectedOption, stakeAmount, isForNFT])

  // 定期清理事件集合，防止内存泄漏
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setRecentEvents(prev => {
        // 如果事件超过100个，保留最新的50个
        if (prev.size > 100) {
          const eventArray = Array.from(prev)
          return new Set(eventArray.slice(-50))
        }
        return prev
      })
      
      setProcessedErrors(prev => {
        // 如果错误记录超过50个，保留最新的25个
        if (prev.size > 50) {
          const errorArray = Array.from(prev)
          return new Set(errorArray.slice(-25))
        }
        return prev
      })
    }, 300000) // 每5分钟清理一次，减少性能开销
    
    return () => clearInterval(cleanupInterval)
  }, [])

  // 智能初始化数据加载 - 优化版本，减少延迟
  useEffect(() => {
    if (address && !stakesLoading && !rewardsLoading) {
      // 立即加载核心数据，无需延迟
      dataRefreshManager.refreshCoreData('initial-load')
      
      // 延迟加载次要数据，减少对主要功能的影响
      setTimeout(() => {
        refetchCCAllowance()
        refetchCustomerNftBalance() 
        refetchProviderNftBalance()
        refetchCCUSDBalance()
        refetchCurrentAPR()
      }, 200) // 减少延迟到200ms
    }
  }, [address]) // 只依赖address，确保只在钱包连接变化时执行

  // 组件卸载时清理状态
  useEffect(() => {
    return () => {
      setTransactionStatus(null)
      setShowStatus(false)
      setIsProcessing(false)
      setProcessedErrors(new Set())
      setRecentEvents(new Set())
      setLastNotificationTime(0)
        }
  }, [])

  // 格式化余额为5位小数
  const formatBalance5 = (balance, decimals = 18) => {
    if (!balance) return '0.00000'
    const divisor = BigInt(10) ** BigInt(decimals)
    const wholePart = balance / divisor
    const fractionalPart = (balance % divisor) * BigInt(100000) / divisor
    return `${wholePart}.${fractionalPart.toString().padStart(5, '0')}`
  }

  // 格式化CCUSD余额（6位小数，显示2位）
  const formatCCUSDBalance = (balance) => {
    if (!balance) return '0.00'
    try {
      const balanceBigInt = BigInt(balance)
      const divisor = BigInt(10) ** BigInt(6)
      const wholePart = balanceBigInt / divisor
      const fractionalPart = (balanceBigInt % divisor) * BigInt(100) / divisor
      return `${wholePart}.${fractionalPart.toString().padStart(2, '0')}`
    } catch (error) {
      console.error('格式化CCUSD余额失败:', error)
      return '0.00'
    }
  }

  // 格式化CC余额（18位小数，显示5位）
  const formatCCBalance = (balance) => {
    if (!balance) return '0.00000'
    return formatBalance5(balance, 18)
  }

  // 验证奖励数据是否合理
  const isRewardsDataValid = (rewards, stakes) => {
    // 如果没有奖励，显示0是合理的
    if (!rewards || rewards === 0n) return true
    // 如果有奖励，必须要有质押记录才合理
    return stakes && stakes.length > 0
  }

  // 统一的数据刷新管理器
  const dataRefreshManager = {
    // 刷新所有核心数据
    refreshCoreData: async (context = 'manual') => {
      try {
        const refreshPromises = [
          refetchUserStakes(),
          refetchPendingRewards(),
          refetchCCBalance(),
          refetchETHBalance()
        ]
        
        // 根据上下文选择性刷新其他数据
        if (context === 'stake' || context === 'claim') {
          refreshPromises.push(
            refetchCustomerNftBalance(),
            refetchProviderNftBalance()
          )
        }
        
        await Promise.all(refreshPromises)
        console.log(`核心数据刷新完成 (${context})`)
      } catch (error) {
        console.error(`核心数据刷新失败 (${context}):`, error)
      }
    },

    // 刷新余额相关数据
    refreshBalances: async (context = 'balance') => {
      try {
        await Promise.all([
          refetchCCBalance(),
          refetchETHBalance(),
          refetchCCUSDBalance()
        ])
        console.log(`余额数据刷新完成 (${context})`)
      } catch (error) {
        console.error(`余额数据刷新失败 (${context}):`, error)
      }
    },

    // 刷新NFT相关数据
    refreshNFTData: async (context = 'nft') => {
      try {
        await Promise.all([
          refetchCustomerNftBalance(),
          refetchProviderNftBalance()
        ])
        console.log(`NFT数据刷新完成 (${context})`)
      } catch (error) {
        console.error(`NFT数据刷新失败 (${context}):`, error)
      }
    },

    // 刷新奖励相关数据
    refreshRewards: async (context = 'rewards') => {
      try {
        await Promise.all([
          refetchPendingRewards(),
          refetchCCBalance()
        ])
        console.log(`奖励数据刷新完成 (${context})`)
      } catch (error) {
        console.error(`奖励数据刷新失败 (${context}):`, error)
      }
    }
  }

  // 批量数据刷新工具函数（保持向后兼容）
  const batchRefresh = dataRefreshManager.refreshCoreData

  // 获取NFT等级图标
  const getTierIconLocal = (tier) => {
    // 使用统一的图标配置 (处理合约枚举值)
    return getTierIconByEnum(tier)
  }

  // 获取NFT等级颜色
  const getTierColor = (tier) => {
    const colors = [
      'from-yellow-600 to-yellow-700',
      'from-gray-400 to-gray-500', 
      'from-yellow-400 to-yellow-500',
      'from-slate-300 to-slate-400'
    ]
    return colors[tier] || 'from-emerald-500 to-emerald-600'
  }

  // 读取用户质押信息 - 事件驱动为主，长时间缓存
  const { data: userStakes, isLoading: stakesLoading, refetch: refetchUserStakes } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    functionName: 'getUserStakes',
    args: [address],
    enabled: !!address,
    query: {
      retry: false,
      staleTime: 300000, // 5分钟缓存，主要依赖事件驱动
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
    onError: (error) => {
      console.error('Failed to fetch user stakes:', error)
    }
  })

  
  // 读取待领取奖励 - 事件驱动为主，中等缓存时间
  const { data: pendingRewards, isLoading: rewardsLoading, refetch: refetchPendingRewards } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    functionName: 'getUserPendingRewards',
    args: [address], // 传递用户地址参数
    enabled: !!address,
    query: {
      retry: false,
      staleTime: 60000, // 1分钟缓存，奖励变化相对频繁
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    onError: (error) => {
      console.error('Failed to fetch pending rewards:', error)
    }
  })

  // 读取当前APR - 长期缓存，几乎不变的数据
  const { data: currentAPR, refetch: refetchCurrentAPR } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    functionName: 'getCurrentAPR',
    query: {
      retry: false,
      staleTime: 600000, // 10分钟缓存，APR很少变化
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  })

  // 读取用户Customer NFT余额 - 长期缓存，事件驱动更新
  const { data: customerNftBalance, refetch: refetchCustomerNftBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
    abi: CONTRACT_ABI.CUSTOMER_NFT_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
    query: {
      retry: false,
      staleTime: 600000, // 10分钟缓存，NFT余额变化很少
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  })

  // 读取用户Provider NFT余额 - 长期缓存，事件驱动更新
  const { data: providerNftBalance, refetch: refetchProviderNftBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.PROVIDER_NFT,
    abi: CONTRACT_ABI.PROVIDER_NFT_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
    query: {
      retry: false,
      staleTime: 600000, // 10分钟缓存，NFT余额变化很少
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  })

  // 获取Customer NFT Token ID - 如果有NFT的话
  const { data: customerNftTokenId, refetch: refetchCustomerNftTokenId } = useReadContract({
    address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
    abi: CONTRACT_ABI.CUSTOMER_NFT_ABI,
    functionName: 'tokenOfOwnerByIndex',
    args: [address, 0], // 获取第一个NFT的Token ID
    enabled: !!address && customerNftBalance > 0,
    query: {
      retry: false,
      staleTime: 600000, // 10分钟缓存，Token ID不会变化
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  })

  // 获取Provider NFT Token ID - 如果有NFT的话
  const { data: providerNftTokenId, refetch: refetchProviderNftTokenId } = useReadContract({
    address: CONTRACT_ADDRESSES.PROVIDER_NFT,
    abi: CONTRACT_ABI.PROVIDER_NFT_ABI,
    functionName: 'tokenOfOwnerByIndex',
    args: [address, 0], // 获取第一个NFT的Token ID
    enabled: !!address && providerNftBalance > 0,
    query: {
      retry: false,
      staleTime: 600000, // 10分钟缓存，Token ID不会变化
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  })

  // CC代币授权
  const { 
    writeContract: approveCC, 
    data: approveHash,
    isPending: isApprovePending
  } = useWriteContract()

  // 质押合约写入
  const { 
    writeContract: stakeCC, 
    data: stakeCCHash,
    isPending: isStakeCCPending,
    error: stakeCCError 
  } = useWriteContract()

  const { 
    writeContract: stakeETH, 
    data: stakeETHHash,
    isPending: isStakeETHPending,
    error: stakeETHError 
  } = useWriteContract()

  // 领取奖励
  const { 
    writeContract: claimRewards, 
    data: claimHash,
    isPending: isClaimPending 
  } = useWriteContract()

  // 等待交易确认 - 移到这里以确保所有依赖的hash变量都已定义
  const { 
    isLoading: isStakeCCLoading, 
    error: stakeCCLoadingError 
  } = useWaitForTransactionReceipt({
    hash: stakeCCHash,
  })

  const { 
    isLoading: isStakeETHLoading, 
    error: stakeETHLoadingError 
  } = useWaitForTransactionReceipt({
    hash: stakeETHHash,
  })

  const { 
    isLoading: isClaimLoading, 
    error: claimLoadingError 
  } = useWaitForTransactionReceipt({
    hash: claimHash,
  })

  // 监听交易 hash 变化，重置相关状态
  useEffect(() => {
    // 当任何交易的 hash 发生变化时，重置处理状态
    if (stakeCCHash || stakeETHHash || claimHash) {
      setIsProcessing(false)
      }
  }, [stakeCCHash, stakeETHHash, claimHash])

  // 交易状态处理 - 优化版本
  useEffect(() => {
    const handleTransactionStatus = async () => {
      // 防止重复处理
      if (isProcessing) return
      
      // 处理CC质押交易错误
      if (stakeCCLoadingError && !isProcessing) {
        const errorKey = `CC-${stakeCCLoadingError.message}-${Date.now()}`
        
        // 检查是否已经处理过这个错误
        if (processedErrors.has(errorKey)) {
          return
        }
        
        setIsProcessing(true)
        setProcessedErrors(prev => new Set([...prev, errorKey]))
        
        console.error('CC质押交易失败:', stakeCCLoadingError)
        setTransactionStatus({
          type: 'error',
          title: t('staking.errors.stakingFailed'),
          message: `CC${t('staking.errors.ccStakeFailed')}`,
        })
        setShowStatus(true)
        
        // 5秒后隐藏通知并清理错误状态
        setTimeout(() => {
          setShowStatus(false)
          setTransactionStatus(null)
          setIsProcessing(false)
          
          // 清理已处理的错误记录（保留最近10个）
          setProcessedErrors(prev => {
            const errorArray = Array.from(prev)
            if (errorArray.length > 10) {
              return new Set(errorArray.slice(-10))
            }
            return prev
          })
        }, 5000)
      }
      
      // 处理ETH质押交易错误
      if (stakeETHLoadingError && !isProcessing) {
        const errorKey = `ETH-${stakeETHLoadingError.message}-${Date.now()}`
        
        // 检查是否已经处理过这个错误
        if (processedErrors.has(errorKey)) {
          return
        }
        
        setIsProcessing(true)
        setProcessedErrors(prev => new Set([...prev, errorKey]))
        
        console.error('ETH质押交易失败:', stakeETHLoadingError)
        console.error('详细错误信息:', {
          message: stakeETHLoadingError.message,
          cause: stakeETHLoadingError.cause,
          data: stakeETHLoadingError.data,
          shortMessage: stakeETHLoadingError.shortMessage
        })
        
        // 尝试解析具体错误原因
        let errorMessage = `ETH${t('staking.errors.ethStakeFailed')}`
        if (stakeETHLoadingError.cause) {
          const causeMessage = stakeETHLoadingError.cause.message || stakeETHLoadingError.cause.shortMessage || String(stakeETHLoadingError.cause)
          if (causeMessage.includes('User already has Customer NFT')) {
            errorMessage = t('staking.consoleErrors.alreadyHasCustomerNFT')
          } else if (causeMessage.includes('Insufficient ETH for Customer NFT tier')) {
            errorMessage = t('staking.consoleErrors.insufficientETHForCustomerNFT')
          } else if (causeMessage.includes('Daily staking limit exceeded')) {
            errorMessage = t('staking.consoleErrors.dailyStakingLimitExceeded')
          } else if (causeMessage.includes('Staking is paused')) {
            errorMessage = t('staking.consoleErrors.stakingPaused')
          }
        }
        
        setTransactionStatus({
          type: 'error',
          title: t('staking.errors.stakingFailed'),
          message: errorMessage,
        })
        setShowStatus(true)
        
        // 5秒后隐藏通知并清理错误状态
        setTimeout(() => {
          setShowStatus(false)
          setTransactionStatus(null)
          setIsProcessing(false)
          
          // 清理已处理的错误记录（保留最近10个）
          setProcessedErrors(prev => {
            const errorArray = Array.from(prev)
            if (errorArray.length > 10) {
              return new Set(errorArray.slice(-10))
            }
            return prev
          })
        }, 5000)
      }
    }
    
    handleTransactionStatus()
  }, [stakeCCLoadingError, stakeETHLoadingError, isProcessing, processedErrors])

  // 读取CC代币授权余额 - 中等缓存，事件驱动更新
  const { data: ccAllowance, refetch: refetchCCAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    functionName: 'allowance',
    args: [address, CONTRACT_ADDRESSES.STAKING_POOL],
    enabled: !!address,
    query: {
      retry: false,
      staleTime: 120000, // 2分钟缓存，授权状态变化较少
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  })

  // 读取CC代币余额 - 事件驱动更新，减少缓存时间
  const { data: ccBalanceRaw, refetch: refetchCCBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
    query: {
      retry: false,
      staleTime: 45000, // 45秒缓存，余额变化相对频繁
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  })

  // 确保余额是BigInt类型
  const ccBalance = ccBalanceRaw ? BigInt(ccBalanceRaw) : BigInt(0)

  // 调试信息
  useEffect(() => {
    if (address && ccBalanceRaw !== undefined) {
      console.log('CC余额调试信息:', {
        address,
        ccBalanceRaw,
        ccBalance,
        ccBalanceType: typeof ccBalance,
        formatted: formatCCBalance(ccBalance)
      })
    }
  }, [address, ccBalanceRaw, ccBalance])

  // 读取ETH余额 - 最小缓存，原生ETH转账需要及时响应
  const { data: ethBalance, refetch: refetchETHBalance } = useBalance({
    address: address,
    enabled: !!address,
    query: {
      retry: false,
      staleTime: 30000, // 30秒缓存，最短的缓存时间
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  })

  // 读取用户CCUSD代币余额 - 长期缓存，事件驱动更新
  const { data: usdcBalance, refetch: refetchCCUSDBalance } = useReadContract({
    address: CCUSD_CONFIG.address,
    abi: CCUSD_CONFIG.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
    query: {
      retry: false,
      staleTime: 300000, // 5分钟缓存，CCUSD使用较少
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  })

  
  // NFT状态检查 - 在选择NFT选项时立即检查用户NFT状态
  useEffect(() => {
    if (isForNFT && !stakesLoading && !rewardsLoading && address) {
      if (nftType === 'customer' && customerNftBalance !== undefined && customerNftBalance > 0) {
        // 用户已有Customer NFT，显示状态提示而非错误
        setTransactionStatus({
          type: 'info',
          title: t('staking.nftStatus.customerNFT'),
          message: t('staking.nftStatus.alreadyOwned')
        })
        setShowStatus(true)
      } else if (nftType === 'provider' && providerNftBalance !== undefined && providerNftBalance > 0) {
        // 用户已有Provider NFT，显示状态提示而非错误
        setTransactionStatus({
          type: 'info',
          title: t('staking.nftStatus.providerNFT'),
          message: t('staking.nftStatus.alreadyOwned')
        })
        setShowStatus(true)
      }
    }
  }, [isForNFT, nftType, customerNftBalance, providerNftBalance, stakesLoading, rewardsLoading, address])

  // 基于区块链事件的数据更新监听
  // 监听质押事件 - 简化过滤版本，避免历史事件触发通知
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    eventName: 'Staked',
    onLogs: (logs) => {
      if (!address || !pageLoadTime) return // 确保页面已完全加载
      
      const userStakeEvent = logs.find(log => log.args.user === address)
      if (!userStakeEvent) return
      
      // 创建事件唯一标识
      const eventKey = `${userStakeEvent.transactionHash}-${userStakeEvent.args.amount}`
      
      // 检查是否已经处理过这个事件
      if (recentEvents.has(eventKey)) return
      
      // 使用区块时间戳进行严格的时间过滤
      const eventBlockTimestamp = Number(userStakeEvent.blockTimestamp)
      const pageLoadTimestamp = pageLoadTime / 1000
      const currentTime = Date.now() / 1000
      
      // 严格过滤：只处理页面加载后60秒内发生的事件
      const timeSincePageLoad = eventBlockTimestamp - pageLoadTimestamp
      const timeSinceEvent = currentTime - eventBlockTimestamp
      
      // 只处理页面加载后发生的事件，且在最近30秒内
      if (timeSincePageLoad < 0 || timeSinceEvent > 30) {
        return
      }
      
      // 添加到已处理事件集合
      setRecentEvents(prev => new Set([...prev, eventKey]))
      setLastUpdateTime(new Date())
      
      // 添加活动记录
      addStakeActivity({
        amount: formatEther(userStakeEvent.args.amount),
        token: userStakeEvent.args.assetType === 0 ? 'ETH' : 'CC',
        txHash: userStakeEvent.transactionHash
      })
      
      // 清除质押数量输入
      setStakeAmount('')
      
      // 显示通知：距离上次通知超过5秒冷却时间
      const currentTimeMs = Date.now()
      const notificationCooldown = 5000
      const timeSinceLastNotification = currentTimeMs - lastNotificationTime
      
      if (timeSinceLastNotification > notificationCooldown && userActionInProgress) {
        setLastNotificationTime(currentTimeMs)
        
        // 清除任何正在显示的错误通知
        if (showStatus && transactionStatus?.type === 'error') {
          setShowStatus(false)
          setTransactionStatus(null)
        }
        
        // 显示成功提示
        setTimeout(() => {
          setTransactionStatus({
            type: 'success',
            title: t('staking.notifications.stakeSuccessTitle'),
            message: t('staking.notifications.stakeSuccessMessage', {
              amount: formatEther(userStakeEvent.args.amount),
              token: userStakeEvent.args.assetType === 0 ? 'ETH' : 'CC'
            }),
          })
          setShowStatus(true)
          
          // 3秒后自动隐藏
          setTimeout(() => {
            setShowStatus(false)
            setTransactionStatus(null)
            setUserActionInProgress(false)
            setUserActionType(null)
          }, 3000)
        }, 500)
      }
      
      // 触发数据刷新 - 减少延迟
      setTimeout(() => {
        dataRefreshManager.refreshCoreData('stake-event')
      }, 1000) // 减少延迟到1秒
    },
    enabled: !!address && !!pageLoadTime,
  })

  // 监听解质押事件 - 优化版本
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    eventName: 'Unstaked', // 正确的事件名称
    onLogs: (logs) => {
      const userUnstakeEvent = logs.find(log => log.args.user === address)
      if (userUnstakeEvent) {
        setLastUpdateTime(new Date())
                
        // 添加活动记录
        addUnstakeActivity({
          amount: formatEther(userUnstakeEvent.args.amount),
          token: userUnstakeEvent.args.assetType === 0 ? 'ETH' : 'CC',
          txHash: userUnstakeEvent.transactionHash
        })
        
        // 触发数据刷新 - 减少延迟
        setTimeout(() => {
          dataRefreshManager.refreshCoreData('unstake-event')
        }, 1000) // 减少延迟到1秒
      }
    },
    enabled: !!address,
  })

  // 监听奖励领取事件 - 优化版本
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    eventName: 'RewardsClaimed', // 正确的事件名称
    onLogs: (logs) => {
      const userRewardEvent = logs.find(log => log.args.user === address)
      if (userRewardEvent) {
        setLastUpdateTime(new Date())
                
        // 使用区块时间戳进行过滤，移除sessionStorage依赖
        const eventBlockTimestamp = Number(userRewardEvent.blockTimestamp)
        const pageLoadTimestamp = pageLoadTime / 1000
        const currentTime = Date.now() / 1000
        const timeSinceEvent = currentTime - eventBlockTimestamp
        
        // 检查是否是用户当前操作的结果
        const isUserActionResult = userActionInProgress && 
                                 userActionType === 'claim' && 
                                 eventBlockTimestamp > pageLoadTimestamp &&
                                 timeSinceEvent < 30 // 事件在最近30秒内
        
        if (isUserActionResult) {
                    
          // 添加活动记录
          addClaimRewardsActivity({
            amount: formatEther(userRewardEvent.args.amount),
            txHash: userRewardEvent.transactionHash
          })
          
          // 显示成功通知
          setTransactionStatus({
            type: 'success',
            title: t('staking.notifications.claimSuccessTitle'),
            message: t('staking.notifications.claimSuccessMessage', {
              amount: formatEther(userRewardEvent.args.amount)
            }),
          })
          setShowStatus(true)
          
          // 3秒后隐藏通知并重置状态
          setTimeout(() => {
            setShowStatus(false)
            setTransactionStatus(null)
            setUserActionInProgress(false)
            setUserActionType(null)
                      }, 3000)
        } else {
                  }
        
        // 触发数据刷新 - 减少延迟
        setTimeout(() => {
          dataRefreshManager.refreshRewards('claim-event')
        }, 800) // 减少延迟到0.8秒
      }
    },
    enabled: !!address,
  })

  
  // 监听CC代币余额变化
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    eventName: 'Transfer',
    onLogs: (logs) => {
      const userTransferEvent = logs.find(log => 
        log.args.from === address || log.args.to === address
      )
      if (userTransferEvent) {
        setLastUpdateTime(new Date())
                // 触发余额刷新 - 减少延迟
        setTimeout(() => {
          dataRefreshManager.refreshBalances('cc-transfer-event')
        }, 500) // 减少延迟到0.5秒
      }
    },
    enabled: !!address,
  })

  // 监听CC代币授权变化 - 优化版本
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    eventName: 'Approval',
    onLogs: (logs) => {
      const userApprovalEvent = logs.find(log => 
        log.args.owner === address && log.args.spender === CONTRACT_ADDRESSES.STAKING_POOL
      )
      if (userApprovalEvent) {
        setLastUpdateTime(new Date())
                // 触发授权和余额刷新 - 减少延迟
        setTimeout(() => {
          dataRefreshManager.refreshBalances('approval-event')
          refetchCCAllowance() // 单独刷新授权状态
        }, 500) // 减少延迟到0.5秒
      }
    },
    enabled: !!address,
  })

  // 监听Customer NFT铸造事件 - 新增事件监听
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
    abi: CONTRACT_ABI.CUSTOMER_NFT_ABI,
    eventName: 'Transfer', // NFT铸造事件
    onLogs: (logs) => {
      const userNftMintEvent = logs.find(log => 
        log.args.to === address && log.args.from === '0x0000000000000000000000000000000000000000'
      )
      if (userNftMintEvent) {
        setLastUpdateTime(new Date())
                // 添加NFT铸造活动记录
        addMintNFTActivity({
          tokenId: userNftMintEvent.args.tokenId?.toString(),
          txHash: userNftMintEvent.transactionHash
        })
        // 触发NFT数据刷新 - 减少延迟
        setTimeout(() => {
          dataRefreshManager.refreshNFTData('nft-mint-event')
        }, 800) // 减少延迟到0.8秒
      }
    },
    enabled: !!address,
  })

  // 监听ETH余额变化 - 使用原生ETH转账事件监听
  useEffect(() => {
    if (!address) return
    
    // 设置定时检查作为补充（原生ETH转账无法直接监听）- 进一步降低频率
    const balanceCheckInterval = setInterval(() => {
      dataRefreshManager.refreshBalances('periodic-eth-check')
    }, 300000) // 增加到5分钟检查一次，最小化网络请求
    
    return () => clearInterval(balanceCheckInterval)
  }, [address])

  // 监听CCUSD代币余额变化 - 新增事件监听
  useWatchContractEvent({
    address: CCUSD_CONFIG.address,
    abi: CCUSD_CONFIG.abi,
    eventName: 'Transfer',
    onLogs: (logs) => {
      const userCCUSDTransferEvent = logs.find(log =>
        log.args.from === address || log.args.to === address
      )
      if (userCCUSDTransferEvent) {
        setLastUpdateTime(new Date())
                setTimeout(() => {
          dataRefreshManager.refreshBalances('ccusd-transfer-event')
        }, 800) // 减少延迟到0.8秒
      }
    },
    enabled: !!address,
  })

  // 监听APR变化事件 - 假设合约有APR更新事件
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    eventName: 'APRUpdated', // 假设的事件名称
    onLogs: (logs) => {
      if (logs.length > 0) {
        setLastUpdateTime(new Date())
                setTimeout(async () => {
          await refetchCurrentAPR()
        }, 800) // 减少延迟到0.8秒
      }
    },
    enabled: true, // APR变化影响所有用户
  })

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      alert(t('staking.errors.invalidAmount'))
      return
    }

    // 标记用户操作开始
    const actionStartTime = Date.now()
    setUserActionInProgress(true)
    setUserActionType('stake')
    setActionCompletionTime(actionStartTime)
    
    console.log('用户开始质押操作', { 
      actionStartTime, 
      amount: stakeAmount, 
      token: selectedOption,
      isForNFT 
    })
    
    
    // 注意：NFT检查已移到选择NFT选项时执行，避免重复触发

    // NFT质押金额验证
    if (isForNFT) {
      const selectedTierData = nftType === 'customer' 
        ? NFT_TIERS.find(tier => tier.tier === selectedTier)
        : PROVIDER_NFT_TIERS.find(tier => tier.tier === selectedProviderTier)
      
      const requiredAmount = selectedOption === 'cc' 
        ? selectedTierData.stakeCC 
        : selectedTierData.stakeETH
      
      if (parseFloat(stakeAmount) < parseFloat(requiredAmount)) {
        const nftTypeName = nftType === 'customer' ? t('staking.types.customer') : t('staking.types.provider')
        alert(t('staking.errors.insufficientStakeAmount', {
          tier: selectedTierData.name,
          nftType: nftTypeName,
          amount: requiredAmount,
          token: selectedOptionData.token
        }))
        return
      }

      // Provider NFT设备数量验证
      if (nftType === 'provider') {
        // 检查是否支持 ETH 质押
        if (selectedOption === 'eth') {
          alert('Provider NFT 不支持 ETH 质押，请选择 CC 代币进行质押')
          return
        }

        const deviceCount = selectedTierData.deviceCount
        const bonus = selectedTierData.bonus
        if (!confirm(t('staking.errors.providerNFTRequirements', {
          tier: selectedTierData.name,
          devices: deviceCount,
          bonus: bonus,
          amount: selectedTierData.stakeCC,
          token: 'CC'
        }))) {
          return
        }
      }
    }

    // 余额充足性验证
    if (selectedOption === 'cc') {
      const amountToStake = parseEther(stakeAmount)
      
      // 调试余额比较
      console.log('CC余额验证:', {
        ccBalance,
        ccBalanceType: typeof ccBalance,
        amountToStake,
        amountToStakeType: typeof amountToStake,
        isSufficient: ccBalance >= amountToStake,
        formattedBalance: formatCCBalance(ccBalance),
        formattedAmount: stakeAmount
      })
            
      if (ccBalance < amountToStake) {
        alert(t('staking.errors.insufficientCCBalance', {
          balance: formatCCBalance(ccBalance),
          amount: stakeAmount
        }))
        return
      }
    } else {
      const amountToStake = parseEther(stakeAmount)
            
      if (!ethBalance || ethBalance.value < amountToStake) {
        alert(t('staking.errors.insufficientETHBalance', {
          balance: formatEther(ethBalance.value || 0n),
          amount: stakeAmount
        }))
        return
      }
    }

    try {
      if (selectedOption === 'cc') {
        const amountToStake = parseEther(stakeAmount)
        
        // 验证NFT要求
        if (isForNFT) {
          const isValid = validateNFTRequirements(
            nftType === 'customer' ? selectedTier : selectedProviderTier,
            nftType,
            selectedOption,
            stakeAmount
          )
          
          if (!isValid) {
            alert(t('staking.alerts.insufficientStakeForNFT'))
            return
          }
        }
        
        // 检查是否需要授权
        if (!ccAllowance || ccAllowance < amountToStake) {
          if (!confirm(t('staking.errors.ccAuthorizationRequired', { amount: stakeAmount }))) {
            return
          }
          
          try {
            await approveCC({
              address: CONTRACT_ADDRESSES.CC_TOKEN,
              abi: CONTRACT_ABI.CC_TOKEN_ABI,
              functionName: 'approve',
              args: [CONTRACT_ADDRESSES.STAKING_POOL, amountToStake],
              gas: Math.floor(GAS_LIMITS.APPROVE * GAS_LIMITS.BUFFER),
            })
            
            // 等待授权完成后再继续质押
            alert(t('staking.authorizationSuccessPrompt'))
            
            // 延迟刷新授权状态
            setTimeout(async () => {
              await refetchCCAllowance()
              // 授权完成后自动执行质押
              try {
                                
                // 执行CC质押 - 根据是否铸造NFT设置不同参数
                if (isForNFT) {
                  if (nftType === 'customer') {
                    // 铸造Customer NFT
                    await stakeCC({
                      address: CONTRACT_ADDRESSES.STAKING_POOL,
                      abi: CONTRACT_ABI.STAKING_POOL_ABI,
                      functionName: 'stakeCC',
                      args: [amountToStake, true, selectedTier, 0], // amount, isForNFT, customerTier, providerTier (uint8 values are correct for enum)
                      gas: Math.floor(GAS_LIMITS.STAKE_FOR_NFT * GAS_LIMITS.BUFFER),
                    })
                  } else {
                    // 铸造Provider NFT
                    await stakeCC({
                      address: CONTRACT_ADDRESSES.STAKING_POOL,
                      abi: CONTRACT_ABI.STAKING_POOL_ABI,
                      functionName: 'stakeCC',
                      args: [amountToStake, true, 0, selectedProviderTier], // amount, isForNFT, customerTier, providerTier
                      gas: Math.floor(GAS_LIMITS.STAKE_FOR_NFT * GAS_LIMITS.BUFFER),
                    })
                  }
                } else {
                  // 普通CC质押
                  await stakeCC({
                    address: CONTRACT_ADDRESSES.STAKING_POOL,
                    abi: CONTRACT_ABI.STAKING_POOL_ABI,
                    functionName: 'stakeCC',
                    args: [amountToStake, false, 0, 0], // amount, isForNFT, customerTier, providerTier
                    gas: Math.floor(GAS_LIMITS.STAKE * GAS_LIMITS.BUFFER),
                  })
                }
              } catch (stakeError) {
                console.error('Staking failed:', stakeError)
                // 重置用户操作状态
                setUserActionInProgress(false)
                setUserActionType(null)
                
                let errorMessage = t('staking.alerts.stakingFailed')
                if (stakeError.message?.includes('Internal JSON-RPC error')) {
                  errorMessage = t('staking.alerts.contractCallFailed')
                } else if (stakeError.message?.includes('reverted')) {
                  errorMessage = t('staking.alerts.contractExecutionFailed')
                } else if (stakeError.message?.includes('ERC20: transfer amount exceeds balance')) {
                  errorMessage = t('staking.alerts.erc20BalanceExceeded')
                } else if (stakeError.message?.includes('ERC20: insufficient allowance')) {
                  errorMessage = t('staking.alerts.erc20AllowanceInsufficient')
                } else if (stakeError.message) {
                  errorMessage = t('staking.alerts.stakingFailedWithMessage', { message: stakeError.message })
                }
                alert(errorMessage)
              }
            }, 3000) // 等待3秒确保授权完成
            
            return
          } catch (approveError) {
            console.error('Authorization failed:', approveError)
            // 重置用户操作状态
            setUserActionInProgress(false)
            setUserActionType(null)
            
            let errorMessage = t('staking.alerts.authorizationFailed')
            if (approveError.message?.includes('User rejected')) {
              errorMessage = t('staking.alerts.authorizationRejected')
            } else if (approveError.message) {
              errorMessage = t('staking.alerts.authorizationFailedWithMessage', { message: approveError.message })
            }
            alert(errorMessage)
            return
          }
        }
        
        // 提前验证用户CC代币余额是否足够
        const userCcBalance = ccBalance || BigInt(0)
        if (userCcBalance < amountToStake) {
          const userBalanceFormatted = formatUnits(userCcBalance, 18)
          const requiredFormatted = formatUnits(amountToStake, 18)
          alert(t('staking.alerts.insufficientCCBalanceForStake', { balance: userBalanceFormatted, amount: requiredFormatted }))
          return
        }
        
        // 重新检查授权状态
        const currentAllowance = await refetchCCAllowance()
        
        // 如果授权不足，先授权
        if (!currentAllowance || currentAllowance < amountToStake) {
          await approveCC({
            address: CONTRACT_ADDRESSES.CC_TOKEN,
            abi: CONTRACT_ABI.CC_TOKEN_ABI,
            functionName: 'approve',
            args: [CONTRACT_ADDRESSES.STAKING_POOL, amountToStake],
            gas: Math.floor(GAS_LIMITS.APPROVE * GAS_LIMITS.BUFFER),
          })
          
          // 等待授权完成
          await new Promise(resolve => setTimeout(resolve, 3000))
          await refetchCCAllowance()
        }
        
        // 执行CC质押 - 根据是否铸造NFT设置不同参数
        if (isForNFT) {
          if (nftType === 'customer') {
            // 铸造Customer NFT
            await stakeCC({
              address: CONTRACT_ADDRESSES.STAKING_POOL,
              abi: CONTRACT_ABI.STAKING_POOL_ABI,
              functionName: 'stakeCC',
              args: [amountToStake, true, selectedTier, 0], // amount, isForNFT, customerTier, providerTier
              gas: Math.floor(GAS_LIMITS.STAKE_FOR_NFT * GAS_LIMITS.BUFFER),
            })
          } else {
            // 铸造Provider NFT
            await stakeCC({
              address: CONTRACT_ADDRESSES.STAKING_POOL,
              abi: CONTRACT_ABI.STAKING_POOL_ABI,
              functionName: 'stakeCC',
              args: [amountToStake, true, 0, selectedProviderTier], // amount, isForNFT, customerTier, providerTier
              gas: Math.floor(GAS_LIMITS.STAKE_FOR_NFT * GAS_LIMITS.BUFFER),
            })
          }
        } else {
          // 普通CC质押
          await stakeCC({
            address: CONTRACT_ADDRESSES.STAKING_POOL,
            abi: CONTRACT_ABI.STAKING_POOL_ABI,
            functionName: 'stakeCC',
            args: [amountToStake, false, 0, 0], // amount, isForNFT, customerTier, providerTier
            gas: Math.floor(GAS_LIMITS.STAKE * GAS_LIMITS.BUFFER),
          })
        }
      } else {
        // 执行ETH质押 - 根据是否铸造NFT调用不同函数
        const amountToStake = parseEther(stakeAmount)
        
        // 提前验证用户ETH余额是否足够
        const userEthBalance = ethBalance?.value || BigInt(0)
        if (userEthBalance < amountToStake) {
          const userBalanceFormatted = formatEther(userEthBalance)
          const requiredFormatted = stakeAmount
          alert(t('staking.alerts.insufficientETHBalanceForStake', { balance: userBalanceFormatted, amount: requiredFormatted }))
          return
        }
        
                
        // 验证NFT要求
        if (isForNFT) {
          const isValid = validateNFTRequirements(
            nftType === 'customer' ? selectedTier : selectedProviderTier,
            nftType,
            selectedOption,
            stakeAmount
          )
          
          if (!isValid) {
            alert(t('staking.alerts.insufficientStakeForNFT'))
            return
          }
        }
        
        if (isForNFT) {
          if (nftType === 'customer') {
            // 铸造Customer NFT
            await stakeETH({
              address: CONTRACT_ADDRESSES.STAKING_POOL,
              abi: CONTRACT_ABI.STAKING_POOL_ABI,
              functionName: 'stakeETH',
              args: [true, selectedTier, 0], // isForNFT, customerTier, providerTier
              value: amountToStake,
              gas: Math.floor(GAS_LIMITS.STAKE_FOR_NFT * GAS_LIMITS.BUFFER),
            })
          } else {
            // 铸造Provider NFT (仅Gold等级支持ETH)
            await stakeETH({
              address: CONTRACT_ADDRESSES.STAKING_POOL,
              abi: CONTRACT_ABI.STAKING_POOL_ABI,
              functionName: 'stakeETH',
              args: [true, 0, selectedProviderTier], // isForNFT, customerTier, providerTier
              value: amountToStake,
              gas: Math.floor(GAS_LIMITS.STAKE_FOR_NFT * GAS_LIMITS.BUFFER),
            })
          }
        } else {
          // 普通ETH质押
          await stakeETH({
            address: CONTRACT_ADDRESSES.STAKING_POOL,
            abi: CONTRACT_ABI.STAKING_POOL_ABI,
            functionName: 'stakeETH',
            args: [false, 0, 0], // isForNFT, customerTier, providerTier
            value: amountToStake,
            gas: Math.floor(GAS_LIMITS.STAKE * GAS_LIMITS.BUFFER),
          })
        }
      }
    } catch (error) {
      console.error('Staking failed:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        data: error.data,
        cause: error.cause,
        shortMessage: error.shortMessage
      })
      
      // 重置用户操作状态
      setUserActionInProgress(false)
      setUserActionType(null)
      
      // 检查是否是授权问题
      if (selectedOption === 'cc') {
        const amountToStake = parseEther(stakeAmount)
                
        // 检查余额是否足够
        if (!ccBalance || ccBalance < amountToStake) {
          alert(t('staking.alerts.insufficientCCBalance', {
            balance: formatCCBalance(ccBalance),
            amount: stakeAmount
          }))
          return
        }
        
        // 检查授权是否足够
        if (!ccAllowance || ccAllowance < amountToStake) {
          alert(t('staking.alerts.insufficientCCAllowance', {
            allowance: formatCCBalance(ccAllowance),
            amount: stakeAmount
          }))
          return
        }
      }
      
      let errorMessage = t('staking.alerts.stakingFailed')
      if (error.message?.includes('Cannot use \'in\' operator')) {
        errorMessage = t('staking.alerts.networkError')
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = t('staking.alerts.insufficientFunds')
      } else if (error.message?.includes('Internal JSON-RPC error')) {
        // 为Internal JSON-RPC错误提供更详细的信息
        if (selectedOption === 'eth' && isForNFT && nftType === 'customer') {
          errorMessage = t('staking.consoleErrors.ethStakingCustomerNFTFailed', { amount: stakeAmount })
        } else {
          errorMessage = t('staking.alerts.contractCallFailed')
        }
      } else if (error.message?.includes('reverted')) {
        errorMessage = t('staking.alerts.contractExecutionFailed')
      } else if (error.message?.includes('ERC20: transfer amount exceeds balance')) {
        errorMessage = t('staking.alerts.erc20BalanceExceeded')
      } else if (error.message?.includes('ERC20: insufficient allowance')) {
        errorMessage = t('staking.alerts.erc20AllowanceInsufficient')
      } else if (error.message) {
        errorMessage = t('staking.alerts.stakingFailedWithMessage', { message: error.message })
      }
      alert(errorMessage)
      // 重置用户操作状态（已经在上面重置过了，这里确保状态正确）
      setUserActionInProgress(false)
      setUserActionType(null)
    }
  }

  const handleClaimRewards = async () => {
    if (!pendingRewards || pendingRewards === 0n) {
      alert(t('staking.errors.noRewardsToClaim'))
      return
    }

    // 额外验证：确保用户有活跃的质押
    if (!userStakes || userStakes.length === 0) {
      alert(t('staking.errors.noActiveStakes'))
      return
    }

    // 标记用户操作开始
    const actionStartTime = Date.now()
    setUserActionInProgress(true)
    setUserActionType('claim')
    setActionCompletionTime(actionStartTime)
    
    console.log('用户开始领取奖励操作', { actionStartTime, amount: formatEther(pendingRewards) })
    
    
    try {
      await claimRewards({
        address: CONTRACT_ADDRESSES.STAKING_POOL,
        abi: CONTRACT_ABI.STAKING_POOL_ABI,
        functionName: 'claimRewards',
        gas: Math.floor(GAS_LIMITS.CLAIM_REWARDS * GAS_LIMITS.BUFFER),
      })
    } catch (error) {
      console.error('Claim rewards failed:', error)
      alert(t('staking.errors.claimingRewardsFailed', { error: error.message }))
      // 重置用户操作状态
      setUserActionInProgress(false)
      setUserActionType(null)
    }
  }

  const stakingOptions = STAKING_OPTIONS(t)
  const selectedOptionData = stakingOptions.find(opt => opt.id === selectedOption)
  const selectedTierData = isForNFT 
    ? (nftType === 'customer' 
        ? NFT_TIERS.find(tier => tier.tier === selectedTier)
        : PROVIDER_NFT_TIERS.find(tier => tier.tier === selectedProviderTier))
    : null

  if (!isConnected) {
    return (
      <div className="space-y-16">
        {/* 连接钱包提示区域 */}
        <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-theme-bg to-emerald-50 dark:from-emerald-900/20 dark:via-theme-bg dark:to-emerald-900/20"></div>
          <div className="relative max-w-7xl mx-auto text-center">
            <div className="space-y-8">
              {/* 主标题 */}
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-full text-lg font-medium">
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                  <span>{t('staking.mining')}</span>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold text-theme-primary">
                  <span className="block">{t('staking.connectWallet')}</span>
                  <span className="block bg-gradient-to-r from-emerald-600 via-emerald-600 to-emerald-600 bg-clip-text text-transparent mt-2">
                    {t('staking.startStaking')}
                  </span>
                </h1>
                
                <p className="text-xl text-theme-secondary max-w-3xl mx-auto leading-relaxed">
                  {t('staking.description')}
                </p>
              </div>
              
              {/* 连接钱包按钮 */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="transform hover:scale-105 transition-all duration-200">
                  <WalletConnectButton
                    className="group relative bg-gradient-to-r from-emerald-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 功能介绍区域 */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-theme-primary mb-4">{t('staking.features.title')}</h2>
            <p className="text-xl text-theme-secondary max-w-3xl mx-auto">
              {t('staking.features.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <CurrencyDollarIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('staking.features.ccStaking.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('staking.features.ccStaking.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <ArrowTrendingUpIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('staking.features.ethStaking.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('staking.features.ethStaking.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <PhotoIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('staking.features.nftMinting.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('staking.features.nftMinting.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <ChartBarIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  4
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('staking.features.earningTracking.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('staking.features.earningTracking.description')}
              </p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 数据更新状态指示器 - 简化版本 */}
      {lastUpdateTime && (
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{t('staking.ui.currentAddress')}: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{t('staking.ui.dataUpdated', { time: lastUpdateTime.toLocaleTimeString() })}</span>
          </div>
        </div>
      )}

      {/* NFT 状态显示 */}
      {(customerNftBalance && customerNftBalance > 0) || (providerNftBalance && providerNftBalance > 0) ? (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('staking.nftStatus.title')}</h3>
          <div className="space-y-4">
            {/* Customer NFT 状态 */}
            {customerNftBalance && customerNftBalance > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <TrophyIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-800 dark:text-green-200">{t('staking.nftStatus.customerNFT')}</h4>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {t('staking.nftStatus.alreadyOwned')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                      ⚠️ {t('staking.nftStatus.mintingDisabled')}
                    </span>
                    <button
                      onClick={() => window.open(`/nft/customer/${customerNftTokenId}`, '_blank')}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
                      disabled={!customerNftTokenId}
                    >
                      {t('staking.nftStatus.viewDetails')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Provider NFT 状态 */}
            {providerNftBalance && providerNftBalance > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <BoltIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200">{t('staking.nftStatus.providerNFT')}</h4>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        {t('staking.nftStatus.alreadyOwned')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                      ⚠️ {t('staking.nftStatus.mintingDisabled')}
                    </span>
                    <button
                      onClick={() => window.open(`/nft/provider/${providerNftTokenId}`, '_blank')}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                      disabled={!providerNftTokenId}
                    >
                      {t('staking.nftStatus.viewDetails')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('staking.nftStatus.title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-400 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                  <TrophyIcon className="w-6 h-6 text-white opacity-50" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-600 dark:text-gray-400">{t('staking.nftStatus.customerNFT')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {t('staking.nftStatus.notOwned')}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-400 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                  <BoltIcon className="w-6 h-6 text-white opacity-50" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-600 dark:text-gray-400">{t('staking.nftStatus.providerNFT')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {t('staking.nftStatus.notOwned')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 奖励概览 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="card text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/25">
            <ArrowTrendingUpIcon className="w-8 h-8 text-white drop-shadow-md" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{currentAPR ? (Number(currentAPR) / 100).toFixed(1) : '8.0'}%</h3>
          <p className="text-gray-600 dark:text-gray-400">{t('staking.currentAPR')}</p>
        </div>
        
        <div className="card text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/25">
            <ClockIcon className="w-8 h-8 text-white drop-shadow-md" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isRewardsDataValid(pendingRewards, userStakes) 
                ? formatCCBalance(pendingRewards) 
                : '0.00000'} CC
            </h3>
          <p className="text-gray-600 dark:text-gray-400">{t('staking.pendingRewards')}</p>
          {isRewardsDataValid(pendingRewards, userStakes) && pendingRewards && pendingRewards > 0n && (
            <button
              onClick={handleClaimRewards}
              disabled={isClaimPending || isClaimLoading}
              className="mt-3 btn-primary text-sm"
            >
              {isClaimPending || isClaimLoading ? t('staking.claiming') : t('staking.claimRewards')}
            </button>
          )}
        </div>
        
        <div className="card text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/25">
            <CurrencyDollarIcon className="w-8 h-8 text-white drop-shadow-md" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{userStakes?.length || 0}</h3>
          <p className="text-gray-600 dark:text-gray-400">{t('staking.activeStakes')}</p>
        </div>

        <div className="card text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/25">
            <CurrencyDollarIcon className="w-8 h-8 text-white drop-shadow-md" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{formatCCBalance(ccBalance)}</h3>
          <p className="text-gray-600 dark:text-gray-400">{t('staking.ccBalance')}</p>
        </div>

        <div className="card text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/25">
            <ArrowTrendingUpIcon className="w-8 h-8 text-white drop-shadow-md" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{formatCCUSDBalance(usdcBalance)}</h3>
          <p className="text-gray-600 dark:text-gray-400">{t('staking.ccusdBalance')}</p>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg max-w-md mx-auto">
        {[
          { id: 'stake', name: t('staking.tabs.stake') },
          { id: 'rewards', name: t('staking.tabs.rewards') }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 rounded-md text-lg font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-emerald-500 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* 质押界面 */}
      {activeTab === 'stake' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 质押选项 */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('staking.selectMethod')}</h2>
            
            {stakingOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedOption === option.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${option.color} rounded-lg flex items-center justify-center`}>
                    <option.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{option.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">{option.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">{option.apy} {t('staking.ui.annualPercentage')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CurrencyDollarIcon className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-600">{t('staking.ui.minimumRequired', { amount: option.minAmount })} {option.token}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 质押表单 */}
          <div className="lg:col-span-2 card">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('staking.createStake')}</h2>
            
            <div className="space-y-6">
              {/* 质押数量 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('staking.stakeAmountPlaceholder', { token: selectedOptionData.token })}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder={t('staking.minAmount', { amount: selectedOptionData.minAmount })}
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">{selectedOptionData.token}</span>
                  </div>
                </div>
                
                {/* CC代币余额和授权状态提示 */}
                {selectedOption === 'cc' && (
                  <div className="mt-2 space-y-1">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('staking.balance.current', { balance: formatCCBalance(ccBalance) })}
                    </div>
                    {stakeAmount && (
                      <div>
                        {ccBalance && ccBalance >= parseEther(stakeAmount) ? (
                          <div className="flex items-center space-x-2 text-green-600 text-sm">
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>{t('staking.balance.sufficient')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-red-600 text-sm">
                            <ExclamationTriangleIcon className="w-4 h-4" />
                            <span>{t('staking.balance.insufficient')}</span>
                          </div>
                        )}
                        
                        {ccAllowance && ccAllowance >= parseEther(stakeAmount) ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-green-600 text-sm">
                              <CheckCircleIcon className="w-4 h-4" />
                              <span>{t('staking.balance.ccAuthorized')}</span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const amountToStake = parseEther(stakeAmount || '1000')
                                if (!confirm(t('staking.alerts.confirmReauthorization', { amount: stakeAmount || '1000' }))) {
                                  return
                                }
                                try {
                                  await approveCC({
                                    address: CONTRACT_ADDRESSES.CC_TOKEN,
                                    abi: CONTRACT_ABI.CC_TOKEN_ABI,
                                    functionName: 'approve',
                                    args: [CONTRACT_ADDRESSES.STAKING_POOL, amountToStake],
                                    gas: Math.floor(GAS_LIMITS.APPROVE * GAS_LIMITS.BUFFER),
                                  })
                                  alert(t('staking.alerts.reauthorizationSuccess'))
                                  refetchCCAllowance()
                                } catch (error) {
                                  console.error('Reauthorization failed:', error)
                                  alert(t('staking.alerts.reauthorizationFailed', { error: error.message }))
                                }
                              }}
                              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                            >
                              {t('staking.authorization.reauthorize')}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-yellow-600 text-sm">
                              <ExclamationTriangleIcon className="w-4 h-4" />
                              <span>{t('staking.balance.ccNeedsAuthorization')}</span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const amountToStake = parseEther(stakeAmount || '1000')
                                if (!confirm(t('staking.alerts.confirmAuthorization', { amount: stakeAmount || '1000' }))) {
                                  return
                                }
                                try {
                                  await approveCC({
                                    address: CONTRACT_ADDRESSES.CC_TOKEN,
                                    abi: CONTRACT_ABI.CC_TOKEN_ABI,
                                    functionName: 'approve',
                                    args: [CONTRACT_ADDRESSES.STAKING_POOL, amountToStake],
                                    gas: Math.floor(GAS_LIMITS.APPROVE * GAS_LIMITS.BUFFER),
                                  })
                                  alert(t('staking.alerts.authorizationSuccess'))
                                  refetchCCAllowance()
                                } catch (error) {
                                  console.error('Authorization failed:', error)
                                  alert(t('staking.alerts.authorizationFailed', { error: error.message }))
                                }
                              }}
                              className="text-xs px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                            >
                              {t('staking.authorization.authorizeNow')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* NFT铸造选项 */}
              <div className={`space-y-4 p-4 rounded-lg border-2 transition-all ${
                isForNFT 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-600' 
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
              }`}>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <div className="relative">
                <input
                  type="checkbox"
                  checked={isForNFT}
                  onChange={(e) => setIsForNFT(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-2 border-gray-400 dark:border-gray-500 rounded focus:ring-emerald-500 focus:ring-offset-emerald-100 bg-white dark:bg-gray-700 appearance-none checked:bg-emerald-600 checked:border-emerald-600 hover:border-gray-500 dark:hover:border-gray-400 cursor-pointer shadow-sm"
                />
                {isForNFT && (
                  <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
                  <span className={`font-medium ${
                    isForNFT 
                      ? 'text-emerald-800 dark:text-emerald-200' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>{t('staking.ui.stakeForNFTMinting')}</span>
                  <span className={`text-sm ml-2 ${
                    isForNFT 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>{t('staking.ui.nftBenefits')}</span>
                </label>

                {isForNFT && (
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">{t('staking.ui.selectNFTType')}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNftType('customer')}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          nftType === 'customer'
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <ShoppingCartIcon className="w-6 h-6 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">{t('staking.nftStatus.customerNFT')}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('staking.ui.customerNFTDescription')}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNftType('provider')}
                        disabled={selectedOption === 'eth'}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          nftType === 'provider'
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        } ${
                          selectedOption === 'eth'
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <CpuChipIcon className="w-6 h-6 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">{t('staking.nftStatus.providerNFT')}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('staking.ui.providerNFTDescription')}</p>
                      </button>
                    </div>
                  </div>
                )}

                {!isForNFT && (
                  <div className="text-sm text-gray-600 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                    <p className="font-medium text-emerald-800 dark:text-emerald-200">{t('staking.ui.normalStakingMode')}</p>
                    <p className="text-emerald-700 dark:text-emerald-300">{t('staking.ui.normalStakingDescription')}</p>
                  </div>
                )}

                {isForNFT && (
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">{t('staking.ui.selectNFTTier', { type: nftType === 'customer' ? t('staking.types.customer') : t('staking.types.provider') })}</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(nftType === 'customer' ? NFT_TIERS : PROVIDER_NFT_TIERS).map((tier) => {
                        const IconComponent = getTierIconLocal(tier.tier)
                        const isSelected = nftType === 'customer' ? selectedTier === tier.tier : selectedProviderTier === tier.tier
                        const handleSelect = nftType === 'customer' 
                          ? () => setSelectedTier(tier.tier)
                          : () => setSelectedProviderTier(tier.tier)
                        
                        return (
                          <button
                            key={tier.tier}
                            type="button"
                            onClick={handleSelect}
                            className={`p-2 rounded-lg border-2 text-center transition-all ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                          >
                            {/* 图标显示区域 */}
                            <div className={`w-8 h-8 bg-gradient-to-br ${tier.color} rounded-lg flex items-center justify-center mb-1 mx-auto shadow-md`}>
                              <IconComponent className="w-4 h-4 text-white drop-shadow-sm" />
                            </div>
                            
                            {/* 等级名称 */}
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1 text-xs">{tier.name}</h4>
                            
                            {/* 等级属性 */}
                            <div className="text-center">
                              {nftType === 'customer' ? (
                                <>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('staking.ui.discount')}: {tier.discount}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {t('staking.ui.required')}: {selectedOption === 'cc' ? tier.stakeCC : tier.stakeETH} {selectedOptionData.token}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('staking.ui.reward')}: {tier.bonus}</p>
                                  <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">{t('staking.ui.deviceRequirement', { count: tier.deviceCount })}</p>
                                  {selectedOption === 'eth' ? (
                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                      ❌ {t('staking.ui.providerNFTETHNotSupported')}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      {t('staking.ui.required')}: {tier.stakeCC} CC
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 预估收益 */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">{t('staking.ui.estimatedEarnings')}</h4>
                <div className="space-y-1 text-sm text-emerald-800 dark:text-emerald-200">
                  <p>{t('staking.ui.annualAPR', { rate: currentAPR ? (Number(currentAPR) / 100).toFixed(1) : '8.0' })}</p>
                  {stakeAmount && parseFloat(stakeAmount) > 0 && (
                    <p>
                      {t('staking.ui.dailyEarnings', {
                        amount: (parseFloat(stakeAmount) * (currentAPR ? Number(currentAPR) / 100 : 8) / 365).toFixed(5),
                        token: selectedOptionData.token
                      })}
                    </p>
                  )}
                  {isForNFT && selectedTierData && (
                    <p>
                      {nftType === 'customer' 
                        ? t('staking.ui.nftBenefitsCustomer', { discount: selectedTierData.discount })
                        : t('staking.ui.nftBenefitsProvider', { bonus: selectedTierData.bonus })
                      }
                    </p>
                  )}
                </div>
              </div>

              {/* 质押按钮 */}
              <button
                onClick={handleStake}
                disabled={!stakeAmount || isStakeCCPending || isStakeETHPending || isStakeCCLoading || isStakeETHLoading || isApprovePending}
                className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(() => {
              if (isApprovePending) {
                return t('staking.ui.stakeButtonAuthorizing')
              }
              if (isStakeCCPending || isStakeETHPending || isStakeCCLoading || isStakeETHLoading) {
                return t('staking.ui.stakeButtonStaking')
              }
              
              const buttonText = isForNFT 
                ? (selectedOption === 'cc' && ccAllowance && ccAllowance >= parseEther(stakeAmount || '0')
                    ? t('staking.ui.stakeButtonStakeAndMintAmount', { amount: stakeAmount, token: selectedOptionData.token })
                    : selectedOption === 'cc'
                        ? t('staking.ui.stakeButtonAuthorizeAndStakeAndMintAmount', { amount: stakeAmount, token: selectedOptionData.token })
                        : t('staking.ui.stakeButtonStakeAndMintAmount', { amount: stakeAmount, token: selectedOptionData.token }))
                : (selectedOption === 'cc' && ccAllowance && ccAllowance >= parseEther(stakeAmount || '0')
                    ? t('staking.ui.stakeButtonStake', { amount: stakeAmount, token: selectedOptionData.token })
                    : selectedOption === 'cc'
                        ? t('staking.ui.stakeButtonAuthorizeAndStakeAmount', { amount: stakeAmount, token: selectedOptionData.token })
                        : t('staking.ui.stakeButtonStake', { amount: stakeAmount, token: selectedOptionData.token }))
              
              return buttonText
            })()}
              </button>

              {/* 错误提示 */}
              {(stakeCCError || stakeETHError || stakeCCLoadingError || stakeETHLoadingError) && (
                <div className="flex items-center space-x-2 text-red-600 text-sm">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span>
                    {stakeCCLoadingError?.message || stakeETHLoadingError?.message || 
                     stakeCCError?.message || stakeETHError?.message}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    
  
          
          
  
      {/* 奖励记录 */}
      {activeTab === 'rewards' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('staking.ui.stakingRecords')}</h2>
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-5 h-5 text-emerald-600" />
              <span className="text-emerald-600 font-medium">{t('staking.ui.realTimeUpdate')}</span>
            </div>
          </div>
          
          {userStakes && userStakes.length > 0 ? (
            <div className="space-y-4">
              {userStakes.map((stake, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 bg-gradient-to-r ${
                        stake.assetType === 0 ? 'from-emerald-500 to-emerald-600' : 'from-emerald-500 to-emerald-600'
                      } rounded-lg flex items-center justify-center`}>
                        <CurrencyDollarIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {stake.assetType === 0 ? t('staking.ui.ethStakeRecord', { number: index + 1 }) : t('staking.ui.ccStakeRecord', { number: index + 1 })}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('staking.ui.startTime', { date: new Date(Number(stake.startTime) * 1000).toLocaleDateString() })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCCBalance(stake.amount)} {stake.assetType === 0 ? 'ETH' : 'CC'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('staking.ui.stakeAmountLabel')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {stake.isForNFT && (
                        <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs rounded-full">
                          {t('staking.ui.nftMintingLabel')}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs rounded-full">
                        {t('staking.ui.apyLabel')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span>{t('staking.ui.daysStaked', { days: Math.floor((Date.now() / 1000 - Number(stake.startTime)) / 86400) })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ClockIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('staking.ui.noStakingRecords')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{t('staking.ui.startStakingToEarn')}</p>
              <button
                onClick={() => setActiveTab('stake')}
                className="btn-primary"
              >
                {t('staking.ui.startStaking')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 交易状态提示 - 优化版本 */}
      {showStatus && transactionStatus && (
        <div 
          className={`fixed top-20 lg:top-24 xl:top-28 right-4 px-4 py-3 rounded-lg z-50 shadow-lg max-w-sm transition-all duration-300 transform ${
            transactionStatus.type === 'success' 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : transactionStatus.type === 'info'
                ? 'bg-blue-100 border border-blue-400 text-blue-700'
                : 'bg-red-100 border border-red-400 text-red-700'
          } animate-slide-in-right`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {transactionStatus.type === 'success' ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              ) : transactionStatus.type === 'info' ? (
                <InformationCircleIcon className="w-5 h-5 text-blue-500" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium">
                {transactionStatus.title}
              </h4>
              <p className="text-sm mt-1 opacity-90">
                {transactionStatus.message}
              </p>
              {transactionStatus.type === 'error' && (
                <p className="text-xs mt-2 opacity-75">
                  {t('staking.notifications.errorTip')}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setShowStatus(false)
                setTransactionStatus(null)
              }}
              className="ml-3 flex-shrink-0 hover:opacity-70 transition-opacity"
              title={t('staking.notifications.closeNotification')}
            >
              <XCircleIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* 自动消失进度条 */}
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                transactionStatus.type === 'success' ? 'bg-green-500' : transactionStatus.type === 'info' ? 'bg-blue-500' : 'bg-red-500'
              } animate-shrink`}
            ></div>
          </div>
        </div>
      )}
    </div>
  )
}