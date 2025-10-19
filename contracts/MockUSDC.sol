// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockUSDC
 * @dev Enhanced Mock USDC contract with integrated CCUSD support system
 * @notice Provides stable functionality and reserve backing
 */
contract MockUSDC is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Reserve configuration
    uint256 public constant RESERVE_RATIO = 85; // 85% reserve requirement
    uint256 public constant RESERVE_RATIO_BPS = RESERVE_RATIO * 100; // 8500 basis points
    
    // Reserve tracking
    uint256 public totalReserveValue; // Total value of reserves in ETH equivalent
    mapping(address => uint256) public assetBalances; // Balance of each reserve asset
    mapping(address => bool) public supportedAssets; // Supported reserve assets
    
    // Treasury for reserve management
    address public reserveTreasury;
    
    // Controls
    bool public mintingPaused;
    bool public burningPaused;
    uint256 public maxSupply;
    
    // Emergency controls
    bool public emergencyMode;
    address public emergencyController;
    
    // Statistics
    uint256 public totalMinted;
    uint256 public totalBurned;
    mapping(address => uint256) public userMinted;
    mapping(address => uint256) public userBurned;
    
    // Events
    event ReserveAdded(address indexed asset, uint256 amount);
    event ReserveWithdrawn(address indexed asset, address to, uint256 amount);
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);
    event MintingPaused(bool paused);
    event BurnPaused(bool paused);
    event EmergencyStateChanged(bool emergency);
    event ReserveRatioUpdated(uint256 newRatio);
    
    /**
     * @dev Constructor
     */
    constructor() ERC20("CCUSD", "CCUSD") Ownable(msg.sender) {
        // Pre-mint 10 billion tokens to deployer
        uint256 initialSupply = 10_000_000_000 * 10**6; // 10B CCUSD with 6 decimals
        maxSupply = 100_000_000_000 * 10**6; // 100B max supply
        
        _mint(msg.sender, initialSupply);
        totalMinted = initialSupply;
        
        // Initialize controls
        mintingPaused = false;
        burningPaused = false;
        emergencyMode = false;
        emergencyController = msg.sender;
        reserveTreasury = msg.sender;
        
        // Support ETH as reserve asset (address(0))
        supportedAssets[address(0)] = true;
    }
    
    /**
     * @dev Override decimals function
     */
    function decimals() public pure override returns (uint8) {
        return 6; // USDC standard
    }
    
    /**
     * @dev Mint new tokens with reserve backing
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external payable nonReentrant whenMintingNotPaused {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(totalSupply() + amount <= maxSupply, "Max supply reached");
        
        // Update reserves if ETH provided
        if (msg.value > 0) {
            assetBalances[address(0)] += msg.value;
            totalReserveValue += msg.value;
            emit ReserveAdded(address(0), msg.value);
        }
        
        // Check reserve requirement (convert CCUSD amount to ETH equivalent for comparison)
        uint256 normalizedAmount = amount * 1e12; // Convert 6 decimals to 18 decimals
        uint256 requiredReserveValue = (normalizedAmount * RESERVE_RATIO_BPS) / 10000;
        
        require(
            totalReserveValue >= requiredReserveValue,
            "Insufficient reserve backing"
        );
        
        // Mint tokens
        _mint(to, amount);
        totalMinted += amount;
        userMinted[to] += amount;
        
        emit Minted(to, amount);
    }
    
    /**
     * @dev Burn tokens and return reserves
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external nonReentrant whenBurningNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Calculate reserve return amount
        uint256 reserveReturnAmount = (amount * totalReserveValue) / totalSupply();
        
        // Burn tokens
        _burn(msg.sender, amount);
        totalBurned += amount;
        userBurned[msg.sender] += amount;
        
        // Return reserves proportionally
        _returnReserves(msg.sender, reserveReturnAmount);
        
        emit Burned(msg.sender, amount);
    }
    
    /**
     * @dev Add reserve assets
     * @param asset Asset address (address(0) for ETH)
     * @param amount Amount to add
     */
    function addReserve(address asset, uint256 amount) external payable nonReentrant {
        require(supportedAssets[asset], "Unsupported asset");
        require(amount > 0, "Amount must be > 0");
        
        if (asset == address(0)) {
            // ETH reserve
            require(msg.value == amount, "ETH amount mismatch");
            assetBalances[asset] += amount;
            totalReserveValue += amount;
        } else {
            // ERC20 reserve
            require(msg.value == 0, "No ETH for ERC20 deposit");
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
            assetBalances[asset] += amount;
            
            // For simplicity, assume 1:1 value for non-ETH assets
            // In production, you'd need price oracles
            totalReserveValue += amount;
        }
        
        emit ReserveAdded(asset, amount);
    }
    
    /**
     * @dev Withdraw reserve assets (treasury only)
     * @param asset Asset address to withdraw
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawReserve(address asset, address to, uint256 amount) external nonReentrant onlyReserveManager {
        require(to != address(0), "Invalid recipient");
        require(assetBalances[asset] >= amount, "Insufficient reserve");
        
        // Check reserve ratio after withdrawal
        uint256 newReserveValue = totalReserveValue - amount;
        uint256 requiredReserveValue = (totalSupply() * RESERVE_RATIO_BPS) / 10000;
        
        require(
            newReserveValue >= requiredReserveValue || emergencyMode,
            "Would breach reserve ratio"
        );
        
        // Update balances
        assetBalances[asset] -= amount;
        totalReserveValue -= amount;
        
        // Transfer assets
        if (asset == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(asset).safeTransfer(to, amount);
        }
        
        emit ReserveWithdrawn(asset, to, amount);
    }
    
    /**
     * @dev Return reserves to user proportionally
     * @param to Recipient address
     * @param reserveAmount Amount of reserves to return
     */
    function _returnReserves(address to, uint256 reserveAmount) internal {
        if (reserveAmount == 0 || totalReserveValue == 0) return;
        
        // Calculate proportion of ETH to return
        uint256 ethBalance = assetBalances[address(0)];
        uint256 ethReturn = (reserveAmount * ethBalance) / totalReserveValue;
        
        if (ethReturn > 0) {
            assetBalances[address(0)] -= ethReturn;
            totalReserveValue -= ethReturn;
            
            (bool success, ) = payable(to).call{value: ethReturn}("");
            require(success, "ETH transfer failed");
        }
        
        // For simplicity, we're only returning ETH reserves
        // In production, you'd return a basket of reserves
    }
    
    /**
     * @dev Get reserve ratio
     * @return ratio Current reserve ratio in basis points
     */
    function getReserveRatio() external view returns (uint256) {
        if (totalSupply() == 0) return 10000; // 100%
        // Convert both values to same decimal precision (18 decimals for ETH, 6 for CCUSD)
        uint256 normalizedSupply = totalSupply() * 1e12; // Convert 6 decimals to 18 decimals
        return (totalReserveValue * 10000) / normalizedSupply;
    }
    
    /**
     * @dev Get backing per token
     * @return backing Amount of reserve value per token (in 18 decimals)
     */
    function getBackingPerToken() external view returns (uint256) {
        if (totalSupply() == 0) return 0;
        // Return backing in ETH (18 decimals) per CCUSD token (6 decimals)
        return (totalReserveValue * 1e12) / totalSupply();
    }
    
    /**
     * @dev Get contract statistics
     * @return supply Current total supply
     * @return reserveValue Total reserve value
     * @return reserveRatio Current reserve ratio
     * @return minted Total minted
     * @return burned Total burned
     */
    function getStats() external view returns (
        uint256 supply,
        uint256 reserveValue,
        uint256 reserveRatio,
        uint256 minted,
        uint256 burned
    ) {
        return (
            this.totalSupply(),
            this.totalReserveValue(),
            this.getReserveRatio(),
            this.totalMinted(),
            this.totalBurned()
        );
    }
    
    /**
     * @dev Add supported asset (owner only)
     * @param asset Asset address
     * @param supported Whether asset is supported
     */
    function setSupportedAsset(address asset, bool supported) external onlyOwner {
        supportedAssets[asset] = supported;
    }
    
    /**
     * @dev Set reserve treasury (owner only)
     * @param treasury New treasury address
     */
    function setReserveTreasury(address treasury) external onlyOwner {
        require(treasury != address(0), "Invalid treasury");
        reserveTreasury = treasury;
    }
    
    /**
     * @dev Set max supply (owner only)
     * @param newMaxSupply New maximum supply
     */
    function setMaxSupply(uint256 newMaxSupply) external onlyOwner {
        require(newMaxSupply >= totalSupply(), "Below current supply");
        maxSupply = newMaxSupply;
    }
    
    /**
     * @dev Set minting pause (owner only)
     * @param paused Whether to pause minting
     */
    function setMintingPaused(bool paused) external onlyOwner {
        mintingPaused = paused;
        emit MintingPaused(paused);
    }
    
    /**
     * @dev Set burning pause (owner only)
     * @param paused Whether to pause burning
     */
    function setBurningPaused(bool paused) external onlyOwner {
        burningPaused = paused;
        emit BurnPaused(paused);
    }
    
    /**
     * @dev Set emergency controller (owner only)
     * @param controller Emergency controller address
     */
    function setEmergencyController(address controller) external onlyOwner {
        require(controller != address(0), "Invalid controller");
        emergencyController = controller;
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
     * @dev Emergency transfer (owner or emergency controller only)
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function emergencyTransfer(address token, address to, uint256 amount) external {
        require(
            msg.sender == owner() || msg.sender == emergencyController,
            "Not authorized"
        );
        require(emergencyMode, "Not in emergency mode");
        
        if (token == address(this)) {
            _transfer(address(this), to, amount);
        } else if (token == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }
    
    // Modifiers
    modifier whenMintingNotPaused() {
        require(!mintingPaused, "Minting is paused");
        _;
    }
    
    modifier whenBurningNotPaused() {
        require(!burningPaused, "Burning is paused");
        _;
    }
    
    modifier onlyReserveManager() {
        require(
            msg.sender == owner() || msg.sender == reserveTreasury,
            "Not authorized"
        );
        _;
    }
}
