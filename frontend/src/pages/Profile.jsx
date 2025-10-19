import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useSignMessage } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { formatEther, parseEther, formatUnits, getAddress } from 'viem'
import { 
  UserIcon,
  WalletIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  ComputerDesktopIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  PencilIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  QrCodeIcon,
  ChartBarIcon,
  BellIcon,
  PlusIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ArrowsRightLeftIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { CONTRACT_ADDRESSES, CONTRACT_ABI, GAS_LIMITS } from '../config/contracts'
import { Link, useNavigate } from 'react-router-dom'
import { useUserProfile, userProfileService } from '../services/userProfileService'
import { useActivityManager } from '../hooks/useActivityManager'
import ActivityFeed from '../components/ActivityFeed'

export default function Profile() {
  const { t } = useTranslation()
  const { address, isConnected } = useAccount()
  
  // 规范化钱包地址
  const normalizedAddress = useMemo(() => {
    if (!address) return null;
    try {
      return getAddress(address);
    } catch (error) {
      console.error(t('wallet.addressNormalizationFailed'), error);
      return address.toLowerCase(); // 备用方案
    }
  }, [address]);
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [criticalError, setCriticalError] = useState(null)
  const [showErrors, setShowErrors] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // 事件驱动数据更新状态 - 用于强制刷新余额数据
  const [refreshKey, setRefreshKey] = useState(0)
  
  // 当有事件触发时增加refreshKey，强制重新获取数据
  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  // 活动记录状态管理
  const { 
    activities, 
    isLoading: isLoadingActivities,
    addStakeActivity,
    addUnstakeActivity,
    addDepositActivity,
    addWithdrawActivity,
    addClaimRewardsActivity,
    addMintNFTActivity,
    setIsLoading
  } = useActivityManager()
  
  // 本地表单数据
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    bio: '',
    website: '',
    location: ''
  })
  
  // 表单验证错误状态
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    website: ''
  })
  
  // 直接使用userProfileService实例
  const { logout } = useUserProfile()
  
  // 用户信息加载状态 - 使用更清晰的状态定义
  const [userStatus, setUserStatus] = useState('idle') // idle, loading, has_profile, disconnected, error
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [profileLoadError, setProfileLoadError] = useState(null)
  const [loadCompleted, setLoadCompleted] = useState(false)
  
  // 签名登录相关状态
  const [isSigning, setIsSigning] = useState(false)
  const [signatureChallenge, setSignatureChallenge] = useState(null)
  const [showSignInModal, setShowSignInModal] = useState(false)
  
  // 读取ETH余额
  const { data: ethBalance, error: ethError, isLoading: ethLoading } = useBalance({
    address: address,
    enabled: !!address,
    query: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
    },
  })

  // 读取CC Token余额
  const { data: ccBalance, error: ccError, isLoading: ccLoading } = useBalance({
    address: address,
    token: CONTRACT_ADDRESSES.CC_TOKEN,
    enabled: !!address && !!CONTRACT_ADDRESSES.CC_TOKEN,
    query: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
    },
  })

  // 读取CCUSD余额 (使用MockUSDC合约)
  const { data: ccusdBalance, error: ccusdError, isLoading: ccusdLoading } = useBalance({
    address: address,
    token: CONTRACT_ADDRESSES.CCSD_TOKEN,
    enabled: !!address && !!CONTRACT_ADDRESSES.CCSD_TOKEN,
    query: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
    },
  })

  // 读取用户质押信息
  const { data: userStakes, error: userStakesError, isLoading: userStakesLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    functionName: 'getUserStakes',
    args: [address],
    enabled: !!address && !!CONTRACT_ADDRESSES.STAKING_POOL,
  })

  // 计算质押的ETH和CC数量
  const stakedEthAmount = useMemo(() => {
    if (!userStakes) return 0n;
    return userStakes
      .filter(stake => stake.assetType === 0) // ETH = 0
      .reduce((total, stake) => total + BigInt(stake.amount), 0n);
  }, [userStakes]);

  const stakedCcAmount = useMemo(() => {
    if (!userStakes) return 0n;
    return userStakes
      .filter(stake => stake.assetType === 1) // CC = 1
      .reduce((total, stake) => total + BigInt(stake.amount), 0n);
  }, [userStakes]);

  const stakedEthLoading = userStakesLoading;
  const stakedCcLoading = userStakesLoading;
  const stakedEthError = userStakesError;
  const stakedCcError = userStakesError;

  // 读取用户是否拥有Customer NFT
  const { data: customerNftBalance, error: customerNftError, isLoading: customerNftLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
    abi: CONTRACT_ABI.CUSTOMER_NFT_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address && !!CONTRACT_ADDRESSES.CUSTOMER_NFT,
  })

  // 读取用户是否拥有Provider NFT
  const { data: providerNftBalance, error: providerNftError, isLoading: providerNftLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.PROVIDER_NFT,
    abi: CONTRACT_ABI.PROVIDER_NFT_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address && !!CONTRACT_ADDRESSES.PROVIDER_NFT,
  })

  // ETH Vault合约已删除，现在通过StakingPool管理ETH质押

  // ETH兑换CCUSD相关数据查询
  // 读取兑换合约当前汇率
  const { data: exchangeRateData, error: exchangeRateError, isLoading: exchangeRateLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER,
    abi: CONTRACT_ABI.ETH_CCUSD_CONVERTER_ABI,
    functionName: 'currentRate',
    enabled: !!address && !!CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER,
  })

  // 读取兑换合约余额和流动性
  const { data: converterBalanceData, error: converterBalanceError, isLoading: converterBalanceLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER,
    abi: CONTRACT_ABI.ETH_CCUSD_CONVERTER_ABI,
    functionName: 'getContractBalances',
    enabled: !!address && !!CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER,
  })

  // 读取兑换合约统计数据
  const { data: converterStatsData, error: converterStatsError, isLoading: converterStatsLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER,
    abi: CONTRACT_ABI.ETH_CCUSD_CONVERTER_ABI,
    functionName: 'getStats',
    enabled: !!address && !!CONTRACT_ADDRESSES.ETH_CCUSD_CONVERTER,
  })

  // 用户兑换的CCUSD余额就是用户的CCSD代币余额，直接使用ccusdBalance数据
  // 不需要查询单独的vault合约，因为兑换的CCUSD直接转入用户钱包

  // 合约写入操作
  const { writeContract: writeStakeEth, isPending: isStakeEthPending, data: stakeEthData } = useWriteContract()
  const { writeContract: writeStakeCc, isPending: isStakeCcPending, data: stakeCcData } = useWriteContract()
  const { writeContract: writeUnstakeEth, isPending: isUnstakeEthPending, data: unstakeEthData } = useWriteContract()
  const { writeContract: writeUnstakeCc, isPending: isUnstakeCcPending, data: unstakeCcData } = useWriteContract()
  const { writeContract: writeDepositEth, isPending: isDepositEthPending, data: depositEthData } = useWriteContract()
  const { writeContract: writeWithdrawEth, isPending: isWithdrawEthPending, data: withdrawEthData } = useWriteContract()
  // Customer NFT铸造功能已移至Staking页面
  // const { writeContract: writeMintCustomerNft, isPending: isMintCustomerNftPending, data: mintCustomerNftData } = useWriteContract()
  // const { writeContract: writeMintProviderNft, isPending: isMintProviderNftPending, data: mintProviderNftData } = useWriteContract()
  const { writeContract: writeClaimRewards, isPending: isClaimRewardsPending, data: claimRewardsData } = useWriteContract()

  // 交易状态监听
  const { isLoading: isStakeEthLoading, isSuccess: isStakeEthSuccess } = useWaitForTransactionReceipt({ hash: stakeEthData })
  const { isLoading: isStakeCcLoading, isSuccess: isStakeCcSuccess } = useWaitForTransactionReceipt({ hash: stakeCcData })
  const { isLoading: isUnstakeEthLoading, isSuccess: isUnstakeEthSuccess } = useWaitForTransactionReceipt({ hash: unstakeEthData })
  const { isLoading: isUnstakeCcLoading, isSuccess: isUnstakeCcSuccess } = useWaitForTransactionReceipt({ hash: unstakeCcData })
  const { isLoading: isDepositEthLoading, isSuccess: isDepositEthSuccess } = useWaitForTransactionReceipt({ hash: depositEthData })
  const { isLoading: isWithdrawEthLoading, isSuccess: isWithdrawEthSuccess } = useWaitForTransactionReceipt({ hash: withdrawEthData })
  // Customer NFT铸造状态监听已移至Staking页面
  // const { isLoading: isMintCustomerNftLoading, isSuccess: isMintCustomerNftSuccess } = useWaitForTransactionReceipt({ hash: mintCustomerNftData })
  // const { isLoading: isMintProviderNftLoading, isSuccess: isMintProviderNftSuccess } = useWaitForTransactionReceipt({ hash: mintProviderNftData })
  const { isLoading: isClaimRewardsLoading, isSuccess: isClaimRewardsSuccess } = useWaitForTransactionReceipt({ hash: claimRewardsData })

  // 签名消息
  const { signMessage, isPending: isSignPending } = useSignMessage()

  // 统一的4位小数格式化函数
  const formatBalance4Decimals = (balance, decimals = 18) => {
    if (!balance) return '0.0000'
    try {
      // 确保转换为 BigInt
      const balanceBigInt = BigInt(balance)
      const divisor = BigInt(10) ** BigInt(decimals)
      const wholePart = balanceBigInt / divisor
      const fractionalPart = (balanceBigInt % divisor) * BigInt(10000) / divisor
      return `${wholePart}.${fractionalPart.toString().padStart(4, '0')}`
    } catch (error) {
      console.error(t('wallet.formatBalanceFailed'), error)
      return '0.0000'
    }
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

  const formatCC = (balance) => {
    if (!balance) return '0.0000'
    return formatBalance4Decimals(balance, 18)
  }

  const formatETH = (balance) => {
    if (!balance) return '0.0000'
    return formatBalance4Decimals(balance, 18)
  }

  // ETH兑换CCUSD相关数据处理
  const exchangeData = useMemo(() => {
    let currentRate = 0 // 默认汇率，将从合约获取
    let ethLiquidity = '0'
    let ccusdLiquidity = '0'
    let totalExchanges = 0
    let totalVolumeEth = '0'
    let totalVolumeCCUSD = '0'
    let userExchangeBalance = '0'

    try {
      // 获取当前汇率 - 从合约实时获取
      if (exchangeRateData) {
        currentRate = Number(exchangeRateData.toString())
      } else {
        // 如果无法获取汇率，显示为加载中状态
        currentRate = 0
      }

      // 获取合约流动性
      if (converterBalanceData) {
        ethLiquidity = formatEther(converterBalanceData[0])
        ccusdLiquidity = (parseFloat(converterBalanceData[1].toString()) / 1e6).toFixed(2)
      }

      // 获取统计数据
      if (converterStatsData) {
        totalExchanges = Number(converterStatsData[2].toString())
        totalVolumeEth = formatEther(converterStatsData[0])
        totalVolumeCCUSD = (parseFloat(converterStatsData[1].toString()) / 1e6).toFixed(2)
      }

      // 获取用户兑换余额（用户实际拥有的CCSD余额）
      if (ccusdBalance) {
        userExchangeBalance = formatCCUSD(ccusdBalance.value)
      }
    } catch (error) {
      console.error('ETH兑换CCUSD数据处理失败:', error)
    }

    return {
      currentRate,
      ethLiquidity,
      ccusdLiquidity,
      totalExchanges,
      totalVolumeEth,
      totalVolumeCCUSD,
      userExchangeBalance
    }
  }, [exchangeRateData, converterBalanceData, converterStatsData, ccusdBalance])

  // 计算总资产价值
  const totalAssetValue = useMemo(() => {
    const ethValue = ethBalance ? parseFloat(formatBalance4Decimals(ethBalance.value, 18)) * 3000 : 0
    const ccValue = ccBalance ? parseFloat(formatBalance4Decimals(ccBalance.value, 18)) * 1 : 0
    const ccusdValue = ccusdBalance ? parseFloat(formatBalance4Decimals(ccusdBalance.value, 6)) : 0
    return ethValue + ccValue + ccusdValue
  }, [ethBalance, ccBalance, ccusdBalance])

  // 计算质押奖励
  const stakingRewards = useMemo(() => {
    const stakedEth = stakedEthAmount ? parseFloat(formatEther(stakedEthAmount)) : 0
    const stakedCc = stakedCcAmount ? parseFloat(formatEther(stakedCcAmount)) : 0
    const apr = 0.08 // 8% APR
    const dailyRewards = (stakedEth * 3000 + stakedCc) * apr / 365
    return dailyRewards
  }, [stakedEthAmount, stakedCcAmount])

  // 构建统计数据
  const stats = [
    {
      name: t('profile.stats.totalAssetValue'),
      value: `$${(totalAssetValue).toFixed(2)}`,
      unit: '',
      change: '+12.5%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
      bgGradient: 'from-emerald-500 via-emerald-600 to-teal-600'
    },
    {
      name: t('profile.stats.ethBalance'),
      value: formatETH(ethBalance?.value),
      unit: 'ETH',
      change: '+5.2%',
      changeType: 'positive',
      icon: BanknotesIcon,
      bgGradient: 'from-amber-500 via-amber-600 to-orange-600'
    },
    {
      name: t('profile.stats.ccTokens'),
      value: formatCC(ccBalance?.value),
      unit: 'CC',
      change: '+8.1%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
      bgGradient: 'from-emerald-500 via-emerald-600 to-teal-600'
    },
    {
      name: t('profile.stats.ccusdBalance'),
      value: formatCCUSD(ccusdBalance?.value),
      unit: 'CCUSD',
      change: '+3.7%',
      changeType: 'positive',
      icon: ShieldCheckIcon,
      bgGradient: 'from-green-500 via-green-600 to-emerald-600'
    }
  ]

  // 事件监听
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    eventName: 'Staked',
    onLogs(logs) {
      logs.forEach(log => {
        const logAddress = log.args.user.toLowerCase()
        if (logAddress === normalizedAddress?.toLowerCase()) {
          const assetType = log.args.assetType === 0n ? 'ETH' : 'CC'
          addStakeActivity(assetType, formatEther(log.args.amount))
          forceRefresh()
        }
      })
    }
  })

  
  // 监听CCUSD转账事件以刷新余额
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.CCSD_TOKEN,
    abi: CONTRACT_ABI.ERC20_ABI,
    eventName: 'Transfer',
    onLogs(logs) {
      logs.forEach(log => {
        const from = log.args.from.toLowerCase()
        const to = log.args.to.toLowerCase()
        const userAddress = normalizedAddress?.toLowerCase()
        
        // 如果用户是发送方或接收方，刷新余额
        if (from === userAddress || to === userAddress) {
          forceRefresh()
          console.log('CCUSD余额更新事件触发', { from, to, userAddress })
        }
      })
    }
  })

  // 监听CC Token转账事件以刷新余额
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.ERC20_ABI,
    eventName: 'Transfer',
    onLogs(logs) {
      logs.forEach(log => {
        const from = log.args.from.toLowerCase()
        const to = log.args.to.toLowerCase()
        const userAddress = normalizedAddress?.toLowerCase()
        
        // 如果用户是发送方或接收方，刷新余额
        if (from === userAddress || to === userAddress) {
          forceRefresh()
          console.log('CC Token余额更新事件触发', { from, to, userAddress })
        }
      })
    }
  })

  // NFT事件监听器已临时禁用，防止虚假通知
  // 如需重新启用，请确保正确处理事件参数和重复事件过滤

  // 加载用户信息的核心逻辑
  useEffect(() => {
    if (!isConnected || !normalizedAddress) {
      setUserStatus('disconnected')
      return
    }

    const loadUserProfile = async () => {
      setIsLoadingProfile(true)
      setLoadCompleted(false)

      try {
        // 1. 首先尝试静默登录
        const silentLoginResult = await userProfileService.silentLogin(normalizedAddress)
        
        if (silentLoginResult.success) {
          // 静默登录成功，获取完整用户信息
          const profileResult = await userProfileService.getUserProfile(normalizedAddress)
          
          if (profileResult.success && profileResult.data) {
            const profile = profileResult.data
            
            // 更新表单数据
            setProfileData({
              name: profile.name || '',
              email: profile.email || '',
              bio: profile.bio || '',
              website: profile.website || '',
              location: profile.location || ''
            })
            
            setUserStatus('has_profile')
          } else {
            // 静默登录成功但获取用户信息失败，进入可编辑状态
            setUserStatus('has_profile')
          }
        } else {
          // 静默登录失败，进入可编辑状态
          setUserStatus('has_profile')
        }
      } catch (error) {
        // 加载失败，进入可编辑状态
        setUserStatus('has_profile')
      } finally {
        setIsLoadingProfile(false)
        setLoadCompleted(true)
      }
    }

    loadUserProfile()
  }, [isConnected, normalizedAddress])

  // 取消签名登录
  const handleCancelSignIn = () => {
    setIsSigning(false)
    setSignatureChallenge(null)
    setShowSignInModal(false)
  }

  // 保存个人资料
  const handleSaveProfile = async () => {
    setIsSaving(true)
    
    try {
      // 验证表单
      const errors = validateProfileData(profileData)
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors)
        setShowErrors(true)
        setIsSaving(false)
        return
      }

      // 准备保存数据
      const saveData = {
        ...profileData,
        wallet_address: normalizedAddress
      }

      // 格式化数据后保存到后端
      let loginError = null

      // 尝试保存到后端
      try {
        const result = await userProfileService.updateUserProfile(saveData)
        if (!result.success) {
          console.log('后端保存失败:', result.message)
          loginError = `保存失败: ${result.message}`
        }
      } catch (backendError) {
        console.error('后端保存失败:', backendError)
        loginError = `保存失败: ${backendError.message}`
        
        // 如果后端保存失败，尝试重新登录
        try {
          const loginResult = await userProfileService.login(normalizedAddress)
          if (loginResult.success) {
            // 重新登录成功，再次尝试保存
            try {
              await userProfileService.updateUserProfile(saveData)
              console.log('重新登录后保存成功')
              loginError = null
            } catch (retryError) {
              console.error('重新登录后保存失败:', retryError)
              loginError = `重新登录后保存失败: ${retryError.message}`
            }
          }
        } catch (loginError) {
          console.error('重新登录失败:', loginError)
          loginError = `重新登录失败: ${loginError.message}`
        }
      }

      // 无论后端保存是否成功，都更新前端状态
      setIsEditing(false)
      setFormErrors({ name: '', email: '', website: '' })
      setShowErrors(false)

      // 如果成功保存到后端，重新获取完整profile
      if (!loginError) {
        try {
          const profileResult = await userProfileService.getUserProfile(normalizedAddress)
          if (profileResult.success && profileResult.data) {
            const profile = profileResult.data
            
            // 更新表单数据
            setProfileData({
              name: profile.name || '',
              email: profile.email || '',
              bio: profile.bio || '',
              website: profile.website || '',
              location: profile.location || ''
            })
          }
        } catch (profileError) {
          console.error('保存后重新获取用户信息失败:', profileError)
          // 如果获取失败，使用保存的数据
        }
      }

      // 根据保存结果显示不同的提示
      if (!loginError) {
        alert(t('profile.errors.profileSaveSuccess'))
      } else {
        alert(`${t('profile.errors.profileSavePartial')}\n${loginError}`)
      }
    } catch (error) {
      console.error('保存用户信息失败:', error)
      
      let errorMessage = t('profile.errors.profileSaveFailed')
      
      if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        errorMessage = t('profile.errors.networkConnectionFailed')
      }
      
      setIsEditing(false)
      setFormErrors({ name: '', email: '', website: '' })
      setShowErrors(false)
      
      alert(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  // 取消编辑
  const handleCancelEdit = async () => {
    try {
      // 重新加载用户信息，使用与初始加载相同的逻辑
      if (normalizedAddress) {
        console.log('取消编辑，重新加载用户信息...')
        
        const silentLoginResult = await userProfileService.silentLogin(normalizedAddress)
        console.log('取消编辑时的静默登录结果:', silentLoginResult)
        
        if (silentLoginResult.success) {
          const profileResult = await userProfileService.getUserProfile(normalizedAddress)
          
          if (profileResult.success && profileResult.data) {
            const profile = profileResult.data
            
            // 恢复表单数据
            setProfileData({
              name: profile.name || '',
              email: profile.email || '',
              bio: profile.bio || '',
              website: profile.website || '',
              location: profile.location || ''
            })
          } else {
            console.error('取消编辑时获取用户信息失败:', profileResult)
            // 取消编辑时遇到错误，保持当前编辑状态或进入可编辑状态
          }
        } else {
          // 检查用户是否存在
          try {
            const existsResult = await userProfileService.checkUserExists(normalizedAddress)
            if (existsResult.success && existsResult.data.exists) {
              const { profile } = existsResult.data
              setProfileData({
                name: profile.name || '',
                email: profile.email || '',
                bio: profile.bio || '',
                website: profile.website || '',
                location: profile.location || ''
              })
            }
          } catch (existsError) {
            console.error('取消编辑时检查用户存在失败:', existsError)
            // 取消编辑时遇到错误，保持当前编辑状态或进入可编辑状态
          }
        }
      }
    } catch (error) {
      console.error('取消编辑时重新加载用户信息失败:', error)
      // 取消编辑时遇到错误，保持当前编辑状态或进入可编辑状态
    }
    
    setIsEditing(false)
    setFormErrors({ name: '', email: '', website: '' })
    setShowErrors(false)
  }

  // 开始编辑
  const handleEditProfile = () => {
    setIsEditing(true)
    setShowErrors(false)
  }

  // 表单验证函数
  const validateProfileData = (data) => {
    const errors = {}
    
    // 邮箱验证
    if (data.email && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        errors.email = t('profile.errors.invalidEmail')
      }
    }
    
    // 网站验证
    if (data.website && data.website.trim()) {
      try {
        new URL(data.website.startsWith('http') ? data.website : `https://${data.website}`)
      } catch {
        errors.website = t('profile.errors.invalidWebsite')
      }
    }
    
    return errors
  }

  // 处理输入变化
  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
    
    // 清除相关错误
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // 处理签名登录
  const handleSignIn = async () => {
    if (!normalizedAddress) return
    
    setIsSigning(true)
    
    try {
      // 生成挑战
      const challengeResult = await userProfileService.generateChallenge(normalizedAddress)
      
      if (challengeResult.success) {
        const { nonce } = challengeResult.data
        
        // 签名
        const signature = await signMessage({ message: nonce })
        
        // 验证签名
        const verifyResult = await userProfileService.verifySignature(normalizedAddress, signature, nonce)
        
        if (verifyResult.success) {
          // 登录成功，重新加载用户信息
          const profileResult = await userProfileService.getUserProfile(normalizedAddress)
          
          if (profileResult.success && profileResult.data) {
            const profile = profileResult.data
            
            setProfileData({
              name: profile.name || '',
              email: profile.email || '',
              bio: profile.bio || '',
              website: profile.website || '',
              location: profile.location || ''
            })
            
            setUserStatus('has_profile')
          }
          
          setShowSignInModal(false)
        } else {
          alert(t('profile.errors.signatureVerificationFailed'))
        }
      } else {
        alert(t('profile.errors.challengeGenerationFailed'))
      }
    } catch (error) {
      console.error('签名登录失败:', error)
        alert(t('profile.errors.signatureLoginFailed'))
    } finally {
      setIsSigning(false)
    }
  }

  // 格式化余额显示
  const formatBalance = (balance, decimals = 4) => {
    if (!balance) return '0'
    const divisor = Math.pow(10, decimals)
    return (parseFloat(balance) / divisor).toFixed(4)
  }

  // 计算总资产价值
  const calculateTotalValue = () => {
    const ethVaultValue = ethVaultBalance ? parseFloat(formatBalance4Decimals(ethVaultBalance, 18)) : 0
    const ccValue = ccBalance ? parseFloat(formatBalance4Decimals(ccBalance.value, 18)) : 0
    return (ethVaultValue * 3000 + ccValue).toFixed(2)
  }

  // 获取NFT等级
  const getNftTier = (balance) => {
    if (!balance || balance === 0n) return t('profile.nftTiers.none')
    if (balance >= 3n) return t('profile.nftTiers.platinum')
    if (balance === 2n) return t('profile.nftTiers.gold')
    if (balance === 1n) return t('profile.nftTiers.bronze')
    return t('profile.nftTiers.none')
  }

  // 获取NFT折扣
  const getNftDiscount = (balance) => {
    if (!balance || balance === 0n) return 0
    if (balance >= 3n) return 15
    if (balance === 2n) return 12
    if (balance === 1n) return 5
    return 0
  }

  // 获取订单状态文本
  const getOrderStatusText = (status) => {
    const statuses = [
      t('profile.orderStatus.created'),
      t('profile.orderStatus.accepted'),
      t('profile.orderStatus.completed'),
      t('profile.orderStatus.cancelled')
    ]
    return statuses[status] || t('profile.orderStatus.unknown')
  }

  // 处理质押ETH
  const handleStakeEth = () => {
    const amount = prompt(t('profile.actions.stakeEth.prompt'))
    if (amount && !isNaN(amount)) {
      writeStakeEth({
        address: CONTRACT_ADDRESSES.STAKING_POOL,
        abi: CONTRACT_ABI.STAKING_POOL_ABI,
        functionName: 'stake',
        args: [0, parseEther(amount)], // AssetType.ETH = 0
        value: parseEther(amount),
        gas: Math.floor(GAS_LIMITS.STAKE * GAS_LIMITS.BUFFER)
      })
    }
  }

  // 处理质押CC
  const handleStakeCc = () => {
    const amount = prompt(t('profile.actions.stakeCc.prompt'))
    if (amount && !isNaN(amount)) {
      writeStakeCc({
        address: CONTRACT_ADDRESSES.STAKING_POOL,
        abi: CONTRACT_ABI.STAKING_POOL_ABI,
        functionName: 'stake',
        args: [1, parseEther(amount)], // AssetType.CC = 1
        gas: Math.floor(GAS_LIMITS.STAKE * GAS_LIMITS.BUFFER)
      })
    }
  }

  // 处理提取质押ETH
  const handleUnstakeEth = () => {
    const amount = prompt(t('profile.actions.unstakeEth.prompt'))
    if (amount && !isNaN(amount)) {
      writeUnstakeEth({
        address: CONTRACT_ADDRESSES.STAKING_POOL,
        abi: CONTRACT_ABI.STAKING_POOL_ABI,
        functionName: 'unstake',
        args: [0, parseEther(amount)], // AssetType.ETH = 0
        gas: Math.floor(GAS_LIMITS.UNSTAKE * GAS_LIMITS.BUFFER)
      })
    }
  }

  // 处理提取质押CC
  const handleUnstakeCc = () => {
    const amount = prompt(t('profile.actions.unstakeCc.prompt'))
    if (amount && !isNaN(amount)) {
      writeUnstakeCc({
        address: CONTRACT_ADDRESSES.STAKING_POOL,
        abi: CONTRACT_ABI.STAKING_POOL_ABI,
        functionName: 'unstake',
        args: [1, parseEther(amount)], // AssetType.CC = 1
        gas: Math.floor(GAS_LIMITS.UNSTAKE * GAS_LIMITS.BUFFER)
      })
    }
  }

  // ETH存取功能已移至Staking页面 - Profile页面仅用于查询和展示

  // NFT铸造功能已移至Staking页面 - Profile页面仅用于查询和展示

  // 处理提取奖励
  const handleClaimRewards = () => {
    writeClaimRewards({
      address: CONTRACT_ADDRESSES.PROVIDER_INCENTIVE,
      abi: CONTRACT_ABI.PROVIDER_INCENTIVE_ABI,
      functionName: 'claimRewards',
      args: [], // claimRewards() 无参数函数
      gas: Math.floor(GAS_LIMITS.CLAIM_PROVIDER_REWARDS * GAS_LIMITS.BUFFER)
    })
  }

  // 显示加载状态
  if (!isConnected || !address) {
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
                  <WalletIcon className="w-4 h-4" />
                  <span>{t('profile.title')}</span>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold text-theme-primary">
                  <span className="block">{t('profile.connectWallet')}</span>
                  <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent mt-2">
                    {t('profile.accessProfile')}
                  </span>
                </h1>
                
                <p className="text-xl text-theme-secondary max-w-3xl mx-auto leading-relaxed">
                  {t('profile.description')}
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
                                    <span>{t('profile.connectToStart')}</span>
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
            <h2 className="text-3xl font-bold text-theme-primary mb-4">{t('profile.features.title')}</h2>
            <p className="text-xl text-theme-secondary max-w-3xl mx-auto">
              {t('profile.features.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <ChartBarIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('profile.features.assetOverview.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('profile.features.assetOverview.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <ArrowTrendingUpIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('profile.features.stakingManagement.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('profile.features.stakingManagement.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <PhotoIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('profile.features.nftCollection.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('profile.features.nftCollection.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <ClockIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  4
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('profile.features.activityRecords.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('profile.features.activityRecords.description')}
              </p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 个人资料展示已隐藏，专注核心业务逻辑 */}
      
      {/* 资产统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                <div className="flex items-baseline space-x-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{stat.unit}</span>
                </div>
                {stat.change && (
                  <div className={`text-xs font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stat.change} {t('profile.stats.changeFromLastMonth')}
                  </div>
                )}
              </div>
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.bgGradient} rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25`}>
                <stat.icon className="w-6 h-6 text-white drop-shadow-md" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 标签页导航 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: t('profile.tabs.overview'), icon: ChartBarIcon },
              { id: 'staking', name: t('profile.tabs.staking'), icon: ArrowTrendingUpIcon },
              { id: 'deposits', name: t('profile.tabs.deposits'), icon: BanknotesIcon },
              { id: 'nfts', name: t('profile.tabs.nfts'), icon: PhotoIcon },
              { id: 'activity', name: t('profile.tabs.activity'), icon: ClockIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 标签页内容 */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 资产概览 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('exchangeData.title')}</h3>
                    <div className="flex items-center space-x-2">
                      <ArrowsRightLeftIcon className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('exchangeData.realtime')}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('exchangeData.currentRate')}</span>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {t('exchangeData.exchangeRateDisplay', { rate: exchangeData.currentRate.toLocaleString() })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('exchangeData.exchangedCcUSD')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {exchangeData.userExchangeBalance} CCUSD
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('exchangeData.estimatedExchange')}</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {(parseFloat(formatETH(ethBalance?.value)) * exchangeData.currentRate).toFixed(0)} CCUSD
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('profile.ui.stakedAssets')}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('profile.ui.stakedEth')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatETH(stakedEthAmount)} ETH
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('profile.ui.stakedCc')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCC(stakedCcAmount)} CC
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('profile.ui.estimatedAnnualReturn')}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">8%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* NFT状态 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer NFT</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">{t('profile.ui.holdingAmount')}</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {customerNftBalance?.toString() || '0'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600 dark:text-gray-300">{t('profile.ui.currentTier')}</p>
                      <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                        {getNftTier(customerNftBalance)}
                      </p>
                    </div>
                  </div>
                  {customerNftBalance && customerNftBalance > 0n && (
                    <div className="mt-4 p-3 bg-emerald-100 dark:bg-emerald-800/30 rounded-lg">
                      <p className="text-sm text-emerald-800 dark:text-emerald-200">
                        {t('profile.ui.enjoyServiceDiscount', { discount: getNftDiscount(customerNftBalance) })}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Provider NFT</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 dark:text-gray-300">{t('profile.ui.holdingAmount')}</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {providerNftBalance?.toString() || '0'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600 dark:text-gray-300">{t('profile.ui.currentTier')}</p>
                      <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                        {getNftTier(providerNftBalance)}
                      </p>
                    </div>
                  </div>
                  {providerNftBalance && providerNftBalance > 0n && (
                    <div className="mt-4 p-3 bg-emerald-100 dark:bg-emerald-800/30 rounded-lg">
                      <p className="text-sm text-emerald-800 dark:text-emerald-200">
                        {t('profile.ui.enjoyRewardBonus', { bonus: getNftDiscount(providerNftBalance) + 5 })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staking' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ETH质押 */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.ui.ethStaking')}</h3>
                    <div className="flex items-center space-x-2">
                      <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">8% APR</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('profile.ui.stakedEthLabel')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatETH(stakedEthAmount)} ETH
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('wallet.balance')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatETH(ethBalance?.value)} ETH
                      </span>
                    </div>
                    
                  </div>
                </div>

                {/* CC质押 */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.ui.ccStaking')}</h3>
                    <div className="flex items-center space-x-2">
                      <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">8% APR</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('profile.ui.stakedCcLabel')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCC(stakedCcAmount)} CC
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('wallet.balance')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCC(ccBalance?.value)} CC
                      </span>
                    </div>
                    
                  </div>
                </div>
              </div>

              </div>
          )}

          {activeTab === 'deposits' && (
            <div className="space-y-6">
              
              {/* 用户兑换数据 */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('exchangeData.myExchangeData')}</h3>
                  <div className="flex items-center space-x-2">
                    <CurrencyDollarIcon className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">{t('exchangeData.personalStats')}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">{t('exchangeData.exchangedCcUSDBalance')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {exchangeData.userExchangeBalance} CCUSD
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">{t('exchangeData.walletETHBalance')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatETH(ethBalance?.value)} ETH
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">{t('exchangeData.walletCCUSDBalance')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCCUSD(ccusdBalance?.value)} CCUSD
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-gray-600 dark:text-gray-300">{t('exchangeData.currentRate')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {exchangeData.currentRate > 0 ? t('exchangeData.exchangeRateDisplay', { rate: exchangeData.currentRate.toLocaleString() }) : t('exchangeData.loading')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">{t('exchangeData.estimatedExchange')}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {exchangeData.currentRate > 0 ? `${(parseFloat(formatETH(ethBalance?.value)) * exchangeData.currentRate).toFixed(2)} CCUSD` : t('exchangeData.loading')}
                    </span>
                  </div>
                </div>
              </div>

  
        </div>
          )}

          {activeTab === 'nfts' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer NFT</h3>
                    <div className="flex items-center space-x-2">
                      <PhotoIcon className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">{t('profile.ui.serviceDiscount')}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('profile.ui.holdingAmount')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {customerNftBalance?.toString() || '0'} NFT
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('profile.ui.currentTier')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getNftTier(customerNftBalance)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('profile.ui.discountRate')}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {getNftDiscount(customerNftBalance)}%
                      </span>
                    </div>
                    
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                      <p className="text-sm text-emerald-800 dark:text-emerald-200">
                        {t('profile.ui.customerNftDescription')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Provider NFT</h3>
                    <div className="flex items-center space-x-2">
                      <PhotoIcon className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">{t('profile.ui.rewardBonus')}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('profile.ui.holdingAmount')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {providerNftBalance?.toString() || '0'} NFT
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('profile.ui.currentTier')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getNftTier(providerNftBalance)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">{t('profile.ui.rewardBonus')}</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {getNftDiscount(providerNftBalance) + 5}%
                      </span>
                    </div>
                    
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                      <p className="text-sm text-emerald-800 dark:text-emerald-200">
                        {t('profile.ui.providerNftDescription')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t('profile.ui.nftTierDescription')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-1">Customer NFT</h5>
                    <ul className="text-gray-600 dark:text-gray-300 space-y-1">
                      <li>• {t('profile.ui.customerNftTiers.bronze')}</li>
                      <li>• {t('profile.ui.customerNftTiers.silver')}</li>
                      <li>• {t('profile.ui.customerNftTiers.gold')}</li>
                      <li>• {t('profile.ui.customerNftTiers.platinum')}</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-1">Provider NFT</h5>
                    <ul className="text-gray-600 dark:text-gray-300 space-y-1">
                      <li>• {t('profile.ui.providerNftTiers.bronze')}</li>
                      <li>• {t('profile.ui.providerNftTiers.silver')}</li>
                      <li>• {t('profile.ui.providerNftTiers.gold')}</li>
                      <li>• {t('profile.ui.providerNftTiers.platinum')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              <ActivityFeed 
                activities={activities}
                isLoading={isLoadingActivities}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}