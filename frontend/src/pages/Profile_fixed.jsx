import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useSignMessage } from 'wagmi'
import { formatEther, parseEther, getAddress, formatUnits } from 'viem'
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
  LockClosedIcon
} from '@heroicons/react/24/outline'
import { CONTRACT_ADDRESSES, CONTRACT_ABI } from '../config/contracts'
import { Link } from 'react-router-dom'
import { useUserProfile, userProfileService } from '../services/userProfileService'
import { useActivityManager } from '../hooks/useActivityManager'
import ActivityFeed from '../components/ActivityFeed'

export default function Profile() {
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
  
  // 事件驱动数据更新状态
  const [lastUpdateTime, setLastUpdateTime] = useState(null)
  
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
  })

  // 读取CC Token余额
  const { data: ccBalance, error: ccError, isLoading: ccLoading } = useBalance({
    address: address,
    token: CONTRACT_ADDRESSES.CC_TOKEN,
    enabled: !!address && !!CONTRACT_ADDRESSES.CC_TOKEN,
  })

  // 读取USDC余额
  const { data: usdcBalance, error: usdcError, isLoading: usdcLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.USDC_TOKEN,
    abi: CONTRACT_ABI.USDC_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address && !!CONTRACT_ADDRESSES.USDC_TOKEN,
  })

  // 读取质押的ETH数量
  const { data: stakedEthAmount, error: stakedEthError, isLoading: stakedEthLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL,
    functionName: 'stakedEthAmount',
    args: [address],
    enabled: !!address && !!CONTRACT_ADDRESSES.STAKING_POOL,
  })

  // 读取质押的CC数量
  const { data: stakedCcAmount, error: stakedCcError, isLoading: stakedCcLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL,
    functionName: 'stakedCcAmount',
    args: [address],
    enabled: !!address && !!CONTRACT_ADDRESSES.STAKING_POOL,
  })

  // 读取用户是否拥有Customer NFT
  const { data: customerNftBalance, error: customerNftError, isLoading: customerNftLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
    abi: CONTRACT_ABI.CUSTOMER_NFT,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address && !!CONTRACT_ADDRESSES.CUSTOMER_NFT,
  })

  // 读取用户是否拥有Provider NFT
  const { data: providerNftBalance, error: providerNftError, isLoading: providerNftLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.PROVIDER_NFT,
    abi: CONTRACT_ABI.PROVIDER_NFT,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address && !!CONTRACT_ADDRESSES.PROVIDER_NFT,
  })

  // 读取ETH Vault中的ETH余额
  const { data: ethVaultBalance, error: ethVaultError, isLoading: ethVaultLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.ETH_VAULT,
    abi: CONTRACT_ABI.ETH_VAULT,
    functionName: 'getEthBalance',
    args: [address],
    enabled: !!address && !!CONTRACT_ADDRESSES.ETH_VAULT,
  })

  // 合约写入操作
  const { writeContract: writeStakeEth, isPending: isStakeEthPending, data: stakeEthData } = useWriteContract()
  const { writeContract: writeStakeCc, isPending: isStakeCcPending, data: stakeCcData } = useWriteContract()
  const { writeContract: writeUnstakeEth, isPending: isUnstakeEthPending, data: unstakeEthData } = useWriteContract()
  const { writeContract: writeUnstakeCc, isPending: isUnstakeCcPending, data: unstakeCcData } = useWriteContract()
  const { writeContract: writeDepositEth, isPending: isDepositEthPending, data: depositEthData } = useWriteContract()
  const { writeContract: writeWithdrawEth, isPending: isWithdrawEthPending, data: withdrawEthData } = useWriteContract()
  const { writeContract: writeMintCustomerNft, isPending: isMintCustomerNftPending, data: mintCustomerNftData } = useWriteContract()
  const { writeContract: writeMintProviderNft, isPending: isMintProviderNftPending, data: mintProviderNftData } = useWriteContract()
  const { writeContract: writeClaimRewards, isPending: isClaimRewardsPending, data: claimRewardsData } = useWriteContract()

  // 交易状态监听
  const { isLoading: isStakeEthLoading, isSuccess: isStakeEthSuccess } = useWaitForTransactionReceipt({ hash: stakeEthData })
  const { isLoading: isStakeCcLoading, isSuccess: isStakeCcSuccess } = useWaitForTransactionReceipt({ hash: stakeCcData })
  const { isLoading: isUnstakeEthLoading, isSuccess: isUnstakeEthSuccess } = useWaitForTransactionReceipt({ hash: unstakeEthData })
  const { isLoading: isUnstakeCcLoading, isSuccess: isUnstakeCcSuccess } = useWaitForTransactionReceipt({ hash: unstakeCcData })
  const { isLoading: isDepositEthLoading, isSuccess: isDepositEthSuccess } = useWaitForTransactionReceipt({ hash: depositEthData })
  const { isLoading: isWithdrawEthLoading, isSuccess: isWithdrawEthSuccess } = useWaitForTransactionReceipt({ hash: withdrawEthData })
  const { isLoading: isMintCustomerNftLoading, isSuccess: isMintCustomerNftSuccess } = useWaitForTransactionReceipt({ hash: mintCustomerNftData })
  const { isLoading: isMintProviderNftLoading, isSuccess: isMintProviderNftSuccess } = useWaitForTransactionReceipt({ hash: mintProviderNftData })
  const { isLoading: isClaimRewardsLoading, isSuccess: isClaimRewardsSuccess } = useWaitForTransactionReceipt({ hash: claimRewardsData })

  // 签名消息
  const { signMessage, isPending: isSignPending } = useSignMessage()

  // 计算总资产价值
  const totalAssetValue = useMemo(() => {
    const ethValue = ethBalance ? parseFloat(formatEther(ethBalance.value)) * 3000 : 0
    const ccValue = ccBalance ? parseFloat(formatEther(ccBalance.value)) * 1 : 0
    const usdcValue = usdcBalance ? parseFloat(formatUnits(usdcBalance, 6)) : 0
    return ethValue + ccValue + usdcValue
  }, [ethBalance, ccBalance, usdcBalance])

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
      name: '总资产价值',
      value: `$${(totalAssetValue).toFixed(2)}`,
      unit: '',
      change: '+12.5%',
      changeType: 'positive',
      icon: ChartBarIcon,
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      name: 'ETH余额',
      value: ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : '0',
      unit: 'ETH',
      change: '+5.2%',
      changeType: 'positive',
      icon: BanknotesIcon,
      iconColor: 'text-teal-600 dark:text-teal-400'
    },
    {
      name: 'CC代币',
      value: ccBalance ? formatCC(ccBalance.value) : '0',
      unit: 'CC',
      change: '+8.1%',
      changeType: 'positive',
      icon: ArrowTrendingUpIcon,
      iconColor: 'text-cyan-600 dark:text-cyan-400'
    },
    {
      name: 'USDC余额',
      value: usdcBalance ? formatUSDC(usdcBalance) : '0',
      unit: 'USDC',
      change: '+3.7%',
      changeType: 'positive',
      icon: ShieldCheckIcon,
      iconColor: 'text-amber-600 dark:text-amber-400'
    }
  ]

  // 事件监听
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL,
    eventName: 'EthStaked',
    onLogs(logs) {
      logs.forEach(log => {
        const logAddress = log.args.user.toLowerCase()
        if (logAddress === normalizedAddress?.toLowerCase()) {
          addStakeActivity('ETH', formatEther(log.args.amount))
          setLastUpdateTime(new Date())
        }
      })
    }
  })

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL,
    eventName: 'CcStaked',
    onLogs(logs) {
      logs.forEach(log => {
        const logAddress = log.args.user.toLowerCase()
        if (logAddress === normalizedAddress?.toLowerCase()) {
          addStakeActivity('CC', formatEther(log.args.amount))
          setLastUpdateTime(new Date())
        }
      })
    }
  })

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.ETH_VAULT,
    abi: CONTRACT_ABI.ETH_VAULT,
    eventName: 'EthDeposited',
    onLogs(logs) {
      logs.forEach(log => {
        const logAddress = log.args.user.toLowerCase()
        if (logAddress === normalizedAddress?.toLowerCase()) {
          addDepositActivity('ETH', formatEther(log.args.amount))
          setLastUpdateTime(new Date())
        }
      })
    }
  })

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
        alert('✅ 个人资料已保存成功')
      } else {
        alert(`⚠️ 个人资料仅保存到本地\n${loginError}`)
      }
    } catch (error) {
      console.error('保存用户信息失败:', error)
      
      let errorMessage = '❌ 保存失败，但资料已保留在本地'
      
      if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        errorMessage = t('wallet.networkConnectionFailed')
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
        errors.email = '请输入有效的邮箱地址'
      }
    }
    
    // 网站验证
    if (data.website && data.website.trim()) {
      try {
        new URL(data.website.startsWith('http') ? data.website : `https://${data.website}`)
      } catch {
        errors.website = '请输入有效的网站地址'
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
          alert('签名验证失败，请重试')
        }
      } else {
        alert('生成登录挑战失败，请重试')
      }
    } catch (error) {
      console.error('签名登录失败:', error)
      alert('签名登录失败，请重试')
    } finally {
      setIsSigning(false)
    }
  }

  // 格式化代币余额显示
  const formatUSDC = (balance) => {
    if (!balance) return '0.00'
    return parseFloat(formatUnits(balance, 6)).toFixed(2)
  }

  const formatCC = (balance) => {
    if (!balance) return '0.00'
    return parseFloat(formatEther(balance)).toFixed(2)
  }

  // 计算总资产价值
  const calculateTotalValue = () => {
    const ethVaultValue = ethVaultBalance ? parseFloat(formatEther(ethVaultBalance)) : 0
    const ccValue = ccBalance ? parseFloat(formatEther(ccBalance.value)) : 0
    return (ethVaultValue * 3000 + ccValue).toFixed(2)
  }

  // 获取NFT等级
  const getNftTier = (balance) => {
    if (!balance || balance === 0n) return '无'
    if (balance >= 3n) return 'PLATINUM'
    if (balance === 2n) return 'GOLD'
    if (balance === 1n) return 'BRONZE'
    return '无'
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
    const statuses = ['创建', '已接受', '已完成', '已取消']
    return statuses[status] || '未知'
  }

  // 处理质押ETH
  const handleStakeEth = () => {
    const amount = prompt('请输入要质押的ETH数量：')
    if (amount && !isNaN(amount)) {
      writeStakeEth({
        address: CONTRACT_ADDRESSES.STAKING_POOL,
        abi: CONTRACT_ABI.STAKING_POOL,
        functionName: 'stakeEth',
        args: [],
        value: parseEther(amount)
      })
    }
  }

  // 处理质押CC
  const handleStakeCc = () => {
    const amount = prompt('请输入要质押的CC数量：')
    if (amount && !isNaN(amount)) {
      writeStakeCc({
        address: CONTRACT_ADDRESSES.STAKING_POOL,
        abi: CONTRACT_ABI.STAKING_POOL,
        functionName: 'stakeCc',
        args: [parseEther(amount)]
      })
    }
  }

  // 处理提取质押ETH
  const handleUnstakeEth = () => {
    const amount = prompt('请输入要提取的ETH数量：')
    if (amount && !isNaN(amount)) {
      writeUnstakeEth({
        address: CONTRACT_ADDRESSES.STAKING_POOL,
        abi: CONTRACT_ABI.STAKING_POOL,
        functionName: 'unstakeEth',
        args: [parseEther(amount)]
      })
    }
  }

  // 处理提取质押CC
  const handleUnstakeCc = () => {
    const amount = prompt('请输入要提取的CC数量：')
    if (amount && !isNaN(amount)) {
      writeUnstakeCc({
        address: CONTRACT_ADDRESSES.STAKING_POOL,
        abi: CONTRACT_ABI.STAKING_POOL,
        functionName: 'unstakeCc',
        args: [parseEther(amount)]
      })
    }
  }

  // 处理存入ETH
  const handleDepositEth = () => {
    const amount = prompt('请输入要存入的ETH数量：')
    if (amount && !isNaN(amount)) {
      writeDepositEth({
        address: CONTRACT_ADDRESSES.ETH_VAULT,
        abi: CONTRACT_ABI.ETH_VAULT,
        functionName: 'depositEth',
        args: [],
        value: parseEther(amount)
      })
    }
  }

  // 处理提取ETH
  const handleWithdrawEth = () => {
    const amount = prompt('请输入要提取的ETH数量：')
    if (amount && !isNaN(amount)) {
      writeWithdrawEth({
        address: CONTRACT_ADDRESSES.ETH_VAULT,
        abi: CONTRACT_ABI.ETH_VAULT,
        functionName: 'withdrawEth',
        args: [parseEther(amount)]
      })
    }
  }

  // 处理铸造Customer NFT
  const handleMintCustomerNft = () => {
    const amount = prompt('请输入要质押的ETH数量来铸造Customer NFT（至少0.1 ETH）：')
    if (amount && !isNaN(amount) && parseFloat(amount) >= 0.1) {
      writeMintCustomerNft({
        address: CONTRACT_ADDRESSES.STAKING_POOL,
        abi: CONTRACT_ABI.STAKING_POOL,
        functionName: 'mintCustomerNft',
        args: []
      })
    } else {
      alert('请输入至少0.1 ETH')
    }
  }

  // 处理铸造Provider NFT
  const handleMintProviderNft = () => {
    const amount = prompt('请输入要质押的CC数量来铸造Provider NFT（至少100 CC）：')
    if (amount && !isNaN(amount) && parseFloat(amount) >= 100) {
      writeMintProviderNft({
        address: CONTRACT_ADDRESSES.STAKING_POOL,
        abi: CONTRACT_ABI.STAKING_POOL,
        functionName: 'mintProviderNft',
        args: []
      })
    } else {
      alert('请输入至少100 CC')
    }
  }

  // 处理提取奖励
  const handleClaimRewards = () => {
    writeClaimRewards({
      address: CONTRACT_ADDRESSES.PROVIDER_INCENTIVE,
      abi: CONTRACT_ABI.PROVIDER_INCENTIVE,
      functionName: 'claimRewards',
      args: []
    })
  }

  // 显示加载状态
  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-gray-500/20">
            <WalletIcon className="w-10 h-10 text-gray-600 dark:text-gray-300 drop-shadow-md" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('wallet.connectWalletPrompt')}</h2>
          <p className="text-gray-600">{t('wallet.connectWalletRequired')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 个人资料展示已隐藏，专注核心业务逻辑 */}
      
      {/* 钱包地址信息 */}
      <div className="card">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <WalletIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
          </div>
          <span className="font-mono text-gray-800">{address?.slice(0, 8)}...{address?.slice(-6)}</span>
        </div>
      </div>

      {/* 资产统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <div className="flex items-baseline space-x-1">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <span className="text-sm text-gray-500">{stat.unit}</span>
                </div>
                {stat.change && (
                  <div className={`text-xs font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change} 较上月
                  </div>
                )}
              </div>
              <div className="p-4 rounded-xl">
                <stat.icon className={`w-8 h-8 ${stat.iconColor} drop-shadow-sm`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 标签页导航 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: '概览', icon: ChartBarIcon },
              { id: 'staking', name: '质押', icon: ArrowTrendingUpIcon },
              { id: 'vault', name: 'ETH充值', icon: BanknotesIcon },
              { id: 'nfts', name: 'NFT', icon: PhotoIcon },
              { id: 'activity', name: '活动', icon: ClockIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">钱包余额</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">ETH</span>
                      <span className="font-medium">
                        {ethBalance ? formatEther(ethBalance.value) : '0'} ETH
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">CC</span>
                      <span className="font-medium">
                        {ccBalance ? formatEther(ccBalance.value) : '0'} CC
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">USDC</span>
                      <span className="font-medium">
                        {usdcBalance ? formatUSDC(usdcBalance) : '0'} USDC
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">质押资产</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">质押ETH</span>
                      <span className="font-medium">
                        {stakedEthAmount ? formatEther(stakedEthAmount) : '0'} ETH
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">质押CC</span>
                      <span className="font-medium">
                        {stakedCcAmount ? formatEther(stakedCcAmount) : '0'} CC
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">预估年化收益</span>
                      <span className="font-medium text-green-600">8%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* NFT状态 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer NFT</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600">持有数量</p>
                      <p className="text-xl font-bold text-blue-600">
                        {customerNftBalance?.toString() || '0'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600">当前等级</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {getNftTier(customerNftBalance)}
                      </p>
                    </div>
                  </div>
                  {customerNftBalance && customerNftBalance > 0n && (
                    <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                      <p className="text-sm text-blue-800">
                        享受 {getNftDiscount(customerNftBalance)}% 的服务折扣
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider NFT</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600">持有数量</p>
                      <p className="text-xl font-bold text-purple-600">
                        {providerNftBalance?.toString() || '0'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600">当前等级</p>
                      <p className="text-lg font-semibold text-purple-600">
                        {getNftTier(providerNftBalance)}
                      </p>
                    </div>
                  </div>
                  {providerNftBalance && providerNftBalance > 0n && (
                    <div className="mt-4 p-3 bg-purple-100 rounded-lg">
                      <p className="text-sm text-purple-800">
                        享受 {getNftDiscount(providerNftBalance) + 5}% 的奖励加成
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
                    <h3 className="text-lg font-semibold text-gray-900">ETH质押</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-md">
                        <ArrowTrendingUpIcon className="w-5 h-5 text-white drop-shadow-sm" />
                      <span className="text-sm text-emerald-600">8% APR</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">已质押ETH</span>
                      <span className="font-medium">
                        {stakedEthAmount ? formatEther(stakedEthAmount) : '0'} ETH
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">钱包余额</span>
                      <span className="font-medium">
                        {ethBalance ? formatEther(ethBalance.value) : '0'} ETH
                      </span>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleStakeEth}
                          disabled={isStakeEthPending || isStakeEthLoading}
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PlusIcon className="w-4 h-4" />
                          <span>质押</span>
                        </button>
                        
                        <button
                          onClick={handleUnstakeEth}
                          disabled={isUnstakeEthPending || isUnstakeEthLoading || !stakedEthAmount || stakedEthAmount === 0n}
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>提取</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CC质押 */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">CC质押</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-md">
                        <ArrowTrendingUpIcon className="w-5 h-5 text-white drop-shadow-sm" />
                      <span className="text-sm text-blue-600">8% APR</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">已质押CC</span>
                      <span className="font-medium">
                        {stakedCcAmount ? formatEther(stakedCcAmount) : '0'} CC
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">钱包余额</span>
                      <span className="font-medium">
                        {ccBalance ? formatEther(ccBalance.value) : '0'} CC
                      </span>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleStakeCc}
                          disabled={isStakeCcPending || isStakeCcLoading}
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PlusIcon className="w-4 h-4" />
                          <span>质押</span>
                        </button>
                        
                        <button
                          onClick={handleUnstakeCc}
                          disabled={isUnstakeCcPending || isUnstakeCcLoading || !stakedCcAmount || stakedCcAmount === 0n}
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>提取</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* NFT铸造 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">铸造Customer NFT</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                        <PhotoIcon className="w-5 h-5 text-white drop-shadow-sm" />
                      <span className="text-sm text-blue-600">5% 折扣</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      质押至少0.1 ETH即可铸造Customer NFT，享受计算服务折扣
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">当前持有</span>
                      <span className="font-medium">
                        {customerNftBalance?.toString() || '0'} NFT
                      </span>
                    </div>
                    
                    <button
                      onClick={handleMintCustomerNft}
                      disabled={isMintCustomerNftPending || isMintCustomerNftLoading}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isMintCustomerNftPending || isMintCustomerNftLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <PhotoIcon className="w-4 h-4" />
                      )}
                      <span>铸造NFT</span>
                    </button>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">铸造Provider NFT</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                        <PhotoIcon className="w-5 h-5 text-white drop-shadow-sm" />
                      <span className="text-sm text-purple-600">奖励加成</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      质押至少100 CC即可铸造Provider NFT，享受提供者奖励加成
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">当前持有</span>
                      <span className="font-medium">
                        {providerNftBalance?.toString() || '0'} NFT
                      </span>
                    </div>
                    
                    <button
                      onClick={handleMintProviderNft}
                      disabled={isMintProviderNftPending || isMintProviderNftLoading}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isMintProviderNftPending || isMintProviderNftLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <PhotoIcon className="w-4 h-4" />
                      )}
                      <span>铸造NFT</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">ETH充值</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
                      <BanknotesIcon className="w-5 h-5 text-white drop-shadow-sm" />
                    <span className="text-sm text-indigo-600">安全存储</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Vault余额</span>
                    <span className="font-medium">
                      {ethVaultBalance ? formatEther(ethVaultBalance) : '0'} ETH
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">钱包余额</span>
                    <span className="font-medium">
                      {ethBalance ? formatEther(ethBalance.value) : '0'} ETH
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">总资产价值</span>
                    <span className="font-medium">
                      ${calculateTotalValue()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">ETH充值说明</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 安全存储您的ETH资产</li>
                  <li>• 支持随时存入和提取</li>
                  <li>• 与质押池完全分离</li>
                  <li>• 无锁定时间限制</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'nfts' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Customer NFT</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                        <PhotoIcon className="w-5 h-5 text-white drop-shadow-sm" />
                      <span className="text-sm text-blue-600">服务折扣</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">持有数量</span>
                      <span className="font-medium">
                        {customerNftBalance?.toString() || '0'} NFT
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">当前等级</span>
                      <span className="font-medium">
                        {getNftTier(customerNftBalance)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">折扣比例</span>
                      <span className="font-medium text-green-600">
                        {getNftDiscount(customerNftBalance)}%
                      </span>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        使用Customer NFT享受计算服务费用折扣，等级越高折扣越多
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Provider NFT</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                        <PhotoIcon className="w-5 h-5 text-white drop-shadow-sm" />
                      <span className="text-sm text-purple-600">奖励加成</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">持有数量</span>
                      <span className="font-medium">
                        {providerNftBalance?.toString() || '0'} NFT
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">当前等级</span>
                      <span className="font-medium">
                        {getNftTier(providerNftBalance)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">奖励加成</span>
                      <span className="font-medium text-purple-600">
                        {getNftDiscount(providerNftBalance) + 5}%
                      </span>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-sm text-purple-800">
                        使用Provider NFT享受服务提供者奖励加成，提升收益
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">NFT等级说明</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-1">Customer NFT</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• BRONZE: 1个NFT, 5%折扣</li>
                      <li>• SILVER: 2个NFT, 8%折扣</li>
                      <li>• GOLD: 3个NFT, 12%折扣</li>
                      <li>• PLATINUM: 4个NFT, 15%折扣</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 mb-1">Provider NFT</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• BRONZE: 1个NFT, 10%奖励</li>
                      <li>• SILVER: 2个NFT, 12%奖励</li>
                      <li>• GOLD: 3个NFT, 14%奖励</li>
                      <li>• PLATINUM: 4个NFT, 15%奖励</li>
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