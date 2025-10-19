import React from 'react'
import { useTranslation } from 'react-i18next'
import { 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  GiftIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

const statusConfig = {
  pending: {
    icon: ClockIcon,
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-600 dark:text-yellow-400'
  },
  success: {
    icon: CheckCircleIcon,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400'
  },
  failed: {
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400'
  }
}

export default function ActivityItem({ activity }) {
  const { t } = useTranslation()
  
  const activityTypes = {
    STAKE: { 
      name: t('activityItem.types.stake'), 
      icon: ArrowTrendingUpIcon, 
      color: 'emerald',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    },
    UNSTAKE: { 
      name: t('activityItem.types.unstake'), 
      icon: ArrowTrendingDownIcon, 
      color: 'emerald',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    },
    DEPOSIT: { 
      name: t('activityItem.types.deposit'), 
      icon: CurrencyDollarIcon, 
      color: 'emerald',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    },
    WITHDRAW: { 
      name: t('activityItem.types.withdraw'), 
      icon: CurrencyDollarIcon, 
      color: 'emerald',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    },
    CLAIM_REWARDS: { 
      name: t('activityItem.types.claimRewards'), 
      icon: GiftIcon, 
      color: 'emerald',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    },
    MINT_NFT: { 
      name: t('activityItem.types.mintNft'), 
      icon: PhotoIcon, 
      color: 'emerald',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    },
    CREATE_ORDER: { 
      name: t('activityItem.types.createOrder'), 
      icon: DocumentTextIcon, 
      color: 'emerald',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    },
    COMPLETE_ORDER: { 
      name: t('activityItem.types.completeOrder'), 
      icon: CheckCircleIcon, 
      color: 'emerald',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-600 dark:text-emerald-400'
    }
  }
  
  const config = activityTypes[activity.type] || activityTypes.STAKE
  const status = statusConfig[activity.status] || statusConfig.success
  const StatusIcon = status.icon
  const ActivityIcon = config.icon

  return (
    <div className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600">
      {/* 活动类型图标 */}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.bgColor}`}>
        <ActivityIcon className={`w-6 h-6 ${config.textColor}`} />
      </div>

      {/* 活动详情 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {activity.title}
          </h3>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
            {config.name}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
          {activity.description}
        </p>

        {/* 交易哈希链接 */}
        {activity.txHash && (
          <a 
            href={`https://polygonscan.com/tx/${activity.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 mt-1 inline-block"
          >
            {t('activityItem.viewTransaction')}
          </a>
        )}
      </div>

      {/* 状态和金额 */}
      <div className="text-right flex-shrink-0">
        {/* 状态指示器 */}
        <div className="flex items-center justify-end space-x-2 mb-1">
          <StatusIcon className={`w-4 h-4 ${status.textColor}`} />
          <span className={`text-xs font-medium ${status.textColor}`}>
            {activity.status === 'pending' ? t('activityItem.status.pending') : 
             activity.status === 'success' ? t('activityItem.status.success') : t('activityItem.status.failed')}
          </span>
        </div>

        {/* 金额显示 */}
        {activity.amount && (
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {activity.amount} {activity.token || ''}
          </p>
        )}

        {/* 时间戳 */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {new Date(activity.timestamp).toLocaleString(t('common.locale') || 'zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  )
}

// 活动类型配置导出，供其他组件使用 (动态生成)
export const getActivityTypes = (t) => ({
  STAKE: { 
    name: t('activityItem.types.stake'), 
    icon: ArrowTrendingUpIcon, 
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-600 dark:text-emerald-400'
  },
  UNSTAKE: { 
    name: t('activityItem.types.unstake'), 
    icon: ArrowTrendingDownIcon, 
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-600 dark:text-emerald-400'
  },
  DEPOSIT: { 
    name: t('activityItem.types.deposit'), 
    icon: CurrencyDollarIcon, 
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-600 dark:text-emerald-400'
  },
  WITHDRAW: { 
    name: t('activityItem.types.withdraw'), 
    icon: CurrencyDollarIcon, 
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-600 dark:text-emerald-400'
  },
  CLAIM_REWARDS: { 
    name: t('activityItem.types.claimRewards'), 
    icon: GiftIcon, 
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-600 dark:text-emerald-400'
  },
  MINT_NFT: { 
    name: t('activityItem.types.mintNft'), 
    icon: PhotoIcon, 
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-600 dark:text-emerald-400'
  },
  CREATE_ORDER: { 
    name: t('activityItem.types.createOrder'), 
    icon: DocumentTextIcon, 
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-600 dark:text-emerald-400'
  },
  COMPLETE_ORDER: { 
    name: t('activityItem.types.completeOrder'), 
    icon: CheckCircleIcon, 
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-600 dark:text-emerald-400'
  }
})