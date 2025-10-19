import { useState, useCallback } from 'react'
import { formatEther } from 'viem'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', options = {}) => {
    const id = Date.now()
    let newToast = { id, message, type, ...options }
    
    setToasts(prev => [...prev, newToast])
    
    // 动态调整显示时间
    const duration = options.duration || (type === 'error' ? 6000 : 3000)
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  // 增强的通知方法
  const showExchangeSuccess = useCallback((exchangeData) => {
    const ethAmount = formatEther(exchangeData.ethAmount || '0')
    const ccusdAmount = (parseFloat(exchangeData.ccusdAmount?.toString() || '0') / 1e6).toFixed(6)
    
    const dynamicMessage = {
      dynamic: true,
      title: '兑换成功',
      details: {
        '兑换金额': `${ethAmount} ETH`,
        '获得数量': `${ccusdAmount} CCUSD`,
        '汇率': exchangeData.rate ? `1 ETH = ${(parseFloat(exchangeData.rate.toString()) / 1e6).toFixed(6)} CCUSD` : 'N/A'
      },
      transactionHash: exchangeData.transactionHash
    }
    
    addToast(dynamicMessage, 'success', { duration: 5000 })
  }, [addToast])

  const showExchangeError = useCallback((error) => {
    const errorMessage = {
      dynamic: true,
      title: '兑换失败',
      details: {
        '错误信息': error.message || '未知错误',
        '错误代码': error.code || 'N/A'
      }
    }
    
    addToast(errorMessage, 'error', { duration: 6000 })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    showExchangeSuccess,
    showExchangeError
  }
}