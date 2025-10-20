import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { 
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  WalletIcon,
  ComputerDesktopIcon as ComputerIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  TagIcon
} from '@heroicons/react/24/outline'


export default function Marketplace() {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  const [selectedCategory, setSelectedCategory] = useState("all")

  // 模拟服务数据
  const mockServices = [
    {
      id: 1,
      title: t('marketplace.services.aiTraining.title'),
      description: t('marketplace.services.aiTraining.description'),
      category: "ai",
      provider: "0x1234...5678",
      rating: 4.8,
      reviewCount: 127,
      pricePerHour: "2.5",
      currency: "CCUSD",
      specs: {
        gpu: "NVIDIA A100 80GB",
        cpu: t('marketplace.specs.cpu.64coreAmd'),
        memory: "512GB RAM",
        storage: "10TB NVMe"
      },
      availability: "available",
      tags: ["GPU", "AI/ML", t('marketplace.tags.deepLearning')]
    },
    {
      id: 2,
      title: t('marketplace.services.renderFarm.title'),
      description: t('marketplace.services.renderFarm.description'),
      category: "render",
      provider: "0x8765...4321",
      rating: 4.6,
      reviewCount: 89,
      pricePerHour: "1.8",
      currency: "CCUSD",
      specs: {
        gpu: "RTX 4090 24GB",
        cpu: t('marketplace.specs.cpu.32coreIntel'),
        memory: "256GB RAM",
        storage: "5TB SSD"
      },
      availability: "available",
      tags: [t('marketplace.categories.rendering'), "GPU", t('marketplace.tags.creative')]
    },
    {
      id: 3,
      title: t('marketplace.services.scientificCompute.title'),
      description: t('marketplace.services.scientificCompute.description'),
      category: "science",
      provider: "0xABCD...EF01",
      rating: 4.9,
      reviewCount: 203,
      pricePerHour: "1.2",
      currency: "CCUSD",
      specs: {
        cpu: t('marketplace.specs.cpu.128coreIntel'),
        memory: "1TB RAM",
        storage: "50TB SAS",
        network: "100Gbps"
      },
      availability: "limited",
      tags: ["HPC", t('marketplace.services.scientific.title'), t('marketplace.tags.numericalSimulation')]
    }
  ]

  const categories = [
    { id: "all", name: t('marketplace.categories.all'), icon: "🌟" },
    { id: "ai", name: t('marketplace.categories.aiMl'), icon: "🤖" },
    { id: "render", name: t('marketplace.categories.rendering'), icon: "🎨" },
    { id: "science", name: t('marketplace.categories.scientific'), icon: "🔬" },
    { id: "crypto", name: t('marketplace.categories.blockchain'), icon: "⛓️" },
    { id: "video", name: t('marketplace.categories.video'), icon: "🎬" }
  ]

  const sortOptions = [
    { value: "rating", name: t('marketplace.sort.highestRated') },
    { value: "price-low", name: t('marketplace.sort.lowestPrice') },
    { value: "price-high", name: t('marketplace.sort.highestPrice') },
    { value: "reviews", name: t('marketplace.sort.mostReviews') }
  ]
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("rating")
  const [priceRange, setPriceRange] = useState([0, 10])
  const [showFilters, setShowFilters] = useState(false)

  // 过滤和搜索逻辑
  const filteredServices = mockServices.filter(service => {
    const matchesCategory = selectedCategory === "all" || service.category === selectedCategory
    const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPrice = parseFloat(service.pricePerHour) >= priceRange[0] && 
                        parseFloat(service.pricePerHour) <= priceRange[1]
    
    return matchesCategory && matchesSearch && matchesPrice
  })

  // 排序逻辑
  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return b.rating - a.rating
      case "price-low":
        return parseFloat(a.pricePerHour) - parseFloat(b.pricePerHour)
      case "price-high":
        return parseFloat(b.pricePerHour) - parseFloat(a.pricePerHour)
      case "reviews":
        return b.reviewCount - a.reviewCount
      default:
        return 0
    }
  })

  const ServiceCard = ({ service }) => (
    <div className="card hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      {/* 服务头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-theme-primary mb-2">{service.title}</h3>
          <p className="text-theme-secondary text-sm line-clamp-2">{service.description}</p>
        </div>
        <div className="flex items-center space-x-1 ml-4">
          <StarIcon className="w-5 h-5 text-yellow-400 fill-current drop-shadow-sm" />
          <span className="text-sm font-medium text-theme-primary dark:text-white">{service.rating}</span>
          <span className="text-xs text-theme-secondary dark:text-gray-400">({service.reviewCount})</span>
        </div>
      </div>

      {/* 规格信息 */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-4 text-sm text-theme-secondary dark:text-gray-300">
          <div className="flex items-center space-x-1">
            <ComputerDesktopIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
            <span>{service.specs.cpu || service.specs.gpu}</span>
          </div>
          <div className="flex items-center space-x-1">
            <ClockIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
            <span>{service.specs.memory}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {service.tags.map((tag, index) => (
            <span key={index} className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 价格和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CurrencyDollarIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
          <div>
            <span className="text-xl font-bold text-theme-primary">{service.pricePerHour}</span>
            <span className="text-sm text-theme-secondary dark:text-gray-400">/{service.currency}/{t('marketplace.common.perHour')}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs rounded-full ${
            service.availability === 'available' 
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' 
              : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300'
          }`}>
            {service.availability === 'available' ? t('marketplace.availability.available') : t('marketplace.availability.limited')}
          </span>
          
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isConnected
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-theme-secondary text-theme-tertiary cursor-not-allowed'
            }`}
            disabled={!isConnected}
            onClick={() => {
              if (isConnected) {
                // 处理订单创建逻辑
                console.log(t('marketplace.actions.createOrder'), service.id)
              }
            }}
          >
            {isConnected ? t('marketplace.buttons.orderNow') : t('marketplace.errors.connectWallet')}
          </button>
        </div>
      </div>

      {/* 提供商信息 */}
      <div className="mt-4 pt-4 border-t border-theme">
        <div className="flex items-center justify-between text-sm text-theme-secondary dark:text-gray-300">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-theme-secondary rounded-full flex items-center justify-center">
              <span className="text-xs font-medium">{service.provider.slice(-2)}</span>
            </div>
            <span className="text-theme-primary dark:text-gray-200">{t('marketplace.serviceCard.providerLabel')} {service.provider}</span>
          </div>
          <CheckCircleIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400 drop-shadow-sm" />
        </div>
      </div>
    </div>
  )

  if (!isConnected) {
    return (
      <div className="space-y-16">
        {/* 连接钱包提示区域 */}
        <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-theme-bg to-teal-50 dark:from-emerald-900/20 dark:via-theme-bg dark:to-teal-900/20"></div>
          <div className="relative max-w-7xl mx-auto text-center">
            <div className="space-y-8">
              {/* 主标题 */}
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2 rounded-full text-lg font-medium">
                  <ShoppingCartIcon className="w-4 h-4" />
                  <span>{t('marketplace.title')}</span>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold text-theme-primary">
                  <span className="block">{t('marketplace.wallet.connect')}</span>
                  <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent mt-2">
                    {t('marketplace.wallet.exploreMarket')}
                  </span>
                </h1>
                
                <p className="text-xl text-theme-secondary max-w-3xl mx-auto leading-relaxed">
                  {t('marketplace.wallet.description')}
                </p>
              </div>
              
              {/* 连接钱包按钮 */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="transform hover:scale-105 transition-all duration-200">
                  <Link
                    to="/wallet-connect"
                    className="group relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 inline-flex items-center"
                  >
                    <span className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    <span className="relative flex items-center space-x-2">
                      <WalletIcon className="w-5 h-5" />
                      <span>{t('marketplace.wallet.connectStart')}</span>
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 功能介绍区域 */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-theme-primary mb-4">{t('marketplace.features.title')}</h2>
            <p className="text-xl text-theme-secondary max-w-3xl mx-auto">
              {t('marketplace.features.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <ComputerDesktopIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('marketplace.features.diverseCompute.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('marketplace.features.diverseCompute.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <TagIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('marketplace.features.nftDiscount.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('marketplace.features.nftDiscount.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <CurrencyDollarIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('marketplace.features.ccPayment.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('marketplace.features.ccPayment.description')}
              </p>
            </div>

            <div className="group text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-emerald-500/25 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                  <CheckCircleIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  4
                </div>
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">{t('marketplace.features.security.title')}</h3>
              <p className="text-theme-secondary leading-relaxed">
                {t('marketplace.features.security.description')}
              </p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* 搜索和过滤 */}
      <div className="bg-theme-card rounded-xl shadow-sm border border-theme p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder={t('marketplace.search.placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-theme-input text-theme-primary"
            />
          </div>

          {/* 分类过滤 */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-theme-secondary text-theme-primary hover:bg-theme-tertiary'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          {/* 高级过滤按钮 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-tertiary"
          >
            <FunnelIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="text-theme-primary">{t('marketplace.filters.advanced')}</span>
          </button>
        </div>

        {/* 高级过滤面板 */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-theme">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 排序 */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">{t('marketplace.filters.sortBy')}</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-theme-input text-theme-primary"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 价格范围 */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">{t('marketplace.filters.priceRange')}</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder={t('marketplace.filters.minPrice')}
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseFloat(e.target.value) || 0, priceRange[1]])}
                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-theme-input text-theme-primary"
                  />
                  <span className="text-theme-secondary">-</span>
                  <input
                    type="number"
                    placeholder={t('marketplace.filters.maxPrice')}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseFloat(e.target.value) || 100])}
                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-theme-input text-theme-primary"
                  />
                </div>
              </div>

              {/* 重置按钮 */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedCategory("all")
                    setSearchTerm("")
                    setPriceRange([0, 10])
                    setSortBy("rating")
                  }}
                  className="w-full px-4 py-2 border border-theme rounded-lg hover:bg-theme-tertiary"
                >
                  {t('marketplace.filters.reset')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 服务列表 */}
      <div className="space-y-6">
        <div className="flex items-center">
          <h2 className="text-2xl font-bold text-theme-primary">
            {t('marketplace.services.title')} ({sortedServices.length})
          </h2>
        </div>

        {sortedServices.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <ShoppingCartIcon className="w-10 h-10 text-gray-400 dark:text-gray-300 drop-shadow-md" />
            </div>
            <h3 className="text-lg font-medium text-theme-primary mb-2">{t('marketplace.services.noResults')}</h3>
            <p className="text-theme-secondary dark:text-gray-300 mb-4">{t('marketplace.services.tryAdjustingFilters')}</p>
            <button
              onClick={() => {
                setSelectedCategory("all")
                setSearchTerm("")
                setPriceRange([0, 10])
              }}
              className="btn-primary"
            >
              {t('marketplace.services.clearFilters')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}