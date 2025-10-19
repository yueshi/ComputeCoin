import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, usePublicClient, useWatchContractEvent } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { formatEther, parseEther, parseUnits } from 'viem'
import { 
  PhotoIcon, 
  CurrencyDollarIcon, 
  SparklesIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  StarIcon,
  ShieldCheckIcon,
  TagIcon,
  GiftIcon,
  TrophyIcon,
  CpuChipIcon,
  FireIcon,
  BoltIcon,
  HeartIcon,
  StarIcon as StarIcon2,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  WalletIcon,
  ChartBarIcon,
  AcademicCapIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline'
import { CONTRACT_ADDRESSES, CONTRACT_ABI, APP_CONFIG, GAS_LIMITS } from '../config/contracts'
import { useActivityManager } from '../hooks/useActivityManager'

const NFT_TIERS = APP_CONFIG.nftTiers.customer
const PROVIDER_NFT_TIERS = APP_CONFIG.nftTiers.provider

// 网络名称映射
const getNetworkName = (chainId) => {
  const networks = {
    31337: 'Localhost',
    1337: 'Hardhat',
    80001: 'Polygon Mumbai',
    97: 'BSC Testnet',
    137: 'Polygon',
    56: 'BSC',
    1: 'Ethereum'
  }
  return networks[chainId] || `Chain ${chainId}`
}

export default function NFTManagement() {
  const { t } = useTranslation()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const [activeTab, setActiveTab] = useState('customer')
  const [selectedTier, setSelectedTier] = useState(0)
  const [paymentToken, setPaymentToken] = useState('usdc') // 'usdc' or 'cc'
  const [paymentAmount, setPaymentAmount] = useState('')
  const [selectedNFT, setSelectedNFT] = useState(null)
  const [showNFTDetails, setShowNFTDetails] = useState(false)
  
  // 计算选中的NFT等级数据
  const selectedTierData = NFT_TIERS[selectedTier]
  const selectedProviderTierData = PROVIDER_NFT_TIERS[selectedTier]
  
  // 事件驱动更新状态
  const [lastUpdateTime, setLastUpdateTime] = useState(null)
  
  // 交易状态管理 - 初始化时重置所有状态
  const [transactionStatus, setTransactionStatus] = useState(null)
  const [showStatus, setShowStatus] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 用于跟踪已处理的错误，避免重复通知
  const [processedErrors, setProcessedErrors] = useState(new Set())
  
  // 活动记录管理
  const { addMintNFTActivity } = useActivityManager()

  // 跟踪页面加载时间和通知状态
  const [pageLoadTime, setPageLoadTime] = useState(Date.now())
  const [recentEvents, setRecentEvents] = useState(new Set())
  const [lastNotificationTime, setLastNotificationTime] = useState(0)
  
  // 用户操作状态跟踪
  const [userActionInProgress, setUserActionInProgress] = useState(false)
  const [userActionType, setUserActionType] = useState(null)
  const [actionCompletionTime, setActionCompletionTime] = useState(null)

  // 页面初始化时重置所有通知状态 - 使用更强的保护
  useEffect(() => {
    const pageKey = 'nft-page-loaded'
    const currentPageLoad = Date.now()
    const lastPageLoad = sessionStorage.getItem(pageKey)
    
    // 如果是首次加载或者距离上次加载超过5秒，认为是新会话
    const isNewSession = !lastPageLoad || (currentPageLoad - parseInt(lastPageLoad)) > 5000
    
    // 设置页面加载时间
    setPageLoadTime(currentPageLoad)
    
    if (isNewSession) {
      // 强制重置所有交易相关状态
      setTransactionStatus(null)
      setShowStatus(false)
      setIsProcessing(false)
      setProcessedErrors(new Set())
      setRecentEvents(new Set())
      setLastNotificationTime(0)
      setUserActionInProgress(false)
      setUserActionType(null)
      setActionCompletionTime(null)
      
      // 记录当前加载时间
      sessionStorage.setItem(pageKey, currentPageLoad.toString())
      sessionStorage.setItem('nft-page-load-time', currentPageLoad.toString())
      sessionStorage.setItem('nft-page-action-time', '0')
      
      console.log('NFT管理页面新会话初始化，已重置所有通知状态')
    } else {
      // 即使是同一会话，也确保通知状态被重置
      setShowStatus(false)
      setTransactionStatus(null)
      setIsProcessing(false)
      setRecentEvents(new Set())
      setLastNotificationTime(0)
      setUserActionInProgress(false)
      setUserActionType(null)
      
      console.log('NFT管理页面同一会话，已重置显示状态')
    }
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
      setUserActionInProgress(false)
      setUserActionType(null)
      console.log(t('wallet.walletAddressChanged', { page: 'NFT' }))
    }
  }, [address])

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
    }, 60000) // 每分钟清理一次
    
    return () => clearInterval(cleanupInterval)
  }, [])

  // 组件卸载时清理状态
  useEffect(() => {
    return () => {
      setTransactionStatus(null)
      setShowStatus(false)
      setIsProcessing(false)
      setProcessedErrors(new Set())
      setRecentEvents(new Set())
      setLastNotificationTime(0)
      setUserActionInProgress(false)
      setUserActionType(null)
      console.log('NFT管理页面卸载，已清理通知状态')
    }
  }, [])

  
  // 批量数据刷新工具函数
  const batchRefresh = async (refreshFunctions, context = 'event') => {
    try {
      console.log(`批量数据刷新开始 (${context}): 刷新${refreshFunctions.length}项数据`)
      await Promise.all(refreshFunctions)
      console.log(`批量数据刷新完成 (${context})`)
    } catch (error) {
      console.error(`批量数据刷新失败 (${context}):`, error)
      throw error
    }
  }

  // 智能初始化数据加载 - 只在组件首次挂载或钱包连接时执行
  useEffect(() => {
    if (address && !isLoading) {
      const loadInitialData = async () => {
        try {
          console.log('开始NFT页面初始数据加载...')
          await Promise.all([
            refetchCustomerBalance(),
            refetchProviderBalance()
          ])
          console.log('NFT页面初始数据加载完成')
        } catch (error) {
          console.error('NFT页面初始数据加载失败:', error)
        }
      }
      
      // 延迟执行以确保所有hook都已准备就绪
      const timer = setTimeout(loadInitialData, 500)
      return () => clearTimeout(timer)
    }
  }, [address]) // 只依赖address，确保只在钱包连接变化时执行

  // 读取客户NFT余额 - 优化版本：事件驱动更新
  const { data: customerNFTBalance, refetch: refetchCustomerBalance, isLoading, isError, error } = useReadContract({
    address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
    abi: CONTRACT_ABI.CUSTOMER_NFT_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
    query: {
      retry: false,
      staleTime: 60000, // 增加缓存时间到60秒
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    }
  })
  
  
  // 读取提供商NFT余额 - 优化版本：事件驱动更新
  const { data: providerNFTBalance, refetch: refetchProviderBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.PROVIDER_NFT,
    abi: CONTRACT_ABI.PROVIDER_NFT_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
    query: {
      retry: false,
      staleTime: 60000, // 1分钟缓存
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  })

  // 读取用户的客户NFT列表
  const [customerNFTs, setCustomerNFTs] = useState([])
  const [providerNFTs, setProviderNFTs] = useState([])

  // 读取用户CC代币余额 - 优化版本：事件驱动更新
  const { data: ccBalance, refetch: refetchCCBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
    query: {
      retry: false,
      staleTime: 30000, // 30秒缓存
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  })

  // 读取用户CCUSD代币余额 - 优化版本：事件驱动更新
  const { data: usdcBalance, refetch: refetchCCUSDBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.CCSD_TOKEN,
    abi: CONTRACT_ABI.CCSD_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
    query: {
      retry: false,
      staleTime: 60000, // 1分钟缓存
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  })

  // 获取用户所有客户NFT的详细信息
  useEffect(() => {
    const fetchCustomerNFTs = async () => {
      if (!address || !customerNFTBalance || Number(customerNFTBalance) === 0) {
        setCustomerNFTs([])
        return
      }
      
      const nfts = []
      try {
        // 批量获取所有tokenId
        const tokenIds = []
        for (let i = 0; i < Number(customerNFTBalance); i++) {
          try {
            const tokenId = await publicClient.readContract({
              address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
              abi: CONTRACT_ABI.CUSTOMER_NFT_ABI,
              functionName: 'tokenOfOwnerByIndex',
              args: [address, i],
            })
            tokenIds.push(tokenId)
          } catch (error) {
            // 忽略单个token获取失败
          }
        }

        // 批量获取每个token的详细信息
        for (const tokenId of tokenIds) {
          try {
            // 使用正确的合约函数
            let nftInfo, monthlyReward, owner
            
            try {
              nftInfo = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
                abi: CONTRACT_ABI.CUSTOMER_NFT_ABI,
                functionName: 'getNFTInfo',
                args: [tokenId],
              })
            } catch (error) {
              continue // 跳过这个 token
            }
            
            // getNFTInfo返回 (tier, discount, monthlyReward)
            const tier = nftInfo[0]
            const discount = nftInfo[1]
            monthlyReward = nftInfo[2]
            
            try {
              owner = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
                abi: CONTRACT_ABI.CUSTOMER_NFT_ABI,
                functionName: 'ownerOf',
                args: [tokenId],
              })
            } catch (error) {
              continue
            }
            
            // 计算节省金额 (基于月度奖励的年化节省)
            const annualSavings = monthlyReward * BigInt(12)
            const discountValue = Number(discount) / 100
            
            // 获取NFT等级名称和颜色
            const tierData = NFT_TIERS[Number(tier)]
            
            nfts.push({
              tokenId: tokenId.toString(),
              tier: Number(tier),
              tierName: tierData?.name || 'UNKNOWN',
              discount: discountValue,
              monthlyReward: formatCC(monthlyReward),
              owner,
              annualSavings: formatCC(annualSavings),
              estimatedValue: (discountValue * 100).toFixed(1),
              type: 'customer',
              mintedAt: new Date().toISOString(), // 简化显示，实际应从链上获取
              isActive: true,
              // 额外详细信息
              contractAddress: CONTRACT_ADDRESSES.CUSTOMER_NFT,
              network: getNetworkName(chainId),
              tokenStandard: 'ERC-721',
              benefits: [
                t('nft.management.modal.benefitDiscount', { discount: discountValue }),
                t('nft.management.modal.benefitMonthlyReward', { reward: formatCC(monthlyReward) }),
                t('nft.management.modal.benefitPriorityAccess')
              ]
            })
          } catch (error) {
            // 忽略单个token详情获取失败
          }
        }
      } catch (error) {
        console.error('Error fetching customer NFTs:', error)
      }
      
      setCustomerNFTs(nfts)
    }

    fetchCustomerNFTs()
  }, [address, customerNFTBalance, chainId])

  // 获取用户所有提供商NFT的详细信息
  useEffect(() => {
    const fetchProviderNFTs = async () => {
      if (!address || !providerNFTBalance || Number(providerNFTBalance) === 0) {
        setProviderNFTs([])
        return
      }
      
      const nfts = []
      try {
        // 批量获取所有tokenId
        const tokenIds = []
        for (let i = 0; i < Number(providerNFTBalance); i++) {
          try {
            const tokenId = await publicClient.readContract({
              address: CONTRACT_ADDRESSES.PROVIDER_NFT,
              abi: CONTRACT_ABI.PROVIDER_NFT_ABI,
              functionName: 'tokenOfOwnerByIndex',
              args: [address, i],
            })
            tokenIds.push(tokenId)
          } catch (error) {
            // 忽略单个token获取失败
          }
        }

        // 批量获取每个token的详细信息
        for (const tokenId of tokenIds) {
          try {
            // 使用正确的合约函数
            let nftInfo, owner, providerStats
            
            try {
              nftInfo = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.PROVIDER_NFT,
                abi: CONTRACT_ABI.PROVIDER_NFT_ABI,
                functionName: 'getNFTInfo',
                args: [tokenId],
              })
            } catch (error) {
              continue
            }
            
            // getNFTInfo返回 (tier, bonusMultiplier, deviceRequirement)
            const tier = nftInfo[0]
            const multiplier = nftInfo[1]
            const deviceRequirement = nftInfo[2]
            
            try {
              owner = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.PROVIDER_NFT,
                abi: CONTRACT_ABI.PROVIDER_NFT_ABI,
                functionName: 'ownerOf',
                args: [tokenId],
              })
            } catch (error) {
              continue
            }
            
            try {
              providerStats = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.PROVIDER_NFT,
                abi: CONTRACT_ABI.PROVIDER_NFT_ABI,
                functionName: 'getProviderStats',
                args: [owner], // getProviderStats需要address参数，不是tokenId
              })
            } catch (error) {
              providerStats = { completedJobs: 0, totalRewards: 0, qualityScore: 0 }
            }
            
            const multiplierValue = Number(multiplier) / 10000
            const bonusPercentage = ((multiplierValue - 1) * 100).toFixed(1)
            
            // 使用从getNFTInfo获取的实际tier
            const tierNumber = Number(tier)
            const tierData = PROVIDER_NFT_TIERS[tierNumber - 1]
            
            nfts.push({
              tokenId: tokenId.toString(),
              multiplier: multiplierValue,
              bonusPercentage,
              owner,
              tier: tierNumber,
              tierName: tierData?.name || 'UNKNOWN',
              type: 'provider',
              estimatedDailyRewards: formatCC(BigInt(Math.floor(1000000 * multiplierValue / 365))), // 基于日奖励池估算
              isActive: true,
              mintedAt: new Date().toISOString(), // 简化显示，实际应从链上获取
              // 额外详细信息
              contractAddress: CONTRACT_ADDRESSES.PROVIDER_NFT,
              network: getNetworkName(chainId),
              tokenStandard: 'ERC-721',
              // 提供商统计信息
              completedJobs: providerStats?.completedJobs?.toString() || '0',
              totalRewards: formatCC(providerStats?.totalRewards || '0'),
              qualityScore: providerStats?.qualityScore?.toString() || '0',
              // NFT数据 - 需要从getNFTInfo获取
              activationTime: '0', // 需要额外查询
              lastActiveTime: '0', // 需要额外查询
              benefits: [
                t('nft.management.modal.benefitBonus', { bonus: bonusPercentage }),
                t('nft.management.modal.benefitPriorityTasks'),
                t('nft.management.modal.benefitQualityRating'),
                t('nft.management.modal.benefitExclusiveSupport')
              ]
            })
          } catch (error) {
            // 忽略单个token详情获取失败
          }
        }
      } catch (error) {
        console.error('Error fetching provider NFTs:', error)
      }
      
      setProviderNFTs(nfts)
    }

    fetchProviderNFTs()
  }, [address, providerNFTBalance, chainId])

  // 铸造客户NFT
  const { 
    writeContract: mintCustomerNFT, 
    data: mintCustomerHash,
    isPending: isMintCustomerPending 
  } = useWriteContract()

  // 铸造提供商NFT
  const { 
    writeContract: mintProviderNFT, 
    data: mintProviderHash,
    isPending: isMintProviderPending 
  } = useWriteContract()

  const { isLoading: isMintCustomerLoading } = useWaitForTransactionReceipt({
    hash: mintCustomerHash,
  })

  const { isLoading: isMintProviderLoading } = useWaitForTransactionReceipt({
    hash: mintProviderHash,
  })

  // 交易状态处理 - NFT页面版本
  useEffect(() => {
    const handleTransactionStatus = async () => {
      // 防止重复处理
      if (isProcessing) return
      
      // 处理客户NFT铸造成功
      if (isMintCustomerLoading && userActionType === 'mint-customer') {
        setIsProcessing(true)
        try {
          setTransactionStatus({
            type: 'success',
            title: t('nft.shared.success.nftMinting'),
            message: `正在铸造客户NFT，等级：${selectedTierData?.name || 'UNKNOWN'}`,
            action: { type: 'mint-customer', tier: selectedTier.toString() }
          })
          setShowStatus(true)
          console.log('NFT铸造状态：客户NFT铸造中')
        } catch (error) {
          console.error('设置客户NFT铸造状态失败:', error)
        }
      }
      
      // 处理提供商NFT铸造成功
      if (isMintProviderLoading && userActionType === 'mint-provider') {
        setIsProcessing(true)
        try {
          setTransactionStatus({
            type: 'success',
            title: t('nft.shared.success.nftMinting'),
            message: `正在铸造提供商NFT，等级：${selectedProviderTierData?.name || 'UNKNOWN'}`,
            action: { type: 'mint-provider', tier: selectedTier.toString() }
          })
          setShowStatus(true)
          console.log('NFT铸造状态：提供商NFT铸造中')
        } catch (error) {
          console.error('设置提供商NFT铸造状态失败:', error)
        }
      }
      
      // 交易确认完成后隐藏状态，等待事件监听器显示最终成功通知
      if (!isMintCustomerLoading && !isMintProviderLoading && isProcessing) {
        setTimeout(() => {
          setIsProcessing(false)
        }, 2000) // 延迟重置，给事件监听器时间处理
      }
    }
    
    handleTransactionStatus()
  }, [isMintCustomerLoading, isMintProviderLoading, userActionType, selectedTier, selectedTierData, selectedProviderTierData, isProcessing])

  // 监听NFT铸造事件 - 客户NFT
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
    abi: CONTRACT_ABI.CUSTOMER_NFT_ABI,
    eventName: 'NFTMinted',
    onLogs: (logs) => {
      const currentTime = Date.now()
      const userActionTime = sessionStorage.getItem('nft-page-action-time') || '0'
      const userActionTimeNum = parseInt(userActionTime)
      const pageTime = sessionStorage.getItem('nft-page-load-time') || pageLoadTime.toString()
      
      console.log('客户NFT铸造事件监听:', {
        currentTime: new Date(currentTime),
        userActionTime: new Date(userActionTimeNum),
        pageTime: new Date(parseInt(pageTime)),
        userActionInProgress,
        userActionType,
        logs: logs.length
      })
      
      for (const log of logs) {
        if (log.args.user === address) {
          const eventTime = Number(log.args.timestamp || (Date.now() / 1000))
          const timeDiff = currentTime - userActionTimeNum
          const timeSincePageLoad = currentTime - parseInt(pageTime)
          const timeSinceLastNotification = currentTime - lastNotificationTime
          const notificationCooldown = 3000 // 3秒冷却时间
          
          // 创建唯一事件标识符
          const eventId = `customer-mint-${log.transactionHash}-${log.logIndex || 0}`
          
          // 检查是否应该显示通知
          const shouldShowNotification = 
            userActionInProgress && // 用户必须正在进行操作
            userActionType === 'mint-customer' && // 操作类型必须匹配
            eventTime > (userActionTimeNum / 1000) && // 事件必须在用户操作之后
            eventTime > (parseInt(pageTime) / 1000) && // 事件必须在页面加载之后
            timeDiff < 60000 && // 事件必须在用户操作60秒内
            timeSinceLastNotification > notificationCooldown && // 距离上次通知超过冷却时间
            !recentEvents.has(eventId) // 事件未被处理过
          
          console.log('客户NFT铸造通知判断:', {
            shouldShowNotification,
            eventTime: new Date(eventTime * 1000),
            userActionTimeNum,
            timeDiff,
            timeSincePageLoad,
            timeSinceLastNotification,
            eventId,
            recentEventsSize: recentEvents.size
          })
          
          if (shouldShowNotification) {
            // 标记事件为已处理
            setRecentEvents(prev => new Set(prev).add(eventId))
            setLastNotificationTime(currentTime)
            
            // 显示成功通知
            setTransactionStatus({
              type: 'success',
              title: t('nft.shared.success.nftMintedSuccessfully'),
              message: `成功铸造客户NFT，等级：${NFT_TIERS[log.args.tier - 1]?.name || 'UNKNOWN'}`,
              action: { type: 'mint-customer', tier: log.args.tier.toString() }
            })
            setShowStatus(true)
            
            // 添加活动记录
            addMintNFTActivity({
              type: 'customer',
              tier: log.args.tier.toString(),
              txHash: log.transactionHash
            })
            
            // 重置用户操作状态
            setUserActionInProgress(false)
            setUserActionType(null)
            setActionCompletionTime(null)
            sessionStorage.setItem('nft-page-action-time', '0')
            
            console.log('显示客户NFT铸造成功通知')
            
            // 刷新数据
            setTimeout(async () => {
              try {
                await batchRefresh([
                  refetchCustomerBalance(),
                  refetchCCBalance(),
                  refetchCCUSDBalance()
                ], 'nft-mint-customer')
                console.log('客户NFT铸造后数据刷新完成')
              } catch (error) {
                console.error('客户NFT铸造后数据刷新失败:', error)
              }
            }, 1000)
            
            // 3秒后自动隐藏通知
            setTimeout(() => {
              setShowStatus(false)
              setTransactionStatus(null)
            }, 3000)
          }
        }
      }
    },
    enabled: !!address,
  })

  // 监听NFT铸造事件 - 提供商NFT
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.PROVIDER_NFT,
    abi: CONTRACT_ABI.PROVIDER_NFT_ABI,
    eventName: 'ProviderNFTMinted',
    onLogs: (logs) => {
      const currentTime = Date.now()
      const userActionTime = sessionStorage.getItem('nft-page-action-time') || '0'
      const userActionTimeNum = parseInt(userActionTime)
      const pageTime = sessionStorage.getItem('nft-page-load-time') || pageLoadTime.toString()
      
      console.log('提供商NFT铸造事件监听:', {
        currentTime: new Date(currentTime),
        userActionTime: new Date(userActionTimeNum),
        pageTime: new Date(parseInt(pageTime)),
        userActionInProgress,
        userActionType,
        logs: logs.length
      })
      
      for (const log of logs) {
        if (log.args.provider === address) {
          const eventTime = Number(log.args.timestamp || (Date.now() / 1000))
          const timeDiff = currentTime - userActionTimeNum
          const timeSincePageLoad = currentTime - parseInt(pageTime)
          const timeSinceLastNotification = currentTime - lastNotificationTime
          const notificationCooldown = 3000 // 3秒冷却时间
          
          // 创建唯一事件标识符
          const eventId = `provider-mint-${log.transactionHash}-${log.logIndex || 0}`
          
          // 检查是否应该显示通知
          const shouldShowNotification = 
            userActionInProgress && // 用户必须正在进行操作
            userActionType === 'mint-provider' && // 操作类型必须匹配
            eventTime > (userActionTimeNum / 1000) && // 事件必须在用户操作之后
            eventTime > (parseInt(pageTime) / 1000) && // 事件必须在页面加载之后
            timeDiff < 60000 && // 事件必须在用户操作60秒内
            timeSinceLastNotification > notificationCooldown && // 距离上次通知超过冷却时间
            !recentEvents.has(eventId) // 事件未被处理过
          
          console.log('提供商NFT铸造通知判断:', {
            shouldShowNotification,
            eventTime: new Date(eventTime * 1000),
            userActionTimeNum,
            timeDiff,
            timeSincePageLoad,
            timeSinceLastNotification,
            eventId,
            recentEventsSize: recentEvents.size
          })
          
          if (shouldShowNotification) {
            // 标记事件为已处理
            setRecentEvents(prev => new Set(prev).add(eventId))
            setLastNotificationTime(currentTime)
            
            // 显示成功通知
            setTransactionStatus({
              type: 'success',
              title: t('nft.shared.success.nftMintedSuccessfully'),
              message: `成功铸造提供商NFT，等级：${PROVIDER_NFT_TIERS[log.args.tier - 1]?.name || 'UNKNOWN'}`,
              action: { type: 'mint-provider', tier: log.args.tier.toString() }
            })
            setShowStatus(true)
            
            // 添加活动记录
            addMintNFTActivity({
              type: 'provider',
              tier: log.args.tier.toString(),
              txHash: log.transactionHash
            })
            
            // 重置用户操作状态
            setUserActionInProgress(false)
            setUserActionType(null)
            setActionCompletionTime(null)
            sessionStorage.setItem('nft-page-action-time', '0')
            
            console.log('显示提供商NFT铸造成功通知')
            
            // 刷新数据
            setTimeout(async () => {
              try {
                await batchRefresh([
                  refetchProviderBalance(),
                  refetchCCBalance(),
                  refetchCCUSDBalance()
                ], 'nft-mint-provider')
                console.log('提供商NFT铸造后数据刷新完成')
              } catch (error) {
                console.error('提供商NFT铸造后数据刷新失败:', error)
              }
            }, 1000)
            
            // 3秒后自动隐藏通知
            setTimeout(() => {
              setShowStatus(false)
              setTransactionStatus(null)
            }, 3000)
          }
        }
      }
    },
    enabled: !!address,
  })

  const handleMintCustomerNFT = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert(t('nft.shared.errors.invalidPaymentAmount'))
      return
    }

    // 标记用户操作开始
    const actionStartTime = Date.now()
    setUserActionInProgress(true)
    setUserActionType('mint-customer')
    setActionCompletionTime(actionStartTime)
    
    // 记录操作时间到sessionStorage，用于事件过滤
    sessionStorage.setItem('nft-page-action-time', actionStartTime.toString())
    
    console.log('用户开始铸造客户NFT操作，记录操作时间:', new Date(actionStartTime))

    try {
      const usdcAmount = paymentToken === 'usdc' ? parseUnits(paymentAmount, 6) : 0n
      const ccAmount = paymentToken === 'cc' ? parseEther(paymentAmount) : 0n

      // 根据支付代币选择正确的mint函数
      const functionName = paymentToken === 'usdc' ? 'mintWithCCUSD' : 'mintWithCC'
      const functionArgs = paymentToken === 'usdc' 
        ? [address, selectedTier, usdcAmount] 
        : [address, selectedTier, ccAmount]
      
      await mintCustomerNFT({
        address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
        abi: CONTRACT_ABI.CUSTOMER_NFT_ABI,
        functionName: functionName,
        args: functionArgs,
        gas: Math.floor(GAS_LIMITS.MINT_NFT * GAS_LIMITS.BUFFER),
      })
      
      // 重置表单
      setPaymentAmount('')
    } catch (error) {
      console.error('铸造客户NFT失败:', error)
      alert(t('nft.shared.errors.mintCustomerNFTFailed', { error: error.message }))
      // 重置用户操作状态
      setUserActionInProgress(false)
      setUserActionType(null)
    }
  }

  const handleMintProviderNFT = async () => {
    // 标记用户操作开始
    const actionStartTime = Date.now()
    setUserActionInProgress(true)
    setUserActionType('mint-provider')
    setActionCompletionTime(actionStartTime)
    
    // 记录操作时间到sessionStorage，用于事件过滤
    sessionStorage.setItem('nft-page-action-time', actionStartTime.toString())
    
    console.log('用户开始铸造提供商NFT操作，记录操作时间:', new Date(actionStartTime))

    try {
      // ProviderNFT应该通过StakingPool质押CC来铸造，不是直接调用ProviderNFT合约
      alert('提供商NFT需要通过质押页面进行质押获得，请前往质押页面')
      return
    } catch (error) {
      console.error('铸造提供商NFT失败:', error)
    alert(t('nft.shared.errors.mintProviderNFTFailed', { error: error.message }))
      // 重置用户操作状态
      setUserActionInProgress(false)
      setUserActionType(null)
    }
  }

  const getTierColor = (tier) => {
    const colors = [
      'from-yellow-600 to-yellow-700',
      'from-gray-400 to-gray-500', 
      'from-yellow-400 to-yellow-500',
      'from-slate-300 to-slate-400'
    ]
    return colors[tier] || 'from-gray-400 to-gray-500'
  }

  const getTierIcon = (tier, type) => {
    // 统一NFT等级图标：BRONZE(铜牌), SILVER(星星), GOLD(CPU芯片), PLATINUM(闪电)
    const icons = [TrophyIcon, StarIcon, CpuChipIcon, BoltIcon]
    return icons[tier] || StarIcon
  }

  const getTierDisplay = (tier) => {
    const tierData = NFT_TIERS[tier - 1]
    return {
      text: tierData?.name || 'UNKNOWN',
      color: tier === 0 ? 'bg-gradient-to-r from-yellow-500 to-amber-600' : // BRONZE - 青铜色
             tier === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' : // SILVER - 银色
             tier === 2 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : // GOLD - 金色
             'bg-gradient-to-r from-purple-400 to-purple-500', // PLATINUM - 铂金色
      icon: getTierIcon(tier, 'customer')
    }
  }

  if (!isConnected || !address) {
    return (
      <div className="space-y-16">
        {/* 连接钱包提示区域 */}
        <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-theme-bg to-gray-100 dark:from-gray-900/20 dark:via-theme-bg dark:to-gray-800/20"></div>
          <div className="relative max-w-7xl mx-auto text-center">
            <div className="space-y-8">
              {/* 主标题 */}
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 px-4 py-2 rounded-full text-lg font-medium">
                  <WalletIcon className="w-4 h-4" />
                  <span>{t('nft.management.title')}</span>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold text-theme-primary">
                  <span className="block">{t('wallet.connect')}</span>
                  <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent mt-2">
                    {t('nft.management.connectWallet')}
                  </span>
                </h1>
                
                <p className="text-xl text-theme-secondary max-w-3xl mx-auto leading-relaxed">
                  {t('nft.management.description')}
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
                                    <span>{t('wallet.connect')}</span>
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
            <h2 className="text-3xl font-bold text-theme-primary mb-4">{t('nft.management.features.title')}</h2>
            <p className="text-xl text-theme-secondary max-w-3xl mx-auto">
              {t('nft.management.features.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <PhotoIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('nft.management.features.customerNFT.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('nft.management.features.customerNFT.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <CurrencyDollarIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('nft.management.features.providerNFT.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('nft.management.features.providerNFT.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <SparklesIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('nft.management.features.minting.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('nft.management.features.minting.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <ChartBarIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  4
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('nft.management.features.statistics.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('nft.management.features.statistics.description')}
              </p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // 格式化余额为5位小数
  const formatBalance5 = (balance, decimals = 18) => {
    if (!balance) return '0.00000'
    // 确保转换为 BigInt
    const balanceBigInt = BigInt(balance)
    const divisor = BigInt(10) ** BigInt(decimals)
    const wholePart = balanceBigInt / divisor
    const fractionalPart = (balanceBigInt % divisor) * BigInt(100000) / divisor
    return `${wholePart}.${fractionalPart.toString().padStart(5, '0')}`
  }

  // 格式化CCUSD余额（6位小数，显示2位）
  const formatCCUSD = (balance) => {
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
  const formatCC = (balance) => {
    if (!balance) return '0.00000'
    return formatBalance5(balance, 18)
  }

  // 查看NFT详情
  const handleViewNFTDetails = (nft) => {
    setSelectedNFT(nft)
    setShowNFTDetails(true)
  }

  // 关闭NFT详情
  const handleCloseNFTDetails = () => {
    setShowNFTDetails(false)
    setSelectedNFT(null)
  }

  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    if (!timestamp || timestamp === '0') return '未知'
    try {
      const date = new Date(Number(timestamp) * 1000)
      return date.toLocaleString('zh-CN')
    } catch {
      return '未知'
    }
  }

  return (
    <div className="space-y-8">

      {/* 代币和NFT统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('nft.management.stats.customerNFTCount')}</p>
              <div className="flex items-baseline space-x-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{customerNFTBalance?.toString() || '0'}</p>
                <span className="text-sm text-gray-500 dark:text-gray-400">NFTs</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <PhotoIcon className="w-6 h-6 text-white drop-shadow-md" />
            </div>
          </div>
        </div>
        
        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('nft.management.stats.providerNFTCount')}</p>
              <div className="flex items-baseline space-x-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{providerNFTBalance?.toString() || '0'}</p>
                <span className="text-sm text-gray-500 dark:text-gray-400">NFTs</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <CurrencyDollarIcon className="w-6 h-6 text-white drop-shadow-md" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('nft.management.stats.ccusdBalance')}</p>
              <div className="flex items-baseline space-x-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCCUSD(usdcBalance)}</p>
                <span className="text-sm text-gray-500 dark:text-gray-400">CCUSD</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/25">
              <CurrencyDollarIcon className="w-6 h-6 text-white drop-shadow-md" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('nft.management.stats.ccBalance')}</p>
              <div className="flex items-baseline space-x-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCC(ccBalance)}</p>
                <span className="text-sm text-gray-500 dark:text-gray-400">CC</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-700 rounded-xl flex items-center justify-center shadow-lg shadow-teal-600/25">
              <SparklesIcon className="w-6 h-6 text-white drop-shadow-md" />
            </div>
          </div>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg max-w-md mx-auto">
        {[
          { id: 'customer', name: t('nft.management.tabs.customer') },
          { id: 'provider', name: t('nft.management.tabs.provider') }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 rounded-md text-lg font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* 我的NFT */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nft.management.myNFTs')}</h2>
          <button
            onClick={() => {
              refetchCustomerBalance()
              refetchProviderBalance()
            }}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>🔄</span>
            <span>{t('nft.management.refresh')}</span>
          </button>
        </div>
        
        {activeTab === 'customer' && (
          <div className="space-y-6">
            {customerNFTs.length > 0 ? (
              customerNFTs.map((nft) => {
                // Debug: 检查tier值和数组索引
                console.log('Customer NFT Debug:', { 
                  tokenId: nft.tokenId, 
                  tier: nft.tier, 
                  tierData: NFT_TIERS[nft.tier - 1],
                  arrayLength: NFT_TIERS.length 
                });
                const tierData = NFT_TIERS[nft.tier - 1] || { name: 'UNKNOWN', color: '#999999' }
                const IconComponent = getTierIcon(nft.tier, 'customer')
                return (
                  <div key={nft.tokenId} className="card hover:shadow-lg transition-shadow relative">
                    {/* 右上角查看详情按钮 */}
                    <div className="absolute top-4 right-4 z-10">
                      <button
                        onClick={() => handleViewNFTDetails(nft)}
                        className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-lg text-sm font-medium"
                      >
                        {t('nft.management.actions.viewDetails')}
                      </button>
                    </div>
                    
                    {/* 主要信息区域 - 横向布局 */}
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* 左侧：NFT 标题和图标 */}
                      <div className="flex items-center space-x-4 lg:w-1/3">
                        <div className={`w-20 h-20 bg-gradient-to-br ${getTierColor(nft.tier)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300`}>
                          <IconComponent className="w-8 h-8 text-white drop-shadow-lg" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{tierData.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{t('nft.common.customerNFT')} #{nft.tokenId}</p>
                          <div className="flex items-center mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('nft.management.display.activeStatus')}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 右侧：核心属性网格 */}
                      <div className="lg:w-2/3">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('nft.management.display.coreBenefits')}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
                            <div className="flex justify-center mb-2">
                              <TagIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
                            </div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-300">{nft.discount}%</div>
                            <div className="text-sm text-green-700 dark:text-green-400 mt-1">{t('nft.management.display.purchaseDiscount')}</div>
                          </div>
                          <div className="bg-teal-50 dark:bg-teal-900/30 rounded-lg p-4 text-center">
                            <div className="flex justify-center mb-2">
                              <CurrencyDollarIcon className="w-10 h-10 text-teal-600 dark:text-teal-400 drop-shadow-sm" />
                            </div>
                            <div className="text-2xl font-bold text-teal-600 dark:text-teal-300">{nft.monthlyReward} CC</div>
                            <div className="text-sm text-teal-700 dark:text-teal-400 mt-1">{t('nft.management.display.monthlyReward')}</div>
                          </div>
                          <div className="bg-cyan-50 dark:bg-cyan-900/30 rounded-lg p-4 text-center">
                            <div className="flex justify-center mb-2">
                              <ArrowTrendingUpIcon className="w-10 h-10 text-cyan-600 dark:text-cyan-400 drop-shadow-sm" />
                            </div>
                            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-300">{nft.annualSavings} CC</div>
                            <div className="text-sm text-cyan-700 dark:text-cyan-400 mt-1">{t('nft.management.display.annualSavings')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-16">
                <PhotoIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">{t('nft.management.display.noCustomerNFTs')}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">{t('nft.management.display.noCustomerNFTsDescription')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'provider' && (
          <div className="space-y-6">
            {providerNFTs.length > 0 ? (
              providerNFTs.map((nft) => {
                // Debug: 检查provider tier值和数组索引
                console.log('Provider NFT Debug:', { 
                  tokenId: nft.tokenId, 
                  tier: nft.tier, 
                  tierData: PROVIDER_NFT_TIERS[nft.tier - 1],
                  arrayLength: PROVIDER_NFT_TIERS.length 
                });
                const tierData = PROVIDER_NFT_TIERS[nft.tier - 1] || { name: 'UNKNOWN', color: '#999999' }
                const IconComponent = getTierIcon(nft.tier, 'provider')
                return (
                  <div key={nft.tokenId} className="card hover:shadow-lg transition-shadow">
                    {/* 主要信息区域 - 横向布局 */}
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* 左侧：NFT 标题和图标 */}
                      <div className="flex items-center space-x-4 lg:w-1/4">
                        <div className={`w-20 h-20 bg-gradient-to-br ${getTierColor(nft.tier)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300`}>
                          <IconComponent className="w-8 h-8 text-white drop-shadow-lg" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{tierData.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{t('nft.common.providerNFT')} #{nft.tokenId}</p>
                          <div className="flex items-center mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('nft.management.display.activeStatus')}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 中间：核心属性网格 */}
                      <div className="lg:w-1/2">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('nft.management.display.coreBenefits')}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="bg-teal-50 dark:bg-teal-900/30 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-teal-600 dark:text-teal-300">{nft.multiplier}x</div>
                            <div className="text-sm text-teal-700 dark:text-teal-400 mt-1">{t('nft.management.display.rewardMultiplier')}</div>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-300">+{nft.bonusPercentage}%</div>
                            <div className="text-sm text-green-700 dark:text-green-400 mt-1">{t('nft.management.display.yieldImprovement')}</div>
                          </div>
                          <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-300">{tierData?.deviceReq}{t('nft.management.modal.deviceUnits')}</div>
                            <div className="text-sm text-orange-700 dark:text-orange-400 mt-1">{t('nft.management.display.deviceRequirement')}</div>
                          </div>
                          <div className="bg-cyan-50 dark:bg-cyan-900/30 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-300">{nft.estimatedDailyRewards} CC</div>
                            <div className="text-sm text-cyan-700 dark:text-cyan-400 mt-1">{t('nft.management.display.estimatedDailyEarnings')}</div>
                          </div>
                        </div>
                        
                        {/* 提供商统计 */}
                        <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('nft.management.display.providerStats')}</h5>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white">{nft.completedJobs}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{t('nft.management.display.completedJobs')}</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white">{nft.totalRewards} CC</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{t('nft.management.display.totalRewards')}</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white">{nft.qualityScore}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{t('nft.management.display.qualityScore')}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 右侧：技术信息 */}
                      <div className="lg:w-1/4">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('nft.management.display.technicalInfo')}</h4>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('nft.management.display.contractAddress')}</div>
                            <div className="font-mono text-sm text-gray-900 dark:text-white truncate" title={nft.contractAddress}>
                              {nft.contractAddress?.slice(0, 8)}...{nft.contractAddress?.slice(-6)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('nft.management.display.network')}</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{nft.network}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('nft.management.display.tokenStandard')}</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{nft.tokenStandard}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 底部：权益详情和操作按钮 */}
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* 权益列表 */}
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('nft.management.modal.exclusiveBenefits')}</h4>
                          <div className="flex flex-wrap gap-2">
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300">
                              <ShieldCheckIcon className="w-4 h-4 mr-1 text-teal-600 dark:text-teal-400 drop-shadow-sm" />
                              {t('nft.management.modal.priorityTaskAllocation')}
                            </div>
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                              <ArrowTrendingUpIcon className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
                              {t('nft.management.modal.rewardBonus')}
                            </div>
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300">
                              <StarIcon className="w-4 h-4 mr-1 text-cyan-600 dark:text-cyan-400 drop-shadow-sm" />
                              {t('nft.management.modal.qualityRatingSystem')}
                            </div>
                          </div>
                        </div>
                        
                        {/* 操作按钮 */}
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleViewNFTDetails(nft)}
                            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium flex items-center"
                          >
                            <span>{t('nft.management.actions.viewDetails')}</span>
                            <span className="ml-1">→</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-16">
                <CurrencyDollarIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">{t('nft.management.display.noProviderNFTs')}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">{t('nft.management.display.noProviderNFTsDescription')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 铸造新NFT - 只在用户没有该类型NFT时显示 */}
      {(activeTab === 'customer' ? customerNFTs.length === 0 : providerNFTs.length === 0) && (
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('nft.management.actions.mintNew', { 
              type: activeTab === 'customer' ? t('nft.common.customerNFT') : t('nft.common.providerNFT')
            })}
          </h2>
        
        {/* NFT等级选择 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('nft.management.actions.selectTier')}</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(activeTab === 'customer' ? NFT_TIERS : PROVIDER_NFT_TIERS).map((tier, index) => {
              const IconComponent = getTierIcon(index, activeTab)
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedTier(index)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedTier === index
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  {/* 图标显示区域 */}
                  <div className={`w-12 h-12 bg-gradient-to-br ${getTierColor(index)} rounded-lg flex items-center justify-center mb-3 mx-auto shadow-lg`}>
                    <IconComponent className="w-6 h-6 text-white drop-shadow-sm" />
                  </div>
                  
                  {/* 等级名称 */}
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-center">{tier.name}</h4>
                  
                  {/* 等级属性信息 */}
                  <div className="text-center">
                    {activeTab === 'customer' ? (
                      <>
                        <p className="text-xs text-teal-600 dark:text-teal-400 mb-1">{t('nft.management.modal.discount')}: {tier.discount / 100}%</p>
                        <p className="text-xs text-cyan-600 dark:text-cyan-400">{t('nft.management.modal.monthlyReward')}: {tier.monthlyReward} CC</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-teal-600 dark:text-teal-400 mb-1">{t('nft.management.modal.multiplier')}: {tier.multiplier / 100}x</p>
                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">{t('nft.management.modal.deviceRequirement')}: {tier.deviceReq}{t('nft.management.modal.deviceUnits')}</p>
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 客户NFT支付选项 */}
        {activeTab === 'customer' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('nft.management.actions.paymentMethod')}</label>
            <div className="flex space-x-4 mb-4">
              {[
                { id: 'usdc', name: 'CCUSD', icon: '$' },
                { id: 'cc', name: t('nft.management.modal.ccToken'), icon: '₵' }
              ].map((option) => (
                <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentToken"
                    value={option.id}
                    checked={paymentToken === option.id}
                    onChange={(e) => setPaymentToken(e.target.value)}
                    className="w-4 h-4 text-emerald-500 border-gray-300 dark:border-gray-600 focus:ring-emerald-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{option.icon} {option.name}</span>
                </label>
              ))}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('nft.management.actions.paymentAmount')}</label>
              <div className="relative">
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={t('nft.management.actions.enterPaymentAmount')}
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">{paymentToken.toUpperCase()}</span>
                </div>
              </div>
              {/* 代币余额显示 */}
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {paymentToken === 'usdc' ? (
                  <span>{t('nft.management.modal.ccusdBalance')}: <span className="font-semibold text-teal-600 dark:text-teal-400">{formatCCUSD(usdcBalance)}</span></span>
                ) : (
                  <span>{t('nft.management.modal.ccBalance')}: <span className="font-semibold text-cyan-600 dark:text-cyan-400">{formatCC(ccBalance)}</span></span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 铸造按钮 */}
        <button
          onClick={activeTab === 'customer' ? handleMintCustomerNFT : handleMintProviderNFT}
          disabled={
            activeTab === 'customer' && (!paymentAmount || parseFloat(paymentAmount) <= 0) ||
            isMintCustomerPending || isMintProviderPending || isMintCustomerLoading || isMintProviderLoading
          }
          className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMintCustomerPending || isMintProviderPending || isMintCustomerLoading || isMintProviderLoading
            ? t('nft.management.actions.mintingInProgress')
            : t('nft.management.actions.mintTierNFT', { tier: selectedTierData.name })
          }
        </button>
        </div>
      )}

      {/* NFT详情模态框 */}
      {showNFTDetails && selectedNFT && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* 模态框头部 */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('nft.management.modal.title.withType', { 
                      type: selectedNFT.type === 'customer' ? t('nft.management.modal.title.customerNFT') : t('nft.management.modal.title.providerNFT')
                    })}
                </h2>
                <button
                  onClick={handleCloseNFTDetails}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* NFT基本信息 */}
              {selectedNFT.type === 'customer' ? (
                <div className="bg-gradient-to-br from-emerald-50 dark:from-emerald-900/20 via-emerald-100 dark:via-emerald-800/20 to-emerald-50 dark:to-emerald-900/20 rounded-2xl p-8 space-y-8 shadow-lg border border-emerald-200/50 dark:border-emerald-700/50 mb-6">
                  {/* NFT 头部信息 */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-200 dark:from-emerald-700 to-emerald-300 dark:to-emerald-600 rounded-xl mb-6 shadow-lg">
                      <SparklesIcon className="h-12 w-12 text-emerald-700 dark:text-emerald-200" />
                    </div>
                    <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">{t('nft.management.modal.title.customerNFT')}</h3>
                    <div className="inline-flex items-center px-4 py-2 bg-emerald-200 dark:bg-emerald-800 rounded-lg">
                      <span className="text-emerald-700 dark:text-emerald-200 font-medium">{t('nft.management.modal.tokenId', { id: selectedNFT.tokenId })}</span>
                    </div>
                  </div>

                  {/* 等级展示 */}
                  <div className="text-center">
                    <div className={`inline-flex items-center px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-xl ${getTierDisplay(selectedNFT.tier).color}`}>
                      <div className="flex items-center space-x-3">
                        {React.createElement(getTierDisplay(selectedNFT.tier).icon, { className: "h-6 w-6" })}
                        <span>{getTierDisplay(selectedNFT.tier).text}</span>
                      </div>
                    </div>
                  </div>

                  {/* 权益卡片 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
                      <div className="flex items-center mb-3">
                        <TagIcon className="h-8 w-8 mr-3" />
                        <span className="text-lg font-semibold">{t('nft.management.modal.computeDiscount')}</span>
                      </div>
                      <div className="text-3xl font-bold">{selectedNFT.discount}%</div>
                      <div className="text-emerald-200 text-sm mt-2">{t('nft.management.modal.discountDescription')}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
                      <div className="flex items-center mb-3">
                        <CurrencyDollarIcon className="h-8 w-8 mr-3" />
                        <span className="text-lg font-semibold">{t('nft.management.modal.monthlyRewards')}</span>
                      </div>
                      <div className="text-3xl font-bold">{selectedNFT.monthlyReward} CC</div>
                      <div className="text-teal-200 text-sm mt-2">{t('nft.management.modal.monthlyRewardDescription')}</div>
                    </div>
                  </div>

                                  </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="text-center">
                    <div className={`w-20 h-20 bg-gradient-to-r ${getTierColor(selectedNFT.tier)} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                      {React.createElement(getTierIcon(selectedNFT.tier, selectedNFT.type), { className: "w-8 h-8 text-white" })}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedNFT.tierName}</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('nft.management.modal.providerNFTTypeWithId', { type: t('nft.management.modal.providerNFTType'), id: selectedNFT.tokenId })}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('nft.management.modal.tokenIdLabel')}:</span>
                      <span className="font-mono font-semibold text-gray-900 dark:text-white">{selectedNFT.tokenId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('nft.management.modal.tier')}:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedNFT.tierName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('nft.management.modal.type')}:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{t('nft.management.modal.providerNFTType')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('nft.management.modal.status')}:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">{t('nft.management.modal.active')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 核心属性 - 仅提供商NFT显示 */}
              {selectedNFT.type === 'provider' && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('nft.management.modal.coreAttributes')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-300">{selectedNFT.multiplier}x</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('nft.management.modal.rewardMultiplier')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-300">+{selectedNFT.bonusPercentage}%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('nft.management.modal.yieldImprovement')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">{selectedNFT.estimatedDailyRewards} CC</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('nft.management.modal.estimatedDailyEarnings')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{selectedNFT.qualityScore}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('nft.management.modal.qualityScore')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 提供商统计（仅提供商NFT） */}
              {selectedNFT.type === 'provider' && (
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 mb-6">
                  <h4 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-3">{t('nft.management.modal.providerStats')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">{selectedNFT.completedJobs}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('nft.management.modal.completedJobs')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">{selectedNFT.totalRewards} CC</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('nft.management.modal.totalRewards')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">{selectedNFT.qualityScore}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('nft.management.modal.qualityScore')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 权益列表 - 仅提供商NFT显示 */}
              {selectedNFT.type === 'provider' && (
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6">
                  <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">{t('nft.management.modal.benefits')}</h4>
                  <ul className="space-y-2">
                    {selectedNFT.benefits?.map((benefit, index) => (
                      <li key={index} className="flex items-center text-blue-700 dark:text-blue-300">
                        <CheckCircleIcon className="w-4 h-4 mr-2 text-green-500 dark:text-green-400" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

    
              {/* 关闭按钮 */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleCloseNFTDetails}
                  className="px-6 py-2 bg-gray-500 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('nft.shared.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 交易状态提示 - NFT页面版本 */}
      {showStatus && transactionStatus && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg z-50 shadow-lg max-w-sm transition-all duration-300 ${
          transactionStatus.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : transactionStatus.type === 'warning'
            ? 'bg-yellow-100 border border-yellow-400 text-yellow-700'
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {transactionStatus.type === 'success' ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : transactionStatus.type === 'warning' ? (
                <ExclamationTriangleIcon className="w-5 h-5" />
              ) : (
                <XCircleIcon className="w-5 h-5" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium">
                {transactionStatus.title}
              </h4>
              <p className="text-sm mt-1">
                {transactionStatus.message}
              </p>
              {transactionStatus.action && (
                <p className="text-xs mt-2 opacity-75">
                  {t('nft.shared.success.action')}: {transactionStatus.action.type === 'mint-customer' ? t('nft.shared.success.mintingCustomer', { tier: transactionStatus.action.tier }) : t('nft.shared.success.mintingProvider', { tier: transactionStatus.action.tier })}
                  {transactionStatus.action.tier && ` - 等级: ${transactionStatus.action.tier}`}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setShowStatus(false)
                setTransactionStatus(null)
              }}
              className="ml-3 flex-shrink-0"
            >
              <XCircleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}