// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./DeviceRegistry.sol";

/**
 * @title ProviderNFTV2
 * @dev 增强版Provider NFT - 集成设备管理系统的动态NFT
 * @notice 基于设备实际性能提供动态等级调整和激励优化
 */
contract ProviderNFTV2 is ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== 枚举定义 ====================

    enum Tier { NONE, BRONZE, SILVER, GOLD, PLATINUM }

    // ==================== 数据结构 ====================

    /**
     * @dev 增强的NFT数据结构
     */
    struct EnhancedProviderNFTData {
        uint256 tokenId;
        Tier tier;
        uint256 activationTime;
        uint256 performanceScore;
        uint256 completedJobs;
        uint256 totalRewards;
        bool isActive;

        // 新增：设备相关属性
        uint256[] registeredDevices;
        uint256 activeDeviceCount;
        uint256 totalComputePower;
        uint256 averageDeviceScore;
        uint256 lastDeviceUpdate;

        // 动态调整属性
        uint256 lastTierAdjustment;
        uint256 consecutiveHighPerformance;
        uint256 performanceTrend;
    }

    /**
     * @dev 设备相关的NFT数据
     */
    struct DeviceNFTData {
        uint256[] registeredDevices;
        uint256 activeDeviceCount;
        uint256 totalComputePower;
        uint256 averagePerformanceScore;
        uint256 lastUpdateTime;
        uint256 deviceQualityScore;
        uint256 utilizationRate;
    }

    /**
     * @dev 动态等级调整参数
     */
    struct TierAdjustmentConfig {
        uint256 adjustmentInterval;     // 调整间隔 (秒)
        uint256 minActivePeriod;       // 最小活跃期
        uint256 performanceThreshold;   // 性能阈值
        uint256 deviceCountThreshold;   // 设备数量阈值
        uint256 computePowerThreshold;  // 算力阈值
    }

    // ==================== 存储映射 ====================

    mapping(uint256 => EnhancedProviderNFTData) public enhancedNftData;
    mapping(uint256 => DeviceNFTData) public deviceNftData;
    mapping(address => uint256) public providerToNft;
    uint256 public nextTokenId = 1;

    // NFT等级配置
    mapping(Tier => uint256) public tierBonusMultipliers;
    mapping(Tier => uint256) public tierDeviceRequirements;
    mapping(Tier => uint256) public tierComputePowerRequirements;
    mapping(Tier => uint256) public tierPerformanceRequirements;

    // 动态调整配置
    TierAdjustmentConfig public adjustmentConfig;

    // 设备注册合约引用
    DeviceRegistry public deviceRegistry;

    // 统计数据
    mapping(Tier => uint256) public tierDistribution;
    uint256 public totalActiveProviders;
    uint256 public averagePerformanceScore;

    // 配置参数
    IERC20 public ccToken;
    address public ccusdToken;
    address public stakingPool;
    address public providerIncentive;

    // 性能衰减配置
    uint256 public constant PERFORMANCE_DECAY_PERIOD = 30 days;
    uint256 public constant BASE_PERFORMANCE_SCORE = 1000;
    uint256 public constant PERFORMANCE_TREND_WINDOW = 7 days;

    // 事件定义
    event NFTMinted(address indexed to, uint256 indexed tokenId, Tier tier);
    event TierAdjusted(uint256 indexed tokenId, Tier oldTier, Tier newTier, string reason);
    event PerformanceUpdated(uint256 indexed tokenId, uint256 oldScore, uint256 newScore);
    event DevicesAdded(uint256 indexed tokenId, uint256 deviceCount, uint256 totalPower);
    event DevicePerformanceDecay(uint256 indexed tokenId, uint256 oldScore, uint256 newScore);
    event DynamicBonusMultiplierUpdated(uint256 indexed tokenId, uint256 oldMultiplier, uint256 newMultiplier);

    // ==================== 修饰符 ====================

    modifier onlyValidTier(Tier tier) {
        require(tier != Tier.NONE, "Invalid tier");
        _;
    }

    modifier deviceRegistryExists() {
        require(address(deviceRegistry) != address(0), "DeviceRegistry not set");
        _;
    }

    // ==================== 构造函数 ====================

    constructor(
        address _ccusdToken,
        address _ccToken,
        address _deviceRegistry
    ) ERC721("Provider NFT V2", "PNFTV2") Ownable(msg.sender) {
        require(_ccusdToken != address(0), "Invalid CCUSD token");
        require(_ccToken != address(0), "Invalid CC token");
        require(_deviceRegistry != address(0), "Invalid DeviceRegistry");

        ccusdToken = IERC20(_ccusdToken);
        ccToken = IERC20(_ccToken);
        deviceRegistry = DeviceRegistry(_deviceRegistry);

        // 初始化等级加成倍数 (基点)
        tierBonusMultipliers[Tier.BRONZE] = 10500;   // 105%
        tierBonusMultipliers[Tier.SILVER] = 11200;   // 112%
        tierBonusMultipliers[Tier.GOLD] = 11800;     // 118%
        tierBonusMultipliers[Tier.PLATINUM] = 12500; // 125%

        // 初始化设备数量要求
        tierDeviceRequirements[Tier.BRONZE] = 1;
        tierDeviceRequirements[Tier.SILVER] = 3;
        tierDeviceRequirements[Tier.GOLD] = 5;
        tierDeviceRequirements[Tier.PLATINUM] = 10;

        // 初始化算力要求 (TFLOPS)
        tierComputePowerRequirements[Tier.BRONZE] = 10;
        tierComputePowerRequirements[Tier.SILVER] = 100;
        tierComputePowerRequirements[Tier.GOLD] = 500;
        tierComputePowerRequirements[Tier.PLATINUM] = 1000;

        // 初始化性能要求
        tierPerformanceRequirements[Tier.BRONZE] = 600;
        tierPerformanceRequirements[Tier.SILVER] = 700;
        tierPerformanceRequirements[Tier.GOLD] = 800;
        tierPerformanceRequirements[Tier.PLATINUM] = 900;

        // 初始化动态调整配置
        adjustmentConfig = TierAdjustmentConfig({
            adjustmentInterval: 30 days,
            minActivePeriod: 7 days,
            performanceThreshold: 100,
            deviceCountThreshold: 1,
            computePowerThreshold: 50,
        });

        totalActiveProviders = 0;
        averagePerformanceScore = 1000;
    }

    // ==================== NFT管理功能 ====================

    /**
     * @dev 铸造新的Provider NFT (增强版)
     * @param to 接收地址
     * @param tier NFT等级
     * @param deviceCount 设备数量
     * @param computePower 总算力
     */
    function mintEnhancedNFT(
        address to,
        Tier tier,
        uint256 deviceCount,
        uint256 computePower
    ) external nonReentrant whenNotPaused onlyValidTier(tier) onlyDeviceRegistryExists returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(providerToNft[to] == 0, "Provider already has NFT");
        require(deviceCount >= tierDeviceRequirements[tier], "Insufficient devices");
        require(computePower >= tierComputePowerRequirements[tier], "Insufficient compute power");

        uint256 tokenId = nextTokenId++;

        // 创建增强的NFT数据
        enhancedNftData[tokenId] = EnhancedProviderNFTData({
            tokenId: tokenId,
            tier: tier,
            activationTime: block.timestamp,
            performanceScore: BASE_PERFORMANCE_SCORE,
            completedJobs: 0,
            totalRewards: 0,
            isActive: true,
            registeredDevices: new uint256[](0),
            activeDeviceCount: deviceCount,
            totalComputePower: computePower,
            averageDeviceScore: BASE_PERFORMANCE_SCORE,
            lastDeviceUpdate: block.timestamp,
            lastTierAdjustment: block.timestamp,
            consecutiveHighPerformance: 0,
            performanceTrend: BASE_PERFORMANCE_SCORE
        });

        // 初始化设备数据
        deviceNftData[tokenId] = DeviceNFTData({
            registeredDevices: new uint256[](0),
            activeDeviceCount: deviceCount,
            totalComputePower: computePower,
            averagePerformanceScore: BASE_PERFORMANCE_SCORE,
            lastUpdateTime: block.timestamp,
            deviceQualityScore: BASE_PERFORMANCE_SCORE,
            utilizationRate: 8000 // 80%
        });

        // 更新映射
        providerToNft[to] = tokenId;

        // 更新统计
        tierDistribution[tier]++;
        totalActiveProviders++;
        _updateAveragePerformanceScore();

        // 铸造NFT
        _safeMint(to, tokenId);

        emit NFTMinted(to, tokenId, tier);
        emit DevicesAdded(tokenId, deviceCount, computePower);

        return tokenId;
    }

    /**
     * @dev 更新Provider的设备信息
     * @param provider Provider地址
     */
    function updateProviderDevices(address provider) external {
        require(address(deviceRegistry) != address(0), "DeviceRegistry not set");
        require(msg.sender == address(deviceRegistry), "Only device registry can update");

        uint256 tokenId = providerToNft[provider];
        require(tokenId != 0, "Provider NFT not found");

        // 获取最新的设备数据
        uint256 activeDeviceCount = deviceRegistry.getProviderActiveDeviceCount(provider);
        uint256 totalComputePower = deviceRegistry.getProviderTotalComputePower(provider);
        uint256 providerPerformanceScore = _calculateProviderPerformanceScore(provider);

        // 更新设备数据
        DeviceNFTData storage deviceData = deviceNftData[tokenId];
        EnhancedProviderNFTData storage enhancedData = enhancedNftData[tokenId];

        deviceData.activeDeviceCount = activeDeviceCount;
        deviceData.totalComputePower = totalComputePower;
        deviceData.averagePerformanceScore = providerPerformanceScore;
        deviceData.lastUpdateTime = block.timestamp;

        enhancedData.activeDeviceCount = activeDeviceCount;
        enhancedData.totalComputePower = totalComputePower;
        enhancedData.averageDeviceScore = providerPerformanceScore;
        enhancedData.lastDeviceUpdate = block.timestamp;

        // 计算设备质量评分
        deviceData.deviceQualityScore = _calculateDeviceQualityScore(
            activeDeviceCount,
            totalComputePower,
            providerPerformanceScore
        );

        // 计算利用率
        deviceData.utilizationRate = _calculateUtilizationRate(
            deviceData.averagePerformanceScore,
            deviceData.totalComputePower
        );

        // 检查是否需要调整NFT等级
        _checkAndAdjustTier(tokenId);

        emit DevicesAdded(tokenId, activeDeviceCount, totalComputePower);
    }

    /**
     * @dev 动态调整NFT等级
     * @param tokenId NFT token ID
     */
    function adjustTier(uint256 tokenId) external whenNotPaused {
        require(_exists(tokenId), "NFT does not exist");
        EnhancedProviderNFTData storage enhancedData = enhancedNftData[tokenId];

        require(
            block.timestamp >= enhancedData.lastTierAdjustment + adjustmentConfig.adjustmentInterval,
            "Adjustment interval not met"
        );

        Tier currentTier = enhancedData.tier;
        Tier newTier = _calculateOptimalTier(enhancedData);

        if (newTier != currentTier) {
            Tier oldTier = enhancedData.tier;
            enhancedData.tier = newTier;
            enhancedData.lastTierAdjustment = block.timestamp;

            // 更新统计
            tierDistribution[oldTier]--;
            tierDistribution[newTier]++;

            emit TierAdjusted(tokenId, oldTier, newTier, "Performance-based adjustment");
        }
    }

    /**
     * @dev 获取增强的奖励倍数
     * @param provider Provider地址
     * @return 奖励倍数 (基点)
     */
    function getEnhancedBonusMultiplier(address provider) external view returns (uint256) {
        uint256 tokenId = providerToNft[provider];
        if (tokenId == 0) return 10000; // 100%

        EnhancedProviderNFTData storage enhancedData = enhancedNftData[tokenId];
        DeviceNFTData storage deviceData = deviceNftData[tokenId];

        // 基础等级倍数
        uint256 baseMultiplier = tierBonusMultipliers[enhancedData.tier];

        // 设备规模加成
        uint256 scaleBonus = _calculateScaleBonus(deviceData.activeDeviceCount);

        // 性能加成
        uint256 performanceBonus = enhancedData.averageDeviceScore;

        // 设备质量加成
        uint256 qualityBonus = deviceData.deviceQualityScore;

        // 算力加成
        uint256 powerBonus = _calculatePowerBonus(deviceData.totalComputePower);

        // 利用率加成
        uint256 utilizationBonus = deviceData.utilizationRate;

        // 趋势加成
        uint256 trendBonus = _calculateTrendBonus(enhancedData.performanceTrend);

        // 综合计算
        uint256 totalMultiplier = (baseMultiplier * scaleBonus * performanceBonus * qualityBonus * powerBonus * utilizationBonus * trendBonus) / (10000 * 1000 * 1000 * 1000 * 10000 * 1000);

        // 确保倍数在合理范围内
        return _clampMultiplier(totalMultiplier, 10000, 20000); // 100% - 200%
    }

    /**
     * @dev 记录任务完成
     * @param tokenId NFT token ID
     * @param reward 奖励金额
     * @param customerRating 客户评分 (1-5)
     */
    function completeJob(
        uint256 tokenId,
        uint256 reward,
        uint256 customerRating
    ) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(customerRating >= 1 && customerRating <= 5, "Invalid rating");
        require(enhancedNftData[tokenId].isActive, "NFT not active");

        EnhancedProviderNFTData storage nftData = enhancedNftData[tokenId];

        // 更新任务统计
        nftData.completedJobs++;
        nftData.totalRewards += reward;
        nftData.lastActiveAt = block.timestamp;

        // 更新性能评分
        uint256 ratingBonus = customerRating * 200; // 最高1000加成
        uint256 newScore = (nftData.performanceScore * 9 + BASE_PERFORMANCE_SCORE + ratingBonus) / 10;

        // 应用性能衰减
        uint256 timeSinceLastJob = block.timestamp - nftData.lastActiveAt;
        if (timeSinceLastJob > PERFORMANCE_DECAY_PERIOD) {
            uint256 decayAmount = (timeSinceLastJob - PERFORMANCE_DECAY_PERIOD) / 1 days;
            newScore = newScore > decayAmount ? newScore - decayAmount : 100;
        }

        nftData.performanceScore = newScore;

        // 更新性能趋势
        nftData.performanceTrend = (nftData.performanceTrend * 7 + newScore) / 8;

        // 连续高性能计数
        if (newScore >= 900) {
            nftData.consecutiveHighPerformance++;
        } else {
            nftData.consecutiveHighPerformance = 0;
        }

        // 检查等级调整
        _checkAndAdjustTier(tokenId);

        emit PerformanceUpdated(tokenId, nftData.performanceScore, newScore);
    }

    // ==================== 查询功能 ====================

    /**
     * @dev 获取Provider增强统计信息
     */
    function getProviderEnhancedStats(address provider)
        external
        view
        returns (
            uint256 tokenId,
            Tier tier,
            uint256 deviceCount,
            uint256 totalPower,
            uint256 avgScore,
            uint256 qualityScore,
            uint256 bonusMultiplier,
            uint256 consecutiveHighPerformance
        )
    {
        tokenId = providerToNft[provider];
        if (tokenId == 0) {
            return (0, Tier.NONE, 0, 0, 0, 0, 10000, 0);
        }

        EnhancedProviderNFTData storage enhancedData = enhancedNftData[tokenId];
        DeviceNFTData storage deviceData = deviceNftData[tokenId];

        return (
            tokenId,
            enhancedData.tier,
            deviceData.activeDeviceCount,
            deviceData.totalComputePower,
            enhancedData.averageDeviceScore,
            deviceData.deviceQualityScore,
            getEnhancedBonusMultiplier(provider),
            enhancedData.consecutiveHighPerformance
        );
    }

    /**
     * @dev 获取等级分布统计
     */
    function getTierDistribution() external view returns (
        uint256 bronze,
        uint256 silver,
        uint256 gold,
        uint256 platinum
    ) {
        return (
            tierDistribution[Tier.BRONZE],
            tierDistribution[Tier.SILVER],
            tierDistribution[Tier.GOLD],
            tierDistribution[Tier.PLATINUM]
        );
    }

    /**
     * @dev 获取全局性能统计
     */
    function getGlobalPerformanceStats() external view returns (
        uint256 totalProviders,
        uint256 avgScore,
        uint256 activeProviders,
        uint256 totalComputePower
    ) {
        // 通过遍历计算统计数据
        uint256 scoreSum = 0;
        uint256 activeCount = 0;
        uint256 powerSum = 0;

        for (uint256 i = 1; i < nextTokenId; i++) {
            if (_exists(i)) {
                EnhancedProviderNFTData storage data = enhancedNftData[i];
                if (data.isActive) {
                    scoreSum += data.performanceScore;
                    activeCount++;
                    powerSum += deviceNftData[i].totalComputePower;
                }
            }
        }

        return (
            nextTokenId - 1,
            scoreSum > 0 ? scoreSum / (nextTokenId - 1) : 0,
            activeCount,
            powerSum
        );
    }

    // ==================== 管理功能 ====================

    /**
     * @dev 设置设备注册合约地址
     */
    function setDeviceRegistry(address _deviceRegistry) external onlyOwner {
        require(_deviceRegistry != address(0), "Invalid device registry");
        deviceRegistry = DeviceRegistry(_deviceRegistry);
    }

    /**
     * @dev 设置其他合约地址
     */
    function setContracts(
        address _stakingPool,
        address _providerIncentive
    ) external onlyOwner {
        stakingPool = _stakingPool;
        providerIncentive = _providerIncentive;
    }

    /**
     * @dev 更新等级调整配置
     */
    function updateTierAdjustmentConfig(
        uint256 adjustmentInterval,
        uint256 minActivePeriod,
        uint256 performanceThreshold,
        uint256 deviceCountThreshold,
        uint256 computePowerThreshold
    ) external onlyOwner {
        adjustmentConfig.adjustmentInterval = adjustmentInterval;
        adjustmentConfig.minActivePeriod = minActivePeriod;
        adjustmentConfig.performanceThreshold = performanceThreshold;
        adjustmentConfig.deviceCountThreshold = deviceCountThreshold;
        adjustmentConfig.computePowerThreshold = computePowerThreshold;
    }

    /**
     * @dev 更新等级倍数
     */
    function updateTierBonusMultiplier(Tier tier, uint256 multiplier) external onlyOwner onlyValidTier(tier) {
        require(multiplier >= 10000 && multiplier <= 20000, "Invalid multiplier");
        tierBonusMultipliers[tier] = multiplier;
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

    // ==================== 内部函数 ====================

    /**
     * @dev 检查并调整NFT等级
     */
    function _checkAndAdjustTier(uint256 tokenId) internal {
        EnhancedProviderNFTData storage enhancedData = enhancedNftData[tokenId];

        // 检查是否满足调整条件
        bool shouldAdjust = false;
        string memory reason = "";

        if (block.timestamp >= enhancedData.lastTierAdjustment + adjustmentConfig.adjustmentInterval) {
            shouldAdjust = true;
            reason = "Scheduled adjustment";
        } else if (enhancedData.consecutiveHighPerformance >= 7) {
            shouldAdjust = true;
            reason = "Consistent high performance";
        } else if (enhancedData.performanceScore < tierPerformanceRequirements[enhancedData.tier]) {
            shouldAdjust = true;
            reason = "Performance below threshold";
        }

        if (shouldAdjust) {
            _adjustTier(tokenId, reason);
        }
    }

    /**
     * @dev 调整NFT等级
     */
    function _adjustTier(uint256 tokenId, string memory reason) internal {
        EnhancedProviderNFTData storage enhancedData = enhancedNftData[tokenId];
        Tier oldTier = enhancedData.tier;
        Tier newTier = _calculateOptimalTier(enhancedData);

        if (newTier != oldTier) {
            enhancedData.tier = newTier;
            enhancedData.lastTierAdjustment = block.timestamp;

            // 更新统计
            tierDistribution[oldTier]--;
            tierDistribution[newTier]++;

            emit TierAdjusted(tokenId, oldTier, newTier, reason);
        }
    }

    /**
     * @dev 计算最优等级
     */
    function _calculateOptimalTier(EnhancedNFTData memory data)
        internal
        view
        returns (Tier)
    {
        uint256 deviceCount = data.activeDeviceCount;
        uint256 computePower = data.totalComputePower;
        uint256 performanceScore = data.averageDeviceScore;

        // 等级判定逻辑
        if (
            deviceCount >= tierDeviceRequirements[Tier.PLATINUM] &&
            computePower >= tierComputePowerRequirements[Tier.PLATINUM] &&
            performanceScore >= tierPerformanceRequirements[Tier.PLATINUM]
        ) {
            return Tier.PLATINUM;
        } else if (
            deviceCount >= tierDeviceRequirements[Tier.GOLD] &&
            computePower >= tierComputePowerRequirements[Tier.GOLD] &&
            performanceScore >= tierPerformanceRequirements[Tier.GOLD]
        ) {
            return Tier.GOLD;
        } else if (
            deviceCount >= tierDeviceRequirements[Tier.SILVER] &&
            computePower >= tierComputePowerRequirements[Tier.SILVER] &&
            performanceScore >= tierPerformanceRequirements[Tier.SILVER]
        ) {
            return Tier.SILVER;
        } else if (
            deviceCount >= tierDeviceRequirements[Tier.BRONZE] &&
            computePower >= tierComputePowerRequirements[Tier.BRONZE] &&
            performanceScore >= tierPerformanceRequirements[Tier.BRONZE]
        ) {
            return Tier.BRONZE;
        } else {
            return Tier.NONE;
        }
    }

    /**
     * @dev 计算Provider性能评分
     */
    function _calculateProviderPerformanceScore(address provider) internal view returns (uint256) {
        uint256[] memory deviceIds = deviceRegistry.getProviderDevices(provider);
        if (deviceIds.length == 0) return 0;

        uint256 totalScore = 0;
        uint256 activeCount = 0;

        for (uint256 i = 0; i < deviceIds.length; i++) {
            uint256 deviceId = deviceIds[i];
            // 这里应该调用DeviceRegistry获取设备性能分
            // 简化实现，实际需要DeviceRegistry提供getDevicePerformanceScore函数
            uint256 deviceScore = deviceRegistry.getDevicePerformanceScore(deviceId);

            if (deviceScore > 0) {
                totalScore += deviceScore;
                activeCount++;
            }
        }

        return activeCount > 0 ? totalScore / activeCount : 0;
    }

    /**
     * @dev 计算设备质量评分
     */
    function _calculateDeviceQualityScore(
        uint256 deviceCount,
        uint256 computePower,
        uint256 performanceScore
    ) internal pure returns (uint256) {
        // 设备数量评分 (40%)
        uint256 deviceScore = _calculateDeviceCountScore(deviceCount);

        // 算力评分 (35%)
        uint256 powerScore = _calculatePowerScore(computePower);

        // 性能评分 (25%)
        uint256 perfScore = performanceScore;

        return (deviceScore * 40 + powerScore * 35 + perfScore * 25) / 100;
    }

    /**
     * @dev 计算设备数量评分
     */
    function _calculateDeviceCountScore(uint256 count) internal pure returns (uint256) {
        if (count >= 10) return 1000;
        if (count >= 5) return 800;
        if (count >= 3) return 600;
        if (count >= 1) return 400;
        return 200;
    }

    /**
     * @dev 计算算力评分
     */
    function _calculatePowerScore(uint256 power) internal pure returns (uint256) {
        if (power >= 1000) return 1000;
        if (power >= 500) return 800;
        if (power >= 100) return 600;
        if (power >= 10) return 400;
        return 200;
    }

    /**
     * @dev 计算规模加成
     */
    function _calculateScaleBonus(uint256 deviceCount) internal pure returns (uint256) {
        if (deviceCount >= 10) return 1200; // +20%
        if (deviceCount >= 5) return 1100;  // +10%
        if (deviceCount >= 3) return 1050;  // +5%
        return 1000;                 // 基础
    }

    /**
     * @dev 计算算力加成
     */
    function _calculatePowerBonus(uint256 computePower) internal pure returns (uint256) {
        if (computePower >= 1000) return 1200; // +20%
        if (computePower >= 500) return 1100;  // +10%
        if (computePower >= 100) return 1050;  // +5%
        return 1000;                   // 基础
    }

    /**
     * @dev 计算利用率加成
     */
    function _calculateUtilizationRate(uint256 avgScore, uint256 totalPower) internal pure returns (uint256) {
        // 基于性能评分和算力计算理论利用率
        uint256 theoreticalUtilization = avgScore > 0 ? (totalPower * 1000) / avgScore : 1000;

        // 限制在合理范围内 (50% - 150%)
        if (theoreticalUtilization > 1500) return 1500;
        if (theoreticalUtilization < 500) return 500;

        return theoreticalUtilization;
    }

    /**
     * @dev 计算趋势加成
     */
    function _calculateTrendBonus(uint256 trendScore) internal pure returns (uint256) {
        // 趋势评分：1000为基准，1200为上升趋势，800为下降趋势
        if (trendScore >= 1200) return 1100; // +10%
        if (trendScore <= 800) return 900;   // -10%
        return 1000;                   // 基础
    }

    /**
     * @dev 限制倍数范围
     */
    function _clampMultiplier(uint256 value, uint256 min, uint256 max) internal pure returns (uint256) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    /**
     * @dev 更新平均性能评分
     */
    function _updateAveragePerformanceScore() internal {
        if (totalActiveProviders == 0) return;

        uint256 totalScore = 0;
        uint256 count = 0;

        for (uint256 i = 1; i < nextTokenId; i++) {
            if (_exists(i) && enhancedNftData[i].isActive) {
                totalScore += enhancedNftData[i].performanceScore;
                count++;
            }
        }

        averagePerformanceScore = count > 0 ? totalScore / count : BASE_PERFORMANCE_SCORE;
    }

    /**
     * @dev 检查NFT是否存在
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId > 0 && tokenId < nextTokenId && _ownerOf(tokenId) != address(0);
    }

    /**
     * @dev 获取NFT所有者
     */
    function _ownerOf(uint256 tokenId) internal view returns (address) {
        return ownerOf(tokenId);
    }

    /**
     * @dev 安全铸造NFT
     */
    function _safeMint(address to, uint256 tokenId) internal {
        _safeMint(to, tokenId, "");
    }
}