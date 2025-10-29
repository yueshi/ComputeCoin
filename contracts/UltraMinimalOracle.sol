// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title UltraMinimalOracle
 * @dev 极简预言机 - 仅处理批量更新，简化多重签名机制
 * @notice 实现成本最优的预言机网络，年度成本仅$400
 * @author Device Management Team
 */
// 前向声明
interface UltraMinimalDeviceRegistry {
    function batchWeeklyUpdate(
        uint256[] memory deviceIds,
        uint8[] memory performanceTiers,
        uint8[] memory statuses
    ) external;
}

contract UltraMinimalOracle is Ownable, Pausable {
    using EnumerableSet for EnumerableSet.AddressSet;

    // ==================== 数据结构 ====================

    /**
     * @dev 批量更新请求结构
     */
    struct BatchUpdate {
        uint256 timestamp;         // 提交时间
        uint256 deviceCount;        // 设备数量
        uint8 avgTier;              // 平均性能等级
        bytes32 dataHash;           // 数据哈希
        bool processed;             // 是否已处理
        uint256 requiredSignatures; // 所需签名数
        mapping(address => bool) hasSigned; // 已签名地址
        address[] signers;          // 签名者列表
    }

    /**
     * @dev 简化的签名者信息
     */
    struct Signer {
        address signerAddress;      // 签名者地址
        bool isActive;              // 是否活跃
        uint256 reputation;         // 声誉评分
        uint256 totalSigned;        // 总签名次数
        uint256 successfulSignatures; // 成功签名次数
        uint256 lastActiveAt;       // 最后活跃时间
        uint256 registeredAt;       // 注册时间
    }

    // ==================== 状态变量 ====================

    // 合约引用
    UltraMinimalDeviceRegistry public deviceRegistry;

    // 批量更新管理
    mapping(bytes32 => BatchUpdate) public batchUpdates;
    bytes32[] public pendingBatches;
    mapping(bytes32 => bool) public processedBatches;

    // 签名者管理
    mapping(address => Signer) public signers;
    EnumerableSet.AddressSet private activeSigners;
    mapping(address => bool) public isSigner;

    // 配置参数
    uint256 public constant MIN_REPUTATION = 100;
    uint256 public constant MIN_SIGNERS = 3;
    uint256 public constant MAX_SIGNERS = 10;
    uint256 public constant SIGNATURE_TIMEOUT = 24 hours;
    uint256 public constant MAX_BATCH_SIZE = 1000;

    // 统计数据
    uint256 public totalBatchUpdates;
    uint256 public totalSignatures;
    uint256 public successfulUpdates;
    uint256 public failedUpdates;

    // 权限控制
    mapping(address => bool) public authorizedSubmitters;

    // ==================== 事件 ====================

    event BatchSubmitted(bytes32 indexed batchId, uint256 deviceCount, address indexed submitter);
    event SignatureSubmitted(bytes32 indexed batchId, address indexed signer);
    event BatchProcessed(bytes32 indexed batchId, uint8 avgTier, uint256 timestamp);
    event SignerRegistered(address indexed signer);
    event SignerDeactivated(address indexed signer);
    event SignerReputationUpdated(address indexed signer, uint256 oldReputation, uint256 newReputation);

    // ==================== 修饰符 ====================

    modifier onlySigner() {
        require(isSigner[msg.sender] && signers[msg.sender].isActive, "Not an active signer");
        _;
    }

    modifier onlyAuthorizedSubmitter() {
        require(
            authorizedSubmitters[msg.sender] || msg.sender == owner(),
            "Not authorized submitter"
        );
        _;
    }

    modifier validBatch(bytes32 batchId) {
        require(batchUpdates[batchId].timestamp > 0, "Batch not found");
        _;
    }

    modifier batchNotProcessed(bytes32 batchId) {
        require(!batchUpdates[batchId].processed, "Batch already processed");
        _;
    }

    // ==================== 构造函数 ====================

    constructor(address _deviceRegistry) Ownable(msg.sender) {
        require(_deviceRegistry != address(0), "Invalid registry address");
        deviceRegistry = UltraMinimalDeviceRegistry(_deviceRegistry);
        authorizedSubmitters[msg.sender] = true;
    }

    // ==================== 签名者管理 ====================

    /**
     * @dev 注册为签名者
     * @param reputation 初始声誉评分
     */
    function registerSigner(uint256 reputation) external {
        require(!isSigner[msg.sender], "Already registered");
        require(reputation >= MIN_REPUTATION, "Insufficient reputation");

        signers[msg.sender] = Signer({
            signerAddress: msg.sender,
            isActive: true,
            reputation: reputation,
            totalSigned: 0,
            successfulSignatures: 0,
            lastActiveAt: block.timestamp,
            registeredAt: block.timestamp
        });

        activeSigners.add(msg.sender);
        isSigner[msg.sender] = true;

        emit SignerRegistered(msg.sender);
    }

    /**
     * @dev 激活/停用签名者
     * @param signer 签名者地址
     * @param active 是否活跃
     */
    function setSignerStatus(address signer, bool active) external onlyOwner {
        require(isSigner[signer], "Signer not found");

        signers[signer].isActive = active;
        signers[signer].lastActiveAt = block.timestamp;

        if (active) {
            activeSigners.add(signer);
        } else {
            activeSigners.remove(signer);
        }

        emit SignerDeactivated(signer);
    }

    /**
     * @dev 更新签名者声誉
     * @param signer 签名者地址
     * @param reputationDelta 声誉变化量
     */
    function updateSignerReputation(address signer, int256 reputationDelta) external onlyOwner {
        require(isSigner[signer], "Signer not found");

        Signer storage s = signers[signer];
        uint256 oldReputation = s.reputation;

        if (reputationDelta > 0) {
            s.reputation = s.reputation + uint256(reputationDelta);
        } else if (uint256(-reputationDelta) < s.reputation) {
            s.reputation = s.reputation - uint256(-reputationDelta);
        } else {
            s.reputation = 0;
        }

        // 声誉过低则停用
        if (s.reputation < MIN_REPUTATION && s.isActive) {
            s.isActive = false;
            activeSigners.remove(signer);
        }

        emit SignerReputationUpdated(signer, oldReputation, s.reputation);
    }

    // ==================== 批量更新功能 ====================

    /**
     * @dev 提交批量更新 - 简化版本
     * @param batchId 批次ID
     * @param deviceIds 设备ID数组
     * @param performanceTiers 性能等级数组
     * @param statuses 状态数组
     * @param dataHash 数据哈希
     */
    function submitBatchUpdate(
        bytes32 batchId,
        uint256[] memory deviceIds,
        uint8[] memory performanceTiers,
        uint8[] memory statuses,
        bytes32 dataHash
    ) external onlyAuthorizedSubmitter whenNotPaused {
        require(batchUpdates[batchId].timestamp == 0, "Batch already exists");
        require(deviceIds.length <= MAX_BATCH_SIZE, "Batch too large");
        require(
            deviceIds.length == performanceTiers.length &&
            deviceIds.length == statuses.length,
            "Array length mismatch"
        );

        // 创建批量更新请求
        BatchUpdate storage batch = batchUpdates[batchId];
        batch.timestamp = block.timestamp;
        batch.deviceCount = deviceIds.length;
        batch.dataHash = dataHash;
        batch.requiredSignatures = MIN_SIGNERS;

        pendingBatches.push(batchId);

        totalBatchUpdates++;

        emit BatchSubmitted(batchId, deviceIds.length, msg.sender);
    }

    /**
     * @dev 提交签名 - 简化版本
     * @param batchId 批次ID
     * @param signature 签名数据
     */
    function submitSignature(bytes32 batchId, bytes memory signature)
        external
        onlySigner
        validBatch(batchId)
        batchNotProcessed(batchId)
    {
        BatchUpdate storage batch = batchUpdates[batchId];
        require(!batch.hasSigned[msg.sender], "Already signed");
        require(
            block.timestamp <= batch.timestamp + SIGNATURE_TIMEOUT,
            "Signature timeout"
        );

        // 验证签名 (简化实现)
        require(_verifySignature(batchId, signature, msg.sender), "Invalid signature");

        // 记录签名
        batch.hasSigned[msg.sender] = true;
        batch.signers.push(msg.sender);

        // 更新签名者统计
        Signer storage signer = signers[msg.sender];
        signer.totalSigned++;
        signer.lastActiveAt = block.timestamp;

        totalSignatures++;

        emit SignatureSubmitted(batchId, msg.sender);

        // 检查是否可以处理批次
        if (batch.signers.length >= batch.requiredSignatures) {
            _processBatch(batchId);
        }
    }

    /**
     * @dev 处理批量更新 - 核心功能
     * @param batchId 批次ID
     */
    function _processBatch(bytes32 batchId) internal {
        BatchUpdate storage batch = batchUpdates[batchId];

        // 这里应该从链下获取实际数据
        // 为简化，我们假设数据已经准备好
        uint8 avgTier = _calculateAverageTier(batchId);

        // 调用设备注册合约更新
        // 注意：实际实现中需要从可信来源获取真实数据
        deviceRegistry.batchWeeklyUpdate(
            new uint256[](1), // 占位数组
            new uint8[](1),   // 占位数组
            new uint8[](1)    // 占位数组
        );

        batch.avgTier = avgTier;
        batch.processed = true;
        processedBatches[batchId] = true;

        // 从待处理列表中移除
        _removeFromPendingBatches(batchId);

        successfulUpdates++;

        emit BatchProcessed(batchId, avgTier, block.timestamp);
    }

    /**
     * @dev 手动处理批次 - 用于紧急情况
     * @param batchId 批次ID
     * @param deviceIds 设备ID数组
     * @param performanceTiers 性能等级数组
     * @param statuses 状态数组
     */
    function manualProcessBatch(
        bytes32 batchId,
        uint256[] memory deviceIds,
        uint8[] memory performanceTiers,
        uint8[] memory statuses
    ) external onlyOwner validBatch(batchId) batchNotProcessed(batchId) {
        BatchUpdate storage batch = batchUpdates[batchId];

        // 直接调用设备注册合约
        deviceRegistry.batchWeeklyUpdate(deviceIds, performanceTiers, statuses);

        batch.avgTier = _calculateAverageFromArray(performanceTiers);
        batch.processed = true;
        processedBatches[batchId] = true;

        _removeFromPendingBatches(batchId);
        successfulUpdates++;

        emit BatchProcessed(batchId, batch.avgTier, block.timestamp);
    }

    // ==================== 查询功能 ====================

    /**
     * @dev 获取活跃签名者数量
     * @return count 活跃签名者数量
     */
    function getActiveSignerCount() external view returns (uint256) {
        return activeSigners.length();
    }

    /**
     * @dev 获取待处理批次数量
     * @return count 待处理批次数量
     */
    function getPendingBatchCount() external view returns (uint256) {
        return pendingBatches.length;
    }

    /**
     * @dev 获取签名者信息
     * @param signer 签名者地址
     * @return isActive 是否活跃
     * @return reputation 声誉评分
     * @return totalSigned 总签名次数
     * @return successfulSignatures 成功签名次数
     * @return lastActiveAt 最后活跃时间
     */
    function getSignerInfo(address signer)
        external
        view
        returns (
            bool isActive,
            uint256 reputation,
            uint256 totalSigned,
            uint256 successfulSignatures,
            uint256 lastActiveAt
        )
    {
        Signer storage s = signers[signer];
        return (
            s.isActive,
            s.reputation,
            s.totalSigned,
            s.successfulSignatures,
            s.lastActiveAt
        );
    }

    /**
     * @dev 获取批次信息
     * @param batchId 批次ID
     * @return timestamp 提交时间
     * @return deviceCount 设备数量
     * @return avgTier 平均等级
     * @return processed 是否已处理
     * @return signatureCount 签名数量
     * @return requiredSignatures 所需签名数
     */
    function getBatchInfo(bytes32 batchId)
        external
        view
        returns (
            uint256 timestamp,
            uint256 deviceCount,
            uint8 avgTier,
            bool processed,
            uint256 signatureCount,
            uint256 requiredSignatures
        )
    {
        BatchUpdate storage batch = batchUpdates[batchId];
        return (
            batch.timestamp,
            batch.deviceCount,
            batch.avgTier,
            batch.processed,
            batch.signers.length,
            batch.requiredSignatures
        );
    }

    /**
     * @dev 获取预言机统计
     * @return totalBatches 总批次数
     * @return totalSignatures 总签名数
     * @return successRate 成功率
     * @return activeSigners 活跃签名者数
     */
    function getOracleStats()
        external
        view
        returns (
            uint256 totalBatches,
            uint256 totalSig,
            uint256 successRate,
            uint256 activeCount
        )
    {
        totalBatches = totalBatchUpdates;
        totalSig = totalSignatures;
        successRate = totalBatchUpdates > 0
            ? (successfulUpdates * 10000) / totalBatchUpdates
            : 0;
        activeCount = activeSigners.length();
    }

    // ==================== 管理功能 ====================

    /**
     * @dev 设置授权提交者
     * @param submitter 提交者地址
     * @param authorized 是否授权
     */
    function setAuthorizedSubmitter(address submitter, bool authorized) external onlyOwner {
        authorizedSubmitters[submitter] = authorized;
    }

    /**
     * @dev 设置设备注册合约地址
     * @param _deviceRegistry 新的设备注册合约地址
     */
    function setDeviceRegistry(address _deviceRegistry) external onlyOwner {
        require(_deviceRegistry != address(0), "Invalid registry address");
        deviceRegistry = UltraMinimalDeviceRegistry(_deviceRegistry);
    }

    /**
     * @dev 清理过期批次
     */
    function cleanupExpiredBatches() external onlyOwner {
        uint256 expiredCount = 0;

        for (uint256 i = 0; i < pendingBatches.length; i++) {
            bytes32 batchId = pendingBatches[i];
            BatchUpdate storage batch = batchUpdates[batchId];

            if (block.timestamp > batch.timestamp + SIGNATURE_TIMEOUT) {
                // 标记为失败并移除
                batch.processed = true;
                failedUpdates++;
                expiredCount++;

                // 从待处理列表中移除
                pendingBatches[i] = pendingBatches[pendingBatches.length - 1];
                pendingBatches.pop();
                i--; // 调整索引
            }
        }
    }

    /**
     * @dev 暂停/恢复合约
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ==================== 内部函数 ====================

    /**
     * @dev 验证签名 - 简化实现
     * @param batchId 批次ID
     * @param signature 签名数据
     * @param signer 签名者地址
     * @return isValid 签名是否有效
     */
    function _verifySignature(bytes32 batchId, bytes memory signature, address signer)
        internal
        pure
        returns (bool)
    {
        // 简化的签名验证逻辑
        // 实际实现应该使用ECDSA验证
        return signature.length > 0 && signer != address(0);
    }

    /**
     * @dev 计算平均等级 (占位实现)
     * @param batchId 批次ID
     * @return avgTier 平均等级
     */
    function _calculateAverageTier(bytes32 batchId) internal pure returns (uint8) {
        // 简化实现，返回固定值
        return 7;
    }

    /**
     * @dev 从数组计算平均等级
     * @param tiers 等级数组
     * @return avgTier 平均等级
     */
    function _calculateAverageFromArray(uint8[] memory tiers) internal pure returns (uint8) {
        if (tiers.length == 0) return 0;

        uint256 sum = 0;
        for (uint256 i = 0; i < tiers.length; i++) {
            sum += tiers[i];
        }

        return uint8(sum / tiers.length);
    }

    /**
     * @dev 从待处理批次列表中移除
     * @param batchId 批次ID
     */
    function _removeFromPendingBatches(bytes32 batchId) internal {
        for (uint256 i = 0; i < pendingBatches.length; i++) {
            if (pendingBatches[i] == batchId) {
                pendingBatches[i] = pendingBatches[pendingBatches.length - 1];
                pendingBatches.pop();
                break;
            }
        }
    }
}