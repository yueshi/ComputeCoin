import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'
import {
  ServerIcon,
  CpuChipIcon,
  CameraIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CogIcon,
  Battery50Icon,
  Battery100Icon,
  MapPinIcon,
  SignalIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  SignalSlashIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

export default function Equipment() {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState('gpu')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  // GPU设备数据
  const [gpuDevices, setGpuDevices] = useState([
    {
      id: 1,
      name: t('equipment.devices.gpu.name', { id: '001' }),
      model: t('equipment.devices.gpu.a100.model'),
      specs: {
        gpu: t('equipment.devices.gpu.a100.gpu'),
        cpu: t('equipment.devices.gpu.a100.cpu'),
        memory: t('equipment.devices.gpu.a100.memory'),
        storage: t('equipment.devices.gpu.a100.storage')
      },
      status: "online",
      utilization: 85,
      temperature: 65,
      location: t('equipment.devices.locations.dataCenterA'),
      uptime: t('equipment.devices.uptime.days', { days: '45' }),
      revenue: "2,450 CC",
      provider: "0x1234...5678"
    },
    {
      id: 2,
      name: t('equipment.devices.gpu.name', { id: '002' }),
      model: t('equipment.devices.gpu.rtx4090.model'),
      specs: {
        gpu: t('equipment.devices.gpu.rtx4090.gpu'),
        cpu: t('equipment.devices.gpu.rtx4090.cpu'),
        memory: t('equipment.devices.gpu.rtx4090.memory'),
        storage: t('equipment.devices.gpu.rtx4090.storage')
      },
      status: "maintenance",
      utilization: 0,
      temperature: 35,
      location: t('equipment.devices.locations.dataCenterB'),
      uptime: t('equipment.devices.uptime.offline'),
      revenue: "1,820 CC",
      provider: "0x8765...4321"
    },
    {
      id: 3,
      name: t('equipment.devices.gpu.name', { id: '003' }),
      model: t('equipment.devices.gpu.h100.model'),
      specs: {
        gpu: t('equipment.devices.gpu.h100.gpu'),
        cpu: t('equipment.devices.gpu.h100.cpu'),
        memory: t('equipment.devices.gpu.h100.memory'),
        storage: t('equipment.devices.gpu.h100.storage')
      },
      status: "offline",
      utilization: 0,
      temperature: 28,
      location: t('equipment.devices.locations.dataCenterC'),
      uptime: t('equipment.devices.uptime.failure'),
      revenue: "3,120 CC",
      provider: "0xABCD...EF01"
    }
  ])

  // 无人机数据
  const [droneDevices, setDroneDevices] = useState([
    {
      id: 1,
      name: t('equipment.devices.drone.inspection.name', { id: '001' }),
      model: t('equipment.devices.drone.inspection.model'),
      specs: {
        drone: t('equipment.devices.drone.inspection.model'),
        camera: t('equipment.devices.drone.inspection.camera'),
        battery: t('equipment.devices.drone.inspection.battery'),
        range: t('equipment.devices.drone.inspection.range')
      },
      status: "active",
      battery: 85,
      flightTime: t('equipment.devices.drone.inspection.flightTime'),
      location: t('equipment.devices.drone.inspection.location'),
      missions: 156,
      revenue: "890 CC",
      provider: "0xFEDC...BA98"
    },
    {
      id: 2,
      name: t('equipment.devices.drone.show.name', { id: '002' }),
      model: t('equipment.devices.drone.show.model'),
      specs: {
        drone: t('equipment.devices.drone.show.model'),
        lights: t('equipment.devices.drone.show.lights'),
        battery: t('equipment.devices.drone.show.battery'),
        swarm: t('equipment.devices.drone.show.swarm')
      },
      status: "charging",
      battery: 45,
      flightTime: t('equipment.devices.drone.show.flightTime'),
      location: t('equipment.devices.drone.show.location'),
      missions: 42,
      revenue: "3,200 CC",
      provider: "0xSHOWTIME...1234"
    },
    {
      id: 3,
      name: t('equipment.devices.drone.spraying.name', { id: '003' }),
      model: t('equipment.devices.drone.spraying.model'),
      specs: {
        drone: t('equipment.devices.drone.spraying.model'),
        tank: t('equipment.devices.drone.spraying.tank'),
        battery: t('equipment.devices.drone.spraying.battery'),
        coverage: t('equipment.devices.drone.spraying.coverage')
      },
      status: "maintenance",
      battery: 20,
      flightTime: t('equipment.devices.drone.spraying.flightTime'),
      location: t('equipment.devices.drone.spraying.location'),
      missions: 89,
      revenue: "1,450 CC",
      provider: "0xAGRIBOT...5678"
    }
  ])

  // 地面服务站数据
  const [groundStationDevices, setGroundStationDevices] = useState([
    {
      id: 1,
      name: t('equipment.devices.groundStation.charging.name', { id: '001' }),
      model: t('equipment.devices.groundStation.charging.model'),
      specs: {
        ports: t('equipment.devices.groundStation.charging.ports'),
        power: t('equipment.devices.groundStation.charging.power'),
        efficiency: t('equipment.devices.groundStation.charging.efficiency'),
        chargingSpeed: t('equipment.devices.groundStation.charging.chargingSpeed')
      },
      status: "online",
      activeConnections: 8,
      totalConnections: 16,
      efficiency: 95,
      location: t('equipment.devices.groundStation.charging.location'),
      uptime: t('equipment.devices.groundStation.charging.uptime'),
      revenue: "980 CC",
      provider: "0xCHARGE...001"
    },
    {
      id: 2,
      name: t('equipment.devices.groundStation.charging.name', { id: '002' }),
      model: "ChargeStation-Pro",
      specs: {
        ports: "8个快充端口",
        power: "320kW总功率",
        efficiency: "93%充电效率",
        chargingSpeed: "45分钟充满"
      },
      status: "busy",
      activeConnections: 7,
      totalConnections: 8,
      efficiency: 87,
      location: "商业区快充站",
      uptime: "1890小时",
      revenue: "1,250 CC",
      provider: "0xCHARGE...002"
    },
    {
      id: 3,
      name: t('equipment.devices.groundStation.maintenance.name', { id: '003' }),
      model: t('equipment.devices.groundStation.maintenance.model'),
      specs: {
        facilities: t('equipment.devices.groundStation.maintenance.facilities'),
        tools: t('equipment.devices.groundStation.maintenance.tools'),
        capacity: t('equipment.devices.groundStation.maintenance.capacity'),
        serviceTime: t('equipment.devices.groundStation.maintenance.serviceTime')
      },
      status: "online",
      activeConnections: 3,
      totalConnections: 8,
      efficiency: 85,
      location: t('equipment.devices.groundStation.maintenance.location'),
      uptime: t('equipment.devices.groundStation.maintenance.uptime'),
      revenue: "890 CC",
      provider: "0xSERVICE...003"
    },
    {
      id: 4,
      name: t('equipment.devices.groundStation.maintenance.name', { id: '004' }),
      model: "ServiceHub-Express",
      specs: {
        facilities: "快速维修设施",
        tools: "快速诊断工具",
        capacity: "同时维护4架设备",
        serviceTime: "1小时快速维护"
      },
      status: "idle",
      activeConnections: 0,
      totalConnections: 4,
      efficiency: 92,
      location: "机场服务站",
      uptime: "1120小时",
      revenue: "720 CC",
      provider: "0xSERVICE...004"
    }
  ])

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
                  <ServerIcon className="w-4 h-4" />
                  <span>{t('equipment.title')}</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-bold text-theme-primary">
                  <span className="block">{t('equipment.wallet.connect')}</span>
                  <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent mt-2">
                    {t('equipment.wallet.manage')}
                  </span>
                </h1>

                <p className="text-xl text-theme-secondary max-w-3xl mx-auto leading-relaxed">
                  {t('equipment.wallet.description')}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

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

  const getBatteryColor = (level) => {
    if (level > 60) return 'text-green-600'
    if (level > 20) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBatteryIcon = (level) => {
    if (level > 60) return Battery100Icon
    return Battery50Icon
  }

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
            {t(`equipment.status.${device.status}`)}
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
            <span className="text-theme-secondary">{t('equipment.utilization')}</span>
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
          <span className="text-theme-secondary">{t('equipment.temperature')}</span>
          <span className={`font-medium ${device.temperature > 70 ? 'text-red-600' : 'text-theme-primary'}`}>
            {device.temperature}°C
          </span>
        </div>
      </div>

      {/* 设备信息 */}
      <div className="space-y-2 mb-4 pt-4 border-t border-theme">
        <div className="flex items-center justify-between text-sm">
          <span className="text-theme-secondary">{t('equipment.location')}</span>
          <span className="text-theme-primary">{device.location}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-theme-secondary">{t('equipment.uptime')}</span>
          <span className="text-theme-primary">{device.uptime}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-theme-secondary">{t('equipment.revenue')}</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{device.revenue}</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center space-x-2">
        <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105">
          <EyeIcon className="w-4 h-4" />
          <span>{t('equipment.actions.view')}</span>
        </button>
        <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105">
          <CogIcon className="w-4 h-4" />
          <span>{t('equipment.actions.configure')}</span>
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
              {t(`equipment.status.${device.status}`)}
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
              <span className="text-theme-secondary">{t('equipment.battery')}</span>
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
            <span className="text-theme-secondary">{t('equipment.location')}</span>
            <span className="text-theme-primary">{device.location}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">{t('equipment.flightTime')}</span>
            <span className="text-theme-primary">{device.flightTime}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">{t('equipment.missions')}</span>
            <span className="text-theme-primary">{device.missions} {t('equipment.missionsUnit')}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">{t('equipment.revenue')}</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{device.revenue}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-2">
          <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105">
            <EyeIcon className="w-4 h-4" />
            <span>{t('equipment.actions.view')}</span>
          </button>
          <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105">
            <MapPinIcon className="w-4 h-4" />
            <span>{t('equipment.actions.track')}</span>
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
              {t(`equipment.status.${device.status}`)}
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
                  <span className="text-theme-secondary">{t('equipment.activeConnections')}</span>
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
                  <span className="text-theme-secondary">{t('equipment.efficiency')}</span>
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

          {/* 额外信息显示 */}
          <div className="grid grid-cols-2 gap-2 text-xs text-theme-secondary">
            {device.specs.chargingSpeed && (
              <div className="flex items-center space-x-1">
                <ClockIcon className="w-3 h-3" />
                <span>{device.specs.chargingSpeed}</span>
              </div>
            )}
            {device.specs.serviceTime && (
              <div className="flex items-center space-x-1">
                <WrenchScrewdriverIcon className="w-3 h-3" />
                <span>{device.specs.serviceTime}</span>
              </div>
            )}
            {device.specs.efficiency && (
              <div className="flex items-center space-x-1">
                <ChartBarIcon className="w-3 h-3" />
                <span>{device.specs.efficiency}</span>
              </div>
            )}
            {device.specs.capacity && (
              <div className="flex items-center space-x-1">
                <ServerIcon className="w-3 h-3" />
                <span>{device.specs.capacity}</span>
              </div>
            )}
          </div>
        </div>

        {/* 设备信息 */}
        <div className="space-y-2 mb-4 pt-4 border-t border-theme">
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">{t('equipment.location')}</span>
            <span className="text-theme-primary">{device.location}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">{t('equipment.uptime')}</span>
            <span className="text-theme-primary">{device.uptime}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-theme-secondary">{t('equipment.revenue')}</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{device.revenue}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-2">
          <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105">
            <EyeIcon className="w-4 h-4" />
            <span>{t('equipment.actions.view')}</span>
          </button>
          <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105">
            <CogIcon className="w-4 h-4" />
            <span>{t('equipment.actions.configure')}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 页面头部 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-gray-900 dark:text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{t('equipment.title')}</h1>
            <p className="text-gray-600 dark:text-gray-300">{t('equipment.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>{t('equipment.addEquipment')}</span>
          </button>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <ServerIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t('equipment.totalGpuDevices')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{gpuDevices.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t('equipment.onlineDevices')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {gpuDevices.filter(d => d.status === 'online').length +
                   droneDevices.filter(d => d.status === 'active').length +
                   groundStationDevices.filter(d => d.status === 'online' || d.status === 'busy').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CameraIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t('equipment.totalDroneDevices')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{droneDevices.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <SignalIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t('equipment.totalGroundStationDevices')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{groundStationDevices.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t('equipment.totalRevenue')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
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
        <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-1 px-6 py-2">
            <button
              onClick={() => setActiveTab('gpu')}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'gpu'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <ServerIcon className="w-5 h-5" />
              <span>{t('equipment.gpuDevices')}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeTab === 'gpu' ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                {gpuDevices.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('drone')}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'drone'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <CameraIcon className="w-5 h-5" />
              <span>{t('equipment.droneDevices')}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeTab === 'drone' ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                {droneDevices.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('groundStation')}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'groundStation'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <SignalIcon className="w-5 h-5" />
              <span>{t('equipment.groundStationDevices')}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeTab === 'groundStation' ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                {groundStationDevices.length}
              </span>
            </button>
          </nav>
        </div>

        {/* 过滤器 */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <FunnelIcon className="w-4 h-4 text-gray-500" />
              {t('equipment.filterByStatus')}:
            </span>
            <div className="flex space-x-2">
              {['all', 'online', 'offline', 'maintenance', 'busy'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
                    filterStatus === status
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  {status === 'busy' ? t(`equipment.status.${status}`) : t(`equipment.filter.${status}`)}
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

          {/* 空状态 */}
          {(activeTab === 'gpu' && filteredGpuDevices.length === 0) ||
           (activeTab === 'drone' && filteredDroneDevices.length === 0) ||
           (activeTab === 'groundStation' && filteredGroundStationDevices.length === 0) ? (
            <div className="text-center py-16">
              <ServerIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-theme-primary mb-2">
                {t('equipment.noDevices')}
              </h3>
              <p className="text-theme-secondary dark:text-gray-400 mb-4">
                {t('equipment.noDevicesDescription')}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                {t('equipment.addFirstEquipment')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}