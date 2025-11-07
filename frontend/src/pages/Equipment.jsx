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
  MapPinIcon
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

  if (!isConnected) {
    return (
      <div className="space-y-16">
        {/* 连接钱包提示区域 */}
        <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-theme-bg to-indigo-50 dark:from-blue-900/20 dark:via-theme-bg dark:to-indigo-900/20"></div>
          <div className="relative max-w-7xl mx-auto text-center">
            <div className="space-y-8">
              {/* 主标题 */}
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-2 rounded-full text-lg font-medium">
                  <ServerIcon className="w-4 h-4" />
                  <span>{t('equipment.title')}</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-bold text-theme-primary">
                  <span className="block">{t('equipment.wallet.connect')}</span>
                  <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mt-2">
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

  const GPUCard = ({ device }) => (
    <div className="card hover:shadow-lg transition-all duration-200">
      {/* 设备头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-theme-primary mb-1">{device.name}</h3>
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
            <CpuChipIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="truncate">{device.specs.gpu.split('x')[1] || device.specs.gpu}</span>
          </div>
          <div className="flex items-center space-x-2 text-theme-secondary">
            <ServerIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
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
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
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
        <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
          <EyeIcon className="w-4 h-4" />
          <span>{t('equipment.actions.view')}</span>
        </button>
        <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
          <CogIcon className="w-4 h-4" />
          <span>{t('equipment.actions.configure')}</span>
        </button>
      </div>
    </div>
  )

  const DroneCard = ({ device }) => {
    const BatteryIcon = getBatteryIcon(device.battery)

    return (
      <div className="card hover:shadow-lg transition-all duration-200">
        {/* 设备头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-theme-primary mb-1">{device.name}</h3>
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
              <CameraIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="truncate">{device.specs.camera || device.specs.lights}</span>
            </div>
            <div className="flex items-center space-x-2 text-theme-secondary">
              <BatteryIcon className={`w-4 h-4 ${getBatteryColor(device.battery)}`} />
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
                  device.battery > 60 ? 'bg-green-500' :
                  device.battery > 20 ? 'bg-yellow-500' : 'bg-red-500'
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
          <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
            <EyeIcon className="w-4 h-4" />
            <span>{t('equipment.actions.view')}</span>
          </button>
          <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
            <MapPinIcon className="w-4 h-4" />
            <span>{t('equipment.actions.track')}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 页面头部 */}
      <div className="bg-theme-card rounded-xl shadow-sm border border-theme p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-theme-primary mb-2">{t('equipment.title')}</h1>
            <p className="text-theme-secondary">{t('equipment.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>{t('equipment.addEquipment')}</span>
          </button>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <ServerIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{t('equipment.totalGpuDevices')}</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{gpuDevices.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">{t('equipment.onlineDevices')}</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {gpuDevices.filter(d => d.status === 'online').length +
                   droneDevices.filter(d => d.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <CameraIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">{t('equipment.totalDroneDevices')}</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{droneDevices.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <ChartBarIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{t('equipment.totalRevenue')}</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                  {parseFloat(
                    gpuDevices.reduce((sum, d) => sum + parseFloat(d.revenue.split(' ')[0]), 0) +
                    parseFloat(droneDevices.reduce((sum, d) => sum + parseFloat(d.revenue.split(' ')[0]), 0))
                  ).toFixed(0)} CC
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 设备管理标签页 */}
      <div className="bg-theme-card rounded-xl shadow-sm border border-theme">
        {/* 标签导航 */}
        <div className="border-b border-theme">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('gpu')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'gpu'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-theme-secondary hover:text-theme-primary'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ServerIcon className="w-5 h-5" />
                <span>{t('equipment.gpuDevices')}</span>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                  {gpuDevices.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('drone')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'drone'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-theme-secondary hover:text-theme-primary'
              }`}
            >
              <div className="flex items-center space-x-2">
                <CameraIcon className="w-5 h-5" />
                <span>{t('equipment.droneDevices')}</span>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                  {droneDevices.length}
                </span>
              </div>
            </button>
          </nav>
        </div>

        {/* 过滤器 */}
        <div className="p-6 border-b border-theme">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-theme-primary">{t('equipment.filterByStatus')}:</span>
            <div className="flex space-x-2">
              {['all', 'online', 'offline', 'maintenance'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    filterStatus === status
                      ? 'bg-emerald-500 text-white'
                      : 'bg-theme-secondary text-theme-primary hover:bg-theme-tertiary'
                  }`}
                >
                  {t(`equipment.filter.${status}`)}
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
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredDroneDevices.map(device => (
                <DroneCard key={device.id} device={device} />
              ))}
            </div>
          )}

          {/* 空状态 */}
          {(activeTab === 'gpu' && filteredGpuDevices.length === 0) ||
           (activeTab === 'drone' && filteredDroneDevices.length === 0) ? (
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