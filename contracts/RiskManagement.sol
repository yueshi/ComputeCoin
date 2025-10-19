// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CCUSDReservePool.sol";

// 接口定义
interface IEnhancedEthConverter {
    function setPaused(bool _paused) external;
}

/**
 * @title RiskManagement
 * @dev 风险管理合约，监控和保护整个经济系统
 * @notice 提供系统级的风险控制和自动保护机制
 */
contract RiskManagement is Ownable {
    
    // 监控的合约
    address payable public immutable reservePool;
    address public immutable ethConverter; // 改为通用地址
    IERC20 public immutable ccToken;
    IERC20 public immutable ccusdToken;
    
    // 风险阈值
    uint256 public constant CRITICAL_RESERVE_RATIO = 3000; // 30% 严重风险
    uint256 public constant WARNING_RESERVE_RATIO = 5000;  // 50% 警告
    uint256 public constant MAX_DAILY_VOLUME_RATIO = 10000; // 100% 储备量日交易限制
    uint256 public constant PRICE_IMPACT_THRESHOLD = 1000; // 10% 价格影响阈值
    
    // 可配置的阈值
    uint256 public criticalThreshold = CRITICAL_RESERVE_RATIO;
    uint256 public warningThreshold = WARNING_RESERVE_RATIO;
    uint256 public priceImpactThreshold = PRICE_IMPACT_THRESHOLD;
    
    // 风险状态
    bool public emergencyMode;
    uint256 public lastRiskCheck;
    uint256 public riskScore; // 0-10000 (0-100%)
    
    // 历史数据
    uint256 public lastReserveRatio;
    uint256 public lastTotalVolume;
    uint256 public lastPrice;
    
    // 风险事件
    event RiskAlert(uint256 indexed level, string message, uint256 reserveRatio, uint256 riskScore);
    event EmergencyModeChanged(bool activated, string reason);
    event CircuitBreakerTriggered(string reason, uint256 duration);
    event RiskMitigationAction(string action, uint256 amount);
    event ThresholdsUpdated(uint256 critical, uint256 warning, uint256 priceImpact);
    event HealthCheckCompleted(bool healthy, string status, uint256 timestamp);
    
    constructor(
        address payable _reservePool,
        address _ethConverter,
        address _ccToken,
        address _ccusdToken
    ) Ownable(msg.sender) {
        reservePool = _reservePool;
        ethConverter = _ethConverter;
        ccToken = IERC20(_ccToken);
        ccusdToken = IERC20(_ccusdToken);
        lastRiskCheck = block.timestamp;
    }
    
    /**
     * @dev 执行风险检查（可被任何地址调用）
     */
    function performRiskCheck() external returns (bool healthy, string memory riskLevel) {
        uint256 currentReserveRatio = CCUSDReservePool(reservePool).getReserveRatio();
        uint256 currentRiskScore = _calculateRiskScore(currentReserveRatio);
        
        lastReserveRatio = currentReserveRatio;
        riskScore = currentRiskScore;
        lastRiskCheck = block.timestamp;
        
        // 确定风险等级
        if (currentReserveRatio < CRITICAL_RESERVE_RATIO) {
            // 严重风险：自动触发紧急模式
            healthy = false;
            riskLevel = "CRITICAL";
            _handleCriticalRisk(currentReserveRatio);
        } else if (currentReserveRatio < WARNING_RESERVE_RATIO) {
            // 警告级别：发出警报
            healthy = false;
            riskLevel = "WARNING";
            _handleWarningRisk(currentReserveRatio);
        } else {
            // 健康状态
            healthy = true;
            riskLevel = "HEALTHY";
        }
        
        emit RiskAlert(
            healthy ? 0 : (currentReserveRatio < CRITICAL_RESERVE_RATIO ? 3 : 1),
            riskLevel,
            currentReserveRatio,
            currentRiskScore
        );
        
        return (healthy, riskLevel);
    }
    
    /**
     * @dev 计算风险评分
     */
    function _calculateRiskScore(uint256 reserveRatio) internal pure returns (uint256) {
        // 基于储备比率计算基础风险
        uint256 baseRisk = reserveRatio >= 10000 ? 0 : (10000 - reserveRatio);
        
        // 可以添加更多风险因子：
        // - 交易量异常
        // - 价格波动
        // - 大额提取
        
        return baseRisk;
    }
    
    /**
     * @dev 处理严重风险
     */
    function _handleCriticalRisk(uint256 reserveRatio) internal {
        string memory reason = string(abi.encodePacked(
            "Reserve ratio critically low: ",
            _uint2str(reserveRatio / 100),
            ".",
            _uint2str(reserveRatio % 100),
            "%"
        ));
        
        // 激活紧急模式
        if (!emergencyMode) {
            emergencyMode = true;
            emit EmergencyModeChanged(true, reason);
        }
        
        // 尝试暂停兑换合约（使用低级调用）
        (bool success, ) = ethConverter.call(
            abi.encodeWithSignature("setPaused(bool)", true)
        );
        if (success) {
            emit CircuitBreakerTriggered(reason, 24 hours);
        }
    }
    
    /**
     * @dev 处理警告风险
     */
    function _handleWarningRisk(uint256 reserveRatio) internal {
        emit RiskAlert(2, "WARNING", reserveRatio, riskScore);
        
        // 可以采取的缓解措施：
        // - 临时提高手续费
        // - 降低兑换限额
        // - 发出流动性补充通知
    }
    
    /**
     * @dev 手动设置紧急模式
     */
    function setEmergencyMode(bool active, string calldata reason) external onlyOwner {
        if (active && !emergencyMode) {
            emergencyMode = true;
            // 尝试暂停兑换合约
            (bool success, ) = ethConverter.call(
                abi.encodeWithSignature("setPaused(bool)", true)
            );
            require(success, "Failed to pause ethConverter");
            emit EmergencyModeChanged(true, reason);
        } else if (!active && emergencyMode) {
            emergencyMode = false;
            // 尝试恢复兑换合约
            (bool success, ) = ethConverter.call(
                abi.encodeWithSignature("setPaused(bool)", false)
            );
            require(success, "Failed to resume ethConverter");
            emit EmergencyModeChanged(false, "Manual deactivation");
        }
    }
    
    /**
     * @dev 紧急流动性注入
     */
    function emergencyLiquidityInjection(
        uint256 ethAmount,
        uint256 ccAmount
    ) external payable onlyOwner {
        require(msg.value >= ethAmount, "Insufficient ETH sent");
        require(emergencyMode, "Not in emergency mode");
        
        // 注入ETH到储备池
        if (ethAmount > 0) {
            (bool success, ) = reservePool.call{value: ethAmount}("");
            require(success, "ETH transfer failed");
        }
        
        // 转移CC到储备池
        if (ccAmount > 0) {
            ccToken.transfer(address(reservePool), ccAmount);
        }
        
        emit RiskMitigationAction("Liquidity injection", ethAmount + ccAmount);
    }
    
    /**
     * @dev 获取系统健康状态
     */
    function getSystemHealth() external view returns (
        uint256 reserveRatio,
        uint256 currentRiskScore,
        bool isEmergency,
        string memory status,
        uint256 lastCheck
    ) {
        uint256 currentRatio = CCUSDReservePool(reservePool).getReserveRatio();
        string memory currentStatus;
        
        if (currentRatio < criticalThreshold) {
            currentStatus = "CRITICAL";
        } else if (currentRatio < warningThreshold) {
            currentStatus = "WARNING";
        } else {
            currentStatus = "HEALTHY";
        }
        
        return (
            currentRatio,
            _calculateRiskScore(currentRatio),
            emergencyMode,
            currentStatus,
            lastRiskCheck
        );
    }
    
    /**
     * @dev 获取储备池详细信息
     */
    function getReserveDetails() external view returns (
        uint256 ethReserves,
        uint256 ccReserves,
        uint256 ccusdIssued,
        uint256 backingPerCCUSD
    ) {
        return (
            address(reservePool).balance,
            ccToken.balanceOf(reservePool),
            ccusdToken.balanceOf(reservePool),
            CCUSDReservePool(reservePool).getBackingPerCCUSD()
        );
    }
    
    /**
     * @dev 预警系统：检查大额交易影响
     */
    function checkLargeTransactionImpact(uint256 ethAmount) external view returns (
        uint256 priceImpact,
        bool wouldTriggerCircuitBreaker
    ) {
        uint256 totalLiquidity = reservePool.balance;
        if (totalLiquidity == 0) return (10000, true);
        
        priceImpact = (ethAmount * 10000) / totalLiquidity;
        wouldTriggerCircuitBreaker = priceImpact > priceImpactThreshold;
    }
    
    /**
     * @dev 设置风险阈值
     */
    function setRiskThresholds(
        uint256 _critical,
        uint256 _warning,
        uint256 _priceImpact
    ) external onlyOwner {
        require(_critical < _warning, "Critical threshold must be lower than warning");
        require(_warning <= 10000, "Warning threshold too high");
        require(_priceImpact <= 10000, "Price impact threshold too high");
        
        criticalThreshold = _critical;
        warningThreshold = _warning;
        priceImpactThreshold = _priceImpact;
        
        emit ThresholdsUpdated(_critical, _warning, _priceImpact);
    }
    
    /**
     * @dev 定期健康检查（可被自动化调用）
     */
    function scheduledHealthCheck() external returns (bool healthy, string memory status) {
        uint256 currentReserveRatio = CCUSDReservePool(reservePool).getReserveRatio();
        uint256 currentRiskScore = _calculateRiskScore(currentReserveRatio);
        
        lastReserveRatio = currentReserveRatio;
        riskScore = currentRiskScore;
        lastRiskCheck = block.timestamp;
        
        // 确定风险等级
        string memory currentStatus;
        bool isHealthy;
        
        if (currentReserveRatio < criticalThreshold) {
            // 严重风险：自动触发紧急模式
            isHealthy = false;
            currentStatus = "CRITICAL";
            _handleCriticalRisk(currentReserveRatio);
        } else if (currentReserveRatio < warningThreshold) {
            // 警告级别：发出警报
            isHealthy = false;
            currentStatus = "WARNING";
            _handleWarningRisk(currentReserveRatio);
        } else {
            // 健康状态
            isHealthy = true;
            currentStatus = "HEALTHY";
        }
        
        emit RiskAlert(
            isHealthy ? 0 : (currentReserveRatio < criticalThreshold ? 3 : 1),
            currentStatus,
            currentReserveRatio,
            currentRiskScore
        );
        
        emit HealthCheckCompleted(isHealthy, currentStatus, block.timestamp);
        return (isHealthy, currentStatus);
    }
    
    /**
     * @dev 辅助函数：uint转字符串
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    // 修饰符
    modifier onlyInEmergency() {
        require(emergencyMode, "Not in emergency mode");
        _;
    }
    
    modifier onlyWhenHealthy() {
        require(!emergencyMode, "System in emergency mode");
        _;
    }
}