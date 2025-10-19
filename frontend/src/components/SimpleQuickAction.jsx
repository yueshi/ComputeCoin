import React from 'react'
import { Link } from 'react-router-dom'

export default function SimpleQuickAction({ name, description, icon: Icon, color, href, onClick }) {
  const Element = href ? Link : 'button'
  const props = href ? { to: href } : { onClick, type: 'button' }

  return (
    <Element
      {...props}
      className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all"
    >
      <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{name}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </Element>
  )
}