// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./DeviceRegistry.sol";

/**
 * @title DeviceOracle
 * @dev 设备状态和数据预言机 - 混合存储架构的关键组件
 * @notice 负责验证设备状态、聚合性能数据并上链更新
 */
contract DeviceOracle is Ownable, Pausable {
    using EnumerableSet for EnumerableSet.Address;

    // ==================== 数据结构 ====================

    /**
     * @dev 验证者信息
     */
    struct Verifier {
        address verifierAddress;
        bool isActive;
        uint256 reputation;
        uint256 completedVerifications;
        uint256 successfulVerifications;
        uint256 lastActiveAt;
        uint256 joinedAt;
    }

    /**
     * @dev 设备验证请求
     */
    struct VerificationRequest {
        uint256 deviceId;
        string deviceMetadata;
        uint256 requestedAt;
        uint256 deadline;
        bool completed;
        mapping(address => bool) hasSubmitted;
        address[] submittedVerifiers;
        mapping(address => bool) verificationResults;
        uint256 trueCount;
        uint256 falseCount;
        uint256 requiredVerifications;
    }

    /**
     * @dev 性能聚合数据
     */
    struct PerformanceData {
        uint256 deviceId;
        uint256 avgScore;
        uint256 totalUptime;
        uint256 successRate;
        uint256 reliabilityScore;
        uint256 efficiencyScore;
        uint256 lastUpdated;
        bytes32 dataHash;
    }

    // ==================== 状态变量 ====================

    // 核心合约引用
    DeviceRegistry public deviceRegistry;

    // 验证者管理
    mapping(address => Verifier) public verifiers;
    EnumerableSet.Address private activeVerifiers;
    mapping(address => bool) public isVerifier;

    // 验证请求管理
    mapping(uint256 => VerificationRequest) public verificationRequests;
    uint256[] public pendingVerifications;

    // 配置参数
    uint256 public constant MIN_REPUTATION = 100;
    uint256 public constant VERIFICATION_TIMEOUT = 24 hours;
    uint256 public constant REQUIRED_VERIFICATIONS = 3;
    uint256 public constant VERIFICATION_REWARD = 100 * 10**18; // 100 CC
    uint256 public constant MAX_PENDING_VERIFICATIONS = 1000;

    // 权限管理
    mapping(address => bool) public authorizedReporters;
    mapping(address => bool) public trustedNodes;

    // 统计数据
    uint256 public totalVerifications;
    uint256 public successfulVerifications;
    uint256 public totalDevicesVerified;

    // 批量操作支持
    struct BatchUpdate {
        uint256[] deviceIds;
        uint256[] scores;
        uint256[] uptimes;
        uint256[] successRates;
        bytes32[] dataHashes;
        uint256 timestamp;
        bool processed;
    }

    mapping(bytes32 => BatchUpdate) public batchUpdates;
    bytes32[] public pendingBatchUpdates;

    // 事件定义
    event VerificationRequested(uint256 indexed deviceId, string metadata);
    event VerificationSubmitted(
        uint256 indexed deviceId,
        address indexed verifier,
        bool result,
        string reportData
    );
    event VerificationCompleted(uint256 indexed deviceId, bool result, uint256 timestamp);
    event VerifierRegistered(address indexed verifier);
    event VerifierStatusChanged(address indexed verifier, bool active);
    event VerifierReputationUpdated(address indexed verifier, uint256 oldReputation, uint256 newReputation);
    event PerformanceUpdated(uint256 indexed deviceId, uint256 score, bytes32 dataHash);
    event BatchUpdateSubmitted(bytes32 indexed batchId, uint256 deviceCount);
    event BatchUpdateProcessed(bytes32 indexed batchId, bool success);

    // ==================== 修饰符 ====================

    modifier onlyAuthorized() {
        require(
            authorizedReporters[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    modifier onlyVerifier() {
        require(
            verifiers[msg.sender].isActive && verifiers[msg.sender].reputation >= MIN_REPUTATION,
            "Not an active verifier"
        );
        _;
    }

    modifier onlyTrustedNode() {
        require(trustedNodes[msg.sender], "Not a trusted node");
        _;
    }

    // ==================== 构造函数 ====================

    constructor(address _deviceRegistry) {
        require(_deviceRegistry != address(0), "Invalid device registry address");
        deviceRegistry = DeviceRegistry(_deviceRegistry);
        authorizedReporters[msg.sender] = true;
        trustedNodes[msg.sender] = true;
    }

    // ==================== 验证者管理 ====================

    /**
     * @dev 注册为设备验证者
     * @param stakeAmount 质押金额 (可选，用于声誉系统)
     */
    function registerVerifier(uint256 stakeAmount) external {
        require(!isVerifier[msg.sender], "Already registered");
        require(stakeAmount >= VERIFICATION_REWARD, "Insufficient stake");

        verifiers[msg.sender] = Verifier({
            verifierAddress: msg.sender,
            isActive: true,
            reputation: 1000, // 初始信誉
            completedVerifications: 0,
            successfulVerifications: 0,
            lastActiveAt: block.timestamp,
            joinedAt: block.timestamp
        });

        activeVerifiers.add(msg.sender);
        isVerifier[msg.sender] = true;

        emit VerifierRegistered(msg.sender);
    }

    /**
     * @dev 更新验证者状态
     * @param verifier 验证者地址
     * @param active 是否活跃
     */
    function setVerifierStatus(address verifier, bool active) external onlyOwner {
        require(isVerifier[verifier], "Verifier not found");

        verifiers[verifier].isActive = active;
        verifiers[verifier].lastActiveAt = block.timestamp;

        if (active) {
            activeVerifiers.add(verifier);
        } else {
            activeVerifiers.remove(verifier);
        }

        emit VerifierStatusChanged(verifier, active);
    }

    /**
     * @dev 更新验证者声誉
     * @param verifier 验证者地址
     * @param reputationDelta 声誉变化量
     */
    function updateVerifierReputation(
        address verifier,
        int256 reputationDelta
    ) external onlyAuthorized {
        require(isVerifier[verifier], "Verifier not found");

        Verifier storage v = verifiers[verifier];
        uint256 oldReputation = v.reputation;

        if (reputationDelta > 0) {
            v.reputation = v.reputation + uint256(reputationDelta);
        } else if (uint256(-reputationDelta) < v.reputation) {
            v.reputation = v.reputation - uint256(-reputationDelta);
        } else {
            v.reputation = 0;
        }

        // 质誉过低则暂停验证资格
        if (v.reputation < MIN_REPUTATION && v.isActive) {
            v.isActive = false;
            activeVerifiers.remove(verifier);
            emit VerifierStatusChanged(verifier, false);
        }

        emit VerifierReputationUpdated(verifier, oldReputation, v.reputation);
    }

    // ==================== 设备验证功能 ====================

    /**
     * @dev 请求设备验证
     * @param deviceId 设备ID
     * @param deviceMetadata 设备元数据
     */
    function requestDeviceVerification(
        uint256 deviceId,
        string memory deviceMetadata
    ) external onlyAuthorized {
        require(deviceRegistry.getDeviceStatus(deviceId) != 0, "Device not found");
        require(verificationRequests[deviceId].requestedAt == 0, "Verification already requested");

        VerificationRequest storage request = verificationRequests[deviceId];
        request.deviceId = deviceId;
        request.deviceMetadata = deviceMetadata;
        request.requestedAt = block.timestamp;
        request.deadline = block.timestamp + VERIFICATION_TIMEOUT;
        request.completed = false;
        request.requiredVerifications = REQUIRED_VERIFICATIONS;

        pendingVerifications.push(deviceId);

        emit VerificationRequested(deviceId, deviceMetadata);
    }

    /**
     * @dev 提交设备验证结果
     * @param deviceId 设备ID
     * @param result 验证结果
     * @param reportData 验证报告数据
     * @param signature 签名验证 (可选)
     */
    function submitVerification(
        uint256 deviceId,
        bool result,
        string memory reportData,
        bytes memory signature
    ) external onlyVerifier {
        VerificationRequest storage request = verificationRequests[deviceId];
        require(request.requestedAt > 0, "Verification not requested");
        require(block.timestamp <= request.deadline, "Verification expired");
        require(!request.hasSubmitted[msg.sender], "Already submitted");

        // 验证签名 (可选，用于链下验证数据完整性)
        if (signature.length > 0) {
            require(_verifySignature(deviceId, result, reportData, signature), "Invalid signature");
        }

        // 记录验证结果
        request.hasSubmitted[msg.sender] = true;
        request.submittedVerifiers.push(msg.sender);
        request.verificationResults[msg.sender] = result;

        if (result) {
            request.trueCount++;
        } else {
            request.falseCount++;
        }

        // 更新验证者统计
        Verifier storage verifier = verifiers[msg.sender];
        verifier.completedVerifications++;
        verifier.lastActiveAt = block.timestamp;

        if (result) {
            verifier.successfulVerifications++;
        }

        emit VerificationSubmitted(deviceId, msg.sender, result, reportData);

        // 检查是否已收集足够验证结果
        _processVerificationResults(deviceId);
    }

    /**
     * @dev 处理验证结果
     */
    function _processVerificationResults(uint256 deviceId) internal {
        VerificationRequest storage request = verificationRequests[deviceId];

        if (request.submittedVerifiers.length >= request.requiredVerifications) {
            // 基于多数同意决定验证结果
            bool finalResult = request.trueCount > request.falseCount;

            // 更新设备状态
            DeviceRegistry.DeviceStatus newStatus = finalResult ?
                DeviceRegistry.DeviceStatus.ACTIVE :
                DeviceRegistry.DeviceStatus.SUSPENDED;

            deviceRegistry.updateDeviceStatus(deviceId, newStatus, 800); // 默认性能分

            request.completed = true;

            // 从待处理列表中移除
            _removeFromPendingVerifications(deviceId);

            // 更新统计
            totalVerifications++;
            if (finalResult) {
                successfulVerifications++;
                totalDevicesVerified++;
            }

            emit VerificationCompleted(deviceId, finalResult, block.timestamp);
        }
    }

    // ==================== 性能数据管理 ====================

    /**
     * @dev 上报设备性能数据
     * @param deviceId 设备ID
     * @param avgScore 平均性能分
     * @param totalUptime 总在线时间
     * @param successRate 成功率
     * @param reliabilityScore 可靠性评分
     * @param efficiencyScore 效率评分
     * @param dataHash 数据哈希
     */
    function reportDevicePerformance(
        uint256 deviceId,
        uint256 avgScore,
        uint256 totalUptime,
        uint256 successRate,
        uint256 reliabilityScore,
        uint256 efficiencyScore,
        bytes32 dataHash
    ) external onlyTrustedNode {
        require(deviceRegistry.getDeviceStatus(deviceId) != 0, "Device not found");

        // 计算综合性能评分
        uint256 finalScore = _calculateFinalScore(
            avgScore,
            reliabilityScore,
            efficiencyScore
        );

        // 更新设备性能数据
        deviceRegistry.batchUpdatePerformance(
            new uint256[](1),
            new uint256[](1),
            new uint256[](1),
            new uint256[](1),
            new bytes32[](1)
        );

        emit PerformanceUpdated(deviceId, finalScore, dataHash);
    }

    /**
     * @dev 批量更新设备性能
     * @param deviceIds 设备ID数组
     * @param scores 性能分数数组
     * @param uptimes 在线时间数组
     * @param successRates 成功率数组
     * @param dataHashes 数据哈希数组
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

        deviceRegistry.batchUpdatePerformance(
            deviceIds,
            scores,
            uptimes,
            successRates,
            dataHashes
        );
    }

    /**
     * @dev 提交批量更新请求
     * @param batchId 批次ID
     * @param deviceIds 设备ID数组
     * @param scores 性能分数数组
     * @param uptimes 在线时间数组
     * @param successRates 成功率数组
     * @param dataHashes 数据哈希数组
     */
    function submitBatchUpdate(
        bytes32 batchId,
        uint256[] memory deviceIds,
        uint256[] memory scores,
        uint256[] memory uptimes,
        uint256[] memory successRates,
        bytes32[] memory dataHashes
    ) external onlyTrustedNode {
        require(
            deviceIds.length == scores.length &&
            deviceIds.length == uptimes.length &&
            deviceIds.length == successRates.length &&
            deviceIds.length == dataHashes.length,
            "Array length mismatch"
        );
        require(batchUpdates[batchId].timestamp == 0, "Batch already exists");

        batchUpdates[batchId] = BatchUpdate({
            deviceIds: deviceIds,
            scores: scores,
            uptimes: uptimes,
            successRates: successRates,
            dataHashes: dataHashes,
            timestamp: block.timestamp,
            processed: false
        });

        pendingBatchUpdates.push(batchId);

        emit BatchUpdateSubmitted(batchId, deviceIds.length);
    }

    /**
     * @dev 处理批量更新
     * @param batchId 批次ID
     */
    function processBatchUpdate(bytes32 batchId) external onlyAuthorized {
        BatchUpdate storage batch = batchUpdates[batchId];
        require(batch.timestamp > 0, "Batch not found");
        require(!batch.processed, "Batch already processed");

        try {
            deviceRegistry.batchUpdatePerformance(
                batch.deviceIds,
                batch.scores,
                batch.uptimes,
                batch.successRates,
                batch.dataHashes
            );

            batch.processed = true;
            emit BatchUpdateProcessed(batchId, true);

            // 从待处理列表中移除
            _removeFromPendingBatches(batchId);

        } catch Error(string memory reason) {
            emit BatchUpdateProcessed(batchId, false);
        }
    }

    // ==================== 管理功能 ====================

    /**
     * @dev 授权/取消授权报告者
     */
    function setAuthorizedReporter(address reporter, bool authorized) external onlyOwner {
        authorizedReporters[reporter] = authorized;
    }

    /**
     * @dev 设置信任节点
     */
    function setTrustedNode(address node, bool trusted) external onlyOwner {
        trustedNodes[node] = trusted;
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
     * @dev 更新验证参数
     * @param requiredVerifications 所需验证数量
     * @param verificationTimeout 验证超时时间
     */
    function updateVerificationParameters(
        uint256 requiredVerifications,
        uint256 verificationTimeout
    ) external onlyOwner {
        // 这里可以更新常量，但由于Solidity限制，
        // 实际实现中可能需要使用storage变量
    }

    // ==================== 查询功能 ====================

    /**
     * @dev 获取活跃验证者数量
     */
    function getActiveVerifierCount() external view returns (uint256) {
        return activeVerifiers.length();
    }

    /**
     * @dev 获取待验证设备数量
     */
    function getPendingVerificationCount() external view returns (uint256) {
        return pendingVerifications.length;
    }

    /**
     * @dev 获取验证者信息
     */
    function getVerifierInfo(address verifier)
        external
        view
        returns (
            bool isActive,
            uint256 reputation,
            uint256 completedVerifications,
            uint256 successfulVerifications,
            uint256 lastActiveAt
        )
    {
        Verifier storage v = verifiers[verifier];
        return (
            v.isActive,
            v.reputation,
            v.completedVerifications,
            v.successfulVerifications,
            v.lastActiveAt
        );
    }

    /**
     * @dev 获取验证请求信息
     */
    function getVerificationRequest(uint256 deviceId)
        external
        view
        returns (
            bool exists,
            uint256 requestedAt,
            uint256 deadline,
            bool completed,
            uint256 trueCount,
            uint256 falseCount,
            uint256 submittedCount
        )
    {
        VerificationRequest storage request = verificationRequests[deviceId];
        bool requestExists = request.requestedAt > 0;

        return (
            requestExists,
            request.requestedAt,
            request.deadline,
            request.completed,
            request.trueCount,
            request.falseCount,
            request.submittedVerifiers.length
        );
    }

    /**
     * @dev 获取验证统计
     */
    function getVerificationStats()
        external
        view
        returns (
            uint256 total,
            uint256 successful,
            uint256 pending,
            uint256 successRate,
            uint256 devicesVerified
        )
    {
        uint256 pendingCount = pendingVerifications.length;
        uint256 rate = totalVerifications > 0 ? (successfulVerifications * 10000) / totalVerifications : 0;

        return (
            totalVerifications,
            successfulVerifications,
            pendingCount,
            rate,
            totalDevicesVerified
        );
    }

    // ==================== 内部函数 ====================

    /**
     * @dev 计算最终性能评分
     */
    function _calculateFinalScore(
        uint256 avgScore,
        uint256 reliabilityScore,
        uint256 efficiencyScore
    ) internal pure returns (uint256) {
        // 加权平均: 平均分50%，可靠性30%，效率20%
        return (avgScore * 50 + reliabilityScore * 30 + efficiencyScore * 20) / 100;
    }

    /**
     * @dev 从待处理验证列表中移除
     */
    function _removeFromPendingVerifications(uint256 deviceId) internal {
        for (uint256 i = 0; i < pendingVerifications.length; i++) {
            if (pendingVerifications[i] == deviceId) {
                // 将最后一个元素移到当前位置，然后删除最后一个元素
                pendingVerifications[i] = pendingVerifications[pendingVerifications.length - 1];
                pendingVerifications.pop();
                break;
            }
        }
    }

    /**
     * @dev 从待处理批次列表中移除
     */
    function _removeFromPendingBatches(bytes32 batchId) internal {
        for (uint256 i = 0; i < pendingBatchUpdates.length; i++) {
            if (pendingBatchUpdates[i] == batchId) {
                pendingBatchUpdates[i] = pendingBatchUpdates[pendingBatchUpdates.length - 1];
                pendingBatchUpdates.pop();
                break;
            }
        }
    }

    /**
     * @dev 验证签名
     */
    function _verifySignature(
        uint256 deviceId,
        bool result,
        string memory reportData,
        bytes memory signature
    ) internal pure returns (bool) {
        // 简化的签名验证逻辑
        // 实际实现应该使用ECDSA验证
        return signature.length > 0;
    }
}