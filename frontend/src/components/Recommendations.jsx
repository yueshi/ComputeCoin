import React from 'react'
import { useTranslation } from 'react-i18next'
import { SparklesIcon, StarIcon, TrendingUpIcon } from '@heroicons/react/24/outline'

const getMockRecommendations = (t) => [
  {
    id: 1,
    type: 'stake',
    title: t('recommendations.recommendations.0.title'),
    description: t('recommendations.recommendations.0.description'),
    benefit: t('recommendations.recommendations.0.benefit'),
    action: t('recommendations.recommendations.0.action'),
    icon: TrendingUpIcon,
    color: 'from-green-400 to-green-600',
    priority: 'high'
  },
  {
    id: 2,
    type: 'nft',
    title: t('recommendations.recommendations.1.title'),
    description: t('recommendations.recommendations.1.description'),
    benefit: t('recommendations.recommendations.1.benefit'),
    action: t('recommendations.recommendations.1.action'),
    icon: StarIcon,
    color: 'from-yellow-400 to-yellow-600',
    priority: 'medium'
  },
  {
    id: 3,
    type: 'service',
    title: t('recommendations.recommendations.2.title'),
    description: t('recommendations.recommendations.2.description'),
    benefit: t('recommendations.recommendations.2.benefit'),
    action: t('recommendations.recommendations.2.action'),
    icon: SparklesIcon,
    color: 'from-purple-400 to-purple-600',
    priority: 'low'
  }
]

export default function Recommendations({ recommendations }) {
  const { t } = useTranslation()
  
  // Use translated mock recommendations if none provided
  const mockRecommendations = getMockRecommendations(t)
  const recommendationsList = recommendations || mockRecommendations
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-blue-200 bg-blue-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getPriorityText = (priority) => {
    return t(`recommendations.priority.${priority}`)
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('recommendations.title')}</h3>
        <span className="text-sm text-gray-500">{t('recommendations.subtitle')}</span>
      </div>
      
      <div className="space-y-4">
        {recommendationsList.map((rec) => {
          const IconComponent = rec.icon
          
          return (
            <div key={rec.id} className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)}`}>
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 bg-gradient-to-r ${rec.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">
                      {rec.benefit}
                    </span>
                    
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {getPriorityText(rec.priority)}
                    </span>
                  </div>
                  
                  <button className="w-full mt-2 bg-white hover:bg-gray-50 text-gray-900 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors">
                    {rec.action}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-4 text-center">
        <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          {t('recommendations.refresh')}
        </button>
      </div>
    </div>
  )
}