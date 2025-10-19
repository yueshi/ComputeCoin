import React from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

const toastConfig = {
  success: {
    icon: CheckCircleIcon,
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-800 dark:text-green-200',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  error: {
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-800 dark:text-red-200',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-800 dark:text-blue-200',
    iconColor: 'text-blue-600 dark:text-blue-400'
  }
}

export default function Toast({ toast, onRemove }) {
  const config = toastConfig[toast.type] || toastConfig.info
  const Icon = config.icon

  // 支持动态数据渲染
  const renderMessage = () => {
    if (typeof toast.message === 'string') {
      return toast.message
    }
    
    // 如果是对象，渲染动态内容
    if (typeof toast.message === 'object' && toast.message.dynamic) {
      return (
        <div className="space-y-1">
          <p className={`text-sm font-medium ${config.textColor}`}>
            {toast.message.title}
          </p>
          {toast.message.details && (
            <div className={`text-xs ${config.textColor} opacity-80 space-y-1`}>
              {Object.entries(toast.message.details).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          )}
          {toast.message.transactionHash && (
            <div className={`text-xs ${config.textColor} opacity-60 truncate`}>
              TX: {toast.message.transactionHash}
            </div>
          )}
        </div>
      )
    }
    
    return toast.message
  }

  return (
    <div
      className={`max-w-sm w-full ${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ease-in-out`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${config.iconColor}`} aria-hidden="true" />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            {renderMessage()}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className={`inline-flex ${config.textColor} rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-green-50`}
              onClick={() => onRemove(toast.id)}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}