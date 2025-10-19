// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CCToken
 * @dev Enhanced $CC token implementation with security features
 * @notice Total supply: 1,000,000,000 CC tokens
 */
contract CCToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    
    // Constants
    string public constant TOKEN_NAME = "$CC";
    string public constant TOKEN_SYMBOL = "CC";
    uint8 public constant DECIMALS = 18;
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**DECIMALS; // 1B tokens
    uint256 public constant ETH_TO_CC_RATE = 1000 * 10**DECIMALS; // 1 ETH = 1000 CC tokens
    
    // Security controls
    bool public purchasesPaused;
    uint256 public dailyPurchaseLimit;
    uint256 public minPurchaseAmount;
    mapping(address => uint256) public dailyPurchased;
    mapping(address => uint256) public lastPurchaseDay;
    
    // Emergency withdrawal addresses
    mapping(address => bool) public emergencyWithdrawalAddresses;
    
    /**
     * @dev Emitted when tokens are purchased with ETH
     * @param buyer Address that purchased tokens
     * @param ethAmount Amount of ETH spent
     * @param tokenAmount Amount of CC tokens received
     */
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);
    
    /**
     * @dev Emitted when purchase status changes
     * @param paused Whether purchases are paused
     */
    event PurchasesPaused(bool paused);
    
    /**
     * @dev Emitted when emergency withdrawal address is set
     * @param addr Address authorized for emergency withdrawal
     * @param authorized Whether the address is authorized
     */
    event EmergencyWithdrawalAddressSet(address indexed addr, bool authorized);
    
    /**
     * @dev Constructor that mints the total supply to the deployer
     * @notice The deployer (typically a multi-sig wallet) will hold all initial tokens
     */
    constructor() ERC20(TOKEN_NAME, TOKEN_SYMBOL) Ownable(msg.sender) {
        _mint(msg.sender, TOTAL_SUPPLY);
        
        // Initialize security parameters
        dailyPurchaseLimit = 10 ether; // 10 ETH daily limit per address
        minPurchaseAmount = 0.001 ether; // 0.001 ETH minimum purchase
        purchasesPaused = false;
    }
    
    /**
     * @dev Returns the number of decimals used for token amounts
     * @return uint8 The number of decimals (18)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @dev Returns the total supply of tokens
     * @return uint256 The current total supply (decreases when tokens are burned)
     */
    function totalSupply() public view override returns (uint256) {
        return super.totalSupply();
    }
    
    /**
     * @dev Burns tokens from a specific address (only callable by authorized contracts)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) public override {
        // Allow ComputeMarket to burn tokens from its own balance for deflationary mechanics
        if (msg.sender != from) {
            // If not burning own tokens, check allowance
            _spendAllowance(from, msg.sender, amount);
        }
        _burn(from, amount);
    }
    
    /**
     * @dev Enhanced purchase CC tokens with ETH at fixed rate with security controls
     * @notice Users can send ETH to receive CC tokens
     * @dev Includes daily limits, minimum amounts, and pause functionality
     */
    function purchaseWithETH() external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Must send ETH to purchase tokens");
        require(msg.value >= minPurchaseAmount, "Amount below minimum purchase");
        
        // Check daily limits
        _checkDailyLimits(msg.sender, msg.value);
        
        // Calculate CC tokens to receive (1 ETH = 1000 CC)
        uint256 tokenAmount = (msg.value * ETH_TO_CC_RATE) / 1 ether;
        
        // Check if contract has enough tokens
        require(balanceOf(owner()) >= tokenAmount, "Insufficient tokens available for purchase");
        
        // Update daily purchase tracking
        _updateDailyPurchase(msg.sender, msg.value);
        
        // Transfer tokens from owner to buyer
        _transfer(owner(), msg.sender, tokenAmount);
        
        // Transfer ETH to owner
        (bool success, ) = payable(owner()).call{value: msg.value}("");
        require(success, "ETH transfer failed");
        
        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
    }
    
    /**
     * @dev Check daily purchase limits
     * @param user Address making the purchase
     * @param ethAmount Amount of ETH being purchased
     */
    function _checkDailyLimits(address user, uint256 ethAmount) internal view {
        uint256 currentDay = block.timestamp / 86400;
        uint256 userLastDay = lastPurchaseDay[user] / 86400;
        
        if (currentDay != userLastDay) {
            // Reset daily limit if it's a new day
            return;
        }
        
        require(
            dailyPurchased[user] + ethAmount <= dailyPurchaseLimit,
            "Daily purchase limit exceeded"
        );
    }
    
    /**
     * @dev Update daily purchase tracking
     * @param user Address making the purchase
     * @param ethAmount Amount of ETH being purchased
     */
    function _updateDailyPurchase(address user, uint256 ethAmount) internal {
        uint256 currentDay = block.timestamp / 86400;
        uint256 userLastDay = lastPurchaseDay[user] / 86400;
        
        if (currentDay != userLastDay) {
            // Reset daily limit if it's a new day
            dailyPurchased[user] = ethAmount;
            lastPurchaseDay[user] = block.timestamp;
        } else {
            dailyPurchased[user] += ethAmount;
        }
    }
    
    /**
     * @dev Get the amount of CC tokens that will be received for a given ETH amount
     * @param ethAmount Amount of ETH to convert
     * @return Amount of CC tokens that would be received
     */
    function getCCForETH(uint256 ethAmount) external pure returns (uint256) {
        return (ethAmount * ETH_TO_CC_RATE) / 1 ether;
    }
    
    /**
     * @dev Get the amount of ETH needed to purchase a given amount of CC tokens
     * @param tokenAmount Amount of CC tokens desired
     * @return Amount of ETH needed
     */
    function getETHForCC(uint256 tokenAmount) external pure returns (uint256) {
        return (tokenAmount * 1 ether) / ETH_TO_CC_RATE;
    }
    
    /**
     * @dev Withdraw ETH from contract (owner only)
     * @param amount Amount of ETH to withdraw
     */
    function withdrawETH(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient ETH balance");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "ETH transfer failed");
    }
    
    /**
     * @dev Set daily purchase limit (owner only)
     * @param limit New daily purchase limit in ETH
     */
    function setDailyPurchaseLimit(uint256 limit) external onlyOwner {
        dailyPurchaseLimit = limit;
    }
    
    /**
     * @dev Set minimum purchase amount (owner only)
     * @param amount New minimum purchase amount in ETH
     */
    function setMinPurchaseAmount(uint256 amount) external onlyOwner {
        minPurchaseAmount = amount;
    }
    
    /**
     * @dev Pause/unpause token purchases (owner only)
     * @param paused Whether to pause purchases
     */
    function setPurchasesPaused(bool paused) external onlyOwner {
        purchasesPaused = paused;
        emit PurchasesPaused(paused);
    }
    
    /**
     * @dev Set emergency withdrawal address (owner only)
     * @param addr Address to authorize for emergency withdrawal
     * @param authorized Whether to authorize the address
     */
    function setEmergencyWithdrawalAddress(address addr, bool authorized) external onlyOwner {
        emergencyWithdrawalAddresses[addr] = authorized;
        emit EmergencyWithdrawalAddressSet(addr, authorized);
    }
    
    /**
     * @dev Emergency token withdrawal (only callable by authorized addresses)
     * @param token Token address to withdraw
     * @param to Address to send tokens to
     * @param amount Amount of tokens to withdraw
     */
    function emergencyWithdrawTokens(address token, address to, uint256 amount) external {
        require(emergencyWithdrawalAddresses[msg.sender], "Not authorized for emergency withdrawal");
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        
        // For CC tokens, use emergency transfer
        if (token == address(this)) {
            _transfer(owner(), to, amount);
        } else {
            // For other tokens (like CCUSD), use regular transfer
            IERC20(token).transferFrom(owner(), to, amount);
        }
    }
    
    /**
     * @dev Get user's remaining daily purchase limit
     * @param user Address to check
     * @return Remaining daily purchase limit in ETH
     */
    function getRemainingDailyLimit(address user) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 86400;
        uint256 userLastDay = lastPurchaseDay[user] / 86400;
        
        if (currentDay != userLastDay) {
            return dailyPurchaseLimit;
        }
        
        return dailyPurchaseLimit - dailyPurchased[user];
    }
    
    // Modifier to check if purchases are paused
    modifier whenNotPaused() {
        require(!purchasesPaused, "Token purchases are paused");
        _;
    }
}