// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CCToken.sol";
import "./CustomerNFT.sol";
import "./ProviderNFT.sol";

/**
 * @title StakingPool
 * @dev Enhanced staking pool with proper funding and security features
 * @notice Supports ETH and CC token staking with NFT minting capabilities
 */
contract StakingPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeERC20 for CCToken;
    
    // Asset type enumeration
    enum AssetType { ETH, CC }
    
    // Staking data structure
    struct Stake {
        address user;
        AssetType assetType;
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        bool isForNFT; // True if staking to obtain/upgrade NFT
        CustomerNFT.Tier customerNftTier; // Customer NFT tier
        ProviderNFT.Tier providerNftTier; // Provider NFT tier
        bool isActive; // Whether stake is active
    }
    
    // Contract dependencies
    CCToken public ccToken;
    CustomerNFT public customerNFT;
    ProviderNFT public providerNFT;
    
    // Staking storage
    mapping(address => Stake[]) public userStakes;
    uint256 public totalETHStaked;
    uint256 public totalCCStaked;
    uint256 public baseAPR = 800; // 8% in basis points
    
    // Customer NFT staking requirements
    mapping(CustomerNFT.Tier => uint256) public customerNftEthRequirements;
    mapping(CustomerNFT.Tier => uint256) public customerNftCcRequirements;
    
    // Provider NFT staking requirements
    mapping(ProviderNFT.Tier => uint256) public providerNftStakeRequirements;
    
    // Configuration constants
    uint256 public constant MAX_APR = 2000; // 20% maximum APR
    uint256 public constant THRESHOLD_ETH_FOR_APR_REDUCTION = 10000 ether;
    uint256 public constant APR_REDUCTION_RATE = 500; // 5% reduction
    
    // Statistics
    uint256 public totalCustomerNftMinted;
    uint256 public totalProviderNftMinted;
    
    // Security controls
    bool public stakingPaused;
    uint256 public maxDailyStake;
    mapping(address => uint256) public dailyStaked;
    mapping(address => uint256) public lastStakeDay;
    
    // Events
    event Staked(address indexed user, AssetType assetType, uint256 amount, bool isForNFT);
    event Unstaked(address indexed user, AssetType assetType, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event CustomerNFTMintedFromStake(address indexed user, uint256 tokenId, CustomerNFT.Tier tier, uint256 ethAmount, uint256 ccAmount);
    event ProviderNFTMintedFromStake(address indexed user, uint256 tokenId, ProviderNFT.Tier tier, uint256 stakeAmount);
    event CustomerNFTDirectMinted(address indexed user, uint256 tokenId, CustomerNFT.Tier tier, uint256 ccusdAmount, uint256 ccAmount);
    event StakingPaused(bool paused);
    event MaxDailyStakeUpdated(uint256 newLimit);
    
    /**
     * @dev Constructor
     */
    constructor(
        address _ccToken,
        address _customerNFT,
        address _providerNFT
    ) Ownable(msg.sender) {
        require(_ccToken != address(0), "Invalid CC token address");
        require(_customerNFT != address(0), "Invalid CustomerNFT address");
        require(_providerNFT != address(0), "Invalid ProviderNFT address");
        
        ccToken = CCToken(_ccToken);
        customerNFT = CustomerNFT(_customerNFT);
        providerNFT = ProviderNFT(_providerNFT);
        
        // Initialize Customer NFT requirements
        customerNftEthRequirements[CustomerNFT.Tier.BRONZE] = 0.5 ether;
        customerNftEthRequirements[CustomerNFT.Tier.SILVER] = 1 ether;
        customerNftEthRequirements[CustomerNFT.Tier.GOLD] = 2 ether;
        customerNftEthRequirements[CustomerNFT.Tier.PLATINUM] = 5 ether;
        
        customerNftCcRequirements[CustomerNFT.Tier.BRONZE] = 100 * 10**18;
        customerNftCcRequirements[CustomerNFT.Tier.SILVER] = 200 * 10**18;
        customerNftCcRequirements[CustomerNFT.Tier.GOLD] = 500 * 10**18;
        customerNftCcRequirements[CustomerNFT.Tier.PLATINUM] = 1000 * 10**18;
        
        // Initialize Provider NFT requirements
        providerNftStakeRequirements[ProviderNFT.Tier.BRONZE] = 1000 * 10**18;
        providerNftStakeRequirements[ProviderNFT.Tier.SILVER] = 3000 * 10**18;
        providerNftStakeRequirements[ProviderNFT.Tier.GOLD] = 6000 * 10**18;
        providerNftStakeRequirements[ProviderNFT.Tier.PLATINUM] = 10000 * 10**18;
        
        // Initialize security parameters
        maxDailyStake = 100 ether; // 100 ETH daily limit per address
        stakingPaused = false;
    }
    
    /**
     * @dev Stake ETH tokens
     * @param isForNFT Whether staking is for NFT minting
     * @param customerTier Customer NFT tier (if applicable)
     * @param providerTier Provider NFT tier (if applicable)
     */
    function stakeETH(bool isForNFT, CustomerNFT.Tier customerTier, ProviderNFT.Tier providerTier) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        require(msg.value > 0, "Must send ETH to stake");
        
        uint256 amount = msg.value;
        
        // Check daily limits
        _checkDailyStakingLimits(msg.sender, amount);
        
        // Create stake record
        Stake memory newStake = Stake({
            user: msg.sender,
            assetType: AssetType.ETH,
            amount: amount,
            startTime: block.timestamp,
            lastClaimTime: block.timestamp,
            isForNFT: isForNFT,
            customerNftTier: customerTier,
            providerNftTier: providerTier,
            isActive: true
        });
        
        // Update tracking
        userStakes[msg.sender].push(newStake);
        totalETHStaked += amount;
        
        // Update daily stake tracking
        _updateDailyStake(msg.sender, amount);
        
        // Mint NFT if requested and requirements met
        if (isForNFT) {
            _handleNFTMinting(msg.sender, AssetType.ETH, amount, customerTier, providerTier);
        }
        
        emit Staked(msg.sender, AssetType.ETH, amount, isForNFT);
    }
    
    /**
     * @dev Stake CC tokens
     * @param amount Amount of CC tokens to stake
     * @param isForNFT Whether staking is for NFT minting
     * @param customerTier Customer NFT tier (if applicable)
     * @param providerTier Provider NFT tier (if applicable)
     */
    function stakeCC(uint256 amount, bool isForNFT, CustomerNFT.Tier customerTier, ProviderNFT.Tier providerTier) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(amount > 0, "Amount must be > 0");
        
        // Check daily limits (convert CC to ETH equivalent based on current rate)
        uint256 ethEquivalent = (amount * 1 ether) / (1000 * 10**18); // 1 CC = 0.001 ETH assumption
        _checkDailyStakingLimits(msg.sender, ethEquivalent);
        
        // Transfer CC tokens to this contract
        ccToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Create stake record
        Stake memory newStake = Stake({
            user: msg.sender,
            assetType: AssetType.CC,
            amount: amount,
            startTime: block.timestamp,
            lastClaimTime: block.timestamp,
            isForNFT: isForNFT,
            customerNftTier: customerTier,
            providerNftTier: providerTier,
            isActive: true
        });
        
        // Update tracking
        userStakes[msg.sender].push(newStake);
        totalCCStaked += amount;
        
        // Update daily stake tracking
        _updateDailyStake(msg.sender, ethEquivalent);
        
        // Mint NFT if requested and requirements met
        if (isForNFT) {
            _handleNFTMinting(msg.sender, AssetType.CC, amount, customerTier, providerTier);
        }
        
        emit Staked(msg.sender, AssetType.CC, amount, isForNFT);
    }
    
    /**
     * @dev Unstake assets
     * @param stakeIndex Index of stake to unstake
     */
    function unstake(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        Stake storage stake = userStakes[msg.sender][stakeIndex];
        require(stake.isActive, "Stake already inactive");
        require(stake.isForNFT == false || block.timestamp >= stake.startTime + 30 days, "NFT stake locked for 30 days");
        
        // Deactivate stake
        stake.isActive = false;
        
        // Calculate rewards
        uint256 rewards = _calculateRewards(stake);
        
        // Transfer principal
        if (stake.assetType == AssetType.ETH) {
            totalETHStaked -= stake.amount;
            (bool success, ) = payable(msg.sender).call{value: stake.amount}("");
            require(success, "ETH transfer failed");
        } else {
            totalCCStaked -= stake.amount;
            ccToken.safeTransfer(msg.sender, stake.amount);
        }
        
        // Transfer rewards if available
        if (rewards > 0 && ccToken.balanceOf(address(this)) >= rewards) {
            ccToken.safeTransfer(msg.sender, rewards);
            emit RewardsClaimed(msg.sender, rewards);
        }
        
        emit Unstaked(msg.sender, stake.assetType, stake.amount);
    }
    
    /**
     * @dev Claim staking rewards
     * @param stakeIndex Index of stake to claim rewards for
     */
    function claimRewards(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        Stake storage stake = userStakes[msg.sender][stakeIndex];
        require(stake.isActive, "Stake not active");
        
        uint256 rewards = _calculateRewards(stake);
        require(rewards > 0, "No rewards available");
        require(ccToken.balanceOf(address(this)) >= rewards, "Insufficient reward tokens");
        
        // Update last claim time
        stake.lastClaimTime = block.timestamp;
        
        // Transfer rewards
        ccToken.safeTransfer(msg.sender, rewards);
        
        emit RewardsClaimed(msg.sender, rewards);
    }
    
    /**
     * @dev Calculate staking rewards
     * @param stake Stake data structure
     * @return rewards Amount of CC rewards
     */
    function _calculateRewards(Stake memory stake) internal view returns (uint256) {
        uint256 timeElapsed = block.timestamp - stake.lastClaimTime;
        if (timeElapsed == 0) return 0;
        
        uint256 currentAPR = _getCurrentAPR();
        
        if (stake.assetType == AssetType.ETH) {
            // Convert ETH to CC equivalent for calculation
            uint256 ccEquivalent = (stake.amount * 1000 * 10**18) / 1 ether;
            return (ccEquivalent * currentAPR * timeElapsed) / (10000 * 365 days);
        } else {
            return (stake.amount * currentAPR * timeElapsed) / (10000 * 365 days);
        }
    }
    
    /**
     * @dev Get current APR with potential reductions
     * @return Current APR in basis points
     */
    function _getCurrentAPR() internal view returns (uint256) {
        uint256 apr = baseAPR;
        
        // Reduce APR if too much ETH is staked
        if (totalETHStaked > THRESHOLD_ETH_FOR_APR_REDUCTION) {
            uint256 reduction = ((totalETHStaked - THRESHOLD_ETH_FOR_APR_REDUCTION) * APR_REDUCTION_RATE) / THRESHOLD_ETH_FOR_APR_REDUCTION;
            apr = apr > reduction ? apr - reduction : 0;
        }
        
        return apr;
    }
    
    /**
     * @dev Check daily staking limits
     * @param user Address staking
     * @param ethEquivalent ETH equivalent amount
     */
    function _checkDailyStakingLimits(address user, uint256 ethEquivalent) internal view {
        uint256 currentDay = block.timestamp / 86400;
        uint256 userLastDay = lastStakeDay[user] / 86400;
        
        if (currentDay != userLastDay) {
            return; // New day, reset limit
        }
        
        require(
            dailyStaked[user] + ethEquivalent <= maxDailyStake,
            "Daily staking limit exceeded"
        );
    }
    
    /**
     * @dev Update daily staking tracking
     * @param user Address staking
     * @param ethEquivalent ETH equivalent amount
     */
    function _updateDailyStake(address user, uint256 ethEquivalent) internal {
        uint256 currentDay = block.timestamp / 86400;
        uint256 userLastDay = lastStakeDay[user] / 86400;
        
        if (currentDay != userLastDay) {
            dailyStaked[user] = ethEquivalent;
            lastStakeDay[user] = block.timestamp;
        } else {
            dailyStaked[user] += ethEquivalent;
        }
    }
    
    /**
     * @dev Handle NFT minting logic
     * @param user Address requesting NFT
     * @param assetType Asset type staked
     * @param amount Amount staked
     * @param customerTier Customer NFT tier
     * @param providerTier Provider NFT tier
     */
    function _handleNFTMinting(address user, AssetType assetType, uint256 amount, CustomerNFT.Tier customerTier, ProviderNFT.Tier providerTier) internal {
        // Handle Customer NFT minting
        if (customerTier != CustomerNFT.Tier.NONE) {
            _mintCustomerNFT(user, assetType, amount, customerTier);
        }
        
        // Handle Provider NFT minting
        if (providerTier != ProviderNFT.Tier.NONE) {
            _mintProviderNFT(user, amount, providerTier);
        }
    }
    
    /**
     * @dev Mint Customer NFT
     */
    function _mintCustomerNFT(address user, AssetType assetType, uint256 amount, CustomerNFT.Tier tier) internal {
        // Check if user already has Customer NFT
        if (customerNFT.balanceOf(user) > 0) {
            revert("User already has Customer NFT");
        }
        
        // Check requirements
        if (assetType == AssetType.ETH) {
            require(amount >= customerNftEthRequirements[tier], "Insufficient ETH for Customer NFT tier");
        } else {
            require(amount >= customerNftCcRequirements[tier], "Insufficient CC for Customer NFT tier");
        }
        
        // Mint NFT
        uint256 tokenId = customerNFT.publicMintNFT(user, tier);
        totalCustomerNftMinted++;
        
        if (assetType == AssetType.ETH) {
            emit CustomerNFTMintedFromStake(user, tokenId, tier, amount, 0);
        } else {
            emit CustomerNFTMintedFromStake(user, tokenId, tier, 0, amount);
        }
    }
    
    /**
     * @dev Mint Provider NFT
     */
    function _mintProviderNFT(address user, uint256 amount, ProviderNFT.Tier tier) internal {
        // Check if user already has Provider NFT
        if (providerNFT.balanceOf(user) > 0) {
            revert("User already has Provider NFT");
        }
        
        // Check requirements
        require(amount >= providerNftStakeRequirements[tier], "Insufficient stake for Provider NFT tier");
        
        // Mint NFT
        uint256 tokenId = providerNFT.mintNFT(user, tier, 1); // Default 1 device for initial mint
        totalProviderNftMinted++;
        
        emit ProviderNFTMintedFromStake(user, tokenId, tier, amount);
    }
    
    /**
     * @dev Get user's stake information
     * @param user Address to query
     * @return stakes Array of stake data
     */
    function getUserStakes(address user) external view returns (Stake[] memory) {
        return userStakes[user];
    }
    
    /**
     * @dev Get current APR for users
     * @return Current APR in basis points
     */
    function getCurrentAPR() external view returns (uint256) {
        return _getCurrentAPR();
    }
    
    /**
     * @dev Check contract's CC token balance for rewards
     * @return Available CC tokens for rewards
     */
    function getAvailableRewards() external view returns (uint256) {
        return ccToken.balanceOf(address(this));
    }
    
    /**
     * @dev Get user's total pending rewards from all active stakes
     * @param user Address to query
     * @return Total pending rewards in CC tokens
     */
    function getUserPendingRewards(address user) external view returns (uint256) {
        uint256 totalRewards = 0;
        Stake[] memory stakes = userStakes[user];
        
        for (uint256 i = 0; i < stakes.length; i++) {
            if (stakes[i].isActive) {
                totalRewards += _calculateRewards(stakes[i]);
            }
        }
        
        return totalRewards;
    }
    
    /**
     * @dev Set base APR (owner only)
     * @param newAPR New APR in basis points (max 20%)
     */
    function setBaseAPR(uint256 newAPR) external onlyOwner {
        require(newAPR <= MAX_APR, "APR too high");
        baseAPR = newAPR;
    }
    
    /**
     * @dev Pause/unpause staking (owner only)
     * @param paused Whether to pause staking
     */
    function setStakingPaused(bool paused) external onlyOwner {
        stakingPaused = paused;
        emit StakingPaused(paused);
    }
    
    /**
     * @dev Set max daily stake limit (owner only)
     * @param limit New daily limit in ETH
     */
    function setMaxDailyStake(uint256 limit) external onlyOwner {
        maxDailyStake = limit;
        emit MaxDailyStakeUpdated(limit);
    }
    
    /**
     * @dev Emergency withdrawal of rewards (owner only)
     * @param amount Amount of CC tokens to withdraw
     */
    function emergencyWithdrawRewards(uint256 amount) external onlyOwner {
        require(ccToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        ccToken.safeTransfer(owner(), amount);
    }
    
    // Modifiers
    modifier whenNotPaused() {
        require(!stakingPaused, "Staking is paused");
        _;
    }
}