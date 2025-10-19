// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./CCUSDReservePool.sol";

/**
 * @title EthToCCUSDConverter
 * @dev 安全优化版ETH兑换CCUSD合约 - 集成EnhancedEthConverter安全机制
 * @notice 用户直接发送ETH兑换CCUSD，包含储备检查、每日限额、汇率偏差限制
 */
contract EthToCCUSDConverter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // 代币合约地址
    IERC20 public ccusdToken;
    CCUSDReservePool public reservePool;
    
    // 汇率相关 - 固定汇率机制
    uint256 public baseRate = 100; // 固定汇率：1 ETH = 100 CCUSD (基于1CCUSD=10CC, 1ETH=1000CC)
    uint256 public maxRateDeviation = 500; // 最大汇率偏差：5%
    uint256 public constant MIN_EXCHANGE_RATE = 100;       // 最小汇率 1:100
    uint256 public constant MAX_EXCHANGE_RATE = 10000;     // 最大汇率 1:10000
    uint256 public constant MAX_SINGLE_EXCHANGE = 100 ether; // 单次最大兑换100 ETH
    
    // 汇率和风险控制 - 固定汇率
    uint256 public currentRate;
    bool public dynamicRateEnabled = false; // 禁用动态汇率
    mapping(address => bool) public authorizedRateSetters;
    
    // 风险控制参数
    bool public paused;
    uint256 public dailyLimit = 1000 ether; // 每日兑换限额
    uint256 public minReserveRatio = 5000; // 最小储备率：50%
    
    // 每日限额跟踪
    uint256 public todayExchangedETH;
    uint256 public lastDayTimestamp;
    mapping(address => uint256) public userDailyExchanged;
    mapping(address => uint256) public userLastExchangeDay;
    
    // 手续费设置
    uint256 public exchangeFeeRate = 50; // 0.5% 手续费 (50基点)
    uint256 public constant MAX_FEE_RATE = 500; // 最大手续费率5%
    address public feeRecipient;
    
    // 统计数据
    uint256 public totalEthExchanged;
    uint256 public totalCCUSDMinted;
    uint256 public totalExchangeCount;
    uint256 public totalFeesCollected;
    uint256 public contractCreatedAt;
    
    // 紧急暂停
    bool public emergencyMode;
    
    // 事件定义
    event Exchanged(
        address indexed user,
        uint256 ethAmount,
        uint256 ccusdAmount,
        uint256 feeAmount,
        uint256 rate,
        uint256 timestamp
    );
    
    event RateUpdated(
        uint256 oldRate,
        uint256 newRate,
        address indexed setter
    );
    
    event FeeUpdated(
        uint256 newFeeRate,
        address indexed recipient
    );
    
    event EmergencyModeToggled(
        bool enabled,
        string reason
    );
    
    event FeesWithdrawn(
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    event ContractBalanceUpdated(
        uint256 ethBalance,
        uint256 ccusdBalance
    );
    
    // 新增事件
    event EmergencyStateChanged(bool paused);
    event ReserveAlert(string message, uint256 ratio);
    
    // 自定义错误
    error InvalidAmount();
    error InsufficientLiquidity();
    error ExchangeRateNotValid();
    error AmountExceedsLimit();
    error ExchangePaused();
    error TransferFailed();
    error UnauthorizedAccess();
    error InvalidAddress();
    error InsufficientCCUSDBalance();
    
    /**
     * @dev 构造函数
     * @param _ccusdToken CCUSD代币地址
     * @param _reservePool 储备池合约地址
     * @param _initialRate 初始汇率
     */
    constructor(
        address _ccusdToken,
        address payable _reservePool,
        uint256 _initialRate
    ) Ownable(msg.sender) {
        if (_ccusdToken == address(0) || _reservePool == address(0)) revert InvalidAddress();
        
        ccusdToken = IERC20(_ccusdToken);
        reservePool = CCUSDReservePool(_reservePool);
        currentRate = _initialRate > 0 ? _initialRate : baseRate;
        contractCreatedAt = block.timestamp;
        feeRecipient = msg.sender;
        authorizedRateSetters[msg.sender] = true;
    }
    
    /**
     * @dev 检查每日限额
     */
    function _checkDailyLimits(address user, uint256 ethAmount) internal {
        uint256 currentDay = block.timestamp / 86400;
        uint256 userCurrentDay = userLastExchangeDay[user] / 86400;
        
        // 重置用户每日限额
        if (currentDay != userCurrentDay) {
            userDailyExchanged[user] = 0;
            userLastExchangeDay[user] = block.timestamp;
        }
        
        // 检查用户每日限额（默认为每日限额的10%）
        uint256 userDailyLimit = dailyLimit / 10;
        require(
            userDailyExchanged[user] + ethAmount <= userDailyLimit,
            "User daily limit exceeded"
        );
        
        // 重置全局每日限额
        uint256 globalCurrentDay = lastDayTimestamp / 86400;
        if (currentDay != globalCurrentDay) {
            todayExchangedETH = 0;
            lastDayTimestamp = block.timestamp;
        }
        
        require(
            todayExchangedETH + ethAmount <= dailyLimit,
            "Daily limit exceeded"
        );
        
        userDailyExchanged[user] += ethAmount;
    }
    
    /**
     * @dev 检查储备要求
     */
    function _checkReserveRequirement() internal view {
        uint256 currentRatio = reservePool.getReserveRatio();
        require(
            currentRatio >= minReserveRatio,
            "Reserve ratio too low"
        );
    }
    
    /**
     * @dev 更新统计数据
     */
    function _updateStatistics(uint256 ethAmount) internal {
        totalEthExchanged += ethAmount;
        todayExchangedETH += ethAmount;
    }
    
    /**
     * @dev 计算ETH可以兑换的CCUSD数量
     * @param ethAmount ETH数量（wei）
     * @param rate 汇率
     * @return ccusdAmount 可兑换的CCUSD数量
     */
    function calculateCCUSD(uint256 ethAmount, uint256 rate) public pure returns (uint256 ccusdAmount) {
        // ETH有18位小数，CCUSD有6位小数，需要调整精度
        return (ethAmount * rate * 1e6) / 1 ether;
    }
    
    /**
     * @dev 计算手续费
     * @param amount 原始金额
     * @return feeAmount 手续费金额
     */
    function calculateFee(uint256 amount) public view returns (uint256 feeAmount) {
        return (amount * exchangeFeeRate) / 10000;
    }
    
    /**
     * @dev 兑换ETH为CCUSD - 主要入口函数（集成安全检查）
     * @param customRate 自定义汇率（0表示使用当前汇率）
     */
    function exchange(uint256 customRate) external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert InvalidAmount();
        if (msg.value > MAX_SINGLE_EXCHANGE) revert AmountExceedsLimit();
        
        // 安全检查
        _checkDailyLimits(msg.sender, msg.value);
        _checkReserveRequirement();
        
        // 确定使用的汇率
        uint256 rate = customRate > 0 ? customRate : currentRate;
        if (rate < MIN_EXCHANGE_RATE || rate > MAX_EXCHANGE_RATE) {
            revert ExchangeRateNotValid();
        }
        
        // 计算兑换数量
        uint256 feeAmount = calculateFee(msg.value);
        uint256 netAmount = msg.value - feeAmount;
        uint256 ccusdAmount = calculateCCUSD(netAmount, rate);
        
        // 检查合约CCUSD余额是否足够
        if (ccusdToken.balanceOf(address(this)) < ccusdAmount) {
            revert InsufficientLiquidity();
        }
        
        // 更新统计
        _updateStatistics(msg.value);
        totalCCUSDMinted += ccusdAmount;
        totalFeesCollected += feeAmount;
        totalExchangeCount++;
        
        // 执行兑换：直接转账给用户
        ccusdToken.safeTransfer(msg.sender, ccusdAmount);
        
        // 将ETH发送到储备池
        (bool success, ) = payable(address(reservePool)).call{value: netAmount}("");
        require(success, "ETH transfer to reserve failed");
        
        // 支付手续费
        if (feeAmount > 0) {
            (bool feeSuccess, ) = payable(feeRecipient).call{value: feeAmount}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        emit Exchanged(
            msg.sender,
            msg.value,
            ccusdAmount,
            feeAmount,
            rate,
            block.timestamp
        );
    }
    
        
    /**
     * @dev 设置基础汇率（固定汇率 - 只允许设置为100）
     * @param newRate 新汇率（必须为100，即1 ETH = 100 CCUSD）
     */
    function setExchangeRate(uint256 newRate) external {
        if (!authorizedRateSetters[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedAccess();
        }

        // 固定汇率：1 ETH = 100 CCUSD (基于1CCUSD=10CC, 1ETH=1000CC)
        require(newRate == 100, "Fixed rate: only 100 allowed (1 ETH = 100 CCUSD)");

        uint256 oldRate = currentRate;
        currentRate = newRate;

        emit RateUpdated(oldRate, newRate, msg.sender);
    }
    
    /**
     * @dev 设置手续费率和接收地址
     * @param newFeeRate 新手续费率（基点）
     * @param newRecipient 新接收地址
     */
    function setFee(uint256 newFeeRate, address newRecipient) external onlyOwner {
        if (newFeeRate > MAX_FEE_RATE) revert ExchangeRateNotValid();
        if (newRecipient == address(0)) revert InvalidAddress();
        
        exchangeFeeRate = newFeeRate;
        feeRecipient = newRecipient;
        
        emit FeeUpdated(newFeeRate, newRecipient);
    }
    
    /**
     * @dev 切换紧急模式
     * @param enabled 是否启用
     * @param reason 原因
     */
    function toggleEmergencyMode(bool enabled, string calldata reason) external onlyOwner {
        emergencyMode = enabled;
        paused = enabled; // 同步暂停状态
        emit EmergencyModeToggled(enabled, reason);
    }
    
    /**
     * @dev 设置暂停状态（集成安全机制）
     * @param _paused 是否暂停
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit EmergencyStateChanged(_paused);
    }
    
    /**
     * @dev 设置每日限额
     */
    function setDailyLimit(uint256 newLimit) external onlyOwner {
        require(newLimit > 0, "Invalid limit");
        dailyLimit = newLimit;
    }
    
    /**
     * @dev 设置最小储备率
     */
    function setMinReserveRatio(uint256 newRatio) external onlyOwner {
        require(newRatio <= 10000, "Invalid ratio");
        minReserveRatio = newRatio;
    }
    
    /**
     * @dev 提取累积的ETH费用（仅owner）
     * @param amount 提取数量
     */
    function withdrawETHFees(uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        if (address(this).balance < amount) revert InsufficientLiquidity();
        
        emit FeesWithdrawn(msg.sender, amount, block.timestamp);
        
        payable(owner()).transfer(amount);
    }
    
    /**
     * @dev 提取所有ETH费用
     */
    function withdrawAllETHFees() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert InvalidAmount();
        
        emit FeesWithdrawn(msg.sender, balance, block.timestamp);
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev 移除快速兑换功能（安全考虑）
     */
    // receive() external payable {
    //     revert("Direct transfers not allowed");
    // }
    
    // fallback() external payable {
    //     revert("Direct transfers not allowed");
    // }
    
    /**
     * @dev 快速兑换函数（使用默认汇率）
     */
    function quickExchange() external payable {
        _quickExchange(); // 使用当前汇率
    }
    
    /**
     * @dev 内部快速兑换实现
     */
    function _quickExchange() internal nonReentrant whenNotPaused {
        if (msg.value == 0) revert InvalidAmount();
        if (msg.value > MAX_SINGLE_EXCHANGE) revert AmountExceedsLimit();
        
        // 安全检查
        _checkDailyLimits(msg.sender, msg.value);
        _checkReserveRequirement();
        
        // 使用当前汇率
        uint256 rate = currentRate;
        
        // 计算兑换数量
        uint256 feeAmount = calculateFee(msg.value);
        uint256 netAmount = msg.value - feeAmount;
        uint256 ccusdAmount = calculateCCUSD(netAmount, rate);
        
        // 检查合约CCUSD余额是否足够
        if (ccusdToken.balanceOf(address(this)) < ccusdAmount) {
            revert InsufficientLiquidity();
        }
        
        // 更新统计
        _updateStatistics(msg.value);
        totalCCUSDMinted += ccusdAmount;
        totalFeesCollected += feeAmount;
        totalExchangeCount++;
        
        // 执行兑换：直接转账给用户
        ccusdToken.safeTransfer(msg.sender, ccusdAmount);
        
        // 将ETH发送到储备池
        (bool success, ) = payable(address(reservePool)).call{value: netAmount}("");
        require(success, "ETH transfer to reserve failed");
        
        // 支付手续费
        if (feeAmount > 0) {
            (bool feeSuccess, ) = payable(feeRecipient).call{value: feeAmount}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        emit Exchanged(
            msg.sender,
            msg.value,
            ccusdAmount,
            feeAmount,
            rate,
            block.timestamp
        );
    }
        
    /**
     * @dev 为金库充值CCUSD流动性（仅owner）
     * @param amount 充值数量
     */
    function fundLiquidity(uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        
        bool success = ccusdToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        
        emit ContractBalanceUpdated(
            address(this).balance,
            ccusdToken.balanceOf(address(this))
        );
    }
    
    /**
     * @dev 回收CCUSD（仅owner，紧急情况下使用）
     * @param amount 回收数量
     */
    function recoverCCUSD(uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        if (ccusdToken.balanceOf(address(this)) < amount) {
            revert InsufficientCCUSDBalance();
        }
        
        bool success = ccusdToken.transfer(owner(), amount);
        if (!success) revert TransferFailed();
        
        emit ContractBalanceUpdated(
            address(this).balance,
            ccusdToken.balanceOf(address(this))
        );
    }
    
    /**
     * @dev 添加/移除汇率设置授权地址
     * @param account 账户地址
     * @param authorized 是否授权
     */
    function setAuthorizedRateSetter(address account, bool authorized) external onlyOwner {
        authorizedRateSetters[account] = authorized;
    }
    
    /**
     * @dev 更新储备池合约地址
     * @param newReservePool 新储备池地址
     */
    function setReservePool(address payable newReservePool) external onlyOwner {
        if (newReservePool == address(0)) revert InvalidAddress();
        
        reservePool = CCUSDReservePool(newReservePool);
    }
    
    /**
     * @dev 获取兑换估算信息
     * @param ethAmount ETH数量
     * @param customRate 自定义汇率（0表示使用当前汇率）
     * @return grossAmount 总CCUSD数量
     * @return feeAmount 手续费
     * @return netAmount 实际到账数量
     */
    function getExchangeEstimate(
        uint256 ethAmount,
        uint256 customRate
    ) external view returns (
        uint256 grossAmount,
        uint256 feeAmount,
        uint256 netAmount
    ) {
        uint256 rate = customRate > 0 ? customRate : currentRate;
        grossAmount = calculateCCUSD(ethAmount, rate);
        feeAmount = calculateFee(grossAmount);
        netAmount = grossAmount - feeAmount;
    }
    
    /**
     * @dev 获取合约统计信息
     * @return _totalEthExchanged 总兑换ETH数量
     * @return _totalCCUSDMinted 总铸造CCUSD数量
     * @return _totalExchangeCount 兑换次数
     * @return _totalFeesCollected 总手续费收入
     * @return contractAge 合约年龄
     */
    function getStats() external view returns (
        uint256 _totalEthExchanged,
        uint256 _totalCCUSDMinted,
        uint256 _totalExchangeCount,
        uint256 _totalFeesCollected,
        uint256 contractAge
    ) {
        return (
            totalEthExchanged,
            totalCCUSDMinted,
            totalExchangeCount,
            totalFeesCollected,
            block.timestamp - contractCreatedAt
        );
    }
    
    /**
     * @dev 获取合约余额
     * @return ethBalance ETH余额
     * @return ccusdBalance CCUSD余额
     */
    function getContractBalances() external view returns (uint256 ethBalance, uint256 ccusdBalance) {
        return (address(this).balance, ccusdToken.balanceOf(address(this)));
    }
    
    /**
     * @dev 检查地址是否为授权的汇率设置者
     * @param account 账户地址
     * @return bool 是否授权
     */
    function isAuthorizedRateSetter(address account) external view returns (bool) {
        return authorizedRateSetters[account];
    }
    
    /**
     * @dev 获取当前汇率信息
     * @return rate 当前汇率
     * @return enabled 是否启用动态汇率
     * @return reserveRatio 储备比率
     */
    function getRateInfo() external view returns (uint256 rate, bool enabled, uint256 reserveRatio) {
        return (currentRate, dynamicRateEnabled, reservePool.getReserveRatio());
    }
    
    /**
     * @dev 获取兑换信息
     */
    function getExchangeInfo() external view returns (
        uint256 currentExchangeRate,
        uint256 fee,
        uint256 availableETH,
        uint256 availableCCUSD,
        uint256 reserveRatio
    ) {
        return (
            currentRate,
            exchangeFeeRate,
            address(this).balance,
            ccusdToken.balanceOf(address(this)),
            reservePool.getReserveRatio()
        );
    }
    
    /**
     * @dev 预估兑换结果
     */
    function estimateExchange(uint256 ethAmount) external view returns (uint256 ccusdAmount, uint256 fee) {
        uint256 feeAmount = calculateFee(ethAmount);
        uint256 netAmount = ethAmount - feeAmount;
        ccusdAmount = calculateCCUSD(netAmount, currentRate);
        fee = feeAmount;
    }
    
    /**
     * @dev 确认固定汇率机制（1 CCUSD = 10 CC）
     * @notice 返回当前系统的固定汇率配置
     */
    function confirmFixedExchangeRate() external pure returns (
        uint256 ethToCCUSDRate,      // 1 ETH = 100 CCUSD
        uint256 ccusdToCCRate,       // 1 CCUSD = 10 CC
        uint256 ethToCCRate,         // 1 ETH = 1000 CC
        bool isFixedRate            // 固定汇率机制
    ) {
        return (
            100,                    // 1 ETH = 100 CCUSD
            10,                     // 1 CCUSD = 10 CC
            1000,                   // 1 ETH = 1000 CC (来自CCToken.sol)
            true                    // 启用固定汇率机制
        );
    }

    // 修饰符
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
}