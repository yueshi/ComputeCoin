import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount, useReadContract, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { CONTRACT_ADDRESSES, CONTRACT_ABI } from '../config/contracts'

export default function CCTokenDebug() {
  const { t } = useTranslation()
  const { address, isConnected } = useAccount()

  // ETH余额查询（工作正常的对比）
  const { data: ethBalance, error: ethError } = useBalance({
    address: address,
    enabled: !!address,
  })

  // CC代币余额查询 - 基础版本
  const { data: ccBalanceBasic, error: ccErrorBasic } = useReadContract({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  })

  // CC代币精度查询
  const { data: ccTokenDecimals, error: ccDecimalsError } = useReadContract({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    functionName: 'decimals',
    enabled: !!address,
  })

  // CC代币符号查询
  const { data: ccTokenSymbol, error: ccSymbolError } = useReadContract({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    functionName: 'symbol',
    enabled: !!address,
  })

  // CC代币总供应量查询
  const { data: ccTokenTotalSupply, error: ccTotalSupplyError } = useReadContract({
    address: CONTRACT_ADDRESSES.CC_TOKEN,
    abi: CONTRACT_ABI.CC_TOKEN_ABI,
    functionName: 'totalSupply',
    enabled: !!address,
  })

  // 格式化CC余额
  const formattedCCBalance = ccBalanceBasic && ccTokenDecimals 
    ? (parseFloat(ccBalanceBasic) / Math.pow(10, ccTokenDecimals)).toFixed(4)
    : '0.0000'

  const formattedTotalSupply = ccTokenTotalSupply && ccTokenDecimals
    ? (parseFloat(ccTokenTotalSupply) / Math.pow(10, ccTokenDecimals)).toFixed(0)
    : '0'

  if (!isConnected) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">{t('ccTokenDebug.title')}</h3>
        <p className="text-yellow-700">{t('ccTokenDebug.connectWallet')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('ccTokenDebug.title')}</h3>
      
      {/* 钱包信息 */}
      <div className="bg-white p-4 rounded border">
        <h4 className="font-medium text-gray-700 mb-2">{t('ccTokenDebug.walletInfo')}</h4>
        <p className="text-sm text-gray-600">{t('ccTokenDebug.address')}: {address}</p>
      </div>

      {/* ETH余额（对比用） */}
      <div className="bg-green-50 p-4 rounded border border-green-200">
        <h4 className="font-medium text-green-700 mb-2">{t('ccTokenDebug.ethBalance')}</h4>
        <p className="text-sm text-green-600">
          {t('ccTokenDebug.balance')}: {ethBalance ? formatEther(ethBalance.value) : '0.0000'} ETH
        </p>
        {ethError && (
          <p className="text-sm text-red-600 mt-1">{t('ccTokenDebug.error')}: {ethError.message}</p>
        )}
      </div>

      {/* CC代币基本信息 */}
      <div className="bg-blue-50 p-4 rounded border border-blue-200">
        <h4 className="font-medium text-blue-700 mb-2">{t('ccTokenDebug.ccTokenInfo')}</h4>
        <p className="text-sm text-blue-600">{t('ccTokenDebug.contractAddress')}: {CONTRACT_ADDRESSES.CC_TOKEN}</p>
        <p className="text-sm text-blue-600">{t('ccTokenDebug.symbol')}: {ccTokenSymbol || t('ccTokenDebug.loading')}</p>
        <p className="text-sm text-blue-600">{t('ccTokenDebug.decimals')}: {ccTokenDecimals?.toString() || t('ccTokenDebug.loading')}</p>
        <p className="text-sm text-blue-600">{t('ccTokenDebug.totalSupply')}: {formattedTotalSupply} CC</p>
        
        {ccDecimalsError && (
          <p className="text-sm text-red-600 mt-1">{t('ccTokenDebug.decimalsError')}: {ccDecimalsError.message}</p>
        )}
        {ccSymbolError && (
          <p className="text-sm text-red-600 mt-1">{t('ccTokenDebug.symbolError')}: {ccSymbolError.message}</p>
        )}
        {ccTotalSupplyError && (
          <p className="text-sm text-red-600 mt-1">{t('ccTokenDebug.totalSupplyError')}: {ccTotalSupplyError.message}</p>
        )}
      </div>

      {/* CC代币余额 */}
      <div className="bg-purple-50 p-4 rounded border border-purple-200">
        <h4 className="font-medium text-purple-700 mb-2">{t('ccTokenDebug.ccBalance')}</h4>
        <p className="text-sm text-purple-600">
          {t('ccTokenDebug.rawBalance')}: {ccBalanceBasic?.toString() || '0'}
        </p>
        <p className="text-sm text-purple-600">
          {t('ccTokenDebug.formattedBalance')}: {formattedCCBalance} CC
        </p>
        
        {ccErrorBasic && (
          <p className="text-sm text-red-600 mt-1">{t('ccTokenDebug.balanceError')}: {ccErrorBasic.message}</p>
        )}
      </div>

      {/* 调试建议 */}
      <div className="bg-gray-100 p-4 rounded border">
        <h4 className="font-medium text-gray-700 mb-2">{t('ccTokenDebug.debugStatus')}</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• {t('ccTokenDebug.ethQuery')}: {ethError ? t('ccTokenDebug.failed') : t('ccTokenDebug.success')}</p>
          <p>• {t('ccTokenDebug.ccTokenQuery')}: {ccErrorBasic ? t('ccTokenDebug.failed') : t('ccTokenDebug.success')}</p>
          <p>• {t('ccTokenDebug.decimalsQuery')}: {ccDecimalsError ? t('ccTokenDebug.failed') : t('ccTokenDebug.success')}</p>
          <p>• {t('ccTokenDebug.symbolQuery')}: {ccSymbolError ? t('ccTokenDebug.failed') : t('ccTokenDebug.success')}</p>
        </div>
      </div>
    </div>
  )
}