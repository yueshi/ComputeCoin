import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import {
  WalletIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  DocumentDuplicateIcon,
  ArrowsRightLeftIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

/**
 * 统一的钱包连接按钮组件
 * 在不同页面中使用，提供一致的钱包连接体验
 */
export default function WalletConnectButton({
  variant = 'primary', // 'primary', 'secondary', 'minimal'
  size = 'medium', // 'small', 'medium', 'large'
  showBalance = false,
  className = ''
}) {
  const { t } = useTranslation()
  const { isConnected, address } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { chains } = useChainId()
  const { switchChain } = useSwitchChain()
  const [showDropdown, setShowDropdown] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const dropdownRef = useRef(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 处理连接钱包
  const handleConnect = async () => {
    if (connectors.length === 0) {
      alert(t('wallet.installMetaMask'))
      return
    }

    setIsConnecting(true)
    try {
      await connect({ connector: metaMask() })
    } catch (error) {
      console.error('连接钱包失败:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  // 处理断开连接
  const handleDisconnect = async () => {
    try {
      await disconnect()
      setShowDropdown(false)
    } catch (error) {
      console.error('断开连接失败:', error)
    }
  }

  // 处理复制地址
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address)
      // 可以添加复制成功的提示
    } catch (error) {
      console.error('复制地址失败:', error)
    }
  }

  // 如果已连接，显示钱包信息
  if (isConnected && address) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-md transition-all duration-200 ${className}`}
        >
          <WalletIcon className="w-4 h-4" />
          <span className="hidden sm:block text-sm font-medium">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <ChevronDownIcon className="w-4 h-4" />
        </button>

        {/* 钱包下拉菜单 */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            <div className="p-4 space-y-3">
              {/* 地址信息 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('wallet.address')}</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>

              {/* 操作按钮 */}
              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCopyAddress}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  <span>{t('wallet.copyAddress')}</span>
                </button>

                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  <span>{t('wallet.disconnect')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 未连接状态
  if (variant === 'minimal') {
    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={`flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <WalletIcon className="w-5 h-5" />
        <span className="text-sm font-medium">
          {isConnecting ? t('wallet.connecting') : t('wallet.connect')}
        </span>
      </button>
    )
  }

  if (variant === 'secondary') {
    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <WalletIcon className="w-5 h-5" />
        <span className="font-medium">
          {isConnecting ? t('wallet.connecting') : t('wallet.connect')}
        </span>
        {!isConnecting && <ArrowRightIcon className="w-4 h-4" />}
      </button>
    )
  }

  // 默认主要样式
  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className={`inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <WalletIcon className="w-5 h-5" />
      <span>{isConnecting ? t('wallet.connecting') : t('wallet.connect')}</span>
      {!isConnecting && <ArrowRightIcon className="w-4 h-4" />}
    </button>
  )
}

// 专用的内联连接按钮（用于导航栏等空间受限的地方）
export function InlineWalletConnectButton({ className = '' }) {
  const { t } = useTranslation()
  const { isConnected, address } = useAccount()
  const { connect } = useConnect()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      await connect({ connector: metaMask() })
    } catch (error) {
      console.error('连接钱包失败:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg">
        <WalletIcon className="w-4 h-4" />
        <span className="text-sm font-medium">
          {address.slice(0, 4)}...{address.slice(-4)}
        </span>
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <WalletIcon className="w-4 h-4 flex-shrink-0" />
      <span>{isConnecting ? t('wallet.connecting') : t('wallet.connect')}</span>
    </button>
  )
}