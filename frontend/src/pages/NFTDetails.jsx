import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount, useReadContract } from 'wagmi'
import { formatEther } from 'viem'
import { 
  ArrowLeftIcon,
  TrophyIcon,
  BoltIcon,
  StarIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  GiftIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  TagIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  WalletIcon,
  BuildingLibraryIcon,
  AcademicCapIcon,
  SparklesIcon,
  FireIcon,
  HeartIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'
import { CONTRACT_ADDRESSES, CONTRACT_ABI, APP_CONFIG } from '../config/contracts'
import { getNFTTierIcon } from '../config/nftIcons'

const NFT_TIERS = APP_CONFIG.nftTiers.customer
const PROVIDER_NFT_TIERS = APP_CONFIG.nftTiers.provider

export default function NFTDetails({ nftType }) {
  const { t } = useTranslation()
  const { tokenId } = useParams()
  const navigate = useNavigate()
  const { address: connectedAddress } = useAccount()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nftData, setNftData] = useState(null)

  // 验证 Token ID
  const tokenIdNumber = tokenId ? BigInt(tokenId) : null
  console.log('NFT详情页面调试:', {
    tokenId,
    tokenIdNumber,
    nftType,
    isValidTokenId: !!tokenId && !isNaN(tokenId)
  })

  // 通过Token ID获取NFT所有者地址
  const { data: ownerAddress, refetch: refetchOwner } = useReadContract({
    address: nftType === 'customer' ? CONTRACT_ADDRESSES.CUSTOMER_NFT : CONTRACT_ADDRESSES.PROVIDER_NFT,
    abi: nftType === 'customer' ? CONTRACT_ABI.CUSTOMER_NFT_ABI : CONTRACT_ABI.PROVIDER_NFT_ABI,
    functionName: 'ownerOf',
    args: [tokenIdNumber],
    enabled: !!tokenIdNumber,
  })

  // 读取NFT详细信息
  const { data: nftDetails, refetch: refetchDetails } = useReadContract({
    address: nftType === 'customer' ? CONTRACT_ADDRESSES.CUSTOMER_NFT : CONTRACT_ADDRESSES.PROVIDER_NFT,
    abi: nftType === 'customer' ? CONTRACT_ABI.CUSTOMER_NFT_ABI : CONTRACT_ABI.PROVIDER_NFT_ABI,
    functionName: 'getNFTInfo',
    args: [tokenIdNumber],
    enabled: !!tokenIdNumber,
  })

  // 读取特定类型的信息
  const { data: additionalInfo, refetch: refetchAdditionalInfo } = useReadContract({
    address: nftType === 'customer' ? CONTRACT_ADDRESSES.CUSTOMER_NFT : CONTRACT_ADDRESSES.PROVIDER_NFT,
    abi: nftType === 'customer' ? CONTRACT_ABI.CUSTOMER_NFT_ABI : CONTRACT_ABI.PROVIDER_NFT_ABI,
    functionName: nftType === 'customer' ? 'getMonthlyReward' : 'getProviderStats',
    args: nftType === 'customer' ? [tokenIdNumber] : [ownerAddress],
    enabled: !!tokenIdNumber && !!ownerAddress,
  })

  useEffect(() => {
    const loadNFTData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        if (!tokenId) {
          setError(t('nft.details.errors.invalidTokenId'))
          return
        }

        if (!ownerAddress) {
          setError(t('nft.details.errors.notFound'))
          return
        }

        if (nftDetails && tokenIdNumber) {
          const tier = nftDetails[0] // tier from getNFTInfo (enum: 0=NONE, 1=BRONZE, 2=SILVER, 3=GOLD, 4=PLATINUM)
          const tierConfig = nftType === 'customer' ? NFT_TIERS : PROVIDER_NFT_TIERS
          
          // 将枚举值转换为数组索引 (tier 1-4 对应数组索引 0-3)
          const tierIndex = Math.max(0, tier - 1)
          const currentTier = tierIndex < tierConfig.length ? tierConfig[tierIndex] : null
          
          console.log('NFT详情调试:', {
            tier,
            tierIndex,
            tierConfig,
            currentTier,
            nftDetails,
            nftType
          })

          if (!currentTier) {
            throw new Error(t('nft.details.errors.invalidTier'))
          }

          const nftInfo = {
            tier: tier,
            tierName: currentTier.name,
            tierDescription: nftType === 'customer' 
              ? t('nft.details.descriptions.customerTier', { 
                  name: currentTier.name, 
                  discount: currentTier.discount, 
                  monthlyReward: currentTier.monthlyReward 
                })
              : t('nft.details.descriptions.providerTier', { 
                  name: currentTier.name, 
                  bonus: currentTier.multiplier - 100 
                }),
            // 对于客户NFT，nftDetails[1]是折扣百分比(基点)，需要转换为百分比
            discount: nftType === 'customer' ? Number(nftDetails[1]) / 100 : null,
            // 对于提供商NFT，nftDetails[1]是奖励倍数(基点)，需要转换为倍数
            bonusMultiplier: nftType === 'provider' ? Number(nftDetails[1]) / 100 : null,
            // 每月奖励从getNFTInfo的第三个返回值获取
            monthlyReward: nftType === 'customer' ? nftDetails[2] : null,
            // 设备要求从getNFTInfo的第三个返回值获取
            deviceRequirement: nftType === 'provider' ? nftDetails[2] : null,
            color: currentTier.color,
            // 使用默认图标
            icon: null,
            tokenId: tokenIdNumber,
            owner: ownerAddress,
            totalStaked: nftType === 'provider' && additionalInfo ? additionalInfo[0] : 0,
            rewardsClaimed: nftType === 'provider' && additionalInfo ? additionalInfo[1] : 0,
            isActive: true
          }

          setNftData(nftInfo)
        }
      } catch (err) {
        console.error('加载NFT数据失败:', err)
        setError(t('nft.details.errors.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    if (nftDetails !== undefined && tokenIdNumber !== undefined) {
      loadNFTData()
    }
  }, [tokenIdNumber, ownerAddress, nftDetails, additionalInfo, nftType, t])

  useEffect(() => {
    refetchOwner()
    refetchDetails()
    refetchAdditionalInfo()
  }, [refetchOwner, refetchDetails, refetchAdditionalInfo])

  const getTierIcon = (tier) => {
    // 使用统一的图标配置
    const nftTypeKey = nftType === 'customer' ? 'CUSTOMER' : 'PROVIDER'
    return getNFTTierIcon(nftTypeKey, tier)
  }

  const getTierColor = (tier) => {
    // tier是枚举值: 0=NONE, 1=BRONZE, 2=SILVER, 3=GOLD, 4=PLATINUM
    // 统一使用与staking页面一致的颜色方案
    const tierIndex = Math.max(0, tier - 1) // 将枚举值转换为数组索引
    const colors = [
      'from-yellow-600 to-yellow-700',  // BRONZE - tier 1
      'from-gray-400 to-gray-500',      // SILVER - tier 2
      'from-yellow-400 to-yellow-500',  // GOLD - tier 3
      'from-slate-300 to-slate-400'     // PLATINUM - tier 4
    ]
    return tierIndex < colors.length ? colors[tierIndex] : colors[0]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-theme flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-theme flex items-center justify-center">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('common.error')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    )
  }

  if (!nftData) {
    return (
      <div className="min-h-screen bg-gradient-theme flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('nft.details.errors.notFound')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('nft.details.errors.notFoundDescription')}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    )
  }

  const TierIcon = getTierIcon(nftData.tier)

  return (
    <div className="min-h-screen bg-gradient-theme py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 返回按钮 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>{t('common.back')}</span>
          </button>
        </div>

        {/* NFT 主要信息卡片 */}
        <div className="card mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* NFT 图标 */}
            <div className={`w-32 h-32 rounded-2xl flex items-center justify-center bg-gradient-to-br ${getTierColor(nftData.tier)} shadow-xl`}>
              <TierIcon className="w-16 h-16 text-white drop-shadow-lg" />
            </div>

            {/* NFT 基本信息 */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start space-y-2 sm:space-y-0 sm:space-x-3 mb-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {nftType === 'customer' ? t('nft.common.customerNFT') : t('nft.common.providerNFT')}
                </h1>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-white font-bold text-sm bg-gradient-to-r ${getTierColor(nftData.tier)} shadow-lg`}>
                  <TierIcon className="w-4 h-4 mr-2" />
                  {nftData.tierName}
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-4">{nftData.tierDescription}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <TagIcon className="w-4 h-4" />
                    <span>{t('nft.details.tokenId')}</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('nft.details.symbols.tokenNumber')}{nftData.tokenId?.toString()}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <WalletIcon className="w-4 h-4" />
                    <span>{t('nft.details.owner')}</span>
                  </div>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    {ownerAddress?.slice(0, 8)}...{ownerAddress?.slice(-8)}
                  </p>
                </div>

                {nftData.mintedAt && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <ClockIcon className="w-4 h-4" />
                      <span>{t('nft.details.mintedAt')}</span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {nftData.mintedAt.toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>{t('nft.details.status')}</span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {nftData.isActive ? t('nft.common.active') : t('nft.common.inactive')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NFT 权益信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {nftType === 'customer' ? (
            <>
              {/* 折扣权益 */}
              <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('nft.details.benefits.discount')}</h3>
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {nftData.discount}% {t('nft.details.symbols.discount')}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('nft.details.benefits.discountDescription')}
                </p>
              </div>

              {/* 每月奖励 */}
              <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <GiftIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('nft.details.benefits.monthlyReward')}</h3>
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {formatEther(nftData.monthlyReward)} {t('nft.details.symbols.ccToken')}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('nft.details.benefits.monthlyRewardDescription')}
                </p>
              </div>
            </>
          ) : (
            <>
              {/* 奖励倍数 */}
              <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('nft.details.benefits.bonusMultiplier')}</h3>
                </div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                  {t('nft.details.symbols.multiplier')}{nftData.bonusMultiplier}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('nft.details.benefits.bonusMultiplierDescription')}
                </p>
              </div>

              {/* 总质押量 */}
              <div className="card">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('nft.details.totalStaked')}</h3>
                </div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  {formatEther(nftData.totalStaked)} {t('nft.details.symbols.ccToken')}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('nft.details.totalStakedDescription')}
                </p>
              </div>
            </>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <Link
            to="/staking"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-center font-medium transition-colors"
          >
            {t('nft.details.actions.stake')}
          </Link>
          <Link
            to="/marketplace"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-center font-medium transition-colors"
          >
            {t('nft.details.actions.marketplace')}
          </Link>
          {connectedAddress === ownerAddress && (
            <Link
              to="/nfts"
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg text-center font-medium transition-colors"
            >
              {t('nft.details.actions.manage')}
            </Link>
          )}
        </div>

        {/* 说明信息 */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                {t('nft.details.information.title')}
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {nftType === 'customer' 
                  ? t('nft.details.information.customerDescription')
                  : t('nft.details.information.providerDescription')
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}