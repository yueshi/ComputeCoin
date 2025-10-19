import { useState, useCallback, useEffect } from 'react'

/**
 * 交易状态追踪 Hook
 * 跟踪交易从提交到确认的完整生命周期
 * @param {Object} options - 配置选项
 * @returns {Object} 交易追踪功能
 */
export function useTransactionTracker(options = {}) {
  const {
    maxPendingTransactions = 10,
    timeoutMs = 300000, // 5分钟超时
    onTransactionConfirmed,
    onTransactionFailed,
    onTransactionPending
  } = options

  const [pendingTransactions, setPendingTransactions] = useState(new Map())
  const [completedTransactions, setCompletedTransactions] = useState(new Map())

  // 添加待处理交易
  const addPendingTransaction = useCallback((transaction) => {
    const txId = transaction.hash || `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newTransaction = {
      id: txId,
      hash: transaction.hash,
      type: transaction.type,
      status: 'pending',
      submittedAt: Date.now(),
      data: transaction.data || {},
      retries: 0,
      timeoutMs: transaction.timeoutMs || timeoutMs
    }

    setPendingTransactions(prev => {
      const updated = new Map(prev)
      updated.set(txId, newTransaction)
      
      // 限制待处理交易数量
      if (updated.size > maxPendingTransactions) {
        const oldestKey = Array.from(updated.keys())[0]
        updated.delete(oldestKey)
      }
      
      return updated
    })

    // 设置超时检查
    const timeoutCheck = setTimeout(() => {
      checkTransactionTimeout(txId)
    }, newTransaction.timeoutMs)

    // 存储超时检查器以便清理
    newTransaction.timeoutChecker = timeoutCheck

    console.log('添加待处理交易:', newTransaction)
    
    // 触发回调
    if (onTransactionPending) {
      onTransactionPending(newTransaction)
    }

    return txId
  }, [maxPendingTransactions, timeoutMs, onTransactionPending])

  // 确认交易
  const confirmTransaction = useCallback((txHash, confirmationData = {}) => {
    const transaction = pendingTransactions.get(txHash) || 
                        Array.from(pendingTransactions.values()).find(tx => tx.hash === txHash)
    
    if (!transaction) {
      console.warn('尝试确认不存在的交易:', txHash)
      return false
    }

    // 清理超时检查器
    if (transaction.timeoutChecker) {
      clearTimeout(transaction.timeoutChecker)
    }

    const confirmedTransaction = {
      ...transaction,
      status: 'success',
      confirmedAt: Date.now(),
      confirmationData,
      processingTime: Date.now() - transaction.submittedAt
    }

    // 从待处理中移除
    setPendingTransactions(prev => {
      const updated = new Map(prev)
      updated.delete(transaction.id)
      return updated
    })

    // 添加到已完成
    setCompletedTransactions(prev => {
      const updated = new Map(prev)
      updated.set(transaction.id, confirmedTransaction)
      
      // 限制已完成交易数量（保留最近100条）
      if (updated.size > 100) {
        const oldestKey = Array.from(updated.keys())[0]
        updated.delete(oldestKey)
      }
      
      return updated
    })

    console.log('交易确认成功:', confirmedTransaction)
    
    // 触发回调
    if (onTransactionConfirmed) {
      onTransactionConfirmed(confirmedTransaction)
    }

    return true
  }, [pendingTransactions, onTransactionConfirmed])

  // 交易失败
  const failTransaction = useCallback((txHash, errorData = {}) => {
    const transaction = pendingTransactions.get(txHash) || 
                        Array.from(pendingTransactions.values()).find(tx => tx.hash === txHash)
    
    if (!transaction) {
      console.warn('尝试标记不存在的交易为失败:', txHash)
      return false
    }

    // 清理超时检查器
    if (transaction.timeoutChecker) {
      clearTimeout(transaction.timeoutChecker)
    }

    const failedTransaction = {
      ...transaction,
      status: 'failed',
      failedAt: Date.now(),
      errorData,
      processingTime: Date.now() - transaction.submittedAt
    }

    // 从待处理中移除
    setPendingTransactions(prev => {
      const updated = new Map(prev)
      updated.delete(transaction.id)
      return updated
    })

    // 添加到已完成
    setCompletedTransactions(prev => {
      const updated = new Map(prev)
      updated.set(transaction.id, failedTransaction)
      return updated
    })

    console.error('交易失败:', failedTransaction)
    
    // 触发回调
    if (onTransactionFailed) {
      onTransactionFailed(failedTransaction)
    }

    return true
  }, [pendingTransactions, onTransactionFailed])

  // 检查交易超时
  const checkTransactionTimeout = useCallback((txId) => {
    const transaction = pendingTransactions.get(txId)
    if (!transaction) return

    const isExpired = Date.now() - transaction.submittedAt > transaction.timeoutMs
    if (isExpired) {
      failTransaction(txId, {
        reason: 'timeout',
        message: `交易在${transaction.timeoutMs / 1000}秒内未确认`
      })
    }
  }, [pendingTransactions, failTransaction])

  // 重试交易
  const retryTransaction = useCallback((txId) => {
    const transaction = pendingTransactions.get(txId)
    if (!transaction) {
      console.warn('尝试重试不存在的交易:', txId)
      return false
    }

    // 更新重试次数和重试时间
    const updatedTransaction = {
      ...transaction,
      retries: transaction.retries + 1,
      lastRetryAt: Date.now()
    }

    setPendingTransactions(prev => {
      const updated = new Map(prev)
      updated.set(txId, updatedTransaction)
      return updated
    })

    console.log('重试交易:', updatedTransaction)
    return true
  }, [pendingTransactions])

  // 取消交易
  const cancelTransaction = useCallback((txId) => {
    const transaction = pendingTransactions.get(txId)
    if (!transaction) {
      console.warn('尝试取消不存在的交易:', txId)
      return false
    }

    // 清理超时检查器
    if (transaction.timeoutChecker) {
      clearTimeout(transaction.timeoutChecker)
    }

    // 从待处理中移除
    setPendingTransactions(prev => {
      const updated = new Map(prev)
      updated.delete(txId)
      return updated
    })

    console.log('取消交易:', transaction)
    return true
  }, [pendingTransactions])

  // 获取交易状态
  const getTransactionStatus = useCallback((txHash) => {
    // 检查待处理交易
    const pending = Array.from(pendingTransactions.values()).find(tx => tx.hash === txHash)
    if (pending) return pending

    // 检查已完成交易
    const completed = Array.from(completedTransactions.values()).find(tx => tx.hash === txHash)
    if (completed) return completed

    return null
  }, [pendingTransactions, completedTransactions])

  // 获取待处理交易数量
  const getPendingCount = useCallback(() => {
    return pendingTransactions.size
  }, [pendingTransactions])

  // 获取指定类型的待处理交易
  const getPendingByType = useCallback((type) => {
    return Array.from(pendingTransactions.values()).filter(tx => tx.type === type)
  }, [pendingTransactions])

  // 清理过期交易
  const cleanupExpiredTransactions = useCallback(() => {
    const now = Date.now()
    const expiredTxIds = []

    completedTransactions.forEach((tx, txId) => {
      // 清理超过24小时的已完成交易
      if (now - tx.confirmedAt > 24 * 60 * 60 * 1000) {
        expiredTxIds.push(txId)
      }
    })

    if (expiredTxIds.length > 0) {
      setCompletedTransactions(prev => {
        const updated = new Map(prev)
        expiredTxIds.forEach(id => updated.delete(id))
        return updated
      })
      
      console.log(`清理了 ${expiredTxIds.length} 个过期交易记录`)
    }
  }, [completedTransactions])

  // 获取交易统计
  const getTransactionStats = useCallback(() => {
    const stats = {
      pending: pendingTransactions.size,
      completed: completedTransactions.size,
      success: 0,
      failed: 0,
      averageProcessingTime: 0,
      byType: {}
    }

    let totalProcessingTime = 0
    let processedCount = 0

    completedTransactions.forEach(tx => {
      if (tx.status === 'success') stats.success++
      else if (tx.status === 'failed') stats.failed++

      if (tx.processingTime) {
        totalProcessingTime += tx.processingTime
        processedCount++
      }

      // 按类型统计
      if (!stats.byType[tx.type]) {
        stats.byType[tx.type] = { success: 0, failed: 0, total: 0 }
      }
      stats.byType[tx.type].total++
      stats.byType[tx.type][tx.status]++
    })

    if (processedCount > 0) {
      stats.averageProcessingTime = totalProcessingTime / processedCount
    }

    return stats
  }, [pendingTransactions, completedTransactions])

  // 定期清理过期交易
  useEffect(() => {
    const cleanupInterval = setInterval(cleanupExpiredTransactions, 60 * 60 * 1000) // 每小时清理一次
    
    return () => {
      clearInterval(cleanupInterval)
      
      // 组件卸载时清理所有超时检查器
      pendingTransactions.forEach(tx => {
        if (tx.timeoutChecker) {
          clearTimeout(tx.timeoutChecker)
        }
      })
    }
  }, [cleanupExpiredTransactions, pendingTransactions])

  return {
    // 状态
    pendingTransactions: Array.from(pendingTransactions.values()),
    completedTransactions: Array.from(completedTransactions.values()),
    pendingCount: getPendingCount(),
    stats: getTransactionStats(),
    
    // 操作方法
    addPendingTransaction,
    confirmTransaction,
    failTransaction,
    retryTransaction,
    cancelTransaction,
    getTransactionStatus,
    getPendingByType,
    cleanupExpiredTransactions
  }
}