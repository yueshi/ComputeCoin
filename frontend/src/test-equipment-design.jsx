import React, { useState } from 'react'
import {
  ServerIcon,
  CpuChipIcon,
  CameraIcon,
  PlusIcon,
  EyeIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CogIcon,
  Battery50Icon,
  Battery100Icon,
  MapPinIcon,
  SignalIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

// 测试数据
const gpuDevices = [
  {
    id: 1,
    name: "GPU算力主机 #001",
    model: "NVIDIA A100 80GB",
    specs: {
      gpu: "8x NVIDIA A100 80GB",
      cpu: "128核 AMD EPYC",
      memory: "2TB DDR4",
      storage: "100TB NVMe"
    },
    status: "online",
    utilization: 85,
    temperature: 65,
    location: "数据中心 A",
    uptime: "45天",
    revenue: "2,450 CC",
    provider: "0x1234...5678"
  },
  {
    id: 2,
    name: "GPU算力主机 #002",
    model: "RTX 4090 24GB",
    specs: {
      gpu: "4x RTX 4090 24GB",
      cpu: "64核 Intel Xeon",
      memory: "512GB DDR4",
      storage: "20TB NVMe"
    },
    status: "maintenance",
    utilization: 0,
    temperature: 35,
    location: "数据中心 B",
    uptime: "离线",
    revenue: "1,820 CC",
    provider: "0x8765...4321"
  }
]

const droneDevices = [
  {
    id: 1,
    name: "无人机巡检 #001",
    model: "DJI Matrice 300 RTK",
    specs: {
      camera: "Zenmuse H20T",
      battery: "59分钟",
      range: "15km"
    },
    status: "active",
    battery: 85,
    flightTime: "125小时",
    location: "上海外滩区域",
    missions: 156,
    revenue: "890 CC",
    provider: "0xFEDC...BA98"
  },
  {
    id: 2,
    name: "无人机表演 #002",
    model: "HighGreat Spark",
    specs: {
      lights: "RGB LED",
      battery: "25分钟",
      swarm: "500+架"
    },
    status: "charging",
    battery: 45,
    flightTime: "89小时",
    location: "表演中心仓库",
    missions: 42,
    revenue: "3,200 CC",
    provider: "0xSHOWTIME...1234"
  }
]

const groundStationDevices = [
  {
    id: 1,
    name: "充电服务站 #001",
    model: "ChargeStation-Max",
    specs: {
      ports: "16个快充端口",
      power: "480kW总功率",
      efficiency: "95%充电效率",
      chargingSpeed: "30分钟充满"
    },
    status: "online",
    activeConnections: 8,
    totalConnections: 16,
    efficiency: 95,
    location: "交通枢纽充电站",
    uptime: "2200小时",
    revenue: "980 CC",
    provider: "0xCHARGE...001"
  },
  {
    id: 2,
    name: "维护服务站 #003",
    model: "ServiceHub-Full",
    specs: {
      facilities: "完整维修设施",
      tools: "专业工具套装",
      capacity: "同时维护8架设备",
      serviceTime: "2小时标准维护"
    },
    status: "online",
    activeConnections: 3,
    totalConnections: 8,
    efficiency: 85,
    location: "设备维护基地",
    uptime: "1450小时",
    revenue: "890 CC",
    provider: "0xSERVICE...003"
  }
]

const getStatusColor = (status) => {
  switch (status) {
    case 'online':
    case 'active':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    case 'offline':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
    case 'maintenance':
    case 'charging':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
    case 'busy':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
    case 'idle':
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'online': return '在线'
    case 'offline': return '离线'
    case 'maintenance': return '维护中'
    case 'charging': return '充电中'
    case 'busy': return '繁忙'
    case 'idle': return '空闲'
    case 'active': return '活跃'
    default: return status
  }
}

const getBatteryColor = (level) => {
  if (level > 60) return 'text-green-600'
  if (level > 20) return 'text-yellow-600'
  return 'text-red-600'
}

const getBatteryIcon = (level) => {
  if (level > 60) return Battery100Icon
  return Battery50Icon
}

export default function EquipmentDesignTest() {
  const [activeTab, setActiveTab] = useState('gpu')
  const [filterStatus, setFilterStatus] = useState('all')

  const filteredGpuDevices = gpuDevices.filter(device =>
    filterStatus === 'all' || device.status === filterStatus
  )

  const filteredDroneDevices = droneDevices.filter(device =>
    filterStatus === 'all' || device.status === filterStatus
  )

  const filteredGroundStationDevices = groundStationDevices.filter(device =>
    filterStatus === 'all' || device.status === filterStatus
  )

  const GPUCard = ({ device }) => (
    <div className="card hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group">
      {/* 设备头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-theme-primary mb-1 group-hover:text-emerald-600 transition-colors">{device.name}</h3>
          <p className="text-sm text-theme-secondary">{device.model}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(device.status)}`}>
            {getStatusText(device.status)}
          </span>
        </div>
      </div>

      {/* 规格信息 */}
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-theme-secondary">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CpuChipIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="truncate">{device.specs.gpu.split('x')[1] || device.specs.gpu}</span>
          </div>
          <div className="flex items-center space-x-2 text-theme-secondary">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ServerIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span>{device.specs.memory}</span>
          </div>
        </div>

        {/* 性能指标 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">利用率</span>
            <span className="font-medium text-theme-primary">{device.utilization}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${device.utilization}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-theme-secondary">温度</span>
          <span className={`font-medium ${device.temperature > 70 ? 'text-red-600' : 'text-theme-primary'}`}>
            {device.temperature}°C
          </span>
        </div>
      </div>

      {/* 设备信息 */}
      <div className="space-y-2 mb-4 pt-4 border-t border-theme">
        <div className="flex items-center justify-between text-sm">
          <span className="text-theme-secondary">位置</span>
          <span className="text-theme-primary">{device.location}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-theme-secondary">运行时间</span>
          <span className="text-theme-primary">{device.uptime}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-theme-secondary">收益</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{device.revenue}</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center space-x-2">
        <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105">
          <EyeIcon className="w-4 h-4" />
          <span>查看详情</span>
        </button>
        <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105">
          <CogIcon className="w-4 h-4" />
          <span>配置</span>
        </button>
      </div>
    </div>
  )

  const DroneCard = ({ device }) => {
    const BatteryIcon = getBatteryIcon(device.battery)

    return (
      <div className="card hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group">
        {/* 设备头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-theme-primary mb-1 group-hover:text-emerald-600 transition-colors">{device.name}</h3>
            <p className="text-sm text-theme-secondary">{device.model}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(device.status)}`}>
              {getStatusText(device.status)}
            </span>
          </div>
        </div>

        {/* 规格信息 */}
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-theme-secondary">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CameraIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="truncate">{device.specs.camera || device.specs.lights}</span>
            </div>
            <div className="flex items-center space-x-2 text-theme-secondary">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BatteryIcon className={`w-4 h-4 ${getBatteryColor(device.battery)}`} />
              </div>
              <span>{device.battery}%</span>
            </div>
          </div>

          {/* 电池指示器 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-theme-secondary">电池电量</span>
              <span className={`font-medium ${getBatteryColor(device.battery)}`}>{device.battery}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  device.battery > 60 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
                  device.battery > 20 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-red-500 to-pink-500'
                }`}
                style={{ width: `${device.battery}%` }}
              />
            </div>
          </div>
        </div>

        {/* 设备信息 */}
        <div className="space-y-2 mb-4 pt-4 border-t border-theme">
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">位置</span>
            <span className="text-theme-primary">{device.location}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">飞行时间</span>
            <span className="text-theme-primary">{device.flightTime}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">任务次数</span>
            <span className="text-theme-primary">{device.missions} 次</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">收益</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{device.revenue}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-2">
          <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105">
            <EyeIcon className="w-4 h-4" />
            <span>查看详情</span>
          </button>
          <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105">
            <MapPinIcon className="w-4 h-4" />
            <span>追踪</span>
          </button>
        </div>
      </div>
    )
  }

  const GroundStationCard = ({ device }) => {
    const getStationIcon = (model) => {
      if (model.includes('Charge') || model.includes('充电')) return BoltIcon
      if (model.includes('Service') || model.includes('维护')) return WrenchScrewdriverIcon
      return ServerIcon
    }

    const StationIcon = getStationIcon(device.model)

    return (
      <div className="card hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group">
        {/* 设备头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-theme-primary mb-1 group-hover:text-emerald-600 transition-colors">{device.name}</h3>
            <p className="text-sm text-theme-secondary">{device.model}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(device.status)}`}>
              {getStatusText(device.status)}
            </span>
          </div>
        </div>

        {/* 规格信息 */}
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-theme-secondary">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <StationIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="truncate">
                {device.specs.ports || device.specs.facilities}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-theme-secondary">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                {device.specs.power ? (
                  <BoltIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <WrenchScrewdriverIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <span className="truncate">
                {device.specs.power || device.specs.tools}
              </span>
            </div>
          </div>

          {/* 连接状态或效率指标 */}
          <div className="space-y-2">
            {device.totalConnections > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-theme-secondary">活跃连接</span>
                  <span className="font-medium text-theme-primary">{device.activeConnections}/{device.totalConnections}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(device.activeConnections / device.totalConnections) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-theme-secondary">效率</span>
                  <span className={`font-medium ${device.efficiency > 80 ? 'text-emerald-600' : device.efficiency > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {device.efficiency}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      device.efficiency > 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
                      device.efficiency > 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}
                    style={{ width: `${device.efficiency}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* 设备信息 */}
        <div className="space-y-2 mb-4 pt-4 border-t border-theme">
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">位置</span>
            <span className="text-theme-primary">{device.location}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">运行时间</span>
            <span className="text-theme-primary">{device.uptime}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">收益</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{device.revenue}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-2">
          <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105">
            <EyeIcon className="w-4 h-4" />
            <span>查看详情</span>
          </button>
          <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105">
            <CogIcon className="w-4 h-4" />
            <span>配置</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 页面头部 */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">设备管理</h1>
              <p className="text-emerald-100">管理您的GPU算力主机、无人机和地面服务站设备</p>
            </div>
            <button className="flex items-center space-x-2 bg-white text-emerald-600 hover:bg-emerald-50 px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg">
              <PlusIcon className="w-5 h-5" />
              <span>添加设备</span>
            </button>
          </div>

          {/* 统计概览 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 hover:bg-white/20 transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <ServerIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-emerald-100 font-medium">GPU设备总数</p>
                  <p className="text-2xl font-bold text-white">{gpuDevices.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 hover:bg-white/20 transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircleIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-emerald-100 font-medium">在线设备</p>
                  <p className="text-2xl font-bold text-white">
                    {gpuDevices.filter(d => d.status === 'online').length +
                     droneDevices.filter(d => d.status === 'active').length +
                     groundStationDevices.filter(d => d.status === 'online' || d.status === 'busy').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 hover:bg-white/20 transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CameraIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-emerald-100 font-medium">无人机设备总数</p>
                  <p className="text-2xl font-bold text-white">{droneDevices.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 hover:bg-white/20 transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <SignalIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-emerald-100 font-medium">地面服务站总数</p>
                  <p className="text-2xl font-bold text-white">{groundStationDevices.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 hover:bg-white/20 transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <ChartBarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-emerald-100 font-medium">总收益</p>
                  <p className="text-2xl font-bold text-white">
                    {parseFloat(
                      gpuDevices.reduce((sum, d) => sum + parseFloat(d.revenue.split(' ')[0]), 0) +
                      droneDevices.reduce((sum, d) => sum + parseFloat(d.revenue.split(' ')[0]), 0) +
                      groundStationDevices.reduce((sum, d) => sum + parseFloat(d.revenue.split(' ')[0]), 0)
                    ).toFixed(0)} CC
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 设备管理标签页 */}
        <div className="bg-theme-card rounded-xl shadow-lg border border-theme overflow-hidden">
          {/* 标签导航 */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-b border-emerald-200 dark:border-emerald-800">
            <nav className="flex space-x-1 px-6 py-2">
              <button
                onClick={() => setActiveTab('gpu')}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === 'gpu'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                }`}
              >
                <ServerIcon className="w-5 h-5" />
                <span>GPU算力主机</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === 'gpu' ? 'bg-emerald-600 text-white' : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {gpuDevices.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('drone')}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === 'drone'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                }`}
              >
                <CameraIcon className="w-5 h-5" />
                <span>无人机设备</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === 'drone' ? 'bg-emerald-600 text-white' : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {droneDevices.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('groundStation')}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === 'groundStation'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                }`}
              >
                <SignalIcon className="w-5 h-5" />
                <span>地面服务站</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === 'groundStation' ? 'bg-emerald-600 text-white' : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {groundStationDevices.length}
                </span>
              </button>
            </nav>
          </div>

          {/* 过滤器 */}
          <div className="p-6 bg-gradient-to-r from-gray-50 to-emerald-50 dark:from-gray-800 dark:to-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-theme-primary flex items-center space-x-2">
                <FunnelIcon className="w-4 h-4 text-emerald-500" />
                按状态过滤:
              </span>
              <div className="flex space-x-2">
                {['all', 'online', 'offline', 'maintenance', 'busy'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
                      filterStatus === status
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                        : 'bg-white dark:bg-gray-700 text-theme-primary border border-emerald-200 dark:border-emerald-700 hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    {status === 'all' ? '全部' :
                     status === 'online' ? '在线' :
                     status === 'offline' ? '离线' :
                     status === 'maintenance' ? '维护中' :
                     status === 'busy' ? '繁忙' : status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 设备列表 */}
          <div className="p-6">
            {activeTab === 'gpu' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredGpuDevices.map(device => (
                  <GPUCard key={device.id} device={device} />
                ))}
              </div>
            ) : activeTab === 'drone' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredDroneDevices.map(device => (
                  <DroneCard key={device.id} device={device} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredGroundStationDevices.map(device => (
                  <GroundStationCard key={device.id} device={device} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 设计效果说明 */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-6">🎨 设计优化效果展示</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-emerald-100">
            <div>
              <h3 className="text-lg font-semibold mb-3">✨ 整体主题优化</h3>
              <ul className="space-y-2 text-sm">
                <li>• emerald-teal-green 渐变主题色系</li>
                <li>• 与主页风格保持一致</li>
                <li>• 现代化的玻璃态效果</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">✨ 视觉层次增强</h3>
              <ul className="space-y-2 text-sm">
                <li>• 渐变背景头部设计</li>
                <li>• 悬停效果和微交互</li>
                <li>• 统一的图标色彩系统</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">✨ 交互体验提升</h3>
              <ul className="space-y-2 text-sm">
                <li>• 卡片悬停向上移动效果</li>
li>• 按钮缩放和渐变效果</li>
                <li>• 流畅的状态过渡动画</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}