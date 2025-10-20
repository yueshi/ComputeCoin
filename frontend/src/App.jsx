import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastContainer } from './components/Toast'
import { useToast } from './hooks/useToast'
import Home from './pages/Home'
import Marketplace from './pages/Marketplace'
import Staking from './pages/Staking'
import NFTManagement from './pages/NFTManagement'
import NFTDetails from './pages/NFTDetails'
import Profile from './pages/Profile'
import Exchange from './pages/Exchange'
import WalletConnect from './pages/WalletConnect'
import OrderManagement from './pages/OrderManagement'

function App() {
  const { isConnected } = useAccount()
  const { toasts, addToast, removeToast } = useToast()

  return (
    <ThemeProvider>
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
                <Route path="/orders" element={<OrderManagement />} />
                <Route path="/wallet-connect" element={<WalletConnect />} />
              </Routes>
            </Layout>
          </div>
          <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App