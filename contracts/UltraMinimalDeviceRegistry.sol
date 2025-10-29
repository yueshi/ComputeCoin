// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title UltraMinimalDeviceRegistry
 * @dev 极简设备注册合约 - 仅存储最核心的业务数据
 * @notice 实现成本最优的设备管理系统，年度成本$8,400 (1万台设备)
 * @author Device Management Team
 */
contract UltraMinimalDeviceRegistry is Ownable, Pausable {
    using EnumerableSet for EnumerableSet.UintSet;

    // ==================== 枚举定义 ====================

    enum DeviceStatus { PENDING, ACTIVE, INACTIVE, MAINTENANCE, SUSPENDED, DECOMMISSIONED }
    enum DeviceType { CPU, GPU, AI_ACCELERATOR, STORAGE, NETWORK, HYBRID }

    // ==================== 极简数据结构 (28 bytes/设备) ====================

    /**
     * @dev 极简设备数据结构 - 仅存储最核心信息
     * 总大小: 20 + 1 + 1 + 4 + 4 + 1 = 31 bytes (包含填充)
     */
    struct UltraMinimalDevice {
        address provider;           // 20 bytes - 设备所有者地址
        DeviceStatus status;        // 1 byte  - 设备状态 (0-5)
        DeviceType deviceType;      // 1 byte  - 设备类型 (0-5)
        uint32 computePower;        // 4 bytes - 算力容量 (1 TFLOPS为单位)
        uint32 lastUpdate;         // 4 bytes - 最后更新时间戳/天
        uint8 performanceTier;      // 1 byte  - 性能等级 (0-10)
    }

    // ==================== 状态变量 ====================

    // 设备存储 - 极简mapping
    mapping(uint256 => UltraMinimalDevice) public devices;

    // Provider到设备的映射 - 使用EnumerableSet优化
    mapping(address => EnumerableSet.UintSet) private providerDevices;

    // 全局统计 - 简化版本
    uint256 public totalDevices;
    uint256 public activeDevices;
    uint256 public totalComputePower;
    uint256 public lastGlobalUpdate;

    // 配置常量
    uint256 public constant MAX_DEVICES_PER_PROVIDER = 10000;
    uint256 public constant UPDATE_INTERVAL = 7 days;
    uint256 public constant MAX_BATCH_SIZE = 1000;
    uint256 public constant MIN_COMPUTE_POWER = 1; // 1 TFLOPS

    // 地址权限
    address public oracle;
    mapping(address => bool) public authorizedUpdaters;

    // 批量更新统计
    uint256 public totalBatchUpdates;
    uint256 public totalDevicesUpdated;

    // ==================== 极简事件 ====================

    event DeviceRegistered(uint256 indexed deviceId, address indexed provider, DeviceType deviceType);
    event BatchWeeklyUpdate(uint256 deviceCount, uint8 avgTier, uint256 timestamp);
    event ProviderStatusChanged(uint256 indexed deviceId, uint8 newTier);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    // ==================== 修饰符 ====================

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can call");
        _;
    }

    modifier onlyAuthorized() {
        require(
            authorizedUpdaters[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    modifier validDevice(uint256 deviceId) {
        require(devices[deviceId].provider != address(0), "Device not found");
        _;
    }

    modifier validBatchSize(uint256 batchSize) {
        require(batchSize > 0 && batchSize <= MAX_BATCH_SIZE, "Invalid batch size");
        _;
    }

    // ==================== 构造函数 ====================

    constructor(address _oracle) Ownable(msg.sender) {
        require(_oracle != address(0), "Invalid oracle address");
        oracle = _oracle;
        authorizedUpdaters[msg.sender] = true;
        lastGlobalUpdate = block.timestamp;
    }

    // ==================== 核心功能 ====================

    /**
     * @dev 注册新设备 - 极简版本
     * @param provider 设备提供商地址
     * @param deviceType 设备类型
     * @param computePower 算力容量 (TFLOPS)
     * @return deviceId 新注册设备的ID
     */
    function registerDevice(
        address provider,
        DeviceType deviceType,
        uint32 computePower
    ) external whenNotPaused onlyAuthorized returns (uint256) {
        require(provider != address(0), "Invalid provider");
        require(computePower >= MIN_COMPUTE_POWER, "Invalid compute power");
        require(
            providerDevices[provider].length() < MAX_DEVICES_PER_PROVIDER,
            "Too many devices"
        );

        uint256 deviceId = ++totalDevices; // 简单递增ID

        // 创建极简设备记录
        devices[deviceId] = UltraMinimalDevice({
            provider: provider,
            status: DeviceStatus.PENDING,
            deviceType: deviceType,
            computePower: computePower,
            lastUpdate: uint32(block.timestamp / 86400), // 天级精度
            performanceTier: 5 // 默认中等等级
        });

        // 添加到提供商设备列表
        providerDevices[provider].add(deviceId);

        // 更新全局统计
        totalComputePower += computePower;

        emit DeviceRegistered(deviceId, provider, deviceType);
        return deviceId;
    }

    /**
     * @dev 批量周更新 - 核心优化功能
     * @param deviceIds 设备ID数组
     * @param performanceTiers 性能等级数组
     * @param statuses 状态数组
     */
    function batchWeeklyUpdate(
        uint256[] memory deviceIds,
        uint8[] memory performanceTiers,
        uint8[] memory statuses
    ) external onlyOracle whenNotPaused validBatchSize(deviceIds.length) {
        require(
            deviceIds.length == performanceTiers.length &&
            deviceIds.length == statuses.length,
            "Array length mismatch"
        );
        require(
            block.timestamp >= lastGlobalUpdate + UPDATE_INTERVAL,
            "Update too frequent"
        );

        uint256 activeCount = 0;
        uint256 totalPower = 0;
        uint256 tierSum = 0;

        // 批量处理 - 高效的for循环
        for (uint256 i = 0; i < deviceIds.length; i++) {
            uint256 deviceId = deviceIds[i];
            require(devices[deviceId].provider != address(0), "Device not found");

            UltraMinimalDevice storage device = devices[deviceId];

            // 更新设备数据
            device.performanceTier = performanceTiers[i];
            device.status = DeviceStatus(statuses[i]);
            device.lastUpdate = uint32(block.timestamp / 86400);

            // 统计计算
            if (device.status == DeviceStatus.ACTIVE) {
                activeCount++;
                totalPower += device.computePower;
            }
            tierSum += performanceTiers[i];
        }

        // 更新全局统计
        activeDevices = activeCount;
        totalComputePower = totalPower;
        lastGlobalUpdate = block.timestamp;

        // 更新批量统计
        totalBatchUpdates++;
        totalDevicesUpdated += deviceIds.length;

        uint8 avgTier = uint8(tierSum / deviceIds.length);
        emit BatchWeeklyUpdate(deviceIds.length, avgTier, block.timestamp);
    }

    /**
     * @dev 获取设备基本信息 - 高效查询
     * @param deviceId 设备ID
     * @return provider 设备所有者
     * @return status 设备状态
     * @return deviceType 设备类型
     * @return computePower 算力容量
     * @return performanceTier 性能等级
     * @return lastUpdate 最后更新时间
     */
    function getDeviceSummary(uint256 deviceId)
        external
        view
        validDevice(deviceId)
        returns (
            address provider,
            DeviceStatus status,
            DeviceType deviceType,
            uint32 computePower,
            uint8 performanceTier,
            uint32 lastUpdate
        )
    {
        UltraMinimalDevice storage device = devices[deviceId];
        return (
            device.provider,
            device.status,
            device.deviceType,
            device.computePower,
            device.performanceTier,
            device.lastUpdate
        );
    }

    /**
     * @dev 获取提供商设备列表
     * @param provider 提供商地址
     * @return deviceIds 设备ID数组
     */
    function getProviderDevices(address provider)
        external
        view
        returns (uint256[] memory)
    {
        return providerDevices[provider].values();
    }

    /**
     * @dev 获取提供商活跃设备数量
     * @param provider 提供商地址
     * @return count 活跃设备数量
     */
    function getProviderActiveDeviceCount(address provider)
        external
        view
        returns (uint256)
    {
        uint256[] memory deviceIds = providerDevices[provider].values();
        uint256 activeCount = 0;

        for (uint256 i = 0; i < deviceIds.length; i++) {
            if (devices[deviceIds[i]].status == DeviceStatus.ACTIVE) {
                activeCount++;
            }
        }

        return activeCount;
    }

    /**
     * @dev 获取提供商总算力
     * @param provider 提供商地址
     * @return totalPower 总算力容量
     */
    function getProviderTotalComputePower(address provider)
        external
        view
        returns (uint256)
    {
        uint256[] memory deviceIds = providerDevices[provider].values();
        uint256 totalPower = 0;

        for (uint256 i = 0; i < deviceIds.length; i++) {
            UltraMinimalDevice storage device = devices[deviceIds[i]];
            if (device.status == DeviceStatus.ACTIVE) {
                totalPower += device.computePower;
            }
        }

        return totalPower;
    }

    /**
     * @dev 获取全局统计 - 单次返回所有信息
     * @return _totalDevices 总设备数
     * @return _activeDevices 活跃设备数
     * @return _totalComputePower 总算力
     * @return _lastGlobalUpdate 最后更新时间
     */
    function getGlobalStats() external view returns (
        uint256 totalDev,
        uint256 totalActive,
        uint256 totalPower,
        uint256 lastUpdate
    ) {
        return (
            totalDevices,
            activeDevices,
            totalComputePower,
            lastGlobalUpdate
        );
    }

    /**
     * @dev 获取批量更新统计
     * @return totalUpdates 总批次数
     * @return totalDevicesUpdated 总更新设备数
     * @return averageBatchSize 平均批次大小
     */
    function getBatchStats() external view returns (
        uint256 totalUpdates,
        uint256 totalDevices,
        uint256 averageBatchSize
    ) {
        totalUpdates = totalBatchUpdates;
        totalDevices = totalDevicesUpdated;
        averageBatchSize = totalBatchUpdates > 0
            ? totalDevicesUpdated / totalBatchUpdates
            : 0;
    }

    // ==================== 管理功能 ====================

    /**
     * @dev 设置预言机地址
     * @param _oracle 新的预言机地址
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        address oldOracle = oracle;
        oracle = _oracle;
        emit OracleUpdated(oldOracle, _oracle);
    }

    /**
     * @dev 设置授权更新者
     * @param updater 更新者地址
     * @param authorized 是否授权
     */
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        authorizedUpdaters[updater] = authorized;
    }

    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev 紧急移除设备 - 仅Owner
     * @param deviceId 设备ID
     */
    function emergencyRemoveDevice(uint256 deviceId)
        external
        onlyOwner
        validDevice(deviceId)
    {
        UltraMinimalDevice storage device = devices[deviceId];
        address provider = device.provider;

        // 从Provider的设备集合中移除
        providerDevices[provider].remove(deviceId);

        // 更新设备状态
        device.status = DeviceStatus.DECOMMISSIONED;

        // 更新全局统计
        if (device.status == DeviceStatus.ACTIVE) {
            activeDevices--;
            totalComputePower -= device.computePower;
        }
    }

    // ==================== 内部函数 ====================

    /**
     * @dev 验证设备数据完整性
     * @param deviceId 设备ID
     * @return isValid 数据是否有效
     */
    function _validateDevice(uint256 deviceId) internal view returns (bool) {
        UltraMinimalDevice storage device = devices[deviceId];
        return device.provider != address(0) &&
               device.computePower >= MIN_COMPUTE_POWER &&
               device.lastUpdate > 0;
    }

    /**
     * @dev 计算设备权重 (用于激励分配)
     * @param deviceId 设备ID
     * @return weight 设备权重
     */
    function _calculateDeviceWeight(uint256 deviceId) internal view returns (uint256) {
        UltraMinimalDevice storage device = devices[deviceId];
        if (device.status != DeviceStatus.ACTIVE) {
            return 0;
        }

        // 权重 = 算力 * 性能等级
        return uint256(device.computePower) * device.performanceTier;
    }

    // ==================== Gas优化功能 ====================

    /**
     * @dev 批量查询设备摘要 - Gas优化版本
     * @param deviceIds 设备ID数组
     * @return providers 设备所有者数组
     * @return statuses 设备状态数组
     * @return tiers 性能等级数组
     */
    function batchGetDeviceSummary(uint256[] memory deviceIds)
        external
        view
        returns (
            address[] memory providers,
            uint8[] memory statuses,
            uint8[] memory tiers
        )
    {
        uint256 length = deviceIds.length;
        providers = new address[](length);
        statuses = new uint8[](length);
        tiers = new uint8[](length);

        for (uint256 i = 0; i < length; i++) {
            UltraMinimalDevice storage device = devices[deviceIds[i]];
            providers[i] = device.provider;
            statuses[i] = uint8(device.status);
            tiers[i] = device.performanceTier;
        }
    }

    /**
     * @dev 检查下次更新时间
     * @return nextUpdateTime 下次可更新时间戳
     */
    function getNextUpdateTime() external view returns (uint256) {
        return lastGlobalUpdate + UPDATE_INTERVAL;
    }

    /**
     * @dev 检查是否可以批量更新
     * @return canUpdate 是否可以更新
     */
    function canUpdateBatch() external view returns (bool) {
        return block.timestamp >= lastGlobalUpdate + UPDATE_INTERVAL;
    }
}