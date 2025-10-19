import React, { Component } from 'react'
import { useTranslation } from 'react-i18next'
import { ExclamationTriangleIcon, HomeIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

class ErrorBoundaryClass extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorBoundaryDisplay error={this.state.error} onReset={() => this.setState({ hasError: false, error: null })} />
    }

    return this.props.children
  }
}

function ErrorBoundaryDisplay({ error, onReset }) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 m-4">
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-6">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('errorBoundary.title')}
          </h1>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
              {t('errorBoundary.errorMessage')}
            </p>
            <p className="text-xs text-red-700 dark:text-red-300">
              {error?.message || t('common.unknownError')}
            </p>
          </div>
          
          <details className="text-left bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              {t('errorBoundary.errorDetails')}
            </summary>
            <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">
              {error?.stack}
            </pre>
          </details>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onReset}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              {t('errorBoundary.tryAgain')}
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              <HomeIcon className="w-4 h-4" />
              {t('errorBoundary.goHome')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ErrorBoundary(props) {
  return <ErrorBoundaryClass {...props} />
}