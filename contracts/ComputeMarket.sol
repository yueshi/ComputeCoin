// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CCToken.sol";
import "./CustomerNFT.sol";

/**
 * @title ComputeMarket
 * @dev Enhanced marketplace for compute services with security and proper funding
 * @notice Supports CC and CCUSD payments with deflationary mechanics
 */
contract ComputeMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeERC20 for CCToken;
    
    // Order status enumeration
    enum OrderStatus { CREATED, ACCEPTED, COMPLETED, CANCELLED }
    
    // Order data structure
    struct ComputeOrder {
        uint256 id;
        address client;
        address provider;
        uint256 usdPrice; // Base price (in CCUSD)
        uint256 finalPrice; // Final price (after discount)
        uint256 ccPaymentAmount; // CC payment amount
        OrderStatus status;
        uint256 createTime;
        uint256 customerNftId; // Customer NFT ID (optional)
    }
    
    // Contract dependencies
    CCToken public ccToken;
    CustomerNFT public customerNFT;
    IERC20 public ccusdToken;
    
    // Order storage
    mapping(uint256 => ComputeOrder) public orders;
    uint256 public nextOrderId = 1;
    
    // Platform fee configuration
    uint256 public platformFeeBps = 250; // 2.5% platform fee
    uint256 public burnRateBps = 150; // 1.5% burn rate
    
    // CC token price (in CCUSD, fixed exchange rate)
    uint256 public ccTokenPrice = 1 * 10**17; // 1 CC = 0.1 CCUSD (1 CCUSD = 10 CC)
    
    // Treasury for platform fees
    address public treasury;
    
    // Security controls
    bool public marketPaused;
    uint256 public maxOrderValue;
    uint256 public minOrderValue;
    mapping(address => uint256) public userDailyOrderValue;
    mapping(address => uint256) public lastOrderDay;
    
    // Statistics
    uint256 public totalOrders;
    uint256 public totalVolumeUSD;
    uint256 public totalVolumeCC;
    uint256 public totalBurnedCC;
    uint256 public totalPlatformFees;
    
    // Events
    event OrderCreated(uint256 indexed orderId, address indexed client, uint256 price);
    event OrderAccepted(uint256 indexed orderId, address indexed provider);
    event OrderCompleted(uint256 indexed orderId, uint256 finalPrice);
    event OrderCancelled(uint256 indexed orderId);
    event TokensBurned(uint256 amount);
    event PlatformFeeCollected(uint256 amount);
    event MarketPaused(bool paused);
    event PriceUpdated(uint256 newPrice);
    
    /**
     * @dev Constructor
     */
    constructor(
        address _ccToken,
        address _customerNFT,
        address _ccusdToken,
        address _treasury
    ) Ownable(msg.sender) {
        require(_ccToken != address(0), "Invalid CC token");
        require(_customerNFT != address(0), "Invalid CustomerNFT");
        require(_ccusdToken != address(0), "Invalid CCUSD token");
        require(_treasury != address(0), "Invalid treasury address");
        
        ccToken = CCToken(_ccToken);
        customerNFT = CustomerNFT(_customerNFT);
        ccusdToken = IERC20(_ccusdToken);
        treasury = _treasury;
        
        // Initialize security parameters
        maxOrderValue = 10000 * 10**6; // 10,000 CCUSD max per order
        minOrderValue = 1 * 10**6;     // 1 CCUSD min per order
        marketPaused = false;
    }
    
    /**
     * @dev Create new compute order
     * @param _provider Provider address
     * @param _usdPrice Order price in CCUSD
     * @param _useNFTDiscount Whether to use NFT discount
     * @return orderId The ID of the created order
     */
    function createOrder(
        address _provider,
        uint256 _usdPrice,
        bool _useNFTDiscount
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(_provider != address(0), "Invalid provider");
        require(_usdPrice >= minOrderValue && _usdPrice <= maxOrderValue, "Invalid price");
        
        // Check daily order limits
        _checkDailyOrderLimits(msg.sender, _usdPrice);
        
        uint256 orderId = nextOrderId++;
        
        // Calculate discount if using NFT
        uint256 discount = 0;
        uint256 customerNftId = 0;
        
        if (_useNFTDiscount) {
            discount = customerNFT.getDiscount(msg.sender);
            if (discount > 0) {
                customerNftId = customerNFT.tokenOfOwnerByIndex(msg.sender, 0);
            }
        }
        
        // Calculate final price
        uint256 finalPrice = _usdPrice - (_usdPrice * discount / 10000);
        
        // Create order
        orders[orderId] = ComputeOrder({
            id: orderId,
            client: msg.sender,
            provider: _provider,
            usdPrice: _usdPrice,
            finalPrice: finalPrice,
            ccPaymentAmount: 0, // Will be set when paying
            status: OrderStatus.CREATED,
            createTime: block.timestamp,
            customerNftId: customerNftId
        });
        
        // Update statistics
        totalOrders++;
        
        // Update daily order tracking
        _updateDailyOrder(msg.sender, _usdPrice);
        
        emit OrderCreated(orderId, msg.sender, _usdPrice);
        return orderId;
    }
    
    /**
     * @dev Pay for order with CCUSD
     * @param orderId Order ID
     */
    function payOrderWithCCUSD(uint256 orderId) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status == OrderStatus.CREATED, "Order not in CREATED status");
        require(order.client == msg.sender, "Not order client");
        
        uint256 paymentAmount = order.finalPrice;
        
        // Transfer CCUSD to this contract
        ccusdToken.safeTransferFrom(msg.sender, address(this), paymentAmount);
        
        // Update order status
        order.status = OrderStatus.ACCEPTED;
        
        emit OrderAccepted(orderId, msg.sender);
    }
    
    /**
     * @dev Pay for order with CC tokens
     * @param orderId Order ID
     */
    function payOrderWithCC(uint256 orderId) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status == OrderStatus.CREATED, "Order not in CREATED status");
        require(order.client == msg.sender, "Not order client");
        
        // Calculate CC payment amount
        uint256 ccPaymentAmount = (order.finalPrice * 10**18) / ccTokenPrice;
        
        // Transfer CC tokens to this contract
        ccToken.safeTransferFrom(msg.sender, address(this), ccPaymentAmount);
        
        // Update order
        order.ccPaymentAmount = ccPaymentAmount;
        order.status = OrderStatus.ACCEPTED;
        
        emit OrderAccepted(orderId, msg.sender);
    }
    
    /**
     * @dev Complete order and distribute payments
     * @param orderId Order ID
     */
    function completeOrder(uint256 orderId) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status == OrderStatus.ACCEPTED, "Order not in ACCEPTED status");
        require(
            msg.sender == order.client || 
            msg.sender == order.provider || 
            msg.sender == owner(),
            "Not authorized"
        );
        
        uint256 paymentAmount = order.finalPrice;
        uint256 platformFee = (paymentAmount * platformFeeBps) / 10000;
        uint256 providerPayment = paymentAmount - platformFee;
        
        // Handle CC payment with burn mechanism
        if (order.ccPaymentAmount > 0) {
            uint256 burnAmount = (order.ccPaymentAmount * burnRateBps) / 10000;
            
            // Burn CC tokens
            ccToken.burnFrom(address(this), burnAmount);
            totalBurnedCC += burnAmount;
            
            // Transfer remaining CC to provider
            uint256 providerCCPayment = order.ccPaymentAmount - burnAmount;
            ccToken.safeTransfer(order.provider, providerCCPayment);
            
            // Transfer platform fee in CC
            uint256 platformFeeCC = (providerCCPayment * platformFeeBps) / (10000 - platformFeeBps);
            ccToken.safeTransfer(treasury, platformFeeCC);
            
            totalPlatformFees += platformFeeCC;
            totalVolumeCC += order.ccPaymentAmount;
            
        } else {
            // Handle CCUSD payment
            // Transfer payment to provider
            ccusdToken.safeTransfer(order.provider, providerPayment);
            
            // Transfer platform fee to treasury
            ccusdToken.safeTransfer(treasury, platformFee);
            
            totalPlatformFees += platformFee;
        }
        
        totalVolumeUSD += paymentAmount;
        
        // Update order status
        order.status = OrderStatus.COMPLETED;
        
        emit OrderCompleted(orderId, paymentAmount);
        emit PlatformFeeCollected(platformFee);
        
        if (order.ccPaymentAmount > 0) {
            emit TokensBurned((order.ccPaymentAmount * burnRateBps) / 10000);
        }
    }
    
    /**
     * @dev Cancel order
     * @param orderId Order ID
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status == OrderStatus.CREATED, "Order not in CREATED status");
        require(
            msg.sender == order.client || 
            msg.sender == order.provider || 
            msg.sender == owner(),
            "Not authorized"
        );
        
        // Refund payment if already made
        if (order.ccPaymentAmount > 0) {
            ccToken.safeTransfer(order.client, order.ccPaymentAmount);
        } else if (order.status == OrderStatus.ACCEPTED) {
            ccusdToken.safeTransfer(order.client, order.finalPrice);
        }
        
        // Update order status
        order.status = OrderStatus.CANCELLED;
        
        emit OrderCancelled(orderId);
    }
    
    /**
     * @dev Check daily order limits
     * @param user Address placing order
     * @param orderValue Order value in CCUSD
     */
    function _checkDailyOrderLimits(address user, uint256 orderValue) internal view {
        uint256 currentDay = block.timestamp / 86400;
        uint256 userLastDay = lastOrderDay[user] / 86400;
        
        if (currentDay != userLastDay) {
            return; // New day, reset limit
        }
        
        uint256 dailyLimit = maxOrderValue * 10; // 10x max order value per day
        require(
            userDailyOrderValue[user] + orderValue <= dailyLimit,
            "Daily order limit exceeded"
        );
    }
    
    /**
     * @dev Update daily order tracking
     * @param user Address placing order
     * @param orderValue Order value in CCUSD
     */
    function _updateDailyOrder(address user, uint256 orderValue) internal {
        uint256 currentDay = block.timestamp / 86400;
        uint256 userLastDay = lastOrderDay[user] / 86400;
        
        if (currentDay != userLastDay) {
            userDailyOrderValue[user] = orderValue;
            lastOrderDay[user] = block.timestamp;
        } else {
            userDailyOrderValue[user] += orderValue;
        }
    }
    
    /**
     * @dev Get order details
     * @param orderId Order ID
     * @return Order details
     */
    function getOrder(uint256 orderId) external view returns (ComputeOrder memory) {
        return orders[orderId];
    }
    
    /**
     * @dev Get user's orders
     * @param user Address to query
     * @param status Order status to filter (0 = all)
     * @return orderIds Array of order IDs
     */
    function getUserOrders(address user, OrderStatus status) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count matching orders
        for (uint256 i = 1; i < nextOrderId; i++) {
            if (
                (orders[i].client == user || orders[i].provider == user) &&
                (status == OrderStatus.CREATED || orders[i].status == status)
            ) {
                count++;
            }
        }
        
        // Create result array
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i < nextOrderId; i++) {
            if (
                (orders[i].client == user || orders[i].provider == user) &&
                (status == OrderStatus.CREATED || orders[i].status == status)
            ) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Get market statistics
     * @return orderCount Total number of orders
     * @return volumeUSD Total volume in CCUSD
     * @return volumeCC Total volume in CC
     * @return burnedCC Total burned CC tokens
     * @return platformFees Total platform fees collected
     */
    function getMarketStats() external view returns (
        uint256 orderCount,
        uint256 volumeUSD,
        uint256 volumeCC,
        uint256 burnedCC,
        uint256 platformFees
    ) {
        return (
            this.totalOrders(),
            this.totalVolumeUSD(),
            this.totalVolumeCC(),
            this.totalBurnedCC(),
            this.totalPlatformFees()
        );
    }
    
    /**
     * @dev Estimate CC payment for given USD amount
     * @param usdAmount Amount in CCUSD
     * @return ccAmount Required CC tokens
     */
    function estimateCCPayment(uint256 usdAmount) external view returns (uint256) {
        return (usdAmount * 10**18) / ccTokenPrice;
    }
    
    /**
     * @dev Set CC token price (owner only)
     * @param newPrice New price in CCUSD (18 decimals)
     */
    function setCCPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Invalid price");
        ccTokenPrice = newPrice;
        emit PriceUpdated(newPrice);
    }
    
    /**
     * @dev Set platform fee (owner only)
     * @param newFeeBps New fee in basis points
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = newFeeBps;
    }
    
    /**
     * @dev Set burn rate (owner only)
     * @param newBurnRateBps New burn rate in basis points
     */
    function setBurnRate(uint256 newBurnRateBps) external onlyOwner {
        require(newBurnRateBps <= 500, "Burn rate too high"); // Max 5%
        burnRateBps = newBurnRateBps;
    }
    
    /**
     * @dev Set treasury address (owner only)
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
    }
    
    /**
     * @dev Set order value limits (owner only)
     * @param minValue Minimum order value
     * @param maxValue Maximum order value
     */
    function setOrderValueLimits(uint256 minValue, uint256 maxValue) external onlyOwner {
        require(minValue > 0 && maxValue > minValue, "Invalid limits");
        minOrderValue = minValue;
        maxOrderValue = maxValue;
    }
    
    /**
     * @dev Pause/unpause market (owner only)
     * @param paused Whether to pause the market
     */
    function setMarketPaused(bool paused) external onlyOwner {
        marketPaused = paused;
        emit MarketPaused(paused);
    }
    
    /**
     * @dev Emergency withdrawal (owner only)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(ccusdToken)) {
            ccusdToken.safeTransfer(owner(), amount);
        } else if (token == address(ccToken)) {
            ccToken.safeTransfer(owner(), amount);
        }
    }
    
    // Modifiers
    modifier whenNotPaused() {
        require(!marketPaused, "Market is paused");
        _;
    }
}