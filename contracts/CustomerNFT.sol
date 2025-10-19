// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CustomerNFT
 * @dev Enhanced NFT for customers with proper funding mechanism
 * @notice Provides discounts and staking rewards in the compute marketplace
 */
contract CustomerNFT is ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // NFT tier enumeration
    enum Tier { NONE, BRONZE, SILVER, GOLD, PLATINUM }
    
    // NFT data structure
    struct CustomerNFTData {
        Tier tier;
        uint256 activationTime;
        uint256 ccusdAmount;
        uint256 ccAmount;
        bool isActive;
    }
    
    // Storage mappings
    mapping(uint256 => CustomerNFTData) public nftData;
    uint256 public nextTokenId = 1;
    
    // Discount configuration (basis points, 10000 = 100%)
    mapping(Tier => uint256) public tierDiscounts;
    
    // Monthly rewards configuration
    mapping(Tier => uint256) public tierMonthlyRewards;
    
    // Token contract addresses
    address public ccusdToken;
    IERC20 public ccToken;
    address public stakingPool;
    
    // Reward management
    mapping(address => uint256) public lastClaimTime;
    uint256 public constant CLAIM_COOLDOWN = 30 days;
    
    // Security controls
    bool public mintingPaused;
    uint256 public maxNFTsPerTier;
    mapping(Tier => uint256) public tierMintedCount;
    
    // Events
    event NFTMinted(address indexed to, uint256 indexed tokenId, Tier tier);
    event RewardsClaimed(address indexed owner, uint256 amount);
    event NFTUpgraded(uint256 indexed tokenId, Tier newTier, Tier oldTier);
    event MintingPaused(bool paused);
    event MaxNFTsPerTierUpdated(uint256 newLimit);
    
    /**
     * @dev Constructor
     */
    constructor(
        address _ccusdToken,
        address _ccToken
    ) ERC721("Customer NFT", "CNFT") Ownable(msg.sender) {
        require(_ccusdToken != address(0), "Invalid CCUSD token");
        require(_ccToken != address(0), "Invalid CC token");
        
        ccusdToken = _ccusdToken;
        ccToken = IERC20(_ccToken);
        
        // Initialize tier discounts (basis points)
        tierDiscounts[Tier.BRONZE] = 500;   // 5%
        tierDiscounts[Tier.SILVER] = 800;   // 8%
        tierDiscounts[Tier.GOLD] = 1200;    // 12%
        tierDiscounts[Tier.PLATINUM] = 1500; // 15%
        
        // Initialize monthly rewards (in CC tokens)
        tierMonthlyRewards[Tier.BRONZE] = 200 * 10**18;   // 200 CC
        tierMonthlyRewards[Tier.SILVER] = 500 * 10**18;   // 500 CC
        tierMonthlyRewards[Tier.GOLD] = 1000 * 10**18;   // 1000 CC
        tierMonthlyRewards[Tier.PLATINUM] = 3000 * 10**18; // 3000 CC
        
        // Initialize security parameters
        maxNFTsPerTier = 10000; // Maximum 10,000 NFTs per tier
        mintingPaused = false;
    }
    
    /**
     * @dev Mint new Customer NFT
     * @param to Address to mint NFT to
     * @param tier NFT tier to mint
     * @return tokenId The ID of the minted NFT
     */
    function mintNFT(address to, Tier tier) internal whenNotPaused returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(tier != Tier.NONE, "Invalid tier");
        require(balanceOf(to) == 0, "User already has Customer NFT");
        require(tierMintedCount[tier] < maxNFTsPerTier, "Tier limit reached");
        
        uint256 tokenId = nextTokenId++;
        
        // Create NFT data
        nftData[tokenId] = CustomerNFTData({
            tier: tier,
            activationTime: block.timestamp,
            ccusdAmount: 0,
            ccAmount: 0,
            isActive: true
        });
        
        // Update tracking
        tierMintedCount[tier]++;
        lastClaimTime[to] = block.timestamp;
        
        // Mint NFT
        _safeMint(to, tokenId);
        
        emit NFTMinted(to, tokenId, tier);
        return tokenId;
    }
    
    /**
     * @dev Mint NFT with CCUSD payment
     * @param to Address to mint NFT to
     * @param tier NFT tier to mint
     * @param ccusdAmount Amount of CCUSD paid
     * @return tokenId The ID of the minted NFT
     */
    function mintWithCCUSD(address to, Tier tier, uint256 ccusdAmount) external nonReentrant whenNotPaused returns (uint256) {
        require(ccusdAmount >= _getCCUSDPrice(tier), "Insufficient CCUSD amount");
        
        // Transfer CCUSD tokens
        IERC20(ccusdToken).safeTransferFrom(msg.sender, address(this), ccusdAmount);
        
        uint256 tokenId = mintNFT(to, tier);
        
        // Update NFT data with payment info
        nftData[tokenId].ccusdAmount = ccusdAmount;
        
        return tokenId;
    }
    
    /**
     * @dev Mint NFT with CC token payment
     * @param to Address to mint NFT to
     * @param tier NFT tier to mint
     * @param ccAmount Amount of CC tokens paid
     * @return tokenId The ID of the minted NFT
     */
    function mintWithCC(address to, Tier tier, uint256 ccAmount) external nonReentrant whenNotPaused returns (uint256) {
        require(ccAmount >= _getCCPrice(tier), "Insufficient CC amount");
        
        // Transfer CC tokens
        ccToken.safeTransferFrom(msg.sender, address(this), ccAmount);
        
        uint256 tokenId = mintNFT(to, tier);
        
        // Update NFT data with payment info
        nftData[tokenId].ccAmount = ccAmount;
        
        return tokenId;
    }
    
    /**
     * @dev Claim monthly rewards
     * @param tokenId NFT token ID
     */
    function claimRewards(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(block.timestamp >= lastClaimTime[msg.sender] + CLAIM_COOLDOWN, "Claim cooldown not met");
        
        CustomerNFTData storage nft = nftData[tokenId];
        require(nft.isActive, "NFT not active");
        
        uint256 rewardAmount = tierMonthlyRewards[nft.tier];
        require(ccToken.balanceOf(address(this)) >= rewardAmount, "Insufficient reward tokens");
        
        // Update claim time
        lastClaimTime[msg.sender] = block.timestamp;
        
        // Transfer rewards
        ccToken.safeTransfer(msg.sender, rewardAmount);
        
        emit RewardsClaimed(msg.sender, rewardAmount);
    }
    
    /**
     * @dev Upgrade NFT tier
     * @param tokenId NFT token ID to upgrade
     * @param newTier New tier to upgrade to
     */
    function upgradeTier(uint256 tokenId, Tier newTier) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(newTier > nftData[tokenId].tier, "Not an upgrade");
        
        CustomerNFTData storage nft = nftData[tokenId];
        
        // Check upgrade requirements
        uint256 upgradeCost = _getCCPrice(newTier) - _getCCPrice(nft.tier);
        require(ccToken.balanceOf(msg.sender) >= upgradeCost, "Insufficient CC for upgrade");
        
        // Transfer upgrade cost
        ccToken.safeTransferFrom(msg.sender, address(this), upgradeCost);
        
        // Update tier
        Tier oldTier = nft.tier;
        nft.tier = newTier;
        
        emit NFTUpgraded(tokenId, newTier, oldTier);
    }
    
    /**
     * @dev Get discount for NFT holder
     * @param user Address to check
     * @return discount Discount percentage in basis points
     */
    function getDiscount(address user) external view returns (uint256) {
        uint256 balance = balanceOf(user);
        if (balance == 0) return 0;
        
        uint256 tokenId = tokenOfOwnerByIndex(user, 0);
        return tierDiscounts[nftData[tokenId].tier];
    }
    
    /**
     * @dev Get monthly reward amount for NFT
     * @param tokenId NFT token ID
     * @return reward Amount of monthly CC rewards
     */
    function getMonthlyReward(uint256 tokenId) external view returns (uint256) {
        return tierMonthlyRewards[nftData[tokenId].tier];
    }
    
    /**
     * @dev Check if user can claim rewards
     * @param user Address to check
     * @return canClaim Whether user can claim rewards
     * @return timeRemaining Time remaining until next claim
     */
    function getClaimStatus(address user) external view returns (bool canClaim, uint256 timeRemaining) {
        uint256 nextClaimTime = lastClaimTime[user] + CLAIM_COOLDOWN;
        
        if (block.timestamp >= nextClaimTime) {
            return (true, 0);
        } else {
            return (false, nextClaimTime - block.timestamp);
        }
    }
    
    /**
     * @dev Get NFT tier information
     * @param tokenId NFT token ID
     * @return tier NFT tier
     * @return discount Discount percentage
     * @return monthlyReward Monthly reward amount
     */
    function getNFTInfo(uint256 tokenId) external view returns (Tier tier, uint256 discount, uint256 monthlyReward) {
        CustomerNFTData storage nft = nftData[tokenId];
        return (nft.tier, tierDiscounts[nft.tier], tierMonthlyRewards[nft.tier]);
    }
    
    /**
     * @dev Set staking pool address (owner only)
     * @param _stakingPool Staking pool contract address
     */
    function setStakingPool(address _stakingPool) external onlyOwner {
        stakingPool = _stakingPool;
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
     * @dev Fund contract with CC tokens for rewards (owner only)
     * @param amount Amount of CC tokens to add
     */
    function fundRewards(uint256 amount) external onlyOwner {
        ccToken.safeTransferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @dev Get CCUSD price for tier
     * @param tier NFT tier
     * @return price CCUSD price
     */
    function _getCCUSDPrice(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.BRONZE) return 100 * 10**6;  // 100 CCUSD
        if (tier == Tier.SILVER) return 200 * 10**6;  // 200 CCUSD
        if (tier == Tier.GOLD) return 500 * 10**6;    // 500 CCUSD
        if (tier == Tier.PLATINUM) return 1000 * 10**6; // 1000 CCUSD
        return 0;
    }
    
    /**
     * @dev Get CC price for tier
     * @param tier NFT tier
     * @return price CC token price
     */
    function _getCCPrice(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.BRONZE) return 100 * 10**18;   // 100 CC
        if (tier == Tier.SILVER) return 250 * 10**18;   // 250 CC
        if (tier == Tier.GOLD) return 500 * 10**18;    // 500 CC
        if (tier == Tier.PLATINUM) return 1000 * 10**18; // 1000 CC
        return 0;
    }
    
    /**
     * @dev Public mint function for StakingPool
     * @param to Address to mint NFT to
     * @param tier NFT tier to mint
     * @return tokenId The ID of the minted NFT
     */
    function publicMintNFT(address to, Tier tier) external nonReentrant whenNotPaused onlyMinter returns (uint256) {
        return mintNFT(to, tier);
    }
    
    /**
     * @dev Get available rewards for contract
     * @return Available CC tokens
     */
    function getAvailableRewards() external view returns (uint256) {
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