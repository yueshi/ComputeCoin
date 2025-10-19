import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // 从localStorage获取保存的主题设置
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      return savedTheme === 'dark'
    }
    // 检查系统主题偏好
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    // 保存主题设置到localStorage
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    
    // 更新HTML类名
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const toggleTheme = () => {
    setIsDark(prev => !prev)
  }

  const theme = useMemo(() => ({
    isDark,
    toggleTheme,
    mode: isDark ? 'dark' : 'light'
  }), [isDark])

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeContext