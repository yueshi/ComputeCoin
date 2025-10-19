import React from 'react'
import { useTranslation } from 'react-i18next'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { CONTRACT_ADDRESSES, CONTRACT_ABI, GAS_LIMITS } from '../config/contracts'

export default function QuickAction({ 
  title, 
  description, 
  buttonText, 
  contractAddress,
  contractAbi,
  functionName,
  args = [],
  value = '0',
  gasLimit,
  onSuccess,
  onError 
}) {
  const { t } = useTranslation()
  const { 
    writeContract, 
    data: hash,
    isPending,
    error 
  } = useWriteContract()

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: hash,
  })

  const handleAction = async () => {
    try {
      const contractConfig = {
        address: contractAddress,
        abi: contractAbi,
        functionName: functionName,
        args: args,
        value: value === '0' ? undefined : parseEther(value)
      }
      
      // 添加gas限制（如果提供或使用默认值）
      if (gasLimit) {
        contractConfig.gas = Math.floor(gasLimit * GAS_LIMITS.BUFFER)
      } else {
        // 根据函数名称推断默认gas限制
        const defaultGasLimit = getDefaultGasLimit(functionName)
        if (defaultGasLimit) {
          contractConfig.gas = Math.floor(defaultGasLimit * GAS_LIMITS.BUFFER)
        }
      }
      
      await writeContract(contractConfig)
      if (onSuccess) onSuccess()
    } catch (err) {
      if (onError) onError(err)
    }
  }
  
  // 根据函数名称返回默认gas限制
  const getDefaultGasLimit = (functionName) => {
    const lowerFunctionName = functionName.toLowerCase()
    
    if (lowerFunctionName.includes('approve')) return GAS_LIMITS.APPROVE
    if (lowerFunctionName.includes('transfer')) return GAS_LIMITS.TRANSFER
    if (lowerFunctionName.includes('stake')) return GAS_LIMITS.STAKE
    if (lowerFunctionName.includes('unstake')) return GAS_LIMITS.UNSTAKE
    if (lowerFunctionName.includes('claim')) return GAS_LIMITS.CLAIM_REWARDS
    if (lowerFunctionName.includes('mint')) return GAS_LIMITS.MINT_NFT
    if (lowerFunctionName.includes('deposit')) return GAS_LIMITS.DEPOSIT_ETH
    if (lowerFunctionName.includes('withdraw')) return GAS_LIMITS.WITHDRAW_ETH
    
    return null // 不设置默认gas限制
  }

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <span className="text-indigo-600 font-bold text-lg">⚡</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {t('quickAction.error', { message: error.message })}
          </div>
        )}
        
        {hash && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            {t('quickAction.transactionSubmitted', { hash: `${hash.slice(0, 6)}...${hash.slice(-4)}` })}
          </div>
        )}
        
        <button
          onClick={handleAction}
          disabled={isPending || isConfirming}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {isPending ? t('quickAction.waitingConfirmation') : isConfirming ? t('quickAction.confirmingTransaction') : buttonText}
        </button>
      </div>
    </div>
  )
}