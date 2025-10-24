// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CCToken.sol";
import "./CustomerNFT.sol";

/**
 * @title ComputeMarketLite - Optimized for smaller bytecode
 * @dev Streamlined marketplace with essential payment and order management
 */
contract ComputeMarketLite is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeERC20 for CCToken;

    // Order status enumeration
    enum OrderStatus {
        CREATED,    // Order created, waiting for payment
        PAID,       // Paid, funds in escrow
        ACTIVE,     // Service in progress
        COMPLETED,  // Service completed
        CONFIRMED,  // Confirmed, funds released
        CANCELLED   // Order cancelled
    }

    // Payment token type enumeration
    enum PaymentToken { NONE, CC, CCUSD }

    // Simplified order structure
    struct ComputeOrder {
        uint128 id;
        address client;
        address provider;
        uint128 finalPrice;          // Final price in CCUSD
        OrderStatus status;
        uint64 createTime;
        uint64 paymentTime;
        uint128 customerNftId;
        PaymentToken primaryPaymentToken;
        uint128 totalPaidAmount;
        uint64 exchangeRate;
        uint8 paymentCount;
        mapping(uint256 => PaymentRecord) payments; // Dynamic mapping instead of fixed array
    }

    // Simplified payment record structure
    struct PaymentRecord {
        uint128 amount;
        PaymentToken tokenType;
        uint64 timestamp;
        uint64 exchangeRate;
        string description;
    }

    // Contract dependencies
    CCToken public ccToken;
    CustomerNFT public customerNFT;
    IERC20 public ccusdToken;

    // Order storage
    mapping(uint256 => ComputeOrder) public orders;
    uint256 public nextOrderId = 1;

    // Platform configuration
    uint256 public platformFeeBps = 250; // 2.5% platform fee
    uint256 public burnRateBps = 150;     // 1.5% burn rate

    // CC token price configuration
    uint256 public ccTokenPrice = 1 * 10**17; // 1 CC = 0.1 CCUSD

    // Treasury
    address public treasury;

    // Enhanced statistics
    uint256 public totalOrders;
    uint256 public totalVolumeUSD;
    uint256 public totalCCUSDPayments;
    uint256 public totalCCPayments;

    // Events
    event OrderCreated(uint256 indexed orderId, address indexed client, address indexed provider, uint256 price);
    event PaymentReceived(uint256 indexed orderId, address indexed payer, PaymentToken tokenType, uint256 amount);
    event OrderCompleted(uint256 indexed orderId, uint256 finalPrice);
    event OrderConfirmed(uint256 indexed orderId, address indexed client);
    event OrderCancelled(uint256 indexed orderId, uint256 refundAmount);

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
        require(_treasury != address(0), "Invalid treasury");

        ccToken = CCToken(_ccToken);
        customerNFT = CustomerNFT(_customerNFT);
        ccusdToken = IERC20(_ccusdToken);
        treasury = _treasury;
    }

    /**
     * @dev Create new compute order
     */
    function createOrder(
        address _provider,
        uint256 _usdPrice,
        bool _useNFTDiscount,
        uint256 _expectedDuration
    ) external nonReentrant returns (uint256) {
        require(_provider != address(0), "Invalid provider");
        require(_usdPrice >= 1 * 10**6 && _usdPrice <= 10000 * 10**6, "Invalid price range");
        require(_usdPrice <= type(uint128).max, "Price exceeds maximum");

        uint256 orderId = nextOrderId++;
        ComputeOrder storage order = orders[orderId];

        // Calculate discount if using NFT
        uint256 discount = 0;
        uint256 customerNftId = 0;
        if (_useNFTDiscount) {
            discount = customerNFT.getDiscount(msg.sender);
            if (discount > 0) {
                customerNftId = customerNFT.tokenOfOwnerByIndex(msg.sender, 0);
            }
        }

        uint256 discountAmount = (_usdPrice * discount) / 10000;
        uint256 finalPrice = _usdPrice - discountAmount;

        // Initialize order
        order.id = uint128(orderId);
        order.client = msg.sender;
        order.provider = _provider;
        order.finalPrice = uint128(finalPrice);
        order.status = OrderStatus.CREATED;
        order.createTime = uint64(block.timestamp);
        order.customerNftId = uint128(customerNftId);
        order.paymentCount = 0;

        totalOrders++;
        emit OrderCreated(orderId, msg.sender, _provider, _usdPrice);
        return orderId;
    }

    /**
     * @dev Make payment for order with enhanced validation
     */
    function makePartialPayment(
        uint256 orderId,
        uint256 _amount,
        PaymentToken _tokenType,
        string calldata _description
    ) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status == OrderStatus.CREATED, "Order not in payment state");
        require(order.client == msg.sender, "Not order client");
        require(_amount > 0, "Invalid payment amount");
        require(_tokenType != PaymentToken.NONE, "Invalid token type");

        // Pre-validate authorization and balance
        require(_validateTokenAllowance(_tokenType, msg.sender, _amount), "Insufficient token allowance");
        require(_validateTokenBalance(_tokenType, msg.sender, _amount), "Insufficient token balance");

        uint256 usdEquivalent;

        if (_tokenType == PaymentToken.CCUSD) {
            require(order.totalPaidAmount + uint128(_amount) <= order.finalPrice, "Overpayment");
            usdEquivalent = _amount;
            ccusdToken.safeTransferFrom(msg.sender, address(this), _amount);

        } else if (_tokenType == PaymentToken.CC) {
            // 🔧 修复：确保_amount是18位精度的CC wei
            // _amount参数应该是CC代币的18位精度wei值
            uint256 ccAmount = _amount;
            require(ccAmount > 0, "Invalid CC amount");
            require(ccAmount <= type(uint256).max / ccTokenPrice, "CC amount too large");
            require(ccTokenPrice > 0, "Invalid CC token price");

            // 🔧 修复：计算CC的USD等值，转换为6位CCUSD精度
            // CC wei (18位) × CC价格wei (18位) ÷ 10^(18+18-6) = 6位CCUSD wei
            usdEquivalent = (ccAmount * ccTokenPrice) / 10**30;
            require(usdEquivalent > 0, "Invalid calculation");
            require(order.totalPaidAmount + uint128(usdEquivalent) <= order.finalPrice, "Overpayment");

            // 🔧 修复：转移18位精度的CC wei值
            ccToken.safeTransferFrom(msg.sender, address(this), ccAmount);

        } else {
            revert("Unsupported token type");
        }

        // Record payment
        order.payments[order.paymentCount] = PaymentRecord({
            amount: uint128(_amount),
            tokenType: _tokenType,
            timestamp: uint64(block.timestamp),
            exchangeRate: _tokenType == PaymentToken.CC ? uint64(ccTokenPrice) : 0,
            description: _description
        });
        order.paymentCount++;

        // Update order info
        if (order.primaryPaymentToken == PaymentToken.NONE) {
            order.primaryPaymentToken = _tokenType;
            order.exchangeRate = _tokenType == PaymentToken.CC ? uint64(ccTokenPrice) : 0;
        }

        order.totalPaidAmount += uint128(usdEquivalent);

        // Check if payment is complete
        if (order.totalPaidAmount >= order.finalPrice) {
            order.status = OrderStatus.PAID;
            order.paymentTime = uint64(block.timestamp);
        }

        // Update statistics
        if (_tokenType == PaymentToken.CCUSD) {
            totalCCUSDPayments += _amount;
        } else {
            totalCCPayments += _amount;
        }
        totalVolumeUSD += usdEquivalent;

        emit PaymentReceived(orderId, msg.sender, _tokenType, _amount);
    }

    /**
     * @dev Start service execution
     */
    function startService(uint256 orderId) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status == OrderStatus.PAID, "Order not ready for service");
        require(msg.sender == order.provider || msg.sender == order.client, "Not authorized");
        order.status = OrderStatus.ACTIVE;
    }

    /**
     * @dev Complete order
     */
    function completeOrder(uint256 orderId) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status == OrderStatus.ACTIVE, "Order not in active status");
        require(msg.sender == order.provider || msg.sender == owner(), "Not authorized");
        order.status = OrderStatus.COMPLETED;
    }

    /**
     * @dev Confirm order and release funds
     */
    function confirmOrder(uint256 orderId) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status == OrderStatus.COMPLETED, "Order not completed");
        require(order.client == msg.sender, "Not order client");

        _processFundSettlement(orderId);
        order.status = OrderStatus.CONFIRMED;
        emit OrderConfirmed(orderId, msg.sender);
    }

    /**
     * @dev Cancel order
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status != OrderStatus.CONFIRMED && order.status != OrderStatus.CANCELLED, "Cannot cancel");
        require(msg.sender == order.client || msg.sender == order.provider || msg.sender == owner(), "Not authorized");

        uint256 refundAmount = order.totalPaidAmount;
        if (refundAmount > 0) {
            _processRefund(orderId, refundAmount);
        }

        order.status = OrderStatus.CANCELLED;
        emit OrderCancelled(orderId, refundAmount);
    }

    /**
     * @dev Process fund settlement
     */
    function _processFundSettlement(uint256 orderId) internal {
        ComputeOrder storage order = orders[orderId];
        uint256 paymentAmount = uint256(order.finalPrice);
        uint256 platformFee = (paymentAmount * platformFeeBps) / 10000;
        uint256 providerPayment = paymentAmount - platformFee;

        if (order.primaryPaymentToken == PaymentToken.CC) {
            _processCCSettlement(order, providerPayment, platformFee);
        } else {
            ccusdToken.safeTransfer(order.provider, providerPayment);
            ccusdToken.safeTransfer(treasury, platformFee);
        }
    }

    /**
     * @dev Process CC token settlement
     */
    function _processCCSettlement(ComputeOrder storage order, uint256 providerPayment, uint256 platformFee) internal {
        uint256 totalCCPaid = _calculateTotalCCPaidFromOrder(order);
        uint256 burnAmount = (totalCCPaid * burnRateBps) / 10000;

        if (burnAmount > 0) {
            ccToken.burnFrom(address(this), burnAmount);
        }

        uint256 remainingCC = totalCCPaid - burnAmount;
        uint256 providerCCPayment = (remainingCC * providerPayment) / order.finalPrice;
        uint256 platformFeeCC = (remainingCC * platformFee) / order.finalPrice;

        ccToken.safeTransfer(order.provider, providerCCPayment);
        ccToken.safeTransfer(treasury, platformFeeCC);
    }

    /**
     * @dev Process refund
     */
    function _processRefund(uint256 orderId, uint256 _refundAmount) internal {
        ComputeOrder storage order = orders[orderId];
        if (_refundAmount == 0) return;

        uint256 totalPaid = uint256(order.totalPaidAmount);
        uint256 refundPercentage = (_refundAmount * 10000) / totalPaid;

        for (uint i = 0; i < order.paymentCount; i++) {
            PaymentRecord memory payment = order.payments[i];
            uint256 refundAmount = (uint256(payment.amount) * refundPercentage) / 10000;

            if (refundAmount > 0) {
                if (payment.tokenType == PaymentToken.CCUSD) {
                    ccusdToken.safeTransfer(order.client, refundAmount);
                } else if (payment.tokenType == PaymentToken.CC) {
                    ccToken.safeTransfer(order.client, refundAmount);
                }
            }
        }
    }

    /**
     * @dev Calculate total CC paid
     */
    function _calculateTotalCCPaid(uint256 orderId) internal view returns (uint256) {
        return _calculateTotalCCPaidFromOrder(orders[orderId]);
    }

    function _calculateTotalCCPaidFromOrder(ComputeOrder storage order) internal view returns (uint256) {
        uint256 totalCC = 0;

        for (uint i = 0; i < order.paymentCount; i++) {
            if (order.payments[i].tokenType == PaymentToken.CC) {
                totalCC += uint256(order.payments[i].amount);
            }
        }

        return totalCC;
    }

    // Validation functions
    function _validateTokenAllowance(PaymentToken tokenType, address user, uint256 amount) internal view returns (bool) {
        if (tokenType == PaymentToken.CCUSD) {
            return ccusdToken.allowance(user, address(this)) >= amount;
        } else if (tokenType == PaymentToken.CC) {
            return ccToken.allowance(user, address(this)) >= amount;
        }
        return false;
    }

    function _validateTokenBalance(PaymentToken tokenType, address user, uint256 amount) internal view returns (bool) {
        if (tokenType == PaymentToken.CCUSD) {
            return ccusdToken.balanceOf(user) >= amount;
        } else if (tokenType == PaymentToken.CC) {
            return ccToken.balanceOf(user) >= amount;
        }
        return false;
    }

    // View functions
    function getOrder(uint256 orderId) external view returns (
        uint128 id,
        address client,
        address provider,
        uint128 finalPrice,
        OrderStatus status,
        uint64 createTime,
        uint64 paymentTime,
        uint128 customerNftId,
        PaymentToken primaryPaymentToken,
        uint128 totalPaidAmount,
        uint64 exchangeRate,
        uint8 paymentCount
    ) {
        ComputeOrder storage order = orders[orderId];
        return (
            order.id,
            order.client,
            order.provider,
            order.finalPrice,
            order.status,
            order.createTime,
            order.paymentTime,
            order.customerNftId,
            order.primaryPaymentToken,
            order.totalPaidAmount,
            order.exchangeRate,
            order.paymentCount
        );
    }

    function getOrderPayment(uint256 orderId, uint256 paymentIndex) external view returns (PaymentRecord memory) {
        return orders[orderId].payments[paymentIndex];
    }

    // Admin functions
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high");
        platformFeeBps = newFeeBps;
    }

    function setBurnRate(uint256 newBurnRateBps) external onlyOwner {
        require(newBurnRateBps <= 500, "Burn rate too high");
        burnRateBps = newBurnRateBps;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
    }

    function setCCPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Invalid price");
        ccTokenPrice = newPrice;
    }
}