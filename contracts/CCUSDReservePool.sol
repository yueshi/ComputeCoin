// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CCUSDReservePool
 * @dev CCUSD储备池合约，为CCUSD提供价值支撑
 * @notice 维护ETH和CC代币储备，确保CCUSD价值稳定
 */
contract CCUSDReservePool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // 代币合约地址
    address public immutable CCUSD_TOKEN;
    address public immutable CC_TOKEN;
    
    // 储备配置
    uint256 public constant RESERVE_RATIO = 80; // 80%储备率
    uint256 public ETH_CCUSD_RATE = 3500; // 1 ETH = 3500 CCUSD
    
    // 储备量跟踪
    uint256 public totalEthReserves;
    uint256 public totalCCReserves;
    uint256 public totalCCUSDIssued;
    
    // 紧急控制
    bool public emergencyPause;
    bool public paused; // 增加暂停状态
    uint256 public constant MAX_WITHDRAWAL_PER_DAY = 100 ether; // 每日最大提取量
    mapping(address => uint256) public dailyWithdrawn;
    mapping(address => uint256) public lastWithdrawTime;
    
    // 安全增强：紧急操作冷却期
    uint256 public emergencyCooldownPeriod = 24 hours;
    uint256 public lastEmergencyAction;

    // 事件定义
    event ReserveAdded(address indexed token, uint256 amount);
    event ReserveWithdrawn(address indexed token, address indexed to, uint256 amount);
    event CCUSDIssued(uint256 amount);
    event CCUSDRedeemed(uint256 amount);
    event EmergencyStateChanged(bool paused);
    event RateUpdated(uint256 newRate);
    event PausedStateChanged(bool paused);
    event EmergencyAction(string action, address indexed caller, uint256 timestamp);

    constructor(address ccusdToken, address ccToken) Ownable(msg.sender) {
        CCUSD_TOKEN = ccusdToken;
        CC_TOKEN = ccToken;
    }

    /**
     * @dev 添加ETH储备
     */
    receive() external payable whenNotPaused nonEmergency nonReentrant {
        require(msg.value > 0, "CCUSDReservePool: Zero amount");
        
        totalEthReserves += msg.value;
        emit ReserveAdded(address(0), msg.value);
    }

    /**
     * @dev 添加CC代币储备
     */
    function addCCReserve(uint256 amount) external whenNotPaused nonEmergency nonReentrant {
        require(amount > 0, "CCUSDReservePool: Zero amount");
        
        IERC20(CC_TOKEN).safeTransferFrom(msg.sender, address(this), amount);
        totalCCReserves += amount;
        emit ReserveAdded(CC_TOKEN, amount);
    }

    /**
     * @dev 发行CCUSD（需要足够的储备支撑）
     */
    function issueCCUSD(uint256 ccusdAmount) external onlyOwner whenNotPaused nonEmergency nonReentrant {
        require(ccusdAmount > 0, "CCUSDReservePool: Zero amount");
        
        uint256 requiredReserves = (ccusdAmount * RESERVE_RATIO) / 100;
        uint256 equivalentEth = (requiredReserves * 1 ether) / ETH_CCUSD_RATE;
        
        require(
            totalEthReserves >= equivalentEth,
            "CCUSDReservePool: Insufficient ETH reserves"
        );
        
        // 检查发行限额（单次不超过总储备的20%）
        uint256 maxIssueAmount = (totalEthReserves * ETH_CCUSD_RATE * 20) / (100 * 1 ether);
        require(
            ccusdAmount <= maxIssueAmount,
            "CCUSDReservePool: Issue amount too large"
        );
        
        IERC20(CCUSD_TOKEN).safeTransfer(msg.sender, ccusdAmount);
        totalCCUSDIssued += ccusdAmount;
        
        emit CCUSDIssued(ccusdAmount);
    }

    /**
     * @dev 赎回CCUSD（按储备比例返还资产）
     */
    function redeemCCUSD(uint256 ccusdAmount) external whenNotPaused nonEmergency nonReentrant {
        require(ccusdAmount > 0, "CCUSDReservePool: Zero amount");
        require(
            IERC20(CCUSD_TOKEN).balanceOf(msg.sender) >= ccusdAmount,
            "CCUSDReservePool: Insufficient CCUSD balance"
        );
        
        // 检查每日提取限制
        _checkDailyLimit(msg.sender, ccusdAmount);
        
        // 计算可赎回的资产
        uint256 ethAmount = _calculateRedemption(ccusdAmount);
        
        IERC20(CCUSD_TOKEN).safeTransferFrom(msg.sender, address(this), ccusdAmount);
        
        if (ethAmount > 0 && totalEthReserves >= ethAmount) {
            (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
            require(success, "CCUSDReservePool: ETH transfer failed");
            totalEthReserves -= ethAmount;
        }
        
        totalCCUSDIssued -= ccusdAmount;
        
        emit CCUSDRedeemed(ccusdAmount);
        emit ReserveWithdrawn(address(0), msg.sender, ethAmount);
    }

    /**
     * @dev 计算CCUSD可赎回的ETH数量
     */
    function _calculateRedemption(uint256 ccusdAmount) internal view returns (uint256) {
        if (totalCCUSDIssued == 0) return 0;
        
        // 按储备比例计算
        uint256 ethBacking = (ccusdAmount * totalEthReserves) / totalCCUSDIssued;
        return (ethBacking * RESERVE_RATIO) / 100;
    }

    /**
     * @dev 检查每日提取限制
     */
    function _checkDailyLimit(address user, uint256 amount) internal {
        uint256 currentDay = block.timestamp / 86400;
        uint256 userLastDay = lastWithdrawTime[user] / 86400;
        
        if (currentDay != userLastDay) {
            dailyWithdrawn[user] = 0;
            lastWithdrawTime[user] = block.timestamp;
        }
        
        uint256 ethEquivalent = (amount * 1 ether) / ETH_CCUSD_RATE;
        require(
            dailyWithdrawn[user] + ethEquivalent <= MAX_WITHDRAWAL_PER_DAY,
            "CCUSDReservePool: Daily withdrawal limit exceeded"
        );
        
        dailyWithdrawn[user] += ethEquivalent;
    }

    /**
     * @dev 紧急提取储备（增强安全检查）
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        require(emergencyPause, "CCUSDReservePool: Not in emergency state");
        require(to != address(0), "CCUSDReservePool: Invalid recipient");
        require(amount > 0, "CCUSDReservePool: Invalid amount");
        
        // 安全检查：冷却期和提取限制
        require(
            block.timestamp >= lastEmergencyAction + emergencyCooldownPeriod,
            "CCUSDReservePool: Emergency cooldown active"
        );
        
        // 限制紧急提取金额（不超过储备的10%）
        if (token == address(0)) {
            uint256 maxEmergencyWithdraw = (address(this).balance * 10) / 100;
            require(
                amount <= maxEmergencyWithdraw,
                "CCUSDReservePool: Emergency withdrawal too large"
            );
            require(address(this).balance >= amount, "CCUSDReservePool: Insufficient ETH");
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "CCUSDReservePool: ETH transfer failed");
        } else {
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            uint256 maxEmergencyWithdraw = (tokenBalance * 10) / 100;
            require(
                amount <= maxEmergencyWithdraw,
                "CCUSDReservePool: Emergency withdrawal too large"
            );
            require(tokenBalance >= amount, "CCUSDReservePool: Insufficient token");
            IERC20(token).safeTransfer(to, amount);
        }
        
        lastEmergencyAction = block.timestamp;
        emit EmergencyAction("emergencyWithdraw", to, block.timestamp);
        emit ReserveWithdrawn(token, to, amount);
    }

    /**
     * @dev 设置紧急状态
     */
    function setEmergencyPause(bool _paused) external onlyOwner {
        emergencyPause = _paused;
        paused = _paused; // 同步暂停状态
        emit EmergencyStateChanged(_paused);
        emit PausedStateChanged(_paused);
    }
    
    /**
     * @dev 设置暂停状态（独立控制）
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }
    
    /**
     * @dev 设置紧急冷却期
     */
    function setEmergencyCooldownPeriod(uint256 period) external onlyOwner {
        require(period >= 1 hours && period <= 7 days, "Invalid cooldown period");
        emergencyCooldownPeriod = period;
    }

    /**
     * @dev 更新汇率（增强安全检查）
     */
    function updateRate(uint256 newRate) external onlyOwner whenNotPaused {
        require(newRate > 0, "CCUSDReservePool: Invalid rate");
        require(newRate >= 1000 && newRate <= 10000, "CCUSDReservePool: Rate out of range");
        
        // 检查汇率偏差（不超过20%）
        uint256 deviation = newRate > ETH_CCUSD_RATE ? 
            ((newRate - ETH_CCUSD_RATE) * 10000) / ETH_CCUSD_RATE :
            ((ETH_CCUSD_RATE - newRate) * 10000) / ETH_CCUSD_RATE;
        
        require(
            deviation <= 2000,
            "CCUSDReservePool: Rate deviation too large"
        );
        
        ETH_CCUSD_RATE = newRate;
        emit RateUpdated(newRate);
    }

    /**
     * @dev 获取储备充足率
     */
    function getReserveRatio() external view returns (uint256) {
        if (totalCCUSDIssued == 0) return 10000; // 100%
        
        uint256 requiredEth = (totalCCUSDIssued * 1 ether) / ETH_CCUSD_RATE;
        return (totalEthReserves * 10000) / requiredEth; // 基点表示
    }

    /**
     * @dev 获取每个CCUSD的ETH支撑
     */
    function getBackingPerCCUSD() external view returns (uint256) {
        if (totalCCUSDIssued == 0) return 0;
        return (totalEthReserves * 1 ether) / totalCCUSDIssued;
    }

    // 修饰符
    modifier nonEmergency() {
        require(!emergencyPause, "CCUSDReservePool: Emergency pause active");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "CCUSDReservePool: Contract is paused");
        _;
    }
}