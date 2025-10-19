import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ActivityItem from './ActivityItem'
import { 
  ArrowPathIcon,
  FunnelIcon,
  ClockIcon,
  FireIcon
} from '@heroicons/react/24/outline'

export default function ActivityFeed({ 
  activities = [], 
  isLoading = false, 
  onRefresh,
  maxItems = 10 
}) {
  const { t } = useTranslation()
  const [selectedFilter, setSelectedFilter] = useState('ALL')
  const [showAll, setShowAll] = useState(false)

  const activityFilters = {
    ALL: { name: t('activityFeed.filters.all'), icon: ClockIcon },
    STAKE: { name: t('activityFeed.filters.stake'), icon: FireIcon },
    DEPOSIT: { name: t('activityFeed.filters.deposit'), icon: ArrowPathIcon },
    NFT: { name: t('activityFeed.filters.nft'), icon: FireIcon },
    ORDER: { name: t('activityFeed.filters.order'), icon: FireIcon }
  }

  // 根据筛选器过滤活动 - 优化版本
  const filteredActivities = useMemo(() => {
    if (selectedFilter === 'ALL') return activities
    
    // 预构建的过滤映射，避免每次重新创建
    const filterMap = {
      STAKE: new Set(['STAKE', 'UNSTAKE', 'CLAIM_REWARDS']),
      DEPOSIT: new Set(['DEPOSIT', 'WITHDRAW']),
      NFT: new Set(['MINT_NFT']),
      ORDER: new Set(['CREATE_ORDER', 'COMPLETE_ORDER'])
    }
    
    const typesToInclude = filterMap[selectedFilter]
    if (!typesToInclude) return activities
    
    return activities.filter(activity => typesToInclude.has(activity.type))
  }, [activities, selectedFilter])

  // 限制显示数量
  const displayActivities = showAll ? filteredActivities : filteredActivities.slice(0, maxItems)
  const hasMore = filteredActivities.length > maxItems

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-theme-primary">{t('activityFeed.title')}</h3>
          <div className="flex items-center space-x-2 text-sm text-theme-secondary">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            <span>{t('activityFeed.loading')}</span>
          </div>
        </div>
        
        {/* 骨架屏 */}
        {[...Array(3)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              </div>
              <div className="text-right space-y-2">
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-theme-primary">{t('activityFeed.title')}</h3>
          
          {/* 实时更新指示器 */}
          <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{t('activityFeed.realTimeUpdate')}</span>
          </div>
        </div>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>{t('activityFeed.refresh')}</span>
          </button>
        )}
      </div>

      {/* 筛选器 */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(activityFilters).map(([key, filter]) => {
          const Icon = filter.icon
          return (
            <button
              key={key}
              onClick={() => setSelectedFilter(key)}
              className={`flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
selectedFilter === key
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{filter.name}</span>
              {key !== 'ALL' && (
                <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs px-1.5 py-0.5 rounded-full">
                  {activities.filter(a => {
                    if (key === 'STAKE') return ['STAKE', 'UNSTAKE', 'CLAIM_REWARDS'].includes(a.type)
                    if (key === 'DEPOSIT') return ['DEPOSIT', 'WITHDRAW'].includes(a.type)
                    if (key === 'NFT') return a.type === 'MINT_NFT'
                    if (key === 'ORDER') return ['CREATE_ORDER', 'COMPLETE_ORDER'].includes(a.type)
                    return true
                  }).length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 活动列表 */}
      {displayActivities.length > 0 ? (
        <div className="space-y-3">
          {displayActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
          
          {/* 加载更多 */}
          {hasMore && !showAll && (
            <button
              onClick={() => setShowAll(true)}
className="w-full py-3 text-center text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium transition-colors border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-600"
            >
              {t('activityFeed.showMore', { count: filteredActivities.length - maxItems })}
            </button>
          )}
          
          {showAll && (
            <button
              onClick={() => setShowAll(false)}
className="w-full py-3 text-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
            >
              {t('activityFeed.showLess')}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <ClockIcon className="w-12 h-12 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-theme-primary mb-2">{t('activityFeed.noRecords')}</h4>
          <p className="text-theme-secondary">
            {selectedFilter === 'ALL' 
              ? t('activityFeed.noActivitiesDescription')
              : t('activityFeed.noFilteredActivities', { filter: activityFilters[selectedFilter].name })
            }
          </p>
        </div>
      )}

      {/* 统计信息 */}
      {activities.length > 0 && (
        <div className="text-xs text-theme-secondary text-center pt-4 border-t border-theme">
          {t('activityFeed.statistics', { 
            total: activities.length, 
            time: new Date().toLocaleTimeString(t('common.locale') || 'zh-CN') 
          })}
        </div>
      )}
    </div>
  )
}