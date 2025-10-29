// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title DeviceRegistry
 * @dev 优化的设备注册合约 - 混合存储架构的核心组件
 * @notice 管理算力设备的注册、状态跟踪和验证
 */
contract DeviceRegistry is Ownable, ReentrancyGuard, Pausable {
    using EnumerableSet for EnumerableSet.Uint256;

    // ==================== 枚举定义 ====================

    enum DeviceStatus {
        PENDING_VERIFICATION,  // 待验证
        ACTIVE,                // 活跃
        INACTIVE,              // 非活跃
        MAINTENANCE,           // 维护中
        SUSPENDED,             // 暂停
        DECOMMISSIONED         // 已退役
    }

    enum DeviceType {
        CPU,                   // CPU算力
        GPU,                   // GPU算力
        AI_ACCELERATOR,        // AI加速器
        STORAGE,               // 存储设备
        NETWORK,               // 网络设备
        HYBRID                 // 混合设备
    }

    // ==================== 核心数据结构 ====================

    /**
     * @dev 设备核心状态数据 - 存储在链上
     */
    struct DeviceCore {
        uint256 deviceId;           // 设备唯一标识
        address provider;           // 设备所有者地址
        DeviceType deviceType;      // 设备类型
        DeviceStatus status;        // 设备状态
        uint256 computePower;       // 算力容量 (TFLOPS)
        uint256 registeredAt;       // 注册时间戳
        uint256 lastActiveAt;       // 最后活跃时间
        uint256 reputationScore;    // 声誉评分 (0-1000)
        bool verified;              // 验证状态
    }

    /**
     * @dev 设备性能聚合数据 - 存储在链上
     */
    struct DevicePerformance {
        uint256 deviceId;
        uint256 avgScore;            // 平均性能分 (0-1000)
        uint256 totalUptime;        // 总在线时间 (小时)
        uint256 successRate;         // 成功率 (0-100)
        uint256 lastUpdated;         // 最后更新时间
        uint256 updateCount;         // 更新次数
    }

    /**
     * @dev 数据哈希链 - 用于验证链下数据完整性
     */
    struct DataHash {
        bytes32 metricsHash;         // 详细数据哈希
        uint256 timestamp;           // 时间戳
        bytes32 previousHash;        // 前一个哈希
        uint256 blockNumber;         // 区块号
    }

    // ==================== 状态变量 ====================

    // 设备存储
    mapping(uint256 => DeviceCore) public deviceCores;
    mapping(uint256 => DevicePerformance) public devicePerformance;
    mapping(uint256 => DataHash[]) public dataHashChain;

    // Provider到设备的映射
    mapping(address => EnumerableSet.Uint256) private providerDevices;

    // 全局统计
    struct GlobalStats {
        uint256 totalDevices;
        uint256 activeDevices;
        uint256 totalComputePower;
        uint256 avgPerformanceScore;
        uint256 lastStatsUpdate;
        uint256 totalUptime;
        uint256 globalSuccessRate;
    }

    GlobalStats public globalStats;

    // 配置参数
    uint256 public constant MIN_COMPUTE_POWER = 1;     // 最小算力 1 TFLOPS
    uint256 public constant MAX_DEVICES_PER_PROVIDER = 1000;
    uint256 public constant VERIFICATION_PERIOD = 24 hours;
    uint256 public constant PERFORMANCE_UPDATE_INTERVAL = 1 hours;

    // 设备计数器
    uint256 public nextDeviceId;

    // 权限控制
    address public deviceOracle;
    mapping(address => bool) public authorizedUpdaters;

    // 事件定义
    event DeviceRegistered(
        uint256 indexed deviceId,
        address indexed provider,
        DeviceType deviceType,
        uint256 computePower
    );

    event DeviceStatusChanged(
        uint256 indexed deviceId,
        DeviceStatus oldStatus,
        DeviceStatus newStatus
    );

    event DevicePerformanceUpdated(
        uint256 indexed deviceId,
        uint256 oldScore,
        uint256 newScore,
        uint256 uptime,
        uint256 successRate
    );

    event DataHashAdded(
        uint256 indexed deviceId,
        bytes32 indexed dataHash,
        uint256 timestamp
    );

    event GlobalStatsUpdated(
        uint256 totalDevices,
        uint256 activeDevices,
        uint256 totalComputePower,
        uint256 avgPerformanceScore
    );

    event ProviderDeviceAdded(
        address indexed provider,
        uint256 deviceId
    );

    event ProviderDeviceRemoved(
        address indexed provider,
        uint256 deviceId
    );

    // ==================== 修饰符 ====================

    modifier onlyOracle() {
        require(msg.sender == deviceOracle, "Only oracle can call");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier validDevice(uint256 deviceId) {
        require(deviceId > 0 && deviceId < nextDeviceId, "Invalid device ID");
        _;
    }

    modifier deviceExists(uint256 deviceId) {
        require(deviceCores[deviceId].provider != address(0), "Device does not exist");
        _;
    }

    // ==================== 构造函数 ====================

    constructor(address _deviceOracle) {
        require(_deviceOracle != address(0), "Invalid oracle address");
        deviceOracle = _deviceOracle;
        authorizedUpdaters[msg.sender] = true;
        nextDeviceId = 1;

        // 初始化全局统计
        globalStats.lastStatsUpdate = block.timestamp;
    }

    // ==================== 设备管理功能 ====================

    /**
     * @dev 注册新设备
     * @param provider 设备提供商地址
     * @param deviceType 设备类型
     * @param computePower 算力容量 (TFLOPS)
     * @param initialDataHash 初始数据哈希
     */
    function registerDevice(
        address provider,
        DeviceType deviceType,
        uint256 computePower,
        bytes32 initialDataHash
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(provider != address(0), "Invalid provider address");
        require(computePower >= MIN_COMPUTE_POWER, "Insufficient compute power");
        require(providerDevices[provider].length() < MAX_DEVICES_PER_PROVIDER, "Too many devices");

        uint256 deviceId = nextDeviceId++;

        // 创建设备核心数据
        deviceCores[deviceId] = DeviceCore({
            deviceId: deviceId,
            provider: provider,
            deviceType: deviceType,
            status: DeviceStatus.PENDING_VERIFICATION,
            computePower: computePower,
            registeredAt: block.timestamp,
            lastActiveAt: block.timestamp,
            reputationScore: 1000, // 初始满分
            verified: false
        });

        // 初始化性能数据
        devicePerformance[deviceId] = DevicePerformance({
            deviceId: deviceId,
            avgScore: 1000,
            totalUptime: 0,
            successRate: 100,
            lastUpdated: block.timestamp,
            updateCount: 0
        });

        // 添加数据哈希
        _addDataHash(deviceId, initialDataHash);

        // 添加到Provider的设备集合
        providerDevices[provider].add(deviceId);

        // 更新全局统计
        _updateGlobalStats();

        emit DeviceRegistered(deviceId, provider, deviceType, computePower);
        emit ProviderDeviceAdded(provider, deviceId);

        return deviceId;
    }

    /**
     * @dev 更新设备状态 (仅预言机)
     */
    function updateDeviceStatus(
        uint256 deviceId,
        DeviceStatus newStatus,
        uint256 performanceScore
    ) external onlyOracle validDevice(deviceId) {
        DeviceCore storage device = deviceCores[deviceId];
        require(device.provider != address(0), "Device not found");

        DeviceStatus oldStatus = device.status;

        // 更新设备状态
        device.status = newStatus;
        device.lastActiveAt = block.timestamp;

        // 更新性能评分
        if (performanceScore != device.reputationScore) {
            device.reputationScore = performanceScore;
        }

        // 如果状态改变，更新统计信息
        if (oldStatus != newStatus) {
            _updateGlobalStats();
            emit DeviceStatusChanged(deviceId, oldStatus, newStatus);
        }

        // 更新ProviderNFT性能评分 (通过事件通知)
        emit DevicePerformanceUpdated(
            deviceId,
            device.reputationScore,
            performanceScore,
            devicePerformance[deviceId].totalUptime,
            devicePerformance[deviceId].successRate
        );
    }

    /**
     * @dev 批量更新设备性能 (仅授权方)
     */
    function batchUpdatePerformance(
        uint256[] memory deviceIds,
        uint256[] memory scores,
        uint256[] memory uptimes,
        uint256[] memory successRates,
        bytes32[] memory dataHashes
    ) external onlyAuthorized {
        require(
            deviceIds.length == scores.length &&
            deviceIds.length == uptimes.length &&
            deviceIds.length == successRates.length &&
            deviceIds.length == dataHashes.length,
            "Array length mismatch"
        );
        require(deviceIds.length <= 100, "Batch too large");

        uint256 totalScore = 0;
        uint256 activeCount = 0;
        uint256 totalPower = 0;
        uint256 totalUptime = 0;
        uint256 successSum = 0;
        uint256 successCount = 0;

        for (uint256 i = 0; i < deviceIds.length; i++) {
            uint256 deviceId = deviceIds[i];
            _validateDevice(deviceId);

            DeviceCore storage device = deviceCores[deviceId];
            DevicePerformance storage perf = devicePerformance[deviceId];

            // 更新性能数据
            uint256 oldScore = perf.avgScore;
            perf.avgScore = scores[i];
            perf.totalUptime = uptimes[i];
            perf.successRate = successRates[i];
            perf.lastUpdated = block.timestamp;
            perf.updateCount++;

            // 添加数据哈希
            _addDataHash(deviceId, dataHashes[i]);

            // 累计统计
            if (device.status == DeviceStatus.ACTIVE) {
                totalScore += scores[i];
                activeCount++;
                totalPower += device.computePower;
                totalUptime += uptimes[i];
                successSum += successRates[i];
                successCount++;
            }

            emit DevicePerformanceUpdated(
                deviceId,
                oldScore,
                scores[i],
                uptimes[i],
                successRates[i]
            );
        }

        // 更新全局统计
        globalStats.avgPerformanceScore = activeCount > 0 ? totalScore / activeCount : 0;
        globalStats.totalUptime = totalUptime;
        globalStats.globalSuccessRate = successCount > 0 ? successSum / successCount : 0;
        globalStats.lastStatsUpdate = block.timestamp;

        emit GlobalStatsUpdated(
            globalStats.totalDevices,
            globalStats.activeDevices,
            globalStats.totalComputePower,
            globalStats.avgPerformanceScore
        );
    }

    /**
     * @dev 获取设备关键信息 (Gas优化版本)
     */
    function getDeviceSummary(uint256 deviceId)
        external
        view
        deviceExists(deviceId)
        returns (
            address provider,
            DeviceStatus status,
            DeviceType deviceType,
            uint256 computePower,
            uint256 reputationScore,
            uint256 avgPerformanceScore,
            uint256 totalUptime,
            uint256 successRate
        )
    {
        DeviceCore storage core = deviceCores[deviceId];
        DevicePerformance storage perf = devicePerformance[deviceId];

        return (
            core.provider,
            core.status,
            core.deviceType,
            core.computePower,
            core.reputationScore,
            perf.avgScore,
            perf.totalUptime,
            perf.successRate
        );
    }

    /**
     * @dev 获取Provider的设备列表
     */
    function getProviderDevices(address provider)
        external
        view
        returns (uint256[] memory)
    {
        return providerDevices[provider].values();
    }

    /**
     * @dev 获取Provider的活跃设备数量
     */
    function getProviderActiveDeviceCount(address provider)
        external
        view
        returns (uint256)
    {
        uint256[] memory deviceIds = providerDevices[provider].values();
        uint256 activeCount = 0;

        for (uint256 i = 0; i < deviceIds.length; i++) {
            if (deviceCores[deviceIds[i]].status == DeviceStatus.ACTIVE) {
                activeCount++;
            }
        }

        return activeCount;
    }

    /**
     * @dev 获取Provider的总算力
     */
    function getProviderTotalComputePower(address provider)
        external
        view
        returns (uint256)
    {
        uint256[] memory deviceIds = providerDevices[provider].values();
        uint256 totalPower = 0;

        for (uint256 i = 0; i < deviceIds.length; i++) {
            DeviceCore storage device = deviceCores[deviceIds[i]];
            if (device.status == DeviceStatus.ACTIVE) {
                totalPower += device.computePower;
            }
        }

        return totalPower;
    }

    /**
     * @dev 验证数据完整性
     */
    function verifyDataIntegrity(uint256 deviceId, bytes32[] memory proof)
        external
        view
        deviceExists(deviceId)
        returns (bool)
    {
        DataHash[] storage hashChain = dataHashChain[deviceId];
        if (hashChain.length == 0) return true;

        bytes32 currentHash = hashChain[0].metricsHash;

        // 验证哈希链完整性
        for (uint256 i = 1; i < hashChain.length; i++) {
            require(
                hashChain[i].previousHash == currentHash,
                "Hash chain broken at index"
            );
            currentHash = hashChain[i].metricsHash;
        }

        // 验证Merkle证明 (简化实现)
        return _verifyMerkleProof(currentHash, proof);
    }

    /**
     * @dev 获取最新的数据哈希
     */
    function getLatestDataHash(uint256 deviceId)
        external
        view
        deviceExists(deviceId)
        returns (bytes32)
    {
        DataHash[] storage hashChain = dataHashChain[deviceId];
        return hashChain.length > 0 ?
            hashChain[hashChain.length - 1].metricsHash : bytes32(0);
    }

    /**
     * @dev 获取数据哈希链长度
     */
    function getDataHashChainLength(uint256 deviceId)
        external
        view
        deviceExists(deviceId)
        returns (uint256)
    {
        return dataHashChain[deviceId].length;
    }

    // ==================== 管理功能 ====================

    /**
     * @dev 设置设备预言机地址
     */
    function setDeviceOracle(address _deviceOracle) external onlyOwner {
        require(_deviceOracle != address(0), "Invalid oracle address");
        deviceOracle = _deviceOracle;
    }

    /**
     * @dev 授权/取消授权更新者
     */
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        authorizedUpdaters[updater] = authorized;
    }

    /**
     * @dev 暂停/恢复合约
     */
    function setPaused(bool paused) external onlyOwner {
        if (paused) {
            _pause();
        } else {
            _unpause();
        }
    }

    /**
     * @dev 紧急移除设备 (仅Owner)
     */
    function emergencyRemoveDevice(uint256 deviceId)
        external
        onlyOwner
        deviceExists(deviceId)
    {
        DeviceCore storage device = deviceCores[deviceId];
        address provider = device.provider;

        // 从Provider的设备集合中移除
        providerDevices[provider].remove(deviceId);

        // 更新设备状态
        device.status = DeviceStatus.DECOMMISSIONED;
        device.verified = false;

        // 更新全局统计
        _updateGlobalStats();

        emit ProviderDeviceRemoved(provider, deviceId);
        emit DeviceStatusChanged(deviceId, DeviceStatus.ACTIVE, DeviceStatus.DECOMMISSIONED);
    }

    // ==================== 内部函数 ====================

    /**
     * @dev 添加数据哈希
     */
    function _addDataHash(uint256 deviceId, bytes32 dataHash) internal {
        DataHash[] storage hashChain = dataHashChain[deviceId];
        bytes32 previousHash = hashChain.length > 0 ?
            hashChain[hashChain.length - 1].metricsHash : bytes32(0);

        hashChain.push(DataHash({
            metricsHash: dataHash,
            timestamp: block.timestamp,
            previousHash: previousHash,
            blockNumber: block.number
        }));

        emit DataHashAdded(deviceId, dataHash, block.timestamp);
    }

    /**
     * @dev 更新全局统计
     */
    function _updateGlobalStats() internal {
        uint256 activeCount = 0;
        uint256 totalPower = 0;
        uint256 totalScore = 0;

        // 简化实现：遍历已知设备
        // 在生产环境中，应该使用更高效的统计方法
        for (uint256 i = 1; i < nextDeviceId; i++) {
            DeviceCore storage device = deviceCores[i];
            if (device.provider != address(0)) {
                if (device.status == DeviceStatus.ACTIVE) {
                    activeCount++;
                    totalPower += device.computePower;
                    totalScore += device.reputationScore;
                }
            }
        }

        globalStats.totalDevices = nextDeviceId - 1;
        globalStats.activeDevices = activeCount;
        globalStats.totalComputePower = totalPower;
        globalStats.avgPerformanceScore = activeCount > 0 ? totalScore / activeCount : 0;
        globalStats.lastStatsUpdate = block.timestamp;
    }

    /**
     * @dev 验证设备是否存在
     */
    function _validateDevice(uint256 deviceId) internal view {
        require(deviceCores[deviceId].provider != address(0), "Device does not exist");
    }

    /**
     * @dev 验证Merkle证明 (简化实现)
     */
    function _verifyMerkleProof(bytes32 root, bytes32[] memory proof)
        internal
        pure
        returns (bool)
    {
        // 简化的Merkle证明验证
        // 实际实现需要完整的Merkle树验证逻辑
        return proof.length > 0;
    }
}