import React from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'
import WalletConnectButton from '../components/WalletConnectButton'
import {
  ComputerDesktopIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowRightIcon,
  ChartBarIcon,
  UsersIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeAltIcon,
  CogIcon,
  WalletIcon,
  TrophyIcon,
  LightBulbIcon,
  FireIcon,
  RocketLaunchIcon,
  AcademicCapIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline'

export default function Home() {
  const { isConnected } = useAccount()
  const { t } = useTranslation()

  return (
    <div className="space-y-16">
      {/* 英雄区域 */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-theme-bg to-teal-50 dark:from-emerald-900/20 dark:via-theme-bg dark:to-teal-900/20"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="space-y-8">
            {/* 主标题 */}
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-full text-lg font-medium">
                <FireIcon className="w-4 h-4" />
                <span>{t('home.hero.tagline')}</span>
              </div>
              
              <h1 className="text-3xl md:text-5xl font-bold text-theme-primary">
                <span className="block">{t('home.hero.title')}</span>
                <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent mt-2">
                  {t('home.hero.subtitle')}
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-theme-secondary max-w-4xl mx-auto leading-relaxed">
                {t('home.hero.description')}
                <br />
              </p>
            </div>

            {/* 行动按钮 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!isConnected ? (
                <div className="transform hover:scale-105 transition-all duration-200">
                  <WalletConnectButton
                    size="large"
                    className="group relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  />
                </div>
              ) : (
                <Link
                  to="/marketplace"
                  className="group relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 inline-flex items-center space-x-2"
                >
                  <span className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                  <span className="relative flex items-center space-x-2">
                    <RocketLaunchIcon className="w-5 h-5" />
                    <span>{t('home.hero.enterMarket')}</span>
                    <ArrowRightIcon className="w-5 h-5" />
                  </span>
                </Link>
              )}
              
              <Link 
                to="/docs" 
                className="group relative bg-theme-card dark:bg-gray-700 text-theme-primary dark:text-theme-secondary border-2 border-theme dark:border-gray-600 px-8 py-4 rounded-xl font-semibold text-lg hover:border-emerald-500 hover:text-emerald-600 transition-all duration-200 inline-flex items-center space-x-2"
              >
                <span className="flex items-center space-x-2">
                  <AcademicCapIcon className="w-5 h-5" />
                  <span>{t('home.hero.viewDocs')}</span>
                  <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </div>

            {/* 统计数据 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mt-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-2">50K+</div>
                <div className="text-theme-secondary">{t('home.stats.activeUsers')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-2">1.2K+</div>
                <div className="text-theme-secondary">{t('home.stats.computeNodes')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-2">$2.5M</div>
                <div className="text-theme-secondary">{t('home.stats.dailyVolume')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-2">99.9%</div>
                <div className="text-theme-secondary">{t('home.stats.availability')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 特性展示 */}
      <section className="py-20 bg-theme-card dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-full text-lg font-medium mb-4">
              <LightBulbIcon className="w-4 h-4" />
              <span>{t('home.features.tagline')}</span>
            </div>
            <h2 className="text-4xl font-bold text-theme-primary mb-4">
              {t('home.features.title')}
            </h2>
            <p className="text-xl text-theme-secondary max-w-3xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group relative bg-theme-card dark:bg-gray-800 border border-theme rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-600">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:shadow-xl group-hover:shadow-emerald-500/30 transition-all duration-300">
                  <ComputerDesktopIcon className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('home.features.decentralized.title')}</h3>
                <p className="text-theme-secondary leading-relaxed">
                  {t('home.features.decentralized.description')}
                </p>
              </div>
            </div>

            <div className="group relative bg-theme-card dark:bg-gray-800 border border-theme rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:border-green-300 dark:hover:border-green-600">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:shadow-xl group-hover:shadow-emerald-500/30 transition-all duration-300">
                  <CurrencyDollarIcon className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('home.features.tokenEconomy.title')}</h3>
                <p className="text-theme-secondary leading-relaxed">
                  {t('home.features.tokenEconomy.description')}
                </p>
              </div>
            </div>

            <div className="group relative bg-theme-card dark:bg-gray-800 border border-theme rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-600">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:shadow-xl group-hover:shadow-emerald-500/30 transition-all duration-300">
                  <SparklesIcon className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('home.features.nftSystem.title')}</h3>
                <p className="text-theme-secondary leading-relaxed">
                  {t('home.features.nftSystem.description')}
                </p>
              </div>
            </div>

            <div className="group relative bg-theme-card dark:bg-gray-800 border border-theme rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-600">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:shadow-xl group-hover:shadow-emerald-500/30 transition-all duration-300">
                  <ShieldCheckIcon className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('home.features.security.title')}</h3>
                <p className="text-theme-secondary leading-relaxed">
                  {t('home.features.security.description')}
                </p>
              </div>
            </div>

            <div className="group relative bg-theme-card dark:bg-gray-800 border border-theme rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-600">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:shadow-xl group-hover:shadow-emerald-500/30 transition-all duration-300">
                  <BoltIcon className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('home.features.performance.title')}</h3>
                <p className="text-theme-secondary leading-relaxed">
                  {t('home.features.performance.description')}
                </p>
              </div>
            </div>

            <div className="group relative bg-theme-card dark:bg-gray-800 border border-theme rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-600">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-50 dark:from-emerald-900/20 dark:to-emerald-900/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:shadow-xl group-hover:shadow-emerald-500/30 transition-all duration-300">
                  <UsersIcon className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
                <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('home.features.community.title')}</h3>
                <p className="text-theme-secondary leading-relaxed">
                  {t('home.features.community.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 使用流程 */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-theme-card dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-full text-lg font-medium mb-4">
              <CogIcon className="w-4 h-4" />
              <span>{t('home.process.tagline')}</span>
            </div>
            <h2 className="text-4xl font-bold text-theme-primary mb-4">
              {t('home.process.title')}
            </h2>
            <p className="text-xl text-theme-secondary max-w-3xl mx-auto">
              {t('home.process.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="group text-center">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <WalletIcon className="w-12 h-12 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('home.process.step1.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('home.process.step1.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <CurrencyDollarIcon className="w-12 h-12 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('home.process.step2.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('home.process.step2.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <SparklesIcon className="w-12 h-12 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('home.process.step3.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('home.process.step3.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <RocketLaunchIcon className="w-12 h-12 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  4
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('home.process.step4.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('home.process.step4.description')}
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link 
              to="/docs" 
              className="group relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 inline-flex items-center space-x-2"
            >
              <span className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
              <span className="relative flex items-center space-x-2">
                <AcademicCapIcon className="w-5 h-5" />
                <span>{t('home.process.learnMore')}</span>
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* 实时数据 */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-full text-lg font-medium mb-4">
              <TrophyIcon className="w-4 h-4" />
              <span>{t('home.realTimeData.tagline')}</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('home.realTimeData.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-xl">{t('home.realTimeData.subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-emerald-500/10">
                <ChartBarIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">8.5%</div>
              <div className="text-gray-600 dark:text-gray-400">{t('home.realTimeData.currentAPR')}</div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">+0.3% {t('home.realTimeData.changeFromLastWeek')}</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-emerald-500/10">
                <CurrencyDollarIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">$2.47</div>
              <div className="text-gray-600 dark:text-gray-400">{t('home.realTimeData.averagePrice')}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('home.realTimeData.ccusdPerHour')}</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-emerald-500/10">
                <ClockIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">24/7</div>
              <div className="text-gray-600 dark:text-gray-400">{t('home.realTimeData.serviceAvailability')}</div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">99.9% {t('home.realTimeData.uptime')}</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-emerald-500/10">
                <TrophyIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">15%</div>
              <div className="text-gray-600 dark:text-gray-400">{t('home.realTimeData.maxNFTDiscount')}</div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">{t('home.realTimeData.platinumTier')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-theme-card dark:bg-gray-800 rounded-3xl shadow-2xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10"></div>
            <div className="relative">
              <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-full text-lg font-medium mb-6">
                <AcademicCapIcon className="w-4 h-4" />
                <span>{t('home.cta.tagline')}</span>
              </div>
              
              <h2 className="text-4xl font-bold text-theme-primary mb-6">
                {t('home.cta.title')}
              </h2>
              
              <p className="text-xl text-theme-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
                {t('home.cta.description')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {!isConnected ? (
                  <div className="transform hover:scale-105 transition-all duration-200">
                    <WalletConnectButton
                      size="large"
                      className="group relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    />
                  </div>
                ) : (
                  <Link
                    to="/marketplace"
                    className="group relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 inline-flex items-center space-x-2"
                  >
                    <span className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    <span className="relative flex items-center space-x-2">
                      <RocketLaunchIcon className="w-5 h-5" />
                      <span>{t('home.cta.enterMarket')}</span>
                      <ArrowRightIcon className="w-5 h-5" />
                    </span>
                  </Link>
                )}
                
                <Link 
                  to="/docs" 
                  className="group relative bg-theme-card dark:bg-gray-700 text-theme-primary dark:text-theme-secondary border-2 border-theme dark:border-gray-600 px-8 py-4 rounded-xl font-semibold text-lg hover:border-emerald-500 hover:text-emerald-600 transition-all duration-200 inline-flex items-center space-x-2"
                >
                  <span className="flex items-center space-x-2">
                    <BuildingLibraryIcon className="w-5 h-5" />
                    <span>{t('home.cta.viewDocumentation')}</span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}