// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CCToken.sol";
import "./ProviderNFT.sol";

/**
 * @title ProviderIncentive
 * @dev Enhanced provider incentive system with proper funding and security
 * @notice Daily reward distribution system for compute providers
 */
contract ProviderIncentive is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeERC20 for CCToken;
    
    // Contract dependencies
    CCToken public ccToken;
    ProviderNFT public providerNFT;
    
    // Configuration parameters
    uint256 public dailyReleaseRate = 1095890 * 10**18; // ~400M CC / 365 days
    uint256 public lastDistributionTime;
    uint256 public totalDistributed;
    
    // Provider reward tracking
    mapping(address => uint256) public lastClaimTime;
    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public totalEarned;
    
    // Performance bonuses
    mapping(ProviderNFT.Tier => uint256) public tierBonusRates;
    
    // Security controls
    bool public distributionPaused;
    uint256 public maxDailyClaim;
    mapping(address => uint256) public dailyClaimed;
    mapping(address => uint256) public lastClaimDay;
    
    // Emergency controls
    bool public emergencyMode;
    address public emergencyController;
    
    // Statistics
    uint256 public totalProviders;
    uint256 public activeProviders;
    uint256 public avgPerformanceScore;
    
    // Events
    event RewardsClaimed(address indexed provider, uint256 amount);
    event DailyDistributed(uint256 amount, uint256 activeProviders);
    event DistributionPaused(bool paused);
    event EmergencyStateChanged(bool emergency);
    event EmergencyControllerSet(address controller);
    
    /**
     * @dev Constructor
     * @param _ccToken CC token address
     * @param _providerNFT Provider NFT address
     */
    constructor(
        address _ccToken,
        address _providerNFT
    ) Ownable(msg.sender) {
        require(_ccToken != address(0), "Invalid CC token");
        require(_providerNFT != address(0), "Invalid ProviderNFT");
        
        ccToken = CCToken(_ccToken);
        providerNFT = ProviderNFT(_providerNFT);
        lastDistributionTime = block.timestamp;
        
        // Initialize tier bonus rates (basis points)
        tierBonusRates[ProviderNFT.Tier.BRONZE] = 10500;   // 105%
        tierBonusRates[ProviderNFT.Tier.SILVER] = 11200;   // 112%
        tierBonusRates[ProviderNFT.Tier.GOLD] = 11800;     // 118%
        tierBonusRates[ProviderNFT.Tier.PLATINUM] = 12500; // 125%
        
        // Initialize security parameters
        maxDailyClaim = dailyReleaseRate; // Can't claim more than daily release
        distributionPaused = false;
        emergencyMode = false;
        emergencyController = msg.sender;
    }
    
    /**
     * @dev Claim rewards for provider
     */
    function claimRewards() external nonReentrant whenNotPaused {
        require(msg.sender != address(0), "Invalid provider");
        
        // Update pending rewards
        _updatePendingRewards(msg.sender);
        
        uint256 claimableAmount = pendingRewards[msg.sender];
        require(claimableAmount > 0, "No rewards to claim");
        
        // Check daily limits
        _checkDailyClaimLimits(msg.sender, claimableAmount);
        
        // Check available balance
        uint256 availableBalance = ccToken.balanceOf(address(this));
        uint256 actualClaimAmount = claimableAmount > availableBalance ? availableBalance : claimableAmount;
        
        // Update state
        pendingRewards[msg.sender] -= actualClaimAmount;
        totalEarned[msg.sender] += actualClaimAmount;
        totalDistributed += actualClaimAmount;
        lastClaimTime[msg.sender] = block.timestamp;
        
        // Update daily claim tracking
        _updateDailyClaim(msg.sender, actualClaimAmount);
        
        // Transfer rewards
        ccToken.safeTransfer(msg.sender, actualClaimAmount);
        
        emit RewardsClaimed(msg.sender, actualClaimAmount);
    }
    
    /**
     * @dev Update pending rewards for a provider
     * @param provider Provider address
     */
    function _updatePendingRewards(address provider) internal {
        // Get provider's NFT and tier
        uint256 nftId = providerNFT.providerToNft(provider);
        if (nftId == 0) return;
        
        (ProviderNFT.Tier tier, uint256 bonusMultiplier,) = providerNFT.getNFTInfo(nftId);
        if (tier == ProviderNFT.Tier.NONE) return;
        
        // Calculate time elapsed since last claim
        uint256 timeElapsed = block.timestamp - lastClaimTime[provider];
        if (timeElapsed == 0) return;
        
        // Calculate base daily reward
        uint256 baseDailyReward = dailyReleaseRate / 100; // Assume ~100 active providers
        uint256 timeShare = (timeElapsed * baseDailyReward) / 1 days;
        
        // Apply tier bonus and NFT bonus multiplier
        uint256 tierBonus = tierBonusRates[tier];
        uint256 performanceBonus = providerNFT.getPerformanceScore(provider);
        uint256 nftBonusMultiplier = bonusMultiplier; // Use the bonusMultiplier from NFT
        uint256 totalMultiplier = (tierBonus * performanceBonus * nftBonusMultiplier) / (BASE_PERFORMANCE_SCORE * 10000);
        
        uint256 earnedRewards = (timeShare * totalMultiplier) / 10000;
        
        // Add to pending rewards
        pendingRewards[provider] += earnedRewards;
    }
    
    /**
     * @dev Distribute daily rewards to active providers
     * @dev Can be called by anyone to distribute daily rewards
     */
    function distributeDailyRewards() external nonReentrant whenNotPaused {
        require(block.timestamp >= lastDistributionTime + 1 days, "Too early for distribution");
        
        uint256 availableBalance = ccToken.balanceOf(address(this));
        require(availableBalance >= dailyReleaseRate, "Insufficient funds for distribution");
        
        // Get active providers count
        activeProviders = _getActiveProviderCount();
        if (activeProviders == 0) return;
        
        // Calculate per-provider share
        uint256 perProviderShare = dailyReleaseRate / activeProviders;
        
        // This is a simplified distribution. In production, you'd want to
        // calculate based on actual performance and activity
        _updateActiveProvidersRewards(perProviderShare);
        
        lastDistributionTime = block.timestamp;
        totalDistributed += dailyReleaseRate;
        
        emit DailyDistributed(dailyReleaseRate, activeProviders);
    }
    
    /**
     * @dev Update rewards for all active providers
     * @param perProviderShare Base reward per provider
     */
    function _updateActiveProvidersRewards(uint256 perProviderShare) internal {
        // In a real implementation, you'd iterate through active providers
        // For now, we'll just note that rewards would be calculated based on:
        // - Provider tier
        // - Performance score
        // - Recent activity
        // - Job completion rate
    }
    
    /**
     * @dev Get count of active providers
     * @return count Number of active providers
     */
    function _getActiveProviderCount() internal pure returns (uint256) {
        // Simplified count - in production, you'd track actual active providers
        return 100; // Assume 100 active providers
    }
    
    /**
     * @dev Check daily claim limits
     * @param provider Provider address
     * @param amount Amount to claim
     */
    function _checkDailyClaimLimits(address provider, uint256 amount) internal view {
        uint256 currentDay = block.timestamp / 86400;
        uint256 providerLastDay = lastClaimDay[provider] / 86400;
        
        if (currentDay != providerLastDay) {
            return; // New day, reset limit
        }
        
        require(
            dailyClaimed[provider] + amount <= maxDailyClaim,
            "Daily claim limit exceeded"
        );
    }
    
    /**
     * @dev Update daily claim tracking
     * @param provider Provider address
     * @param amount Amount claimed
     */
    function _updateDailyClaim(address provider, uint256 amount) internal {
        uint256 currentDay = block.timestamp / 86400;
        uint256 providerLastDay = lastClaimDay[provider] / 86400;
        
        if (currentDay != providerLastDay) {
            dailyClaimed[provider] = amount;
            lastClaimDay[provider] = block.timestamp;
        } else {
            dailyClaimed[provider] += amount;
        }
    }
    
    /**
     * @dev Get provider's pending rewards
     * @param provider Provider address
     * @return amount Pending reward amount
     */
    function getPendingRewards(address provider) external view returns (uint256) {
        uint256 nftId = providerNFT.providerToNft(provider);
        if (nftId == 0) return 0;
        
        (ProviderNFT.Tier tier, uint256 bonusMultiplier,) = providerNFT.getNFTInfo(nftId);
        if (tier == ProviderNFT.Tier.NONE) return 0;
        
        // Calculate current pending rewards
        uint256 timeElapsed = block.timestamp - lastClaimTime[provider];
        if (timeElapsed == 0) return pendingRewards[provider];
        
        return _calculatePendingRewards(provider, tier, bonusMultiplier, timeElapsed);
    }
    
    /**
     * @dev Internal helper to calculate pending rewards
     */
    function _calculatePendingRewards(
        address provider,
        ProviderNFT.Tier tier,
        uint256 bonusMultiplier,
        uint256 timeElapsed
    ) internal view returns (uint256) {
        uint256 baseDailyReward = dailyReleaseRate / 100;
        uint256 timeShare = (timeElapsed * baseDailyReward) / 1 days;
        uint256 tierBonus = tierBonusRates[tier];
        uint256 performanceBonus = providerNFT.getPerformanceScore(provider);
        uint256 nftBonusMultiplier = bonusMultiplier;
        uint256 totalMultiplier = (tierBonus * performanceBonus * nftBonusMultiplier) / (BASE_PERFORMANCE_SCORE * 10000);
        uint256 earnedRewards = (timeShare * totalMultiplier) / 10000;
        
        return pendingRewards[provider] + earnedRewards;
    }
    
    /**
     * @dev Get provider statistics
     * @param provider Provider address
     * @return pending Pending rewards
     * @return earned Total earned rewards
     * @return lastClaim Last claim timestamp
     * @return canClaim Whether provider can claim
     */
    function getProviderStats(address provider) external view returns (
        uint256 pending,
        uint256 earned,
        uint256 lastClaim,
        bool canClaim
    ) {
        return (
            pendingRewards[provider],
            totalEarned[provider],
            this.lastClaimTime(provider),
            pendingRewards[provider] > 0 && !distributionPaused
        );
    }
    
    /**
     * @dev Get contract statistics
     * @return distributed Total distributed rewards
     * @return availableBalance Available CC balance
     * @return dailyRate Current daily release rate
     * @return providers Number of active providers
     */
    function getContractStats() external view returns (
        uint256 distributed,
        uint256 availableBalance,
        uint256 dailyRate,
        uint256 providers
    ) {
        return (
            this.totalDistributed(),
            ccToken.balanceOf(address(this)),
            this.dailyReleaseRate(),
            this.activeProviders()
        );
    }
    
    /**
     * @dev Set daily release rate (owner only)
     * @param newRate New daily release rate
     */
    function setDailyReleaseRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Invalid rate");
        dailyReleaseRate = newRate;
    }
    
    /**
     * @dev Set tier bonus rates (owner only)
     * @param tier Provider NFT tier
     * @param bonusRate Bonus rate in basis points
     */
    function setTierBonusRate(ProviderNFT.Tier tier, uint256 bonusRate) external onlyOwner {
        require(bonusRate >= 10000 && bonusRate <= 20000, "Invalid bonus rate");
        tierBonusRates[tier] = bonusRate;
    }
    
    /**
     * @dev Set max daily claim (owner only)
     * @param maxClaim New maximum daily claim
     */
    function setMaxDailyClaim(uint256 maxClaim) external onlyOwner {
        require(maxClaim > 0, "Invalid max claim");
        maxDailyClaim = maxClaim;
    }
    
    /**
     * @dev Pause/unpause distribution (owner only)
     * @param paused Whether to pause distribution
     */
    function setDistributionPaused(bool paused) external onlyOwner {
        distributionPaused = paused;
        emit DistributionPaused(paused);
    }
    
    /**
     * @dev Set emergency controller (owner only)
     * @param controller Emergency controller address
     */
    function setEmergencyController(address controller) external onlyOwner {
        require(controller != address(0), "Invalid controller");
        emergencyController = controller;
        emit EmergencyControllerSet(controller);
    }
    
    /**
     * @dev Set emergency mode (owner or emergency controller only)
     * @param emergency Whether to activate emergency mode
     */
    function setEmergencyMode(bool emergency) external {
        require(
            msg.sender == owner() || msg.sender == emergencyController,
            "Not authorized"
        );
        emergencyMode = emergency;
        emit EmergencyStateChanged(emergency);
    }
    
    /**
     * @dev Emergency withdrawal of rewards (owner or emergency controller only)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external {
        require(
            msg.sender == owner() || msg.sender == emergencyController,
            "Not authorized"
        );
        require(emergencyMode, "Not in emergency mode");
        require(ccToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        
        ccToken.safeTransfer(owner(), amount);
    }
    
    /**
     * @dev Fund contract with CC tokens (owner only)
     * @param amount Amount to fund
     */
    function fundContract(uint256 amount) external onlyOwner {
        ccToken.safeTransferFrom(msg.sender, address(this), amount);
    }
    
    // Constants
    uint256 public constant BASE_PERFORMANCE_SCORE = 1000; // 100% base score
    
    // Modifiers
    modifier whenNotPaused() {
        require(!distributionPaused && !emergencyMode, "Distribution paused or emergency mode");
        _;
    }
}