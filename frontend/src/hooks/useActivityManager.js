import { useState, useCallback, useEffect } from 'react'

// 活动类型定义
export const ACTIVITY_TYPES = {
  STAKE: 'STAKE',
  UNSTAKE: 'UNSTAKE',
  DEPOSIT: 'DEPOSIT',
  WITHDRAW: 'WITHDRAW',
  CLAIM_REWARDS: 'CLAIM_REWARDS',
  MINT_NFT: 'MINT_NFT',
  CREATE_ORDER: 'CREATE_ORDER',
  COMPLETE_ORDER: 'COMPLETE_ORDER',
  EXCHANGE: 'EXCHANGE'
}

// 活动状态定义
export const ACTIVITY_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed'
}

/**
 * 活动管理 Hook
 * @param {number} maxActivities - 最大活动记录数量
 * @returns {Object} 活动管理功能
 */
export function useActivityManager(maxActivities = 50) {
  const [activities, setActivities] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // 添加新活动
  const addActivity = useCallback((activity) => {
    const newActivity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...activity
    }

    setActivities(prev => {
      // 避免重复活动（基于相同类型、时间和描述）
      const isDuplicate = prev.some(existing => 
        existing.type === newActivity.type &&
        existing.title === newActivity.title &&
        Math.abs(existing.timestamp - newActivity.timestamp) < 5000 // 5秒内相同活动视为重复
      )

      if (isDuplicate) {
        console.log('检测到重复活动，跳过添加:', newActivity)
        return prev
      }

      // 限制活动数量
      const updated = [newActivity, ...prev]
      return updated.slice(0, maxActivities)
    })

    return newActivity.id
  }, [maxActivities])

  // 更新活动状态
  const updateActivityStatus = useCallback((activityId, status, additionalData = {}) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === activityId
          ? { 
              ...activity, 
              status, 
              ...additionalData,
              // 如果状态变为成功或失败，记录完成时间
              ...(status !== ACTIVITY_STATUS.PENDING && { completedAt: Date.now() })
            }
          : activity
      )
    )
  }, [])

  // 根据类型添加活动的便捷方法
  const addStakeActivity = useCallback((data) => {
    return addActivity({
      type: ACTIVITY_TYPES.STAKE,
      title: '质押成功',
      description: `成功质押 ${data.amount} ${data.token}`,
      amount: data.amount,
      token: data.token,
      txHash: data.txHash,
      status: ACTIVITY_STATUS.SUCCESS,
      ...data
    })
  }, [addActivity])

  const addUnstakeActivity = useCallback((data) => {
    return addActivity({
      type: ACTIVITY_TYPES.UNSTAKE,
      title: '解质押成功',
      description: `成功解质押 ${data.amount} ${data.token}`,
      amount: data.amount,
      token: data.token,
      txHash: data.txHash,
      status: ACTIVITY_STATUS.SUCCESS,
      ...data
    })
  }, [addActivity])

  const addDepositActivity = useCallback((data) => {
    return addActivity({
      type: ACTIVITY_TYPES.DEPOSIT,
      title: '充值成功',
      description: `成功存入 ${data.amount} ${data.token}`,
      amount: data.amount,
      token: data.token,
      txHash: data.txHash,
      status: ACTIVITY_STATUS.SUCCESS,
      ...data
    })
  }, [addActivity])

  const addWithdrawActivity = useCallback((data) => {
    return addActivity({
      type: ACTIVITY_TYPES.WITHDRAW,
      title: '取款成功',
      description: `成功取出 ${data.amount} ${data.token}`,
      amount: data.amount,
      token: data.token,
      txHash: data.txHash,
      status: ACTIVITY_STATUS.SUCCESS,
      ...data
    })
  }, [addActivity])

  const addClaimRewardsActivity = useCallback((data) => {
    return addActivity({
      type: ACTIVITY_TYPES.CLAIM_REWARDS,
      title: '领取奖励成功',
      description: `成功领取 ${data.amount} CC 代币奖励`,
      amount: data.amount,
      token: 'CC',
      txHash: data.txHash,
      status: ACTIVITY_STATUS.SUCCESS,
      ...data
    })
  }, [addActivity])

  const addMintNFTActivity = useCallback((data) => {
    return addActivity({
      type: ACTIVITY_TYPES.MINT_NFT,
      title: '铸造NFT成功',
      description: `成功铸造 ${data.nftType} NFT (${data.nftName})`,
      nftType: data.nftType,
      nftName: data.nftName,
      txHash: data.txHash,
      status: ACTIVITY_STATUS.SUCCESS,
      ...data
    })
  }, [addActivity])

  const addOrderActivity = useCallback((data) => {
    const isCreate = data.action === 'create'
    return addActivity({
      type: isCreate ? ACTIVITY_TYPES.CREATE_ORDER : ACTIVITY_TYPES.COMPLETE_ORDER,
      title: isCreate ? '创建订单成功' : '完成订单成功',
      description: `${isCreate ? '创建' : '完成'}订单 #${data.orderId}，金额: ${data.amount} ${data.token}`,
      orderId: data.orderId,
      amount: data.amount,
      token: data.token,
      txHash: data.txHash,
      status: ACTIVITY_STATUS.SUCCESS,
      ...data
    })
  }, [addActivity])

  const addExchangeActivity = useCallback((data) => {
    return addActivity({
      type: ACTIVITY_TYPES.EXCHANGE,
      title: '兑换成功',
      description: `成功兑换 ${data.amount} ${data.fromToken} → ${data.receivedAmount} ${data.toToken}`,
      fromToken: data.fromToken,
      toToken: data.toToken,
      amount: data.amount,
      receivedAmount: data.receivedAmount,
      rate: data.rate,
      txHash: data.txHash,
      status: data.status || ACTIVITY_STATUS.SUCCESS,
      ...data
    })
  }, [addActivity])

  // 添加待处理活动（交易提交后等待确认）
  const addPendingActivity = useCallback((data) => {
    return addActivity({
      status: ACTIVITY_STATUS.PENDING,
      ...data
    })
  }, [addActivity])

  // 清空活动记录
  const clearActivities = useCallback(() => {
    setActivities([])
  }, [])

  // 移除特定活动
  const removeActivity = useCallback((activityId) => {
    setActivities(prev => prev.filter(activity => activity.id !== activityId))
  }, [])

  // 获取活动统计
  const getActivityStats = useCallback(() => {
    const stats = {
      total: activities.length,
      today: 0,
      thisWeek: 0,
      byType: {},
      byStatus: {
        pending: 0,
        success: 0,
        failed: 0
      }
    }

    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    const oneWeek = 7 * oneDay

    activities.forEach(activity => {
      // 时间统计
      if (now - activity.timestamp < oneDay) stats.today++
      if (now - activity.timestamp < oneWeek) stats.thisWeek++

      // 类型统计
      stats.byType[activity.type] = (stats.byType[activity.type] || 0) + 1

      // 状态统计
      stats.byStatus[activity.status] = (stats.byStatus[activity.status] || 0) + 1
    })

    return stats
  }, [activities])

  // 导出活动数据
  const exportActivities = useCallback(() => {
    const dataStr = JSON.stringify(activities, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activities_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [activities])

  return {
    // 状态
    activities,
    isLoading,
    stats: getActivityStats(),
    
    // 基础操作
    addActivity,
    updateActivityStatus,
    clearActivities,
    removeActivity,
    
    // 便捷方法
    addStakeActivity,
    addUnstakeActivity,
    addDepositActivity,
    addWithdrawActivity,
    addClaimRewardsActivity,
    addMintNFTActivity,
    addOrderActivity,
    addExchangeActivity,
    addPendingActivity,
    
    // 工具方法
    exportActivities,
    
    // 控制方法
    setIsLoading
  }
}