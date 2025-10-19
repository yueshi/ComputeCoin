import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellIcon, CheckCircleIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

export default function NotificationBell() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  
  const mockNotifications = [
    {
      id: 1,
      type: 'reward',
      title: t('notificationBell.notifications.rewardReceived.title'),
      description: t('notificationBell.notifications.rewardReceived.description', { amount: '15.2' }),
      time: t('notificationBell.notifications.rewardReceived.time'),
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      read: false
    },
    {
      id: 2,
      type: 'order',
      title: t('notificationBell.notifications.orderUpdate.title'),
      description: t('notificationBell.notifications.orderUpdate.description', { orderId: '#123' }),
      time: t('notificationBell.notifications.orderUpdate.time'),
      icon: CheckCircleIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      read: false
    },
    {
      id: 3,
      type: 'reminder',
      title: t('notificationBell.notifications.monthlyReward.title'),
      description: t('notificationBell.notifications.monthlyReward.description'),
      time: t('notificationBell.notifications.monthlyReward.time'),
      icon: ClockIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      read: true
    }
  ]
  
  const [notifications, setNotifications] = useState(mockNotifications)
  
  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{t('notificationBell.title')}</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${notification.bgColor}`}>
                      <notification.icon className={`w-5 h-5 ${notification.color}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {notification.time}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <BellIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>{t('notificationBell.noNotifications')}</p>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <button className="w-full text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              {t('notificationBell.viewAllNotifications')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}