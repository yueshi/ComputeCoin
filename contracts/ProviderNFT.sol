// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProviderNFT
 * @dev Enhanced NFT for compute providers with proper funding mechanism
 * @notice Provides reward multipliers and benefits for compute providers
 */
contract ProviderNFT is ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // NFT tier enumeration
    enum Tier { NONE, BRONZE, SILVER, GOLD, PLATINUM }
    
    // NFT data structure
    struct ProviderNFTData {
        Tier tier;
        uint256 activationTime;
        uint256 performanceScore;
        uint256 completedJobs;
        uint256 totalRewards;
        bool isActive;
    }
    
    // Storage mappings
    mapping(uint256 => ProviderNFTData) public nftData;
    mapping(address => uint256) public providerToNft;
    uint256 public nextTokenId = 1;
    
    // Bonus multiplier configuration (basis points, 10000 = 100%)
    mapping(Tier => uint256) public tierBonusMultipliers;
    
    // Device requirements for tiers
    mapping(Tier => uint256) public tierDeviceRequirements;
    
    // Token contract addresses
    address public ccusdToken;
    IERC20 public ccToken;
    address public stakingPool;
    address public providerIncentive;
    
    // Performance tracking
    mapping(uint256 => uint256) public lastJobCompletionTime;
    mapping(uint256 => mapping(uint256 => bool)) public hasClaimedDailyReward;
    uint256 public constant PERFORMANCE_DECAY_PERIOD = 30 days;
    uint256 public constant BASE_PERFORMANCE_SCORE = 1000; // 100% base score
    
    // Security controls
    bool public mintingPaused;
    uint256 public maxNFTsPerTier;
    mapping(Tier => uint256) public tierMintedCount;
    
    // Events
    event NFTMinted(address indexed to, uint256 indexed tokenId, Tier tier);
    event JobCompleted(uint256 indexed tokenId, uint256 reward, uint256 performanceScore);
    event PerformanceUpdated(uint256 indexed tokenId, uint256 newScore);
    event NFTUpgraded(uint256 indexed tokenId, Tier newTier, Tier oldTier);
    event MintingPaused(bool paused);
    event MaxNFTsPerTierUpdated(uint256 newLimit);
    
    /**
     * @dev Constructor
     */
    constructor(
        address _ccusdToken,
        address _ccToken
    ) ERC721("Provider NFT", "PNFT") Ownable(msg.sender) {
        require(_ccusdToken != address(0), "Invalid CCUSD token");
        require(_ccToken != address(0), "Invalid CC token");
        
        ccusdToken = _ccusdToken;
        ccToken = IERC20(_ccToken);
        
        // Initialize tier bonus multipliers (basis points)
        tierBonusMultipliers[Tier.BRONZE] = 10500;   // 105%
        tierBonusMultipliers[Tier.SILVER] = 11200;   // 112%
        tierBonusMultipliers[Tier.GOLD] = 11800;     // 118%
        tierBonusMultipliers[Tier.PLATINUM] = 12500; // 125%
        
        // Initialize device requirements
        tierDeviceRequirements[Tier.BRONZE] = 1;     // 1 device
        tierDeviceRequirements[Tier.SILVER] = 3;     // 3 devices
        tierDeviceRequirements[Tier.GOLD] = 5;       // 5 devices
        tierDeviceRequirements[Tier.PLATINUM] = 10;   // 10 devices
        
        // Initialize security parameters
        maxNFTsPerTier = 5000; // Maximum 5,000 NFTs per tier
        mintingPaused = false;
    }
    
    /**
     * @dev Mint new Provider NFT
     * @param to Address to mint NFT to
     * @param tier NFT tier to mint
     * @param deviceCount Number of devices provider has
     * @return tokenId The ID of the minted NFT
     */
    function mintNFT(address to, Tier tier, uint256 deviceCount) external nonReentrant whenNotPaused onlyMinter returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(tier != Tier.NONE, "Invalid tier");
        require(providerToNft[to] == 0, "Provider already has NFT");
        require(deviceCount >= tierDeviceRequirements[tier], "Insufficient devices");
        require(tierMintedCount[tier] < maxNFTsPerTier, "Tier limit reached");
        
        uint256 tokenId = nextTokenId++;
        
        // Create NFT data
        nftData[tokenId] = ProviderNFTData({
            tier: tier,
            activationTime: block.timestamp,
            performanceScore: BASE_PERFORMANCE_SCORE,
            completedJobs: 0,
            totalRewards: 0,
            isActive: true
        });
        
        // Update tracking
        providerToNft[to] = tokenId;
        tierMintedCount[tier]++;
        
        // Mint NFT
        _safeMint(to, tokenId);
        
        emit NFTMinted(to, tokenId, tier);
        return tokenId;
    }
    
    /**
     * @dev Record job completion
     * @param tokenId NFT token ID
     * @param reward Reward amount received
     * @param customerRating Customer rating (1-5)
     */
    function completeJob(uint256 tokenId, uint256 reward, uint256 customerRating) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(customerRating >= 1 && customerRating <= 5, "Invalid rating");
        require(nftData[tokenId].isActive, "NFT not active");
        
        ProviderNFTData storage nft = nftData[tokenId];
        
        // Update job statistics
        nft.completedJobs++;
        nft.totalRewards += reward;
        lastJobCompletionTime[tokenId] = block.timestamp;
        
        // Calculate new performance score
        uint256 ratingBonus = customerRating * 200; // Up to 1000 bonus for 5-star rating
        uint256 newScore = (nft.performanceScore * 9 + BASE_PERFORMANCE_SCORE + ratingBonus) / 10;
        
        // Apply decay if inactive
        uint256 timeSinceLastJob = block.timestamp - lastJobCompletionTime[tokenId];
        if (timeSinceLastJob > PERFORMANCE_DECAY_PERIOD) {
            uint256 decayAmount = (timeSinceLastJob - PERFORMANCE_DECAY_PERIOD) / 1 days;
            newScore = newScore > decayAmount ? newScore - decayAmount : 100;
        }
        
        nft.performanceScore = newScore;
        
        emit JobCompleted(tokenId, reward, newScore);
        emit PerformanceUpdated(tokenId, newScore);
    }
    
    /**
     * @dev Upgrade NFT tier
     * @param tokenId NFT token ID to upgrade
     * @param newTier New tier to upgrade to
     * @param deviceCount New device count
     */
    function upgradeTier(uint256 tokenId, Tier newTier, uint256 deviceCount) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(newTier > nftData[tokenId].tier, "Not an upgrade");
        require(deviceCount >= tierDeviceRequirements[newTier], "Insufficient devices");
        
        ProviderNFTData storage nft = nftData[tokenId];
        
        // Check upgrade requirements
        uint256 upgradeCost = _getUpgradeCost(nft.tier, newTier);
        require(ccToken.balanceOf(msg.sender) >= upgradeCost, "Insufficient CC for upgrade");
        
        // Transfer upgrade cost
        ccToken.safeTransferFrom(msg.sender, address(this), upgradeCost);
        
        // Update tier
        Tier oldTier = nft.tier;
        nft.tier = newTier;
        
        emit NFTUpgraded(tokenId, newTier, oldTier);
    }
    
    /**
     * @dev Get bonus multiplier for provider
     * @param provider Address to check
     * @return multiplier Bonus multiplier in basis points
     */
    function getBonusMultiplier(address provider) external view returns (uint256) {
        uint256 tokenId = providerToNft[provider];
        if (tokenId == 0) return 10000; // 100% (no bonus)
        
        ProviderNFTData storage nft = nftData[tokenId];
        if (!nft.isActive) return 10000;
        
        // Base multiplier from tier
        uint256 baseMultiplier = tierBonusMultipliers[nft.tier];
        
        // Performance bonus (up to 20% additional)
        uint256 performanceBonus = ((nft.performanceScore - BASE_PERFORMANCE_SCORE) * 200) / BASE_PERFORMANCE_SCORE;
        
        return baseMultiplier + performanceBonus;
    }
    
    /**
     * @dev Get provider performance score
     * @param provider Address to check
     * @return score Performance score
     */
    function getPerformanceScore(address provider) external view returns (uint256) {
        uint256 tokenId = providerToNft[provider];
        if (tokenId == 0) return 0;
        
        return nftData[tokenId].performanceScore;
    }
    
    /**
     * @dev Get provider statistics
     * @param provider Address to check
     * @return tier Provider tier
     * @return completedJobs Number of completed jobs
     * @return totalRewards Total rewards earned
     * @return performanceScore Current performance score
     */
    function getProviderStats(address provider) external view returns (
        Tier tier,
        uint256 completedJobs,
        uint256 totalRewards,
        uint256 performanceScore
    ) {
        uint256 tokenId = providerToNft[provider];
        if (tokenId == 0) return (Tier.NONE, 0, 0, 0);
        
        ProviderNFTData storage nft = nftData[tokenId];
        return (nft.tier, nft.completedJobs, nft.totalRewards, nft.performanceScore);
    }
    
    /**
     * @dev Get NFT tier information
     * @param tokenId NFT token ID
     * @return tier NFT tier
     * @return bonusMultiplier Bonus multiplier
     * @return deviceRequirement Required devices
     */
    function getNFTInfo(uint256 tokenId) external view returns (Tier tier, uint256 bonusMultiplier, uint256 deviceRequirement) {
        ProviderNFTData storage nft = nftData[tokenId];
        return (nft.tier, tierBonusMultipliers[nft.tier], tierDeviceRequirements[nft.tier]);
    }
    
    /**
     * @dev Set staking pool address (owner only)
     * @param _stakingPool Staking pool contract address
     */
    function setStakingPool(address _stakingPool) external onlyOwner {
        stakingPool = _stakingPool;
    }
    
    /**
     * @dev Set provider incentive contract address (owner only)
     * @param _providerIncentive Provider incentive contract address
     */
    function setProviderIncentive(address _providerIncentive) external onlyOwner {
        providerIncentive = _providerIncentive;
    }
    
    /**
     * @dev Set pause status for minting (owner only)
     * @param paused Whether to pause minting
     */
    function setMintingPaused(bool paused) external onlyOwner {
        mintingPaused = paused;
        emit MintingPaused(paused);
    }
    
    /**
     * @dev Set max NFTs per tier (owner only)
     * @param limit New limit per tier
     */
    function setMaxNFTsPerTier(uint256 limit) external onlyOwner {
        maxNFTsPerTier = limit;
        emit MaxNFTsPerTierUpdated(limit);
    }
    
    /**
     * @dev Update tier bonus multipliers (owner only)
     * @param tier NFT tier
     * @param multiplier New bonus multiplier
     */
    function setTierBonusMultiplier(Tier tier, uint256 multiplier) external onlyOwner {
        require(multiplier >= 10000 && multiplier <= 15000, "Invalid multiplier");
        tierBonusMultipliers[tier] = multiplier;
    }
    
    /**
     * @dev Emergency withdrawal of tokens (owner only)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == ccusdToken) {
            IERC20(token).safeTransfer(owner(), amount);
        } else if (token == address(ccToken)) {
            ccToken.safeTransfer(owner(), amount);
        }
    }
    
    /**
     * @dev Deactivate NFT (owner only)
     * @param tokenId NFT token ID to deactivate
     */
    function deactivateNFT(uint256 tokenId) external onlyOwner {
        nftData[tokenId].isActive = false;
    }
    
    /**
     * @dev Get upgrade cost between tiers
     * @param currentTier Current tier
     * @param newTier New tier
     * @return cost CC token cost
     */
    function _getUpgradeCost(Tier currentTier, Tier newTier) internal pure returns (uint256) {
        if (currentTier == Tier.BRONZE && newTier == Tier.SILVER) return 500 * 10**18;
        if (currentTier == Tier.SILVER && newTier == Tier.GOLD) return 1000 * 10**18;
        if (currentTier == Tier.GOLD && newTier == Tier.PLATINUM) return 2000 * 10**18;
        if (currentTier == Tier.BRONZE && newTier == Tier.GOLD) return 1200 * 10**18;
        if (currentTier == Tier.BRONZE && newTier == Tier.PLATINUM) return 2500 * 10**18;
        if (currentTier == Tier.SILVER && newTier == Tier.PLATINUM) return 1800 * 10**18;
        return 0;
    }
    
    /**
     * @dev Get available CC tokens in contract
     * @return balance Available CC tokens
     */
    function getAvailableBalance() external view returns (uint256) {
        return ccToken.balanceOf(address(this));
    }
    
    // Modifiers
    modifier whenNotPaused() {
        require(!mintingPaused, "Minting is paused");
        _;
    }
    
    modifier onlyMinter() {
        require(
            msg.sender == owner() || 
            msg.sender == stakingPool, 
            "Not authorized to mint"
        );
        _;
    }
}