import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useSignMessage } from 'wagmi'
import { formatEther, parseEther, getAddress } from 'viem'
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
import SimpleQuickAction from '../components/SimpleQuickAction'
import { Link } from 'react-router-dom'
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

  // 读取ETH Vault余额
  const { data: ethVaultBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.ETH_VAULT,
    abi: CONTRACT_ABI.ETH_VAULT_ABI,
    functionName: 'getUserBalance',
    args: [address],
    enabled: !!address,
  })

  // 读取CC代币余额
  const { data: ccBalance, error: ccError, isLoading: ccLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  })

  // 读取CC代币精度
  const { data: ccTokenDecimals, isLoading: decimalsLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    functionName: 'decimals',
    enabled: !!address,
  })

  // 读取客户NFT余额
  const { data: customerNFTBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
    abi: CONTRACT_ABI.CUSTOMER_NFT_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  })

  // 读取提供商NFT余额
  const { data: providerNFTBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.PROVIDER_NFT,
    abi: CONTRACT_ABI.PROVIDER_NFT_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  })

  // 读取用户质押信息 - 使用完整ABI
  const { data: userStakes, error: stakesError, isLoading: stakesLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    functionName: 'getUserStakes',
    args: [address],
    enabled: !!address,
  })

  // 读取待领取奖励 - 使用完整ABI
  const { data: pendingRewards, error: rewardsError, isLoading: rewardsLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    functionName: 'getPendingRewards',
    args: [address],
    enabled: !!address,
  })

  // 读取用户订单历史
  const { data: userOrders } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ABI,
    functionName: 'getUserOrders',
    args: [address, false, 10], // 获取最近10个订单
    enabled: !!address,
  })

  // 签名功能
  const { signMessageAsync, isPending: isSignPending } = useSignMessage()

  // 读取提供商订单历史（如果有提供商NFT）
  const { data: providerOrders } = useReadContract({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ABI,
    functionName: 'getUserOrders',
    args: [address, true, 10], // 获取最近10个提供商订单
    enabled: !!address && providerNFTBalance && Number(providerNFTBalance) > 0,
  })

  // 领取奖励
  const { 
    writeContract: claimRewards, 
    data: claimHash,
    isPending: isClaimPending 
  } = useWriteContract()

  const { isLoading: isClaimLoading } = useWaitForTransactionReceipt({
    hash: claimHash,
  })

  const handleClaimRewards = async () => {
    if (!pendingRewards || pendingRewards === 0n) {
      alert('没有可领取的奖励')
      return
    }

    try {
      await claimRewards({
        address: CONTRACT_ADDRESSES.STAKING_POOL,
        abi: CONTRACT_ABI.STAKING_POOL_ABI,
        functionName: 'claimRewards',
      })
    } catch (error) {
      console.error('领取奖励失败:', error)
      alert('领取奖励失败: ' + error.message)
    }
  }

  // 签名登录函数
  const handleSignIn = async () => {
    if (!normalizedAddress) return
    
    setIsSigning(true)
    try {
      // 1. 获取签名挑战
      const challenge = await userProfileService.getChallenge(normalizedAddress)
      setSignatureChallenge(challenge)
      
      // 2. 请求用户签名
      const signature = await signMessageAsync({ message: challenge.message })
      
      // 3. 验证签名并获取token
      await userProfileService.verifySignature(normalizedAddress, signature, challenge.nonce)
      
      // 4. 获取用户信息
      const profile = await userProfileService.getUserProfile()
      
      setUserStatus('has_profile')
      setProfileData({
        name: profile.name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        website: profile.website || '',
        location: profile.location || ''
      })
      
      setShowSignInModal(false)
      alert('登录成功！')
      
    } catch (error) {
      console.error('签名登录失败:', error)
      alert(`登录失败: ${error.message}`)
    } finally {
      setIsSigning(false)
      setSignatureChallenge(null)
    }
  }

  // 取消签名登录
  const handleCancelSignIn = () => {
    setShowSignInModal(false)
    setSignatureChallenge(null)
    // 保持当前状态不变
  }

  // 基于区块链事件的数据更新监听
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
        console.log('CC代币余额变化事件触发')
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  // 监听ETH Vault相关事件 - 只在用户信息加载完成后启用
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.ETH_VAULT,
    abi: CONTRACT_ABI.ETH_VAULT_ABI,
    eventName: 'ETHDeposited',
    onLogs: (logs) => {
      const userEvent = logs.find(log => {
        const logAddress = log.args.user.toLowerCase();
        return logAddress === normalizedAddress?.toLowerCase();
      })
      if (userEvent) {
        setLastUpdateTime(new Date())
        console.log('ETH Vault存款事件触发')
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.ETH_VAULT,
    abi: CONTRACT_ABI.ETH_VAULT_ABI,
    eventName: 'ETHWithdrawn',
    onLogs: (logs) => {
      const userEvent = logs.find(log => {
        const logAddress = log.args.user.toLowerCase();
        return logAddress === normalizedAddress?.toLowerCase();
      })
      if (userEvent) {
        setLastUpdateTime(new Date())
        console.log('ETH Vault取款事件触发')
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  // 监听质押相关事件
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    eventName: 'Staked', // 正确的事件名称
    onLogs: (logs) => {
      const userStakeEvent = logs.find(log => log.args.user === address)
      if (userStakeEvent) {
        setLastUpdateTime(new Date())
        console.log('用户质押事件触发')
        
        // 添加活动记录
        addStakeActivity({
          amount: formatEther(userStakeEvent.args.amount),
          token: userStakeEvent.args.assetType === 0 ? 'ETH' : 'CC',
          txHash: userStakeEvent.transactionHash
        })
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  // 监听NFT铸造事件
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    eventName: 'NFTMintedFromStake', // NFT铸造事件
    onLogs: (logs) => {
      const userNFTEvent = logs.find(log => log.args.user === address)
      if (userNFTEvent) {
        setLastUpdateTime(new Date())
        console.log('用户NFT铸造事件触发')
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  // 监听解质押事件 - 通过CC代币转移检测
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    eventName: 'Transfer',
    onLogs: (logs) => {
      const unstakeEvent = logs.find(log => 
        log.args.from === address && log.args.to === CONTRACT_ADDRESSES.STAKING_POOL
      )
      if (unstakeEvent) {
        setLastUpdateTime(new Date())
        console.log('用户解质押相关事件触发')
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  // 监听奖励领取事件
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    eventName: 'RewardsClaimed', // 正确的事件名称
    onLogs: (logs) => {
      const userRewardEvent = logs.find(log => log.args.user === address)
      if (userRewardEvent) {
        setLastUpdateTime(new Date())
        console.log('用户奖励领取事件触发')
        
        // 添加活动记录
        addClaimRewardsActivity({
          amount: formatEther(userRewardEvent.args.amount),
          txHash: userRewardEvent.transactionHash
        })
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  // 监听客户NFT铸造事件
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.CUSTOMER_NFT,
    abi: CONTRACT_ABI.CUSTOMER_NFT_ABI,
    eventName: 'CustomerNFTMinted',
    onLogs: (logs) => {
      const userEvent = logs.find(log => {
        const logAddress = log.args.to.toLowerCase();
        return logAddress === normalizedAddress?.toLowerCase();
      })
      if (userNFTEvent) {
        setLastUpdateTime(new Date())
        console.log('客户NFT铸造事件触发')
        
        // 添加活动记录
        addMintNFTActivity({
          nftType: 'customer',
          nftName: `客户NFT #${userNFTEvent.args.tokenId.toString()}`,
          tokenId: userNFTEvent.args.tokenId.toString(),
          txHash: userNFTEvent.transactionHash
        })
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  // 监听提供商NFT铸造事件
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.PROVIDER_NFT,
    abi: CONTRACT_ABI.PROVIDER_NFT_ABI,
    eventName: 'ProviderNFTMinted',
    onLogs: (logs) => {
      const userEvent = logs.find(log => {
        const logAddress = log.args.provider.toLowerCase();
        return logAddress === normalizedAddress?.toLowerCase();
      })
      if (userNFTEvent) {
        setLastUpdateTime(new Date())
        console.log('提供商NFT铸造事件触发')
        
        // 添加活动记录
        addMintNFTActivity({
          nftType: 'provider',
          nftName: `提供商NFT #${userNFTEvent.args.tokenId.toString()}`,
          tokenId: userNFTEvent.args.tokenId.toString(),
          txHash: userNFTEvent.transactionHash
        })
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })
  
  // 监听质押NFT铸造事件
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STAKING_POOL,
    abi: CONTRACT_ABI.STAKING_POOL_ABI,
    eventName: 'NFTMintedFromStake',
    onLogs: (logs) => {
      const userNFTEvent = logs.find(log => log.args.user === address)
      if (userNFTEvent) {
        setLastUpdateTime(new Date())
        console.log('质押NFT铸造事件触发')
        
        // 添加活动记录
        addMintNFTActivity({
          nftType: userNFTEvent.args.isCustomerNFT ? 'customer' : 'provider',
          nftName: `${userNFTEvent.args.isCustomerNFT ? '客户' : '提供商'}NFT #${userNFTEvent.args.tokenId.toString()}`,
          tokenId: userNFTEvent.args.tokenId.toString(),
          txHash: userNFTEvent.transactionHash
        })
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  // 监听订单相关事件
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ABI,
    eventName: 'OrderCreated',
    onLogs: (logs) => {
      const userEvent = logs.find(log => {
        const logAddress = log.args.client.toLowerCase();
        return logAddress === normalizedAddress?.toLowerCase();
      })
      if (userOrderEvent) {
        setLastUpdateTime(new Date())
        console.log('用户订单创建事件触发')
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ABI,
    eventName: 'OrderCompleted',
    onLogs: (logs) => {
      const userEvent = logs.find(log => {
        const logAddress = log.args.client.toLowerCase();
        return logAddress === normalizedAddress?.toLowerCase();
      })
      if (userOrderEvent) {
        setLastUpdateTime(new Date())
        console.log('用户订单完成事件触发')
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.COMPUTE_MARKET,
    abi: CONTRACT_ABI.COMPUTE_MARKET_ABI,
    eventName: 'OrderAccepted',
    onLogs: (logs) => {
      const providerOrderEvent = logs.find(log => log.args.provider === address)
      if (providerOrderEvent) {
        setLastUpdateTime(new Date())
        console.log('提供商订单接受事件触发')
      }
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  // 监听区块更新以捕获ETH余额变化
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    eventName: 'Transfer',
    onLogs: () => {
      // 任何代币转账都可能意味着网络活动，更新时间戳
      setLastUpdateTime(new Date())
    },
    enabled: !!normalizedAddress && userStatus === 'has_profile',
  })

  // 格式化用户数据
  const formatProfileData = (data) => {
    const formatted = { ...data }
    
    // 格式化网站地址
    if (formatted.website && formatted.website.trim()) {
      let website = formatted.website.trim()
      if (!website.match(/^https?:\/\//)) {
        website = `https://${website}`
      }
      formatted.website = website
    } else {
      formatted.website = ''
    }
    
    return formatted
  }
  
  const handleSaveProfile = async () => {
    // 表单验证
    if (!validateProfileForm()) {
      return
    }
    
    setIsSaving(true)
    try {
      // 格式化数据后保存到后端
      const formattedData = formatProfileData(profileData)
      
      // 尝试保存到后端
      let savedToBackend = false
      let loginError = null
      
      if (userProfileService.isLoggedIn()) {
        try {
          await userProfileService.updateUserProfile(formattedData)
          savedToBackend = true
        } catch (backendError) {
          console.log('后端保存失败:', backendError.message)
          
          // 检查是否是认证错误
          if (backendError.message.includes('token') || 
              backendError.message.includes('认证') || 
              backendError.message.includes('登录')) {
            loginError = t('wallet.reconnectWallet')
          } else {
            loginError = `保存失败: ${backendError.message}`
          }
        }
      } else {
        // 尝试自动重新登录
        try {
          console.log('尝试自动重新登录...')
          const reLoginResult = await userProfileService.silentLogin(address)
          if (reLoginResult) {
            // 重新登录成功，再次尝试保存
            try {
              await userProfileService.updateUserProfile(formattedData)
              savedToBackend = true
              console.log('重新登录后保存成功')
            } catch (retryError) {
              loginError = `重新登录后保存失败: ${retryError.message}`
            }
          } else {
            loginError = '登录状态已过期，请重新连接钱包'
          }
        } catch (reLoginError) {
          loginError = `自动登录失败: ${reLoginError.message}`
        }
      }
      
      // 无论后端保存是否成功，都更新前端状态
      setProfileData(formattedData)
      
      // 如果成功保存到后端，重新获取完整profile
      if (savedToBackend) {
        try {
          const profile = await userProfileService.getUserProfile()
          setProfileData({
            name: profile.name || '',
            email: profile.email || '',
            bio: profile.bio || '',
            website: profile.website || '',
            location: profile.location || ''
          })
        } catch (profileError) {
          // 如果获取失败，使用保存的数据
          setProfileData(formattedData)
        }
      }
      
      // 更新用户状态
      setUserStatus('has_profile')
      setIsEditing(false)
      
      // 根据保存结果显示不同的提示
      if (savedToBackend) {
        alert('✅ 个人资料已保存成功')
      } else if (loginError) {
        alert(`⚠️ 个人资料仅保存到本地\n${loginError}`)
      } else {
        alert('📝 个人资料已更新（本地保存）\n\n您的资料已保存到本地，重新连接服务器后将自动同步。')
      }
    } catch (error) {
      console.error('保存用户信息失败:', error)
      
      // 简化错误提示，因为现在允许本地编辑
      let errorMessage = '❌ 保存失败，但资料已保留在本地'
      
      if (error.message.includes('network')) {
        errorMessage = t('wallet.networkConnectionFailed')
      } else if (error.message) {
        errorMessage = `⚠️ ${error.message}\n\n资料已保留在本地，请稍后重试。`
      }
      
      alert(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }
  
  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false)
    // 重新加载用户信息，使用与初始加载相同的逻辑
    const reloadUserInfo = async () => {
      if (!isConnected || !address) return
      
      setUserStatus('loading')
      setIsLoadingProfile(true)
      setProfileLoadError(null)
      
      try {
        console.log('取消编辑，重新加载用户信息...')
        
        // 首先尝试静默登录
        const silentLoginResult = await userProfileService.silentLogin(address)
        console.log('取消编辑时的静默登录结果:', silentLoginResult)
        
        if (silentLoginResult) {
          // 静默登录成功，获取完整用户信息
          try {
            const profile = await userProfileService.getUserProfile()
            setUserStatus('has_profile')
            setProfileData({
              name: profile.name || '',
              email: profile.email || '',
              bio: profile.bio || '',
              website: profile.website || '',
              location: profile.location || ''
            })
          } catch (profileError) {
            console.error('取消编辑时获取用户信息失败:', profileError)
            // 静默登录成功但获取用户信息失败，进入可编辑状态
            setUserStatus('has_profile')
            setProfileData({
              name: '',
              email: '',
              bio: '',
              website: '',
              location: ''
            })
          }
        } else {
          // 静默登录失败，检查用户是否存在
          try {
            const userExists = await userProfileService.checkUserExists(address)
            
            if (userExists.exists && userExists.profile) {
              // 用户存在且有profile信息，使用返回的数据
              setUserStatus('has_profile')
              setProfileData({
                name: userExists.profile.name || '',
                email: userExists.profile.email || '',
                bio: userExists.profile.bio || '',
                website: userExists.profile.website || '',
                location: userExists.profile.location || ''
              })
            } else {
              // 用户不存在或没有profile信息，设置为可编辑状态
              setUserStatus('has_profile')
              setProfileData({
                name: '',
                email: '',
                bio: '',
                website: '',
                location: ''
              })
              if (!userExists.exists) {
                // 新用户不设置特殊错误信息
              }
            }
          } catch (existsError) {
            console.error('取消编辑时检查用户存在失败:', existsError)
            // 取消编辑时遇到错误，保持当前编辑状态或进入可编辑状态
            if (!isEditing) {
              // 不设置错误提示，让用户直接使用
              setUserStatus('has_profile')
              setProfileData({
                name: '',
                email: '',
                bio: '',
                website: '',
                location: ''
              })
            }
          }
        }
        
      } catch (error) {
        console.error('取消编辑时重新加载用户信息失败:', error)
        // 无论什么错误，都设置为可编辑状态
        // 不设置错误提示，让用户直接使用
        setUserStatus('has_profile')
        setProfileData({
          name: '',
          email: '',
          bio: '',
          website: '',
          location: ''
        })
      } finally {
        setIsLoadingProfile(false)
      }
    }
    
    reloadUserInfo()
  }
  
  // 表单验证
  const validateProfileForm = () => {
    // 验证必填和需要验证的字段
    validateField('name', profileData.name)
    validateField('email', profileData.email)
    validateField('website', profileData.website)
    
    // 检查是否有错误
    const hasErrors = Object.values(formErrors).some(error => error !== '')
    
    if (hasErrors) {
      const firstError = Object.values(formErrors).find(error => error !== '')
      alert(firstError || '请检查输入内容')
      return false
    }
    
    return true
  }
  
  // 邮箱验证
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  // URL验证 - 支持多种格式
  const isValidUrl = (url) => {
    if (!url || url.trim() === '') return true // 允许为空
    
    const trimmedUrl = url.trim()
    
    // 如果不包含协议，自动添加 https:// 进行测试
    const testUrl = trimmedUrl.match(/^https?:\/\//) 
      ? trimmedUrl 
      : `https://${trimmedUrl}`
    
    try {
      new URL(testUrl)
      // 额外检查域名格式
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
      return domainRegex.test(testUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    } catch {
      return false
    }
  }
  
  
  const handleEditProfile = () => {
    // 清除之前的表单错误
    setFormErrors({
      name: '',
      email: '',
      website: ''
    })
    
    // 直接进入编辑模式
    setIsEditing(true)
  }

  // 移除钱包认证功能

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // 实时验证
    validateField(field, value)
  }
  
  // 实时字段验证
  const validateField = (field, value) => {
    let error = ''
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = '姓名不能为空'
        }
        break
      case 'email':
        if (value && !isValidEmail(value)) {
          error = '请输入有效的邮箱地址'
        }
        break
      case 'website':
        if (value && !isValidUrl(value)) {
          error = '请输入有效的网站地址'
        }
        break
    }
    
    setFormErrors(prev => ({
      ...prev,
      [field]: error
    }))
  }

  // 延迟显示错误，避免页面切换时的短暂错误
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowErrors(true)
    }, 2000) // 2秒后才显示错误，给网络请求时间
    
    return () => clearTimeout(timer)
  }, [])

  // 钱包断开连接时重置用户状态
  useEffect(() => {
    if (!isConnected || !address) {
      // 钱包断开连接或地址为空时重置状态
      setUserStatus('disconnected')
      setIsEditing(false)
      setIsLoadingProfile(false)
      setLoadCompleted(false)
      setProfileData({
        name: '',
        email: '',
        bio: '',
        website: '',
        location: ''
      })
    }
  }, [isConnected, address])
  
  // 钱包连接后自动加载用户信息 - 基于钱包地址获取
  useEffect(() => {
    const loadUserInfo = async () => {
      if (!isConnected || !normalizedAddress) return
      
      // 如果已经在加载中，避免重复加载
      if (userStatus === 'loading' || isLoadingProfile) return
      
      setUserStatus('loading')
      setIsLoadingProfile(true)
      setProfileLoadError(null)
      setLoadCompleted(false)
      
      // 设置强制超时 - 15秒后无论如何都结束加载
      const forceTimeout = setTimeout(() => {
        console.warn('强制结束加载状态 - 超时')
        setUserStatus('has_profile')
        setIsLoadingProfile(false)
        setLoadCompleted(true)
        // 不设置错误提示，让用户直接使用
      }, 15000)
      
      try {
        console.log(t('wallet.startingUserInfoLoad'))
        console.log(t('wallet.originalAddress'), ':', address)
        console.log(t('wallet.normalizedAddress'), ':', normalizedAddress)
        console.log(t('wallet.addressType'), ':', typeof address)
        console.log(t('wallet.addressLength'), ':', address?.length)
        
        // 首先尝试静默登录
        const silentLoginResult = await userProfileService.silentLogin(normalizedAddress)
        console.log('静默登录结果:', silentLoginResult)
        
        if (silentLoginResult) {
          // 静默登录成功，获取完整用户信息
          try {
            console.log('尝试获取用户profile...')
            const profile = await userProfileService.getUserProfile()
            console.log('获取用户profile成功:', profile)
            setUserStatus('has_profile')
            setProfileData({
              name: profile.name || '',
              email: profile.email || '',
              bio: profile.bio || '',
              website: profile.website || '',
              location: profile.location || ''
            })
          } catch (profileError) {
            console.error('获取用户信息失败:', profileError)
            // 静默登录成功但获取用户信息失败，进入可编辑状态
            setUserStatus('has_profile')
            setProfileData({
              name: '',
              email: '',
              bio: '',
              website: '',
              location: ''
            })
            // 不设置错误提示，让用户直接使用
          }
        } else {
          // 静默登录失败，检查用户是否存在
          console.log('静默登录失败，检查用户是否存在...')
          try {
            console.log('调用 checkUserExists 前，地址:', normalizedAddress)
            const userExists = await userProfileService.checkUserExists(normalizedAddress)
            console.log('用户存在检查结果:', userExists)
            
            if (userExists.exists && userExists.profile) {
              // 用户存在且有profile信息
              setUserStatus('has_profile')
              setProfileData({
                name: userExists.profile.name || '',
                email: userExists.profile.email || '',
                bio: userExists.profile.bio || '',
                website: userExists.profile.website || '',
                location: userExists.profile.location || ''
              })
            } else {
              // 用户不存在或没有profile信息
              if (!userExists.exists) {
                // 新用户直接进入可编辑状态
                setUserStatus('has_profile')
                setProfileData({
                  name: '',
                  email: '',
                  bio: '',
                  website: '',
                  location: ''
                })
                // 自动进入编辑模式
                setIsEditing(true)
              } else {
                // 已有用户但没有profile信息，直接进入编辑状态
                setUserStatus('has_profile')
                setProfileData({
                  name: '',
                  email: '',
                  bio: '',
                  website: '',
                  location: ''
                })
                setIsEditing(true)
              }
            }
          } catch (existsError) {
            console.error('检查用户存在失败:', existsError)
            // 检查失败，可能是网络问题，进入可编辑状态
            setUserStatus('has_profile')
            setProfileData({
              name: '',
              email: '',
              bio: '',
              website: '',
              location: ''
            })
            // 不设置错误提示，让用户直接使用
          }
        }
        
      } catch (error) {
        console.error('加载用户信息失败:', error)
        // 明确设置错误状态
        setUserStatus('error')
        // 不设置错误提示，让用户直接使用
        setProfileData({
          name: '',
          email: '',
          bio: '',
          website: '',
          location: ''
        })
      } finally {
        clearTimeout(forceTimeout)
        setIsLoadingProfile(false)
        setLoadCompleted(true)
      }
    }
    
    loadUserInfo()
  }, [isConnected, address])
  
  // 只显示真正的关键错误（网络问题等）
  useEffect(() => {
    if (!showErrors) return
    
    const criticalErrors = []
    
    // 检查是否是网络连接问题
    if (ccError && ccError.message.includes('network')) {
      criticalErrors.push('网络连接问题')
    }
    if (ethError && ethError.message.includes('network')) {
      criticalErrors.push('ETH余额获取失败')
    }
    
    if (criticalErrors.length > 0) {
      setCriticalError(criticalErrors.join(', '))
    } else {
      setCriticalError(null)
    }
  }, [ccError, ethError, showErrors])
  
  // 格式化代币余额的函数
  const formatTokenBalance = (balance, decimals) => {
    if (!balance || !decimals) return '0.0000'
    const divisor = Math.pow(10, decimals)
    return (parseFloat(balance) / divisor).toFixed(4)
  }

  // 计算总资产价值（简化计算）
  const totalAssetsValue = () => {
    const ethVaultValue = parseFloat(formatEther(ethVaultBalance || 0n))
    const ccValue = parseFloat(formatTokenBalance(ccBalance || 0n, ccTokenDecimals))
    // 假设 1 CC = 1 USDC，1 ETH = 3000 USDC 进行估算
    return (ethVaultValue * 3000 + ccValue).toFixed(2)
  }

  // 获取订单状态文本
  const getOrderStatusText = (status) => {
    const statuses = ['创建', '已接受', '已完成', '已取消']
    return statuses[status] || '未知'
  }

  // 获取订单状态颜色
  const getOrderStatusColor = (status) => {
    const colors = ['bg-gray-100 text-gray-800', 'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-red-100 text-red-800']
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // 钱包未连接状态
  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-6 h-6 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('wallet.connectWalletPrompt')}</h2>
          <p className="text-gray-600 mb-6">
            {t('profile.description')}
          </p>
        </div>
      </div>
    )
  }
  
  // 钱包断开连接状态
  if (userStatus === 'disconnected') {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WalletIcon className="w-6 h-6 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('wallet.walletDisconnected')}</h2>
          <p className="text-gray-600 mb-6">
            {t('wallet.reconnectWallet')}
          </p>
        </div>
      </div>
    )
  }
  
  // 加载状态 - 更精确的判断条件
  const shouldShowLoading = userStatus === 'loading' && isLoadingProfile && !loadCompleted
  if (shouldShowLoading) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('wallet.loadingUserInfo')}</h2>
          <p className="text-gray-600">{t('wallet.fetchingUserInfo')}</p>
        </div>
      </div>
    )
  }

    
    
  
  // 资产统计卡片 
  const stats = [
    {
      name: '总资产价值',
      value: '12,345.67',
      unit: 'USDC',
      icon: CurrencyDollarIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      change: '+5.2%',
      changeType: 'positive'
    },
    {
      name: 'CC余额',
      value: ccLoading || decimalsLoading ? '加载中...' : ccError ? '获取失败' : formatTokenBalance(ccBalance, ccTokenDecimals),
      unit: 'CC',
      icon: CurrencyDollarIcon,
      color: ccError ? 'text-red-600' : 'text-green-600',
      bgColor: ccError ? 'bg-red-100' : 'bg-green-100',
      change: '+2.1%',
      changeType: 'positive'
    },
    {
      name: 'ETH 充值余额',
      value: ethVaultBalance ? parseFloat(formatEther(ethVaultBalance)).toFixed(4) : '0.0000',
      unit: 'ETH',
      icon: BanknotesIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: null,
      changeType: 'neutral'
    },
    {
      name: '累计收益',
      value: '234.56',
      unit: 'CC',
      icon: ArrowTrendingUpIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+12.4%',
      changeType: 'positive'
    }
  ]

  // 快速操作 - 从Dashboard迁移
  const quickActions = [
    {
      name: '充值',
      description: '存入ETH获取安全收益',
      icon: BanknotesIcon,
      color: 'bg-purple-500',
      href: '/eth-vault'
    },
    {
      name: '一键质押',
      description: '快速质押CC代币获得收益',
      icon: ArrowTrendingUpIcon,
      color: 'bg-blue-500',
      href: '/staking'
    },
    {
      name: '领取奖励',
      description: '领取待领取的质押奖励',
      icon: CurrencyDollarIcon,
      color: 'bg-green-500',
      href: '/staking'
    },
    {
      name: '创建订单',
      description: '快速创建计算服务订单',
      icon: ComputerDesktopIcon,
      color: 'bg-indigo-500',
      href: '/marketplace'
    }
  ]

  return (
    <div className="space-y-8">
      {/* 个人资料展示已隐藏，专注核心业务逻辑 */}
      
      {/* 钱包地址信息 */}
      <div className="card">
        <div className="flex items-center space-x-3">
          <WalletIcon className="w-6 h-6 text-gray-600" />
          <span className="font-mono text-gray-800">{address?.slice(0, 8)}...{address?.slice(-6)}</span>
        </div>
      </div>

      {/* 资产统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">个人网站</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={profileData.website}
                          onChange={(e) => handleInputChange('website', e.target.value)}
                          placeholder="example.com"
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            formErrors.website ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                          }`}
                        />
                        {formErrors.website && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                          </div>
                        )}
                      </div>
                      {formErrors.website && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.website}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">支持 example.com 或 https://example.com 格式</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
                    <input
                      type="text"
                      value={profileData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="介绍一下自己..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
              
            </div>
          </div>
          
          {/* 右侧：编辑按钮和状态指示器 */}
          <div className="flex flex-col items-end space-y-3">
            {/* 事件驱动更新状态指示器 */}
            {lastUpdateTime && (
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>数据更新: {lastUpdateTime.toLocaleTimeString()}</span>
              </div>
            )}
            
            {/* 登录状态指示器和操作 */}
            <div className="text-xs text-gray-500 mb-2">
              {userProfileService.isLoggedIn() ? (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>已登录</span>
                  </div>
                  <button
                    onClick={() => userProfileService.logout()}
                    className="text-red-600 hover:text-red-800 underline"
                  >
                    退出登录
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span>未登录</span>
                  </div>
                  <button
                    onClick={() => setShowSignInModal(true)}
                    className="text-indigo-600 hover:text-indigo-800 underline"
                  >
                    登录
                  </button>
                </div>
              )}
            </div>
            
            {/* 编辑按钮 */}
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>取消</span>
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircleIcon className="w-4 h-4" />
                    )}
                    <span>{isSaving ? '保存中...' : '保存'}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEditProfile}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <PencilIcon className="w-4 h-4" />
                  )}
                  <span>
                    {isSaving ? '保存中...' : '修改资料'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        
                
                
        
                  
          {/* 简化的编辑信息 */}
        {isEditing && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
              <input
                type="text"
                value={profileData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="城市, 国家"
                className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
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
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <SimpleQuickAction
              key={action.name}
              name={action.name}
              description={action.description}
              icon={action.icon}
              color={action.color}
              href={action.href}
            />
          ))}
        </div>
      </div>

      
      {/* 标签页切换 */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg max-w-2xl mx-auto">
        {[
          { id: 'overview', name: '概览' },
          { id: 'staking', name: '质押记录' },
          { id: 'orders', name: '订单历史' },
          { id: 'activity', name: '活动记录' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-indigo-500 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* 概览标签 */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 质押概览 */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">质押概览</h2>
              <Link to="/staking" className="text-indigo-500 hover:text-purple-500 text-sm font-medium">
                管理质押
              </Link>
            </div>
            
            {stakesLoading ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <ChartBarIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600">加载质押数据...</p>
              </div>
            ) : stakesError ? (
              <div className="text-center py-8">
                <ChartBarIcon className="w-10 h-10 text-yellow-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">质押数据暂时无法获取</p>
                <p className="text-sm text-gray-500">请稍后刷新页面重试</p>
              </div>
            ) : userStakes && userStakes.length > 0 ? (
              <div className="space-y-3">
                {userStakes.slice(0, 3).map((stake, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${stake.assetType === 0 ? 'bg-purple-500' : 'bg-blue-500'} rounded-full flex items-center justify-center`}>
                        <ArrowTrendingUpIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {stake.assetType === 0 ? 'ETH' : 'CC'} 质押
                        </p>
                        <p className="text-sm text-gray-600">
                          {stake.assetType === 0 
                            ? parseFloat(formatEther(stake.amount)).toFixed(4) + ' ETH'
                            : formatTokenBalance(stake.amount, ccTokenDecimals) + ' CC'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">年化收益</p>
                      <p className="font-semibold text-green-600">8%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">您还没有任何质押</p>
                <Link to="/staking" className="btn-primary">
                  开始质押
                </Link>
              </div>
            )}
          </div>

          {/* 待领取奖励 */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">待领取奖励</h2>
              {pendingRewards && pendingRewards > 0 && (
                <button 
                  onClick={handleClaimRewards}
                  disabled={isClaimPending || isClaimLoading}
                  className="btn-primary text-sm"
                >
                  {isClaimPending || isClaimLoading ? '领取中...' : '领取奖励'}
                </button>
              )}
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="w-6 h-6 text-yellow-600" />
              </div>
              {rewardsLoading ? (
                <p className="text-lg text-gray-600 mb-4">加载奖励数据...</p>
              ) : rewardsError ? (
                <div>
                  <p className="text-lg text-gray-600 mb-2">奖励数据暂时无法获取</p>
                  <p className="text-sm text-gray-500">请稍后刷新页面</p>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {formatTokenBalance(pendingRewards, ccTokenDecimals)} CC
                  </p>
                  <p className="text-gray-600 mb-4">可领取的质押奖励</p>
                  
                  {pendingRewards && pendingRewards > 0 ? (
                    <button 
                      onClick={handleClaimRewards}
                      disabled={isClaimPending || isClaimLoading}
                      className="btn-primary"
                    >
                      {isClaimPending || isClaimLoading ? '领取中...' : '立即领取'}
                    </button>
                  ) : (
                    <p className="text-sm text-gray-500">暂无待领取奖励</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 质押记录标签 */}
      {activeTab === 'staking' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">质押记录</h2>
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-5 h-5 text-blue-600" />
              <span className="text-blue-600 font-medium">实时更新</span>
            </div>
          </div>
          
          {userStakes && userStakes.length > 0 ? (
            <div className="space-y-4">
              {userStakes.map((stake, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 bg-gradient-to-r ${
                        stake.assetType === 0 ? 'from-purple-500 to-purple-600' : 'from-blue-500 to-blue-600'
                      } rounded-lg flex items-center justify-center`}>
                        <ArrowTrendingUpIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {stake.assetType === 0 ? 'ETH' : 'CC'} 质押 #{index + 1}
                        </h4>
                        <p className="text-sm text-gray-600">
                          开始时间: {new Date(Number(stake.startTime) * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {stake.assetType === 0 
                          ? parseFloat(formatEther(stake.amount)).toFixed(4) + ' ETH'
                          : formatTokenBalance(stake.amount, ccTokenDecimals) + ' CC'
                        }
                      </p>
                      <p className="text-sm text-gray-600">质押数量</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {stake.isForNFT && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          NFT铸造
                        </span>
                      )}
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        年化 8%
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span>已质押 {Math.floor((Date.now() / 1000 - Number(stake.startTime)) / 86400)} 天</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无质押记录</h3>
              <p className="text-gray-600 mb-6">开始质押以获得奖励和NFT铸造权限</p>
            </div>
          )}
        </div>
      )}

      {/* 订单历史标签 */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* 客户订单 */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">客户订单</h2>
            {userOrders && userOrders.length > 0 ? (
              <div className="space-y-3">
                {userOrders.map((order, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        order.status === 2 ? 'bg-green-500' : 
                        order.status === 1 ? 'bg-blue-500' : 'bg-gray-400'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">订单 #{order.id?.toString() || index + 1}</p>
                        <p className="text-sm text-gray-600">
                          {parseFloat(formatEther(order.usdPrice)).toFixed(2)} USDC + {formatTokenBalance(order.ccPaymentAmount, ccTokenDecimals)} CC
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full ${getOrderStatusColor(order.status)}`}>
                        {getOrderStatusText(order.status)}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(Number(order.createdTime) * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">暂无客户订单</p>
            )}
          </div>

          {/* 提供商订单 */}
          {providerNFTBalance && Number(providerNFTBalance) > 0 && (
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">提供商订单</h2>
              {providerOrders && providerOrders.length > 0 ? (
                <div className="space-y-3">
                  {providerOrders.map((order, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          order.status === 2 ? 'bg-green-500' : 
                          order.status === 1 ? 'bg-blue-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <p className="font-medium text-gray-900">服务订单 #{order.id?.toString() || index + 1}</p>
                          <p className="text-sm text-gray-600">
                            客户: {order.client?.slice(0, 6)}...{order.client?.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${getOrderStatusColor(order.status)}`}>
                          {getOrderStatusText(order.status)}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(Number(order.createdTime) * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">暂无提供商订单</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 活动记录标签 */}
      {activeTab === 'activity' && (
        <ActivityFeed 
          activities={activities} 
          isLoading={isLoadingActivities}
          maxItems={15}
        />
      )}
      
      {/* 签名登录模态框 */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <WalletIcon className="w-8 h-8 text-indigo-600" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {signatureChallenge ? '请确认签名' : '需要登录验证'}
              </h3>
              
              {!signatureChallenge ? (
                <div className="space-y-4">
                  <p className="text-gray-600 mb-6">
                    您已连接钱包，但需要签名验证以访问完整的个人资料功能。此签名不会花费任何费用。
                  </p>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={handleCancelSignIn}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      稍后登录
                    </button>
                    <button
                      onClick={handleSignIn}
                      disabled={isSigning || isSignPending}
                      className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSigning || isSignPending ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>签名中...</span>
                        </div>
                      ) : (
                        '签名登录'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-left">
                    <p className="text-sm font-medium text-gray-700 mb-2">签名内容：</p>
                    <p className="text-xs text-gray-600 break-all font-mono">
                      {signatureChallenge?.message}
                    </p>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    请在钱包中确认签名以完成登录。
                  </p>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={handleCancelSignIn}
                      disabled={isSigning}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      取消
                    </button>
                    <div className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg">
                      等待签名...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
