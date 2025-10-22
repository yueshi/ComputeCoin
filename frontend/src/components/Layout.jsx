import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount, useBalance, useSwitchChain, useDisconnect, useReadContract } from 'wagmi'
import { formatEther } from 'viem'
import { CONTRACT_ADDRESSES, CONTRACT_ABI } from '../config/contracts'
import { CCUSD_CONFIG } from '../config/mockusdc-config'
import {
  HomeIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  UserIcon,
  ShieldCheckIcon,
  WalletIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ArrowsRightLeftIcon,
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { InlineWalletConnectButton } from './WalletConnectButton'


export default function Layout({ children }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { isConnected, address } = useAccount()
  const { switchChain } = useSwitchChain()
  const { disconnect } = useDisconnect()
  const [showWalletDropdown, setShowWalletDropdown] = useState(false)

  // 动态导航菜单
  const navigationUnconnected = [
    { name: t('navigation.home'), href: '/', icon: HomeIcon },
    { name: t('navigation.marketplace'), href: '/marketplace', icon: ShoppingCartIcon },
    { name: t('navigation.exchange'), href: '/exchange', icon: ArrowTrendingUpIcon },
    { name: t('navigation.staking'), href: '/staking', icon: CurrencyDollarIcon },
    { name: t('navigation.nfts'), href: '/nfts', icon: PhotoIcon },
    { name: t('navigation.profile'), href: '/profile', icon: UserIcon },
  ]
  
  // 连接钱包后的导航菜单（去掉home项，英文大写）
  const navigationConnected = [
    { name: t('navigation.marketplace').toUpperCase(), href: '/marketplace', icon: ShoppingCartIcon },
    { name: t('navigation.exchange').toUpperCase(), href: '/exchange', icon: ArrowTrendingUpIcon },
    { name: t('navigation.staking').toUpperCase(), href: '/staking', icon: CurrencyDollarIcon },
    { name: t('navigation.nfts').toUpperCase(), href: '/nfts', icon: PhotoIcon },
    { name: t('navigation.orders').toUpperCase(), href: '/orders', icon: ChartBarIcon },
    { name: t('navigation.profile').toUpperCase(), href: '/profile', icon: UserIcon },
  ]
  
  // 根据连接状态选择导航菜单
  const navigation = isConnected ? navigationConnected : navigationUnconnected

  // 监听路由变化，自动收起下拉菜单
  useEffect(() => {
    setShowWalletDropdown(false)
  }, [pathname])
  
  // 获取钱包余额
  const { data: ethBalance } = useBalance({
    address: address,
    watch: false,
    cacheTime: 30_000, // 30秒缓存
  })
  
  // 获取CC代币余额
  const { data: ccBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    watch: true,
    cacheTime: 30_000, // 30秒缓存
  })
  
  // 获取CCUSD代币余额
  const { data: ccusdBalance } = useReadContract({
    address: CCUSD_CONFIG.address,
    abi: CCUSD_CONFIG.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    watch: true,
    cacheTime: 30_000, // 30秒缓存
  })
  
  // 格式化余额为4位小数
  const formatBalance = (balance) => {
    if (!balance) return '0.0000'
    try {
      const balanceBigInt = BigInt(balance.value)
      const divisor = BigInt(10) ** BigInt(18)
      const wholePart = balanceBigInt / divisor
      const fractionalPart = (balanceBigInt % divisor) * BigInt(10000) / divisor
      return `${wholePart}.${fractionalPart.toString().padStart(4, '0')}`
    } catch (error) {
      console.error(t('layout.formatBalanceError'), error)
      return '0.0000'
    }
  }
  
  // 格式化CC余额（18位小数）
  const formatCCBalance = (balance) => {
    if (!balance) return '0.0000'
    try {
      return formatEther(balance)
    } catch (error) {
      console.error(t('layout.formatCCBalanceError'), error)
      return '0.0000'
    }
  }
  
  // 格式化CCUSD余额（2位小数）
  const formatCCUSDBalance = (balance) => {
    if (!balance) return '0.00'
    try {
      const balanceBigInt = BigInt(balance)
      const divisor = BigInt(10) ** BigInt(6)
      const wholePart = balanceBigInt / divisor
      const fractionalPart = (balanceBigInt % divisor) * BigInt(100) / divisor
      return `${wholePart}.${fractionalPart.toString().padStart(2, '0')}`
    } catch (error) {
      console.error(t('layout.formatCCUSDBalanceError'), error)
      return '0.00'
    }
  }
  
  // 复制地址到剪贴板
  const copyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address)
        alert(t('wallet.addressCopied'))
      } catch (error) {
        console.error(t('wallet.copyFailed'), error)
      }
    }
  }
  
  // 格式化地址显示
  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="min-h-screen flex">
      {/* 钱包未连接时的传统布局 */}
      {!isConnected && (
        <div className="flex-1 flex flex-col">
          {/* 导航栏 */}
          <nav className="bg-theme-card shadow-sm border-b border-theme">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16 lg:h-20 xl:h-22">
                {/* Logo */}
                <div className="flex items-center h-16 lg:h-20 xl:h-22">
                  <Link to="/" className="flex items-center space-x-2 sm:space-x-3 h-full">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 xl:w-11 xl:h-11 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-sm lg:text-base xl:text-lg">CC</span>
                    </div>
                    <span className="text-lg sm:text-xl lg:text-xl xl:text-2xl font-bold text-theme-primary whitespace-nowrap">{t('marketplace.title')}</span>
                  </Link>
                </div>

                {/* 导航区域 - 弹性布局 */}
                <div className="hidden sm:flex items-center justify-between flex-1 ml-4 lg:ml-6 xl:ml-8">
                  {/* 桌面导航 */}
                  <div className="hidden md:flex items-center space-x-0.5 lg:space-x-1 xl:space-x-1.5">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center space-x-1.5 px-3 lg:px-4 xl:px-5 py-2 rounded-lg text-sm lg:text-base xl:text-lg font-medium transition-colors whitespace-nowrap ${
                          pathname === item.href
                            ? 'bg-emerald-500 text-white shadow-md'
                            : 'text-theme-secondary hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <item.icon className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </div>

                  {/* 右侧按钮组 */}
                  <div className="flex items-center space-x-2 lg:space-x-3 ml-4 lg:ml-6 flex-shrink-0">
                    {/* 语言切换 */}
                    <LanguageToggle />

                    {/* 主题切换 */}
                    <ThemeToggle />

                    {/* 钱包连接按钮 */}
                    <InlineWalletConnectButton />
                  </div>
                </div>
              </div>
            </div>

            {/* 移动端导航 */}
            <div className="sm:hidden border-t border-theme">
              <div className="px-4 py-3">
                <div className="flex space-x-2 overflow-x-auto">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        pathname === item.href
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-theme-secondary hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
                
                {/* 移动端钱包连接 */}
                <div className="mt-3 pt-3 border-t border-theme dark:border-gray-600">
                  <InlineWalletConnectButton />
                </div>
              </div>
            </div>
          </nav>

          {/* 主要内容 */}
          <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          {/* 页脚 */}
          <footer className="bg-theme-card border-t border-theme">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center text-theme-secondary">
                <p>&copy; 2024 $CC {t('marketplace.title')}. {t('footer.builtOnBlockchain')}</p>
                <p className="mt-2 text-sm">
                  {t('footer.features')}
                </p>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* 钱包连接后的上下布局 */}
      {isConnected && (
        <div className="flex-1 flex flex-col">
          {/* PC端固定顶部功能条 */}
          <div className="hidden lg:block fixed top-0 left-0 right-0 z-40 bg-theme-card shadow-sm border-b border-theme">
            <div className="flex justify-between items-center h-12 lg:h-14 xl:h-16">
              {/* 左侧：Logo + 当前菜单名称 - 紧贴左边无空白 */}
              <div className="flex items-center space-x-4 lg:space-x-6">
                {/* Logo */}
                <div className="flex items-center h-12 lg:h-14 xl:h-16">
                  <Link to="/" className="flex items-center space-x-2 lg:space-x-3 h-full pl-4 sm:pl-6 lg:pl-8">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 xl:w-11 xl:h-11 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-sm lg:text-base xl:text-lg">CC</span>
                    </div>
                    <span className="text-lg lg:text-xl xl:text-2xl font-bold text-theme-primary whitespace-nowrap">{t('marketplace.title')}</span>
                  </Link>
                </div>
                
                {/* 当前菜单名称 */}
                <div className="hidden sm:block">
                  <div className="text-sm lg:text-base xl:text-lg font-medium text-theme-secondary">
                    {navigation.find(item => item.href === pathname)?.name || t('marketplace.title')}
                  </div>
                </div>
              </div>

              {/* 右侧：语言切换 + 主题切换 + 钱包信息 - 整体组件 */}
              <div className="flex items-center space-x-2 lg:space-x-3 pr-4 sm:pr-6 lg:pr-8">
                {/* 语言切换 */}
                <LanguageToggle />
                
                {/* 主题切换 */}
                <ThemeToggle />
                
                {/* 钱包信息 */}
                <div className="relative">
                  <button
                    onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                    className="flex items-center space-x-2 lg:space-x-3 px-3 lg:px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-md transition-all duration-200"
                  >
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <WalletIcon className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="text-xs lg:text-sm font-medium">{formatAddress(address)}</div>
                      <div className="text-xs opacity-90">{formatBalance(ethBalance)} ETH</div>
                    </div>
                    <ChevronDownIcon className="w-3 h-3 lg:w-4 lg:h-4 transition-transform duration-200" 
                                   style={{ transform: showWalletDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>
                  
                  {/* 钱包下拉菜单 */}
                  {showWalletDropdown && (
                    <div 
                      className="absolute right-0 mt-2 w-96 bg-theme-card dark:bg-gray-800 border border-theme dark:border-gray-600 rounded-xl shadow-xl z-50 overflow-hidden"
                      onMouseLeave={() => setShowWalletDropdown(false)}
                    >
                      {/* 钱包头部 */}
                      <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                              <WalletIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">{t('wallet.myWallet')}</div>
                              <div className="text-sm opacity-90">{formatAddress(address)}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowWalletDropdown(false)}
                            className="text-white/80 hover:text-white transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      
                      {/* 资产信息 */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <BanknotesIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-theme-primary dark:text-white">{t('wallet.ethBalance')}</div>
                              <div className="text-xs text-theme-secondary dark:text-gray-400">{t('wallet.ethereum')}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-theme-primary dark:text-white">
                              {formatBalance(ethBalance)} ETH
                            </div>
                            <div className="text-xs text-theme-secondary dark:text-gray-400">
                              ≈ ${(parseFloat(formatBalance(ethBalance)) * 2650).toFixed(2)} USD
                            </div>
                          </div>
                        </div>
                        
                        {/* CC代币余额 */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <CurrencyDollarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-theme-primary dark:text-white">{t('wallet.ccBalance')}</div>
                              <div className="text-xs text-theme-secondary dark:text-gray-400">{t('wallet.ccToken')}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-theme-primary dark:text-white">
                              {formatCCBalance(ccBalance)} CC
                            </div>
                            <div className="text-xs text-theme-secondary dark:text-gray-400">
                              ≈ ${(parseFloat(formatCCBalance(ccBalance)) * 0.5).toFixed(2)} USD
                            </div>
                          </div>
                        </div>
                        
                        {/* CCUSD代币余额 */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                              <BanknotesIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-theme-primary dark:text-white">{t('wallet.ccusdBalance')}</div>
                              <div className="text-xs text-theme-secondary dark:text-gray-400">{t('wallet.ccusdToken')}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-theme-primary dark:text-white">
                              {formatCCUSDBalance(ccusdBalance)} CCUSD
                            </div>
                            <div className="text-xs text-theme-secondary dark:text-gray-400">
                              ≈ ${(parseFloat(formatCCUSDBalance(ccusdBalance)) * 1).toFixed(2)} USD
                            </div>
                          </div>
                        </div>
                        
                        {/* 网络切换 */}
                        <div className="pt-3 border-t border-theme dark:border-gray-600">
                          <div className="text-sm font-semibold text-theme-primary dark:text-white mb-2">{t('layout.switchNetwork')}</div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                switchChain({ chainId: 31337 })
                                setShowWalletDropdown(false)
                              }}
                              className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-theme-primary dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <ArrowsRightLeftIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">{t('network.localTest')}</span>
                            </button>
                            <button
                              onClick={() => {
                                switchChain({ chainId: 80001 })
                                setShowWalletDropdown(false)
                              }}
                              className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-theme-primary dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <ArrowsRightLeftIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">{t('network.polygon')}</span>
                            </button>
                          </div>
                        </div>

                        {/* 地址操作 */}
                        <div className="pt-2 space-y-2">
                          <button
                            onClick={copyAddress}
                            className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-theme dark:border-gray-600 rounded-lg hover:bg-theme-tertiary dark:hover:bg-gray-700 transition-colors"
                          >
                            <DocumentDuplicateIcon className="w-4 h-4 text-theme-secondary dark:text-gray-400" />
                            <span className="text-sm text-theme-primary dark:text-white">{t('wallet.copyAddress')}</span>
                          </button>
                          <button
                            onClick={() => {
                              disconnect()
                              setShowWalletDropdown(false)
                            }}
                            className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-theme dark:border-gray-600 rounded-lg hover:bg-theme-tertiary dark:hover:bg-gray-700 transition-colors"
                          >
                            <ArrowLeftOnRectangleIcon className="w-4 h-4 text-theme-secondary dark:text-gray-400" />
                            <span className="text-sm text-theme-primary dark:text-white">{t('wallet.disconnect')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 移动端固定顶部功能条 */}
          <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-theme-card shadow-sm border-b border-theme">
            <div className="px-4 py-3">
              {/* 移动端Logo和钱包信息 */}
              <div className="flex items-center justify-between mb-3">
                <Link to="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm">CC</span>
                  </div>
                  <span className="text-lg font-bold text-theme-primary">{t('marketplace.title')}</span>
                </Link>
                
                <div className="flex items-center space-x-2">
                  <LanguageToggle />
                  <ThemeToggle />
                  <div className="relative">
                    <button
                      onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                      className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-md transition-all duration-200"
                    >
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                        <WalletIcon className="w-3 h-3 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-medium">{formatAddress(address)}</div>
                        <div className="text-xs opacity-90">{formatBalance(ethBalance)} ETH</div>
                      </div>
                      <ChevronDownIcon className="w-3 h-3 transition-transform duration-200" 
                                     style={{ transform: showWalletDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    </button>

                    {/* 移动端钱包下拉菜单 */}
                    {showWalletDropdown && (
                      <div 
                        className="absolute right-0 mt-2 w-96 bg-theme-card dark:bg-gray-800 border border-theme dark:border-gray-600 rounded-xl shadow-xl z-50 overflow-hidden"
                        onMouseLeave={() => setShowWalletDropdown(false)}
                      >
                        {/* 钱包头部 */}
                        <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <WalletIcon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="font-medium">{t('wallet.myWallet')}</div>
                                <div className="text-sm opacity-90">{formatAddress(address)}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowWalletDropdown(false)}
                              className="text-white/80 hover:text-white transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        
                        {/* 资产信息 - 移动端 */}
                        <div className="p-4 space-y-3">
                          {/* ETH余额 */}
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <BanknotesIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-theme-primary dark:text-white">{t('wallet.ethBalance')}</div>
                                <div className="text-xs text-theme-secondary dark:text-gray-400">{t('wallet.ethereum')}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-theme-primary dark:text-white">
                                {formatBalance(ethBalance)} ETH
                              </div>
                              <div className="text-xs text-theme-secondary dark:text-gray-400">
                                ≈ ${(parseFloat(formatBalance(ethBalance)) * 2650).toFixed(2)} USD
                              </div>
                            </div>
                          </div>
                          
                          {/* CC代币余额 */}
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <CurrencyDollarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-theme-primary dark:text-white">{t('wallet.ccBalance')}</div>
                                <div className="text-xs text-theme-secondary dark:text-gray-400">{t('wallet.ccToken')}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-theme-primary dark:text-white">
                                {formatCCBalance(ccBalance)} CC
                              </div>
                              <div className="text-xs text-theme-secondary dark:text-gray-400">
                                ≈ ${(parseFloat(formatCCBalance(ccBalance)) * 0.5).toFixed(2)} USD
                              </div>
                            </div>
                          </div>
                          
                          {/* CCUSD代币余额 */}
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <BanknotesIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-theme-primary dark:text-white">{t('wallet.ccusdBalance')}</div>
                                <div className="text-xs text-theme-secondary dark:text-gray-400">{t('wallet.ccusdToken')}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-theme-primary dark:text-white">
                                {formatCCUSDBalance(ccusdBalance)} CCUSD
                              </div>
                              <div className="text-xs text-theme-secondary dark:text-gray-400">
                                ≈ ${(parseFloat(formatCCUSDBalance(ccusdBalance)) * 1).toFixed(2)} USD
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 网络切换和操作按钮 */}
                        <div className="p-4 space-y-3">
                          <div className="text-sm font-semibold text-theme-primary dark:text-white mb-2">{t('layout.switchNetwork')}</div>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <button
                              onClick={() => {
                                switchChain({ chainId: 31337 })
                                setShowWalletDropdown(false)
                              }}
                              className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-theme-primary dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <ArrowsRightLeftIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">{t('network.localTest')}</span>
                            </button>
                            <button
                              onClick={() => {
                                switchChain({ chainId: 80001 })
                                setShowWalletDropdown(false)
                              }}
                              className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-theme-primary dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <ArrowsRightLeftIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">{t('network.polygon')}</span>
                            </button>
                          </div>
                          <div className="space-y-2">
                            <button
                              onClick={copyAddress}
                              className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-theme dark:border-gray-600 rounded-lg hover:bg-theme-tertiary dark:hover:bg-gray-700 transition-colors"
                            >
                              <DocumentDuplicateIcon className="w-4 h-4 text-theme-secondary dark:text-gray-400" />
                              <span className="text-sm text-theme-primary dark:text-white">{t('wallet.copyAddress')}</span>
                            </button>
                            <button
                              onClick={() => {
                                disconnect()
                                setShowWalletDropdown(false)
                              }}
                              className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-theme dark:border-gray-600 rounded-lg hover:bg-theme-tertiary dark:hover:bg-gray-700 transition-colors"
                            >
                              <ArrowLeftOnRectangleIcon className="w-4 h-4 text-theme-secondary dark:text-gray-400" />
                              <span className="text-sm text-theme-primary dark:text-white">{t('wallet.disconnect')}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 移动端导航菜单 */}
              <div className="flex space-x-2 overflow-x-auto">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                      pathname === item.href
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-theme-secondary hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* 主内容区域 - 左右布局 */}
          <div className="flex-1 flex overflow-hidden">
            {/* PC端固定左侧菜单 */}
            <div className="hidden lg:flex fixed top-12 lg:top-14 xl:top-16 left-0 bg-theme-card border-r border-theme flex-col z-30" style={{ width: 'auto', minWidth: '160px', maxWidth: '200px', height: 'calc(100vh - 56px)' }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-theme-secondary hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* 右侧功能区 - 可滚动 */}
            <div className="flex-1 flex flex-col overflow-hidden lg:ml-auto" style={{ marginLeft: '170px' }}>
              {/* PC端：顶部占位 */}
              <div className="hidden lg:block h-12 lg:h-14 xl:h-16"></div>
              
              {/* 移动端：顶部占位 */}
              <div className="lg:hidden"></div>

              {/* 主内容区域 - 可滚动 */}
              <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  {children}
                </div>
              </main>

              {/* 页脚 */}
              <footer className="bg-theme-card border-t border-theme">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="text-center text-theme-secondary">
                    <p>&copy; 2024 $CC {t('marketplace.title')}. {t('footer.builtOnBlockchain')}</p>
                    <p className="mt-2 text-sm">
                      {t('footer.features')}
                    </p>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </div>
      )}

      </div>
  )
}