import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'
import { useTranslation } from 'react-i18next'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastContainer } from './components/Toast'
import { useToast } from './hooks/useToast'
import { config } from './config/rainbowKit'
import Home from './pages/Home'
import Marketplace from './pages/Marketplace'
import Staking from './pages/Staking'
import NFTManagement from './pages/NFTManagement'
import NFTDetails from './pages/NFTDetails'
import Profile from './pages/Profile'
import Exchange from './pages/Exchange'

// 自定义绿色主题
const customLightTheme = lightTheme({
  accentColor: '#10b981',
  accentColorForeground: '#ffffff',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
})

const customDarkTheme = darkTheme({
  accentColor: '#10b981',
  accentColorForeground: '#ffffff',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
})

function RainbowKitThemeProvider({ children }) {
  const { isDark } = useTheme()
  const { i18n } = useTranslation()
  const [rainbowLocale, setRainbowLocale] = useState(i18n.language === 'zh' ? 'zh-CN' : 'en-US')
  
  // 监听语言变化
  useEffect(() => {
    const handleLanguageChange = () => {
      setRainbowLocale(i18n.language === 'zh' ? 'zh-CN' : 'en-US')
    }
    
    i18n.on('languageChanged', handleLanguageChange)
    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [i18n])
  
  return (
    <RainbowKitProvider
      config={config}
      theme={isDark ? customDarkTheme : customLightTheme}
      locale={rainbowLocale}
    >
      {children}
    </RainbowKitProvider>
  )
}

function App() {
  const { isConnected } = useAccount()
  const { toasts, addToast, removeToast } = useToast()

  return (
    <ThemeProvider>
      <RainbowKitThemeProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <div className="min-h-screen bg-gradient-theme">
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/staking" element={<Staking />} />
                  <Route path="/nfts" element={<NFTManagement />} />
                  <Route path="/nft/customer/:tokenId" element={<NFTDetails nftType="customer" />} />
                  <Route path="/nft/provider/:tokenId" element={<NFTDetails nftType="provider" />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/exchange" element={<Exchange />} />
                    </Routes>
              </Layout>
            </div>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
          </ErrorBoundary>
        </BrowserRouter>
      </RainbowKitThemeProvider>
    </ThemeProvider>
  )
}

export default App