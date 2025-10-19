// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CCUSDTokenVault
 * @dev CCUSD金库合约，管理用户兑换后的CCUSD存储和提取
 * @notice 用户兑换的CCUSD将存储在此合约中，12小时后可提取
 */
contract CCUSDTokenVault is Ownable, ReentrancyGuard {
    
    // 状态变量
    IERC20 public ccusdToken;
    
    struct UserDeposit {
        uint256 amount;          // 存款金额
        uint256 timestamp;       // 存款时间戳
        uint256 lockDuration;    // 锁定时长（默认12小时）
        bool isWithdrawn;        // 是否已提取
    }
    
    // 用户存款记录 mapping: 用户地址 => 存款ID => 存款信息
    mapping(address => mapping(uint256 => UserDeposit)) public userDeposits;
    
    // 用户存款数量
    mapping(address => uint256) public userDepositCount;
    
    // 用户总存款金额（包括已提取）
    mapping(address => uint256) public userTotalDeposited;
    
    // 用户总提取金额
    mapping(address => uint256) public userTotalWithdrawn;
    
    // 用户当前可提取余额
    mapping(address => uint256) public userAvailableBalance;
    
    // 全局统计
    uint256 public totalDeposits;
    uint256 public totalWithdrawals;
    uint256 public totalUsers;
    uint256 public contractCreatedAt;
    
    // 配置参数
    uint256 public constant DEFAULT_LOCK_DURATION = 12 hours; // 默认12小时锁定
    uint256 public constant MAX_LOCK_DURATION = 30 days;      // 最大锁定时长
    uint256 public constant MIN_LOCK_DURATION = 1 hours;      // 最小锁定时长
    
    // 管理员地址（可以执行特殊操作）
    address public admin;
    
    // 授权合约地址（如兑换合约）
    mapping(address => bool) public authorizedDepositors;
    
    // 事件定义
    event CCUSDDeposited(
        address indexed user,
        uint256 indexed depositId,
        uint256 amount,
        uint256 timestamp,
        uint256 lockDuration
    );
    
    event CCUSDWithdrawn(
        address indexed user,
        uint256 indexed depositId,
        uint256 amount,
        uint256 timestamp
    );
    
    event WithdrawalAvailable(
        address indexed user,
        uint256 indexed depositId,
        uint256 amount,
        uint256 availableAt
    );
    
    event LockDurationUpdated(uint256 newDuration);
    event AdminUpdated(address indexed newAdmin);
    event AuthorizedDepositorUpdated(address indexed depositor, bool authorized);
    event EmergencyWithdrawal(
        address indexed owner,
        uint256 amount,
        uint256 timestamp
    );
    
    // 自定义错误
    error InvalidAmount();
    error InsufficientBalance();
    error DepositNotFound();
    error DepositStillLocked();
    error AlreadyWithdrawn();
    error TransferFailed();
    error InvalidDuration();
    error UnauthorizedAccess();
    error InvalidAddress();
    
    /**
     * @dev 构造函数
     * @param _ccusdToken CCUSD代币地址
     */
    constructor(address _ccusdToken) Ownable(msg.sender) {
        ccusdToken = IERC20(_ccusdToken);
        admin = msg.sender;
        contractCreatedAt = block.timestamp;
        // 合约部署者默认为授权存款者
        authorizedDepositors[msg.sender] = true;
    }
    
    /**
     * @dev 存入CCUSD到金库（由兑换合约调用）
     * @param user 用户地址
     * @param amount 存入金额
     * @param lockDuration 锁定时长（可选，默认12小时）
     * @return depositId 存款ID
     */
    function deposit(
        address user,
        uint256 amount,
        uint256 lockDuration
    ) external nonReentrant returns (uint256 depositId) {
        if (msg.sender != owner() && !authorizedDepositors[msg.sender]) {
            revert UnauthorizedAccess();
        }
        if (amount == 0) revert InvalidAmount();
        if (lockDuration == 0) {
            lockDuration = DEFAULT_LOCK_DURATION;
        } else {
            if (lockDuration < MIN_LOCK_DURATION || lockDuration > MAX_LOCK_DURATION) {
                revert InvalidDuration();
            }
        }
        
        // 转移CCUSD到合约
        bool success = ccusdToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        
        // 生成存款ID
        depositId = userDepositCount[user] + 1;
        
        // 记录存款信息
        userDeposits[user][depositId] = UserDeposit({
            amount: amount,
            timestamp: block.timestamp,
            lockDuration: lockDuration,
            isWithdrawn: false
        });
        
        // 更新用户统计
        userDepositCount[user]++;
        userTotalDeposited[user] += amount;
        
        // 更新全局统计
        if (userDepositCount[user] == 1) {
            totalUsers++;
        }
        totalDeposits += amount;
        
        emit CCUSDDeposited(user, depositId, amount, block.timestamp, lockDuration);
        emit WithdrawalAvailable(user, depositId, amount, block.timestamp + lockDuration);
    }
    
    /**
     * @dev 提取到期的CCUSD存款
     * @param depositId 存款ID
     */
    function withdraw(uint256 depositId) external nonReentrant {
        UserDeposit storage userDeposit = userDeposits[msg.sender][depositId];
        
        if (depositId == 0 || depositId > userDepositCount[msg.sender]) {
            revert DepositNotFound();
        }
        if (userDeposit.isWithdrawn) revert AlreadyWithdrawn();
        if (block.timestamp < userDeposit.timestamp + userDeposit.lockDuration) {
            revert DepositStillLocked();
        }
        
        // 标记为已提取
        userDeposit.isWithdrawn = true;
        
        // 更新统计
        userTotalWithdrawn[msg.sender] += userDeposit.amount;
        totalWithdrawals += userDeposit.amount;
        
        emit CCUSDWithdrawn(msg.sender, depositId, userDeposit.amount, block.timestamp);
        
        // 转账给用户
        bool success = ccusdToken.transfer(msg.sender, userDeposit.amount);
        if (!success) revert TransferFailed();
    }
    
    /**
     * @dev 批量提取到期的CCUSD存款
     * @param depositIds 存款ID数组
     */
    function batchWithdraw(uint256[] calldata depositIds) external nonReentrant {
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < depositIds.length; i++) {
            uint256 depositId = depositIds[i];
            UserDeposit storage userDeposit = userDeposits[msg.sender][depositId];
            
            if (depositId == 0 || depositId > userDepositCount[msg.sender]) {
                continue; // 跳过无效的存款ID
            }
            if (userDeposit.isWithdrawn || block.timestamp < userDeposit.timestamp + userDeposit.lockDuration) {
                continue; // 跳过已提取或未到期的存款
            }
            
            // 标记为已提取
            userDeposit.isWithdrawn = true;
            
            // 累计提取金额
            totalAmount += userDeposit.amount;
            userTotalWithdrawn[msg.sender] += userDeposit.amount;
            totalWithdrawals += userDeposit.amount;
            
            emit CCUSDWithdrawn(msg.sender, depositId, userDeposit.amount, block.timestamp);
        }
        
        // 批量转账
        if (totalAmount > 0) {
            bool success = ccusdToken.transfer(msg.sender, totalAmount);
            if (!success) revert TransferFailed();
        }
    }
    
    /**
     * @dev 获取用户存款信息
     * @param user 用户地址
     * @param depositId 存款ID
     * @return amount 存款金额
     * @return timestamp 存款时间
     * @return lockDuration 锁定时长
     * @return isWithdrawn 是否已提取
     * @return canWithdraw 是否可以提取
     * @return availableAt 可提取时间
     */
    function getUserDepositInfo(
        address user, 
        uint256 depositId
    ) external view returns (
        uint256 amount,
        uint256 timestamp,
        uint256 lockDuration,
        bool isWithdrawn,
        bool canWithdraw,
        uint256 availableAt
    ) {
        UserDeposit storage userDeposit = userDeposits[user][depositId];
        
        if (depositId == 0 || depositId > userDepositCount[user]) {
            return (0, 0, 0, false, false, 0);
        }
        
        amount = userDeposit.amount;
        timestamp = userDeposit.timestamp;
        lockDuration = userDeposit.lockDuration;
        isWithdrawn = userDeposit.isWithdrawn;
        canWithdraw = !isWithdrawn && block.timestamp >= userDeposit.timestamp + userDeposit.lockDuration;
        availableAt = userDeposit.timestamp + userDeposit.lockDuration;
    }
    
    /**
     * @dev 获取用户可提取的总金额
     * @param user 用户地址
     * @return availableAmount 可提取金额
     */
    function getAvailableWithdrawAmount(address user) external view returns (uint256 availableAmount) {
        uint256 count = userDepositCount[user];
        for (uint256 i = 1; i <= count; i++) {
            UserDeposit storage userDeposit = userDeposits[user][i];
            if (!userDeposit.isWithdrawn && block.timestamp >= userDeposit.timestamp + userDeposit.lockDuration) {
                availableAmount += userDeposit.amount;
            }
        }
    }
    
    /**
     * @dev 获取用户总览信息
     * @param user 用户地址
     * @return totalDeposited 总存款金额
     * @return totalWithdrawn 总提取金额
     * @return depositCount 存款笔数
     * @return availableAmount 可提取金额
     */
    function getUserOverview(address user) external view returns (
        uint256 totalDeposited,
        uint256 totalWithdrawn,
        uint256 depositCount,
        uint256 availableAmount
    ) {
        totalDeposited = userTotalDeposited[user];
        totalWithdrawn = userTotalWithdrawn[user];
        depositCount = userDepositCount[user];
        
        // 计算可提取金额
        for (uint256 i = 1; i <= depositCount; i++) {
            UserDeposit storage userDeposit = userDeposits[user][i];
            if (!userDeposit.isWithdrawn && block.timestamp >= userDeposit.timestamp + userDeposit.lockDuration) {
                availableAmount += userDeposit.amount;
            }
        }
    }
    
    /**
     * @dev 获取金库统计信息
     * @return _totalDeposits 总存款金额
     * @return _totalWithdrawals 总提取金额
     * @return _totalUsers 总用户数
     * @return contractAge 合约年龄
     */
    function getVaultStats() external view returns (
        uint256 _totalDeposits,
        uint256 _totalWithdrawals,
        uint256 _totalUsers,
        uint256 contractAge
    ) {
        return (
            totalDeposits,
            totalWithdrawals,
            totalUsers,
            block.timestamp - contractCreatedAt
        );
    }
    
    /**
     * @dev 设置管理员地址
     * @param _admin 新管理员地址
     */
    function setAdmin(address _admin) external onlyOwner {
        if (_admin == address(0)) revert UnauthorizedAccess();
        admin = _admin;
        emit AdminUpdated(_admin);
    }
    
    /**
     * @dev 紧急提取函数（仅管理员）
     * @param amount 提取金额
     * @param recipient 接收地址
     */
    function emergencyWithdraw(uint256 amount, address recipient) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        if (ccusdToken.balanceOf(address(this)) < amount) revert InsufficientBalance();
        
        emit EmergencyWithdrawal(recipient, amount, block.timestamp);
        
        bool success = ccusdToken.transfer(recipient, amount);
        if (!success) revert TransferFailed();
    }
    
    /**
     * @dev 获取合约CCUSD余额
     * @return uint256 合约CCUSD余额
     */
    function getContractBalance() external view returns (uint256) {
        return ccusdToken.balanceOf(address(this));
    }
    
    /**
     * @dev 设置授权存款者地址
     * @param depositor 存款者地址
     * @param authorized 是否授权
     */
    function setAuthorizedDepositor(address depositor, bool authorized) external onlyOwner {
        if (depositor == address(0)) revert InvalidAddress();
        authorizedDepositors[depositor] = authorized;
        emit AuthorizedDepositorUpdated(depositor, authorized);
    }
    
    /**
     * @dev 为用户存入CCUSD（授权合约调用）
     * @param user 用户地址
     * @param amount 存入金额
     * @param lockDuration 锁定时长（可选，默认12小时）
     * @return success 是否成功
     */
    function depositForUser(
        address user,
        uint256 amount,
        uint256 lockDuration
    ) external nonReentrant returns (bool success) {
        if (msg.sender != owner() && !authorizedDepositors[msg.sender]) {
            revert UnauthorizedAccess();
        }
        if (amount == 0) revert InvalidAmount();
        if (user == address(0)) revert InvalidAddress();
        
        // 检查合约CCUSD余额是否足够（不需要transfer，因为调用者已经转账）
        if (ccusdToken.balanceOf(address(this)) < amount) {
            revert InsufficientBalance();
        }
        
        if (lockDuration == 0) {
            lockDuration = DEFAULT_LOCK_DURATION;
        } else {
            if (lockDuration < MIN_LOCK_DURATION || lockDuration > MAX_LOCK_DURATION) {
                revert InvalidDuration();
            }
        }
        
        // 生成存款ID
        uint256 depositId = userDepositCount[user] + 1;
        
        // 记录存款信息
        userDeposits[user][depositId] = UserDeposit({
            amount: amount,
            timestamp: block.timestamp,
            lockDuration: lockDuration,
            isWithdrawn: false
        });
        
        // 更新用户统计
        userDepositCount[user]++;
        userTotalDeposited[user] += amount;
        
        // 更新全局统计
        if (userDepositCount[user] == 1) {
            totalUsers++;
        }
        totalDeposits += amount;
        
        emit CCUSDDeposited(user, depositId, amount, block.timestamp, lockDuration);
        emit WithdrawalAvailable(user, depositId, amount, block.timestamp + lockDuration);
        
        return true;
    }
    
    /**
     * @dev 修饰符：检查是否为管理员
     */
    modifier onlyAdmin() {
        if (msg.sender != admin && msg.sender != owner()) revert UnauthorizedAccess();
        _;
    }
}