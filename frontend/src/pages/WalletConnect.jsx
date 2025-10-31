import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAccount, useConnect, useConnectors } from 'wagmi'
import { metaMask, injected } from 'wagmi/connectors'
import { useTranslation } from 'react-i18next'
import { WALLET_CONFIGS, WALLET_TYPES } from '../config/rainbowKit'
import {
  ArrowLeftIcon,
  WalletIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  BanknotesIcon,
  GlobeAltIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'

/**
 * CC平台钱包连接页面
 * 参考galaxy_gui的统一钱包连接组件，为CC平台量身定制
 */
export default function WalletConnect() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Wagmi hooks
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()
  const allConnectors = useConnectors()

  // 页面状态
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [connectionStep, setConnectionStep] = useState(0) // 0: 选择, 1: 连接中, 2: 成功
  const [walletStatus, setWalletStatus] = useState({})
  const [isChecking, setIsChecking] = useState(false)

  // 钱包配置 - 使用配置文件中的钱包信息
  const walletConfigs = [
    {
      id: WALLET_TYPES.METAMASK,
      ...WALLET_CONFIGS[WALLET_TYPES.METAMASK],
      features: ['安全可靠', '广泛支持', '易于使用'],
      recommended: true
    },
    {
      id: WALLET_TYPES.INJECTED,
      ...WALLET_CONFIGS[WALLET_TYPES.INJECTED],
      features: ['兼容性强', '多钱包支持'],
      recommended: false
    }
  ]

  // 检查钱包是否可用
  const checkWalletAvailability = useCallback(async (walletId) => {
    setIsChecking(true)

    let available = false
    try {
      switch (walletId) {
        case WALLET_TYPES.METAMASK:
          // 更精确的 MetaMask 检测
          available = !!(
            window.ethereum?.isMetaMask ||
            window.ethereum?.providers?.some(p => p.isMetaMask) ||
            (typeof window.ethereum !== 'undefined' && window.ethereum.constructor.name === 'Object')
          )

          // 如果检测到 MetaMask，进一步验证其功能
          if (available && window.ethereum) {
            try {
              // 尝试获取账户权限来验证钱包功能
              const accounts = await window.ethereum.request({ method: 'eth_accounts' })
              available = Array.isArray(accounts)
            } catch (error) {
              // 如果请求失败，仍然认为是可用的，只是需要用户授权
              available = true
            }
          }
          break
        case WALLET_TYPES.INJECTED:
          // 检测其他注入式钱包（如 Trust Wallet, Coinbase Wallet 等）
          available = !!(
            window.ethereum &&
            !window.ethereum.isMetaMask &&
            typeof window.ethereum.request === 'function'
          )
          break
        default:
          available = false
      }
    } catch (error) {
      console.error('检查钱包状态失败:', error)
      available = false
    }

    // 强制状态更新，确保触发重新渲染
    setWalletStatus(prev => {
      const newStatus = {
        ...prev,
        [walletId]: {
          available,
          checked: true,
          timestamp: Date.now()
        }
      }
      console.log(`钱包 ${walletId} 状态更新:`, { available, status: newStatus[walletId] })
      return newStatus
    })

    setIsChecking(false)
    return available
  }, []) // 保持空依赖数组，因为我们使用函数式更新

  // 初始化时检查所有钱包状态
  useEffect(() => {
    const checkAllWallets = async () => {
      for (const walletId of Object.values(WALLET_TYPES)) {
        await checkWalletAvailability(walletId)
      }
    }
    checkAllWallets()
  }, []) // 只在组件挂载时执行一次

  // 注释掉自动跳转逻辑，让用户在连接成功页面手动选择下一步操作
  // useEffect(() => {
  //   if (isConnected && address) {
  //     navigate('/')
  //   }
  // }, [isConnected, address, navigate])

  // 处理钱包选择
  const handleWalletSelect = (wallet) => {
    setSelectedWallet(wallet)
    setConnectionStep(1)
    connectToWallet(wallet)
  }

  // 连接钱包
  const connectToWallet = async (wallet) => {
    try {
      // 直接使用特定的钱包连接器
      let connector
      if (wallet.id === WALLET_TYPES.METAMASK) {
        // 直接使用 metaMask 连接器
        connector = metaMask()
      } else {
        // 使用 injected 连接器处理其他钱包
        connector = injected()
      }

      console.log(`正在连接 ${wallet.name}...`)
      await connect({ connector })

      // 等待连接状态更新
      let attempts = 0
      const maxAttempts = 20

      while (attempts < maxAttempts && !isConnected) {
        await new Promise(resolve => setTimeout(resolve, 500))
        attempts++
      }

      if (isConnected && address) {
        setConnectionStep(2)
        console.log('钱包连接成功:', { wallet: wallet.name, address })
      } else {
        throw new Error('连接超时，请重试')
      }

    } catch (error) {
      console.error('钱包连接失败:', error)
      setConnectionStep(0)
      setSelectedWallet(null)

      // 显示错误提示
      alert(`连接失败: ${error.message}`)
    }
  }

  // 重新选择钱包
  const handleReset = () => {
    setConnectionStep(0)
    setSelectedWallet(null)
  }

  // 获取钱包状态信息
  const getWalletStatus = (wallet) => {
    const status = walletStatus[wallet.id]

    // 添加调试日志
    console.log(`获取 ${wallet.id} 状态:`, { status, walletStatus })

    if (!status || !status.checked) {
      return {
        text: '检查中...',
        available: false,
        actionable: false
      }
    }

    const result = {
      text: status.available ? '已安装' : '未安装',
      available: status.available,
      actionable: true
    }

    console.log(`${wallet.id} 最终状态:`, result)
    return result
  }

  // 连接步骤
  const steps = [
    { id: 0, name: '选择钱包' },
    { id: 1, name: '确认连接' },
    { id: 2, name: '连接成功' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full opacity-10 blur-3xl"></div>
      </div>

      {/* 导航栏 */}
      <nav className="relative z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">CC</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                $CC Token Economy
              </span>
            </Link>

            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>返回首页</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-lg mb-6">
            <WalletIcon className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            连接钱包
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            连接您的数字钱包以访问 $CC 代币经济生态系统，体验分布式算力交易
          </p>

          {/* 步骤指示器 */}
          <div className="flex justify-center items-center space-x-4 mb-12">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className={`flex items-center space-x-2 ${
                  connectionStep >= step.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    connectionStep >= step.id
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                  }`}>
                    {connectionStep > step.id ? (
                      <CheckCircleSolidIcon className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium">{step.name}</span>
                </div>

                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ${
                    connectionStep > step.id ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

          {/* 步骤 0: 选择钱包 */}
          {connectionStep === 0 && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  选择您的钱包
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  选择您偏好的钱包来连接 $CC 平台。我们推荐使用 MetaMask 以获得最佳体验。
                </p>
              </div>

              {/* 平台特性介绍 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="flex items-start space-x-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <ShieldCheckIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">安全可靠</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      基于区块链技术的安全交易
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <CpuChipIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">分布式算力</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      访问全球分布式计算网络
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <BanknotesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">代币经济</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      完整的 $CC 代币生态系统
                    </p>
                  </div>
                </div>
              </div>

              {/* 钱包列表 */}
              <div className="space-y-4">
                {walletConfigs.map((wallet) => {
                  const status = getWalletStatus(wallet)

                  return (
                    <div
                      key={wallet.id}
                      className={`relative p-6 rounded-xl border-2 transition-all duration-300 ${
                        status.available
                          ? 'bg-white dark:bg-gray-800 border-emerald-300 dark:border-emerald-600 shadow-lg hover:shadow-xl hover:border-emerald-400 dark:hover:border-emerald-500'
                          : 'cursor-not-allowed opacity-60 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {/* 推荐标签 */}
                      {wallet.recommended && (
                        <div className="absolute -top-3 -right-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg">
                            <SparklesIcon className="w-3 h-3 mr-1" />
                            推荐
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-4xl">{wallet.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {wallet.name}
                              </h3>
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all duration-300 ${
                                status.available
                                  ? 'text-white bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-600 shadow-lg animate-pulse'
                                  : 'text-white bg-gradient-to-r from-gray-400 to-gray-500 border-gray-500 shadow-sm'
                              }`}>
                                {status.available && <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5"></span>}
                                {status.text}
                              </span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-3">
                              {wallet.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {wallet.features.map((feature, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {status.available ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleWalletSelect(wallet)
                              }}
                              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 text-sm font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center space-x-2 ring-2 ring-emerald-200 hover:ring-emerald-300"
                            >
                              <WalletIcon className="w-5 h-5" />
                              <span>连接钱包</span>
                              <ChevronRightIcon className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(wallet.downloadUrl, '_blank')
                              }}
                              className="px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg flex items-center space-x-2"
                            >
                              <ArrowPathIcon className="w-4 h-4" />
                              <span>安装钱包</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 刷新按钮 */}
              <div className="text-center mt-6">
                <button
                  onClick={() => {
                    setWalletStatus({})
                    Object.values(WALLET_TYPES).forEach(walletId => {
                      checkWalletAvailability(walletId)
                    })
                  }}
                  disabled={isChecking}
                  className="inline-flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>重新检测钱包</span>
                </button>
              </div>
            </div>
          )}

          {/* 步骤 1: 连接中 */}
          {connectionStep === 1 && selectedWallet && (
            <div className="p-8 text-center">
              <div className="text-6xl mb-6">{selectedWallet.icon}</div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  正在连接 {selectedWallet.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  请在 {selectedWallet.name} 中确认连接请求
                </p>
              </div>

              {/* 连接提示 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <ExclamationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-left">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      连接提示
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• 检查浏览器右上角是否有钱包图标闪烁</li>
                      <li>• 确保没有其他标签页正在请求连接</li>
                      <li>• 如果看不到弹窗，请检查钱包的设置</li>
                      <li>• 连接成功后将自动跳转到主页面</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 加载动画 */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-emerald-200 rounded-full"></div>
                  <div className="w-16 h-16 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
              </div>

              {/* 取消按钮 */}
              <button
                onClick={handleReset}
                disabled={isPending}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                取消连接
              </button>
            </div>
          )}

          {/* 步骤 2: 连接成功 */}
          {connectionStep === 2 && (
            <div className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircleIcon className="w-10 h-10 text-white" />
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                  连接成功！
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
                  欢迎来到 $CC Token Economy
                </p>
                {address && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    钱包地址: {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                )}
              </div>

              {/* 快速操作 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <Link
                  to="/marketplace"
                  className="flex items-center justify-center space-x-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                >
                  <CpuChipIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900 dark:text-white">算力市场</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">探索分布式算力</p>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </Link>

                <Link
                  to="/staking"
                  className="flex items-center justify-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <BanknotesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900 dark:text-white">质押挖矿</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">质押获取收益</p>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </Link>
              </div>

              {/* 开始使用按钮 */}
              <Link
                to="/"
                className="inline-flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <GlobeAltIcon className="w-5 h-5" />
                <span>开始探索</span>
              </Link>
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            连接钱包即表示您同意我们的{' '}
            <a href="#" className="text-emerald-600 dark:text-emerald-400 hover:underline">
              服务条款
            </a>{' '}
            和{' '}
            <a href="#" className="text-emerald-600 dark:text-emerald-400 hover:underline">
              隐私政策
            </a>
          </p>
          <p className="mt-2">
            如有疑问，请查看我们的{' '}
            <a href="#" className="text-emerald-600 dark:text-emerald-400 hover:underline">
              帮助中心
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}