import React from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function OrderStatus({ orders = [] }) {
  const { t } = useTranslation()
  
  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
        return { 
          icon: CheckCircleIcon, 
          color: 'text-green-600', 
          bgColor: 'bg-green-50',
          text: t('orderStatus.status.completed')
        }
      case 'active':
        return { 
          icon: ClockIcon, 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50',
          text: t('orderStatus.status.active')
        }
      case 'cancelled':
        return { 
          icon: XCircleIcon, 
          color: 'text-red-600', 
          bgColor: 'bg-red-50',
          text: t('orderStatus.status.cancelled')
        }
      default:
        return { 
          icon: ClockIcon, 
          color: 'text-gray-600', 
          bgColor: 'bg-gray-50',
          text: t('orderStatus.status.pending')
        }
    }
  }

  const mockOrders = [
    {
      id: '#12345',
      service: 'AI模型训练服务',
      provider: '0x1234...5678',
      amount: '150 USDC',
      status: 'active',
      progress: 65,
      startTime: '2024-01-15 14:30',
      estimatedEnd: '2024-01-15 16:30'
    },
    {
      id: '#12344',
      service: '3D渲染农场',
      provider: '0x8765...4321',
      amount: '200 USDC',
      status: 'completed',
      progress: 100,
      startTime: '2024-01-14 10:15',
      endTime: '2024-01-14 12:45'
    }
  ]

  const displayOrders = orders.length > 0 ? orders : mockOrders

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('orderStatus.title')}</h3>
        <span className="text-sm text-gray-500">{t('orderStatus.activeOrders', { count: displayOrders.length })}</span>
      </div>
      
      <div className="space-y-4">
        {displayOrders.map((order) => {
          const config = getStatusConfig(order.status)
          const IconComponent = config.icon
          
          return (
            <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <IconComponent className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{order.service}</p>
                    <p className="text-sm text-gray-600">{order.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{order.amount}</p>
                  <span className={`text-sm px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}>
                    {config.text}
                  </span>
                </div>
              </div>
              
              {order.status === 'active' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('orderStatus.progress')}</span>
                    <span className="text-gray-900 font-medium">{order.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${order.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between text-sm text-gray-500 mt-3">
                <span>{t('orderStatus.start', { time: order.startTime })}</span>
                <span>{order.status === 'active' ? t('orderStatus.estimatedEnd', { time: order.estimatedEnd }) : t('orderStatus.end', { time: order.endTime })}</span>
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-4 text-center">
        <a href="/marketplace" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          {t('orderStatus.viewAllOrders')}
        </a>
      </div>
    </div>
  )
}