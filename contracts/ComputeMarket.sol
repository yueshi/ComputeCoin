// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CCToken.sol";
import "./CustomerNFT.sol";

/**
 * @title ComputeMarket - Enhanced with Advanced Settlement
 * @dev Enhanced marketplace with intelligent fund settlement and partial payments
 * @notice Supports escrow-style fund management and multi-stage payment processing
 */
contract ComputeMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeERC20 for CCToken;

    // Enhanced order status enumeration
    enum OrderStatus {
        CREATED,    // 订单已创建，等待支付
        PAID,       // 已支付，资金托管中
        ACTIVE,     // 服务进行中
        COMPLETED,  // 服务已完成，等待确认
        CONFIRMED,  // 已确认，资金已释放
        CANCELLED,  // 已取消
        EXPIRED,    // 已过期
        DISPUTED    // 争议处理中
    }

    // Payment token type enumeration
    enum PaymentToken { NONE, CC, CCUSD }

    // Cancellation reason enumeration
    enum CancelReason {
        CLIENT_REQUEST,      // 客户主动取消
        PROVIDER_REQUEST,    // 提供商主动取消
        TIMEOUT,            // 超时取消
        MUTUAL_AGREEMENT,   // 双方同意
        PLATFORM_INTERVENTION // 平台干预
    }

    // Gas-optimized constants
    uint256 private constant BPS_PRECISION = 10000;
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant MAX_PAYMENTS = 10; // Limit payment records for gas efficiency

    // Payment record structure for partial payments (optimized)
    struct PaymentRecord {
        uint128 amount;              // Payment amount (sufficient for most values)
        PaymentToken tokenType;      // Token type used
        uint64 timestamp;            // Payment timestamp (sufficient until 2106)
        uint64 exchangeRate;         // Exchange rate at payment time
        string description;          // Payment description
    }

    // Escrow fund structure (optimized)
    struct EscrowFund {
        uint128 totalAmount;         // Total escrowed amount (in USD equivalent)
        uint128 releasedAmount;      // Amount released to provider
        uint128 refundAmount;        // Amount refunded to client
        uint64 platformFee;          // Platform fee amount
        bool isFrozen;               // Whether funds are frozen (dispute)
    }

    // Cancellation terms structure (optimized)
    struct CancellationTerms {
        uint16 clientPenaltyBps;     // Client cancellation penalty (basis points, max 10000)
        uint16 providerPenaltyBps;   // Provider cancellation penalty (max 10000)
        uint16 refundablePercentage; // Refundable percentage by stage (max 10000)
        bool allowRefund;            // Whether refund is allowed
    }

    // Enhanced order data structure (optimized for storage)
    struct ComputeOrder {
        uint128 id;                  // Order ID (sufficient for billions of orders)
        address client;              // Client address
        address provider;            // Provider address
        uint128 usdPrice;            // Base price in CCUSD (max 3.4e28 CCUSD)
        uint128 finalPrice;          // Final price after discount (CCUSD)
        OrderStatus status;          // Current order status
        uint64 createTime;           // Order creation timestamp
        uint64 paymentTime;          // Payment timestamp
        uint64 serviceStartTime;     // Service start timestamp
        uint64 completionTime;       // Completion timestamp
        uint64 confirmTime;          // Confirmation timestamp
        uint64 cancelTime;           // Cancellation timestamp
        uint128 customerNftId;       // Customer NFT ID (optional)

        // Enhanced payment tracking (optimized)
        PaymentRecord[MAX_PAYMENTS] payments; // Fixed-size payment history
        uint8 paymentCount;          // Number of payments (max 255)
        PaymentToken primaryPaymentToken; // Primary payment token
        uint128 totalPaidAmount;     // Total amount paid (USD equivalent)
        uint64 exchangeRate;         // Exchange rate at first payment

        // Escrow and settlement
        EscrowFund escrow;           // Escrow fund information
        CancellationTerms cancelTerms; // Cancellation terms
        CancelReason cancelReason;   // Reason for cancellation (if applicable)

        // Service tracking
        uint16 serviceProgress;      // Service completion percentage (0-10000)
        uint32 expectedDuration;     // Expected service duration (seconds, max 136 years)
        uint32 actualDuration;       // Actual service duration
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
    uint256 public burnRateBps = 150;     // 1.5% burn rate

    // CC token price (in CCUSD, fixed exchange rate)
    uint256 public ccTokenPrice = 1 * 10**17; // 1 CC = 0.1 CCUSD (1 CCUSD = 10 CC)

    // Exchange rate protection mechanisms
    uint256 public priceChangeLimitBps = 500;      // 5% max price change per update
    uint256 public priceUpdateDelay = 24 hours;    // Minimum time between price updates
    uint256 public lastPriceUpdateTime;            // Timestamp of last price update
    uint256 public pendingPriceUpdate;             // New price awaiting activation
    uint256 public priceUpdateActivationTime;      // When pending price becomes active
    bool public hasPendingPriceUpdate;             // Flag for pending updates

    // Treasury for platform fees
    address public treasury;

    // Enhanced security controls
    bool public marketPaused;
    uint256 public maxOrderValue;
    uint256 public minOrderValue;
    uint256 public orderTimeout = 24 hours;        // Order timeout period
    uint256 public confirmationWindow = 7 days;   // Client confirmation window
    uint256 public serviceGracePeriod = 1 hours;  // Grace period after completion
    mapping(address => uint256) public userDailyOrderValue;
    mapping(address => uint256) public lastOrderDay;

    // Cancellation policy configuration
    uint256 public clientCancelPenaltyBps = 500;    // 5% penalty for client cancellation
    uint256 public providerCancelPenaltyBps = 1000; // 10% penalty for provider cancellation
    uint256 public minCancelFee = 1 * 10**6;        // Minimum cancellation fee (1 CCUSD)

    // Enhanced statistics
    uint256 public totalOrders;
    uint256 public totalVolumeUSD;
    uint256 public totalVolumeCC;
    uint256 public totalBurnedCC;
    uint256 public totalPlatformFees;
    uint256 public totalCCUSDPayments;
    uint256 public totalCCPayments;
    uint256 public totalRefunds;
    uint256 public totalPenalties;

    // Payment tracking
    mapping(PaymentToken => uint256) public volumeByToken;
    mapping(PaymentToken => uint256) public feesByToken;

    // Escrow tracking
    uint256 public totalEscrowedAmount;
    uint256 public totalReleasedAmount;
    uint256 public totalRefundedAmount;

    // Enhanced events
    event OrderCreated(uint256 indexed orderId, address indexed client, address indexed provider, uint256 price);
    event PaymentReceived(uint256 indexed orderId, address indexed payer, PaymentToken tokenType, uint256 amount, string description);
    event OrderStarted(uint256 indexed orderId, address indexed provider);
    event OrderCompleted(uint256 indexed orderId, uint256 finalPrice, uint256 providerPayment);
    event OrderConfirmed(uint256 indexed orderId, address indexed client);
    event OrderCancelled(uint256 indexed orderId, CancelReason reason, uint256 refundAmount, uint256 penalty);
    event OrderDisputed(uint256 indexed orderId, address indexed disputer);
    event FundsEscrowed(uint256 indexed orderId, uint256 amount);
    event FundsReleased(uint256 indexed orderId, address indexed to, uint256 amount);
    event FundsRefunded(uint256 indexed orderId, address indexed to, uint256 amount);
    event PenaltyCharged(uint256 indexed orderId, address indexed charged, uint256 amount);
    event TokensBurned(uint256 amount);
    event PlatformFeeCollected(uint256 amount, PaymentToken token);
    event ExchangeRateRecorded(uint256 indexed orderId, uint256 rate);
    event PriceUpdateScheduled(uint256 newPrice, uint256 activationTime);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event EmergencyPriceUpdate(uint256 oldPrice, uint256 newPrice);

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
     * @dev Create new compute order with enhanced terms
     */
    function createOrder(
        address _provider,
        uint256 _usdPrice,
        bool _useNFTDiscount,
        uint256 _expectedDuration
    ) external nonReentrant whenNotPaused canCreateOrder validProvider(_provider) returns (uint256) {
        require(_provider != address(0), "Invalid provider");
        require(_usdPrice >= minOrderValue && _usdPrice <= maxOrderValue, "Invalid price");
        require(_expectedDuration > 0, "Invalid duration");
        require(_usdPrice <= type(uint128).max, "Price exceeds maximum");

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

        // Calculate final price with overflow protection (optimized)
        require(_usdPrice <= type(uint256).max / BPS_PRECISION, "Price too large for discount calculation");
        uint256 discountAmount = (_usdPrice * discount) / BPS_PRECISION;
        uint256 finalPrice = _usdPrice - discountAmount;

        // Initialize optimized order in storage
        ComputeOrder storage order = orders[orderId];
        order.id = uint128(orderId);
        order.client = msg.sender;
        order.provider = _provider;
        order.usdPrice = uint128(_usdPrice);
        order.finalPrice = uint128(finalPrice);
        order.status = OrderStatus.CREATED;
        order.createTime = uint64(block.timestamp);
        order.customerNftId = uint128(customerNftId);

        // Payment tracking (optimized)
        order.paymentCount = 0;
        order.primaryPaymentToken = PaymentToken.NONE;
        order.totalPaidAmount = 0;
        order.exchangeRate = 0;

        // Escrow and settlement (optimized)
        order.escrow.totalAmount = 0;
        order.escrow.releasedAmount = 0;
        order.escrow.refundAmount = 0;
        order.escrow.platformFee = 0;
        order.escrow.isFrozen = false;

        order.cancelTerms.clientPenaltyBps = uint16(clientCancelPenaltyBps);
        order.cancelTerms.providerPenaltyBps = uint16(providerCancelPenaltyBps);
        order.cancelTerms.refundablePercentage = 10000;
        order.cancelTerms.allowRefund = true;
        order.cancelReason = CancelReason.CLIENT_REQUEST;

        // Service tracking (optimized)
        order.serviceProgress = 0;
        order.expectedDuration = uint32(_expectedDuration);
        order.actualDuration = 0;

        // Update statistics
        totalOrders++;

        // Update daily order tracking
        _updateDailyOrder(msg.sender, _usdPrice);

        emit OrderCreated(orderId, msg.sender, _provider, _usdPrice);
        return orderId;
    }

    // Payment tracking to prevent duplicates
    mapping(uint256 => mapping(bytes32 => bool)) public paymentHashes; // orderId => paymentHash => exists

    // Gas-optimized role-based access control
    struct UserInfo {
        bool isProvider;              // Provider authorization status
        bool isClient;                // Client authorization status
        bool isAdmin;                 // Admin authorization status
        uint8 permissions;            // Bitmask for user permissions (max 255 permissions)
    }

    mapping(address => UserInfo) public users;  // Combined user information

    // Permission constants (optimized to uint8)
    uint8 public constant PERMISSION_CREATE_ORDER = 1;
    uint8 public constant PERMISSION_PROVIDER_SERVICE = 2;
    uint8 public constant PERMISSION_ADMIN_FUNCTIONS = 4;
    uint8 public constant PERMISSION_DISPUTE_RESOLUTION = 8;

    /**
     * @dev Make partial payment for order with duplicate protection
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

        // Additional validation to prevent duplicate payments (optimized)
        require(order.paymentCount == 0 || block.timestamp > order.payments[order.paymentCount - 1].timestamp + 1 minutes,
                "Payment too frequent");
        require(order.paymentCount < MAX_PAYMENTS, "Maximum payment records reached");

        // Create unique payment hash to prevent duplicates
        bytes32 paymentHash = keccak256(abi.encodePacked(
            orderId,
            msg.sender,
            _amount,
            _tokenType,
            _description,
            block.timestamp,
            block.number
        ));

        require(!paymentHashes[orderId][paymentHash], "Duplicate payment detected");
        paymentHashes[orderId][paymentHash] = true;

        uint256 usdEquivalent;

        if (_tokenType == PaymentToken.CCUSD) {
            require(order.totalPaidAmount <= type(uint128).max - uint128(_amount), "Overflow in payment addition");
            require(order.totalPaidAmount + uint128(_amount) <= order.finalPrice, "Overpayment");
            usdEquivalent = _amount;

            // Transfer CCUSD to this contract
            ccusdToken.safeTransferFrom(msg.sender, address(this), _amount);

        } else if (_tokenType == PaymentToken.CC) {
            uint256 ccAmount = _amount;
            require(ccAmount <= type(uint256).max / ccTokenPrice, "CC amount too large");

            usdEquivalent = (ccAmount * ccTokenPrice) / 10**18;
            require(order.totalPaidAmount <= type(uint128).max - uint128(usdEquivalent), "Overflow in payment addition");
            require(order.totalPaidAmount + uint128(usdEquivalent) <= order.finalPrice, "Overpayment");

            // Transfer CC tokens to this contract
            ccToken.safeTransferFrom(msg.sender, address(this), ccAmount);

        } else {
            revert("Unsupported token type");
        }

        // Record payment (optimized for fixed array)
        order.payments[order.paymentCount] = PaymentRecord({
            amount: uint128(_amount),
            tokenType: _tokenType,
            timestamp: uint64(block.timestamp),
            exchangeRate: _tokenType == PaymentToken.CC ? uint64(ccTokenPrice) : 0,
            description: _description
        });
        order.paymentCount++;

        // Update order payment info
        if (order.primaryPaymentToken == PaymentToken.NONE) {
            order.primaryPaymentToken = _tokenType;
            order.exchangeRate = _tokenType == PaymentToken.CC ? uint64(ccTokenPrice) : 0;
        }

        order.totalPaidAmount = order.totalPaidAmount + uint128(usdEquivalent);

        // Update escrow with overflow protection
        require(order.escrow.totalAmount <= type(uint128).max - uint128(usdEquivalent), "Escrow overflow");
        order.escrow.totalAmount = order.escrow.totalAmount + uint128(usdEquivalent);
        require(totalEscrowedAmount <= type(uint256).max - usdEquivalent, "Total escrow overflow");
        totalEscrowedAmount = totalEscrowedAmount + usdEquivalent;

        // Check if payment is complete
        if (order.totalPaidAmount >= order.finalPrice) {
            order.status = OrderStatus.PAID;
            order.paymentTime = uint64(block.timestamp);
            emit FundsEscrowed(orderId, order.escrow.totalAmount);
        }

        // Update statistics with overflow protection
        if (_tokenType == PaymentToken.CCUSD) {
            require(totalCCUSDPayments <= type(uint256).max - _amount, "CCUSD payments overflow");
            totalCCUSDPayments = totalCCUSDPayments + _amount;
            require(volumeByToken[PaymentToken.CCUSD] <= type(uint256).max - _amount, "CCUSD volume overflow");
            volumeByToken[PaymentToken.CCUSD] = volumeByToken[PaymentToken.CCUSD] + _amount;
        } else {
            require(totalCCPayments <= type(uint256).max - _amount, "CC payments overflow");
            totalCCPayments = totalCCPayments + _amount;
            require(volumeByToken[PaymentToken.CC] <= type(uint256).max - _amount, "CC volume overflow");
            volumeByToken[PaymentToken.CC] = volumeByToken[PaymentToken.CC] + _amount;
        }

        emit PaymentReceived(orderId, msg.sender, _tokenType, _amount, _description);
        emit ExchangeRateRecorded(orderId, order.exchangeRate);
    }

    /**
     * @dev Start service execution
     */
    function startService(uint256 orderId) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status == OrderStatus.PAID, "Order not ready for service");

        // Enhanced permission checks
        require(
            (msg.sender == order.provider && hasPermission(msg.sender, PERMISSION_PROVIDER_SERVICE)) ||
            (msg.sender == order.client && hasPermission(msg.sender, PERMISSION_CREATE_ORDER)) ||
            (msg.sender == owner() && hasPermission(msg.sender, PERMISSION_ADMIN_FUNCTIONS)),
            "Not authorized to start service"
        );

        order.serviceStartTime = uint64(block.timestamp);
        order.status = OrderStatus.ACTIVE;

        // Update cancellation terms (less refundable as service starts)
        order.cancelTerms.refundablePercentage = uint16(8000); // 80% refundable after service starts

        emit OrderStarted(orderId, msg.sender);
    }

    /**
     * @dev Update service progress
     */
    function updateServiceProgress(uint256 orderId, uint256 _progress) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status == OrderStatus.ACTIVE, "Order not in active state");
        require(
            msg.sender == order.provider ||
            msg.sender == owner(),
            "Not authorized to update progress"
        );
        require(_progress <= 10000, "Invalid progress percentage");
        require(_progress > order.serviceProgress, "Progress cannot decrease");

        order.serviceProgress = uint16(_progress);

        // Update refundable percentage based on progress (optimized)
        if (_progress <= 2500) {
            order.cancelTerms.refundablePercentage = uint16(8000); // 80% refundable
        } else if (_progress <= 5000) {
            order.cancelTerms.refundablePercentage = uint16(6000); // 60% refundable
        } else if (_progress <= 7500) {
            order.cancelTerms.refundablePercentage = uint16(4000); // 40% refundable
        } else {
            order.cancelTerms.refundablePercentage = uint16(2000); // 20% refundable
        }
    }

    /**
     * @dev Complete order (provider marks completion)
     */
    function completeOrder(uint256 orderId) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status == OrderStatus.ACTIVE, "Order not in active status");
        require(
            msg.sender == order.provider ||
            msg.sender == owner(),
            "Not authorized to complete"
        );

        order.completionTime = uint64(block.timestamp);
        order.actualDuration = uint32(order.completionTime - order.serviceStartTime);
        order.status = OrderStatus.COMPLETED;

        // Freeze funds during confirmation window
        order.escrow.isFrozen = true;

        emit OrderCompleted(orderId, order.finalPrice, 0); // Payment amount determined at confirmation
    }

    /**
     * @dev Confirm order and release funds (client confirmation)
     */
    function confirmOrder(uint256 orderId) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status == OrderStatus.COMPLETED, "Order not completed");
        require(order.client == msg.sender, "Not order client");

        // Check if within confirmation window or service has been completed for grace period
        bool inConfirmationWindow = block.timestamp <= order.completionTime + confirmationWindow;
        bool afterGracePeriod = block.timestamp > order.completionTime + serviceGracePeriod;

        require(inConfirmationWindow || afterGracePeriod, "Cannot confirm yet");

        // Process fund settlement
        _processFundSettlement(orderId);

        order.confirmTime = uint64(block.timestamp);
        order.status = OrderStatus.CONFIRMED;

        emit OrderConfirmed(orderId, msg.sender);
    }

    /**
     * @dev Cancel order with enhanced validation and intelligent refund calculation
     */
    function cancelOrder(uint256 orderId, CancelReason _reason) external nonReentrant {
        ComputeOrder storage order = orders[orderId];
        require(order.status != OrderStatus.CONFIRMED && order.status != OrderStatus.CANCELLED, "Order cannot be cancelled");

        // Enhanced authorization and timing validation
        _validateCancellationRequest(order, _reason);

        order.cancelReason = _reason;
        order.cancelTime = uint64(block.timestamp);

        uint256 refundAmount = _calculateRefundAmount(orderId, msg.sender);
        uint256 penaltyAmount = 0;

        if (order.totalPaidAmount > 0) {
            if (refundAmount < order.totalPaidAmount) {
                penaltyAmount = order.totalPaidAmount - refundAmount;
            }

            _processRefund(orderId, refundAmount);

            if (penaltyAmount > 0) {
                _processPenalty(orderId, penaltyAmount);
            }
        }

        order.status = OrderStatus.CANCELLED;
        order.escrow.isFrozen = false;

        emit OrderCancelled(orderId, _reason, refundAmount, penaltyAmount);
    }

    /**
     * @dev Validate cancellation request based on order status and caller
     */
    function _validateCancellationRequest(ComputeOrder storage order, CancelReason _reason) internal view {
        address caller = msg.sender;

        // Time-based restrictions
        if (order.status == OrderStatus.CREATED) {
            // Created orders can be cancelled by client or provider within 24 hours
            require(
                caller == order.client || caller == order.provider || caller == owner(),
                "Only client, provider, or owner can cancel created orders"
            );

            // Provider can't cancel if client has already paid
            if (caller == order.provider && order.totalPaidAmount > 0) {
                require(_reason == CancelReason.PROVIDER_REQUEST || _reason == CancelReason.TIMEOUT,
                        "Provider cannot cancel paid orders without valid reason");
            }

        } else if (order.status == OrderStatus.PAID) {
            // Paid orders: different rules for client vs provider
            uint256 timeSincePayment = block.timestamp - order.paymentTime;

            if (caller == order.client) {
                // Client cancellation: stricter rules after payment
                require(timeSincePayment <= 1 hours, "Client cancellation window expired");
                require(_reason == CancelReason.CLIENT_REQUEST, "Invalid reason for client cancellation");

            } else if (caller == order.provider) {
                // Provider cancellation: only allowed with valid reasons
                require(_reason == CancelReason.TIMEOUT || _reason == CancelReason.MUTUAL_AGREEMENT,
                        "Provider cannot cancel paid orders without valid reason");
                require(timeSincePayment >= 30 minutes, "Provider must wait before cancellation");

            } else {
                require(caller == owner(), "Only owner can cancel paid orders");
            }

        } else if (order.status == OrderStatus.ACTIVE) {
            // Active orders: only provider or owner can cancel
            require(
                caller == order.provider || caller == owner(),
                "Only provider or owner can cancel active orders"
            );

            if (caller == order.provider) {
                require(_reason == CancelReason.TIMEOUT || _reason == CancelReason.MUTUAL_AGREEMENT,
                        "Provider needs valid reason for cancellation");
            }

        } else if (order.status == OrderStatus.COMPLETED) {
            // Completed orders: very limited cancellation
            uint256 timeSinceCompletion = block.timestamp - order.completionTime;
            require(timeSinceCompletion <= serviceGracePeriod, "Cancellation window expired");
            require(caller == owner() && _reason == CancelReason.PLATFORM_INTERVENTION,
                    "Only owner can cancel completed orders within grace period");
        }

        // Additional validation for mutual agreement
        if (_reason == CancelReason.MUTUAL_AGREEMENT) {
            require(
                caller == order.client || caller == order.provider || caller == owner(),
                "Mutual agreement requires participant authorization"
            );
        }
    }

    /**
     * @dev Calculate refund amount based on cancellation terms with enhanced precision (optimized)
     */
    function _calculateRefundAmount(uint256 orderId, address _canceler) internal view returns (uint256) {
        ComputeOrder storage order = orders[orderId];

        if (order.totalPaidAmount == 0) {
            return 0; // Nothing to refund
        }

        uint256 refundableAmount;
        uint256 penaltyBps = 0;

        // Determine penalty based on who cancels and when (optimized)
        if (_canceler == order.client) {
            penaltyBps = order.cancelTerms.clientPenaltyBps;
        } else if (_canceler == order.provider) {
            penaltyBps = order.cancelTerms.providerPenaltyBps;
        }

        // Apply refundable percentage using optimized multiplication
        uint256 totalPaid = uint256(order.totalPaidAmount);
        require(order.cancelTerms.refundablePercentage <= BPS_PRECISION, "Invalid refundable percentage");
        refundableAmount = (totalPaid * order.cancelTerms.refundablePercentage) / BPS_PRECISION;

        // Apply penalty with overflow protection (optimized)
        if (penaltyBps > 0) {
            require(refundableAmount <= type(uint256).max / penaltyBps, "Penalty calculation overflow");
            uint256 penaltyAmount = (refundableAmount * penaltyBps) / BPS_PRECISION;
            require(refundableAmount >= penaltyAmount, "Penalty exceeds refundable amount");
            refundableAmount -= penaltyAmount;
        }

        // Apply minimum fee with proper bounds checking (optimized)
        if (refundableAmount > minCancelFee) {
            require(refundableAmount >= minCancelFee, "Refundable amount insufficient for minimum fee");
            refundableAmount -= minCancelFee;
        } else {
            refundableAmount = 0;
        }

        return refundableAmount;
    }

    /**
     * @dev Process fund settlement after confirmation
     */
    function _processFundSettlement(uint256 orderId) internal {
        ComputeOrder storage order = orders[orderId];

        uint256 paymentAmount = uint256(order.finalPrice);
        uint256 platformFee = (paymentAmount * platformFeeBps) / BPS_PRECISION;
        uint256 providerPayment = paymentAmount - platformFee;

        // Handle CC payment with burn mechanism
        if (order.primaryPaymentToken == PaymentToken.CC) {
            _processCCSettlement(order, providerPayment, platformFee);
        } else if (order.primaryPaymentToken == PaymentToken.CCUSD) {
            _processCCUSDSettlement(order, providerPayment, platformFee);
        } else {
            revert("Invalid payment token for settlement");
        }

        // Update escrow records with overflow protection
        order.escrow.releasedAmount = uint128(providerPayment);
        order.escrow.platformFee = uint64(platformFee);
        order.escrow.isFrozen = false;

        require(totalReleasedAmount <= type(uint256).max - providerPayment, "Released amount overflow");
        totalReleasedAmount = totalReleasedAmount + providerPayment;
        require(totalVolumeUSD <= type(uint256).max - paymentAmount, "Volume overflow");
        totalVolumeUSD = totalVolumeUSD + paymentAmount;
    }

    /**
     * @dev Process CC token settlement with burn mechanism
     */
    function _processCCSettlement(
        ComputeOrder storage order,
        uint256 providerPayment,
        uint256 platformFee
    ) internal {
        uint256 totalCCPaid = _calculateTotalCCPaid(uint256(order.id));
        require(totalCCPaid <= type(uint256).max / burnRateBps, "Amount too large for burn calculation");
        uint256 burnAmount = (totalCCPaid * burnRateBps) / BPS_PRECISION;

        // Burn CC tokens
        if (burnAmount > 0) {
            ccToken.burnFrom(address(this), burnAmount);
            totalBurnedCC += burnAmount;
        }

        // Calculate actual CC amounts
        uint256 remainingCC = totalCCPaid - burnAmount;
        require(remainingCC <= type(uint256).max, "Remaining CC amount too large");

        uint256 providerCCPayment = (remainingCC * providerPayment) / order.finalPrice;
        uint256 platformFeeCC = (remainingCC * platformFee) / order.finalPrice;

        // Transfer CC to provider
        ccToken.safeTransfer(order.provider, providerCCPayment);

        // Transfer platform fee to treasury
        ccToken.safeTransfer(treasury, platformFeeCC);

        require(totalPlatformFees <= type(uint256).max - platformFeeCC, "Platform fees overflow");
        totalPlatformFees = totalPlatformFees + platformFeeCC;
        require(totalVolumeCC <= type(uint256).max - totalCCPaid, "CC volume overflow");
        totalVolumeCC = totalVolumeCC + totalCCPaid;
        require(feesByToken[PaymentToken.CC] <= type(uint256).max - platformFeeCC, "CC fees overflow");
        feesByToken[PaymentToken.CC] = feesByToken[PaymentToken.CC] + platformFeeCC;

        emit FundsReleased(order.id, order.provider, providerCCPayment);
        emit PlatformFeeCollected(platformFee, PaymentToken.CC);

        if (burnAmount > 0) {
            emit TokensBurned(burnAmount);
        }
    }

    /**
     * @dev Process CCUSD settlement
     */
    function _processCCUSDSettlement(
        ComputeOrder storage order,
        uint256 providerPayment,
        uint256 platformFee
    ) internal {
        // Transfer payment to provider
        ccusdToken.safeTransfer(order.provider, providerPayment);

        // Transfer platform fee to treasury
        ccusdToken.safeTransfer(treasury, platformFee);

        require(totalPlatformFees <= type(uint256).max - platformFee, "Platform fees overflow");
        totalPlatformFees = totalPlatformFees + platformFee;
        require(feesByToken[PaymentToken.CCUSD] <= type(uint256).max - platformFee, "CCUSD fees overflow");
        feesByToken[PaymentToken.CCUSD] = feesByToken[PaymentToken.CCUSD] + platformFee;

        emit FundsReleased(order.id, order.provider, providerPayment);
        emit PlatformFeeCollected(platformFee, PaymentToken.CCUSD);
    }

    /**
     * @dev Process refund with enhanced precision and error handling
     */
    function _processRefund(uint256 orderId, uint256 _refundAmount) internal {
        ComputeOrder storage order = orders[orderId];

        if (_refundAmount == 0) return;

        require(order.totalPaidAmount > 0, "Cannot refund with zero total paid amount");

        uint256 totalPaid = uint256(order.totalPaidAmount);
        uint256 refundPercentage = (_refundAmount * BPS_PRECISION) / totalPaid;
        require(refundPercentage <= BPS_PRECISION, "Invalid refund percentage");

        uint256 totalRefunded = 0;

        // Calculate and refund based on payment records (optimized for fixed array)
        for (uint i = 0; i < order.paymentCount; i++) {
            PaymentRecord memory payment = order.payments[i];
            require(uint256(payment.amount) <= type(uint256).max / refundPercentage, "Refund calculation overflow");
            uint256 refundAmount = (uint256(payment.amount) * refundPercentage) / BPS_PRECISION;

            if (refundAmount > 0) {
                if (payment.tokenType == PaymentToken.CCUSD) {
                    ccusdToken.safeTransfer(order.client, refundAmount);
                    emit FundsRefunded(orderId, order.client, refundAmount);
                } else if (payment.tokenType == PaymentToken.CC) {
                    ccToken.safeTransfer(order.client, refundAmount);
                    emit FundsRefunded(orderId, order.client, refundAmount);
                }
                totalRefunded += refundAmount;
            }
        }

        // Verify total refunded matches expected amount (allowing for rounding errors)
        require(totalRefunded <= _refundAmount && totalRefunded >= _refundAmount - 1, "Refund amount mismatch");

        order.escrow.refundAmount = uint128(_refundAmount);
        require(totalRefundedAmount <= type(uint256).max - _refundAmount, "Refunded amount overflow");
        totalRefundedAmount = totalRefundedAmount + _refundAmount;
        require(totalRefunds <= type(uint256).max - _refundAmount, "Refunds overflow");
        totalRefunds = totalRefunds + _refundAmount;
    }

    /**
     * @dev Process penalty payment with clear allocation rules
     */
    function _processPenalty(uint256 orderId, uint256 _penaltyAmount) internal {
        ComputeOrder storage order = orders[orderId];

        if (_penaltyAmount == 0) return;

        // Determine penalty allocation based on cancellation reason and service progress
        address penaltyRecipient;
        string memory reason;

        if (order.cancelReason == CancelReason.CLIENT_REQUEST) {
            // Client cancelled: penalty goes to provider as compensation
            penaltyRecipient = order.provider;
            reason = "Client cancellation penalty to provider";

        } else if (order.cancelReason == CancelReason.PROVIDER_REQUEST) {
            // Provider cancelled: penalty goes to platform
            penaltyRecipient = treasury;
            reason = "Provider cancellation penalty to platform";

        } else if (order.cancelReason == CancelReason.TIMEOUT) {
            // Timeout: determine who was at fault
            if (order.serviceProgress < 2500) {
                // Provider barely started: penalty to client via platform
                penaltyRecipient = order.client;
                reason = "Provider timeout penalty to client";
            } else {
                // Significant progress: penalty to platform
                penaltyRecipient = treasury;
                reason = "Timeout penalty to platform";
            }

        } else if (order.cancelReason == CancelReason.MUTUAL_AGREEMENT) {
            // Mutual agreement: split penalty between platform and provider
            // 70% to provider, 30% to platform
            _processSplitPenalty(orderId, _penaltyAmount, order.provider, treasury, 7000, 3000);
            require(totalPenalties <= type(uint256).max - _penaltyAmount, "Penalties overflow");
            totalPenalties = totalPenalties + _penaltyAmount;
            emit PenaltyCharged(orderId, msg.sender, _penaltyAmount);
            return;

        } else if (order.cancelReason == CancelReason.PLATFORM_INTERVENTION) {
            // Platform intervention: penalty goes to platform treasury
            penaltyRecipient = treasury;
            reason = "Platform intervention penalty";
        } else {
            // Default: penalty to platform
            penaltyRecipient = treasury;
            reason = "Default penalty to platform";
        }

        // Calculate and transfer penalty based on payment records with overflow protection (optimized)
        uint256 totalPenaltyTransferred = 0;
        for (uint i = 0; i < order.paymentCount; i++) {
            PaymentRecord memory payment = order.payments[i];
            require(uint256(payment.amount) <= type(uint256).max / _penaltyAmount, "Penalty calculation overflow");
            uint256 penaltyAmount = (uint256(payment.amount) * _penaltyAmount) / uint256(order.totalPaidAmount);

            if (penaltyAmount > 0) {
                if (payment.tokenType == PaymentToken.CCUSD) {
                    ccusdToken.safeTransfer(penaltyRecipient, penaltyAmount);
                } else if (payment.tokenType == PaymentToken.CC) {
                    ccToken.safeTransfer(penaltyRecipient, penaltyAmount);
                }
                totalPenaltyTransferred += penaltyAmount;
            }
        }

        // Verify penalty amount matches
        require(totalPenaltyTransferred == _penaltyAmount, "Penalty amount mismatch");

        require(totalPenalties <= type(uint256).max - _penaltyAmount, "Penalties overflow");
        totalPenalties = totalPenalties + _penaltyAmount;
        emit PenaltyCharged(orderId, msg.sender, _penaltyAmount);
    }

    /**
     * @dev Process split penalty between two recipients
     */
    function _processSplitPenalty(
        uint256 orderId,
        uint256 _penaltyAmount,
        address recipient1,
        address recipient2,
        uint256 split1Bps,
        uint256 split2Bps
    ) internal {
        ComputeOrder storage order = orders[orderId];
        require(split1Bps + split2Bps == BPS_PRECISION, "Split percentages must sum to 10000");

        uint256 totalPenaltyTransferred = 0;

        for (uint i = 0; i < order.paymentCount; i++) {
            PaymentRecord memory payment = order.payments[i];
            require(uint256(payment.amount) <= type(uint256).max / _penaltyAmount, "Penalty calculation overflow");
            uint256 penaltyAmount = (uint256(payment.amount) * _penaltyAmount) / uint256(order.totalPaidAmount);

            if (penaltyAmount > 0) {
                // Calculate split amounts (optimized)
                require(penaltyAmount <= type(uint256).max / split1Bps, "Split calculation overflow");
                uint256 amount1 = (penaltyAmount * split1Bps) / BPS_PRECISION;
                uint256 amount2 = penaltyAmount - amount1;

                // Transfer to recipient 1
                if (amount1 > 0) {
                    if (payment.tokenType == PaymentToken.CCUSD) {
                        ccusdToken.safeTransfer(recipient1, amount1);
                    } else if (payment.tokenType == PaymentToken.CC) {
                        ccToken.safeTransfer(recipient1, amount1);
                    }
                }

                // Transfer to recipient 2
                if (amount2 > 0) {
                    if (payment.tokenType == PaymentToken.CCUSD) {
                        ccusdToken.safeTransfer(recipient2, amount2);
                    } else if (payment.tokenType == PaymentToken.CC) {
                        ccToken.safeTransfer(recipient2, amount2);
                    }
                }

                totalPenaltyTransferred += penaltyAmount;
            }
        }

        require(totalPenaltyTransferred == _penaltyAmount, "Split penalty amount mismatch");
    }

    /**
     * @dev Get enhanced order details
     */
    function getOrder(uint256 orderId) external view returns (ComputeOrder memory) {
        return orders[orderId];
    }

    /**
     * @dev Get order payment summary
     */
    function getOrderPaymentSummary(uint256 orderId) external view returns (
        PaymentToken primaryToken,
        uint256 totalPaid,
        uint256 paymentCount,
        uint256 escrowedAmount,
        uint256 releasedAmount,
        uint256 refundAmount
    ) {
        ComputeOrder storage order = orders[orderId];
        return (
            order.primaryPaymentToken,
            order.totalPaidAmount,
            order.paymentCount,
            order.escrow.totalAmount,
            order.escrow.releasedAmount,
            order.escrow.refundAmount
        );
    }

    /**
     * @dev Get payment records for an order
     */
    function getOrderPayments(uint256 orderId) external view returns (PaymentRecord[] memory) {
        ComputeOrder storage order = orders[orderId];
        PaymentRecord[] memory result = new PaymentRecord[](order.paymentCount);
        for (uint i = 0; i < order.paymentCount; i++) {
            result[i] = order.payments[i];
        }
        return result;
    }

    // Admin functions for configuration
    function setCancellationPolicy(uint256 _clientPenaltyBps, uint256 _providerPenaltyBps, uint256 _minFee) external onlyOwner {
        require(_clientPenaltyBps <= 5000, "Client penalty too high"); // Max 50%
        require(_providerPenaltyBps <= 5000, "Provider penalty too high"); // Max 50%

        clientCancelPenaltyBps = _clientPenaltyBps;
        providerCancelPenaltyBps = _providerPenaltyBps;
        minCancelFee = _minFee;
    }

    function setConfirmationWindow(uint256 _window) external onlyOwner {
        require(_window >= 1 hours && _window <= 30 days, "Invalid confirmation window");
        confirmationWindow = _window;
    }

    function setServiceGracePeriod(uint256 _period) external onlyOwner {
        require(_period >= 15 minutes && _period <= 24 hours, "Invalid grace period");
        serviceGracePeriod = _period;
    }

    /**
     * @dev Calculate total CC paid from payment records
     */
    function _calculateTotalCCPaid(uint256 orderId) internal view returns (uint256) {
        ComputeOrder storage order = orders[orderId];
        uint256 totalCC = 0;

        for (uint i = 0; i < order.paymentCount; i++) {
            if (order.payments[i].tokenType == PaymentToken.CC) {
                totalCC += uint256(order.payments[i].amount);
            }
        }

        return totalCC;
    }

    /**
     * @dev Calculate total CCUSD paid from payment records (optimized)
     */
    function _calculateTotalCCUSDPaid(uint256 orderId) internal view returns (uint256) {
        ComputeOrder storage order = orders[orderId];
        uint256 totalCCUSD = 0;

        for (uint i = 0; i < order.paymentCount; i++) {
            if (order.payments[i].tokenType == PaymentToken.CCUSD) {
                totalCCUSD += uint256(order.payments[i].amount);
            }
        }

        return totalCCUSD;
    }

    // Keep existing utility functions
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

    // Existing admin functions (keep them)
    function setCCPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Invalid price");

        // Calculate price change percentage (optimized)
        uint256 priceChange;
        if (newPrice > ccTokenPrice) {
            priceChange = ((newPrice - ccTokenPrice) * BPS_PRECISION) / ccTokenPrice;
        } else {
            priceChange = ((ccTokenPrice - newPrice) * BPS_PRECISION) / ccTokenPrice;
        }

        require(priceChange <= priceChangeLimitBps, "Price change exceeds limit");
        require(block.timestamp >= lastPriceUpdateTime + priceUpdateDelay, "Price update too soon");

        // Create delayed price update
        pendingPriceUpdate = newPrice;
        priceUpdateActivationTime = block.timestamp + priceUpdateDelay;
        hasPendingPriceUpdate = true;

        emit PriceUpdateScheduled(newPrice, priceUpdateActivationTime);
    }

    /**
     * @dev Activate pending price update (can be called by anyone after activation time)
     */
    function activatePendingPriceUpdate() external {
        require(hasPendingPriceUpdate, "No pending price update");
        require(block.timestamp >= priceUpdateActivationTime, "Update not yet active");

        uint256 oldPrice = ccTokenPrice;
        ccTokenPrice = pendingPriceUpdate;
        lastPriceUpdateTime = block.timestamp;

        // Clear pending update
        hasPendingPriceUpdate = false;
        pendingPriceUpdate = 0;
        priceUpdateActivationTime = 0;

        emit PriceUpdated(oldPrice, ccTokenPrice);
    }

    /**
     * @dev Emergency price update (bypasses protection mechanisms)
     */
    function emergencySetCCPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Invalid price");

        uint256 oldPrice = ccTokenPrice;
        ccTokenPrice = newPrice;
        lastPriceUpdateTime = block.timestamp;

        // Clear any pending updates
        hasPendingPriceUpdate = false;
        pendingPriceUpdate = 0;
        priceUpdateActivationTime = 0;

        emit EmergencyPriceUpdate(oldPrice, newPrice);
    }

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

    function setOrderValueLimits(uint256 minValue, uint256 maxValue) external onlyOwner {
        require(minValue > 0 && maxValue > minValue, "Invalid limits");
        minOrderValue = minValue;
        maxOrderValue = maxValue;
    }

    function setMarketPaused(bool paused) external onlyOwner {
        marketPaused = paused;
    }

    function setOrderTimeout(uint256 timeout) external onlyOwner {
        require(timeout >= 1 hours && timeout <= 30 days, "Invalid timeout period");
        orderTimeout = timeout;
    }

    function setPriceProtectionParameters(uint256 _changeLimitBps, uint256 _updateDelay) external onlyOwner {
        require(_changeLimitBps <= 2000, "Change limit too high"); // Max 20%
        require(_updateDelay >= 1 hours && _updateDelay <= 7 days, "Invalid delay");
        priceChangeLimitBps = _changeLimitBps;
        priceUpdateDelay = _updateDelay;
    }

    /**
     * @dev Check if user has specific permission (optimized)
     */
    function hasPermission(address user, uint8 permission) internal view returns (bool) {
        UserInfo storage userInfo = users[user];
        return (userInfo.permissions & permission) != 0 || userInfo.isAdmin;
    }

    /**
     * @dev Check if user is authorized provider (optimized)
     */
    function isAuthorizedProvider(address provider) internal view returns (bool) {
        return users[provider].isProvider;
    }

    /**
     * @dev Check if user is authorized client (optimized)
     */
    function isAuthorizedClient(address client) internal view returns (bool) {
        return users[client].isClient;
    }

    /**
     * @dev Gas-optimized modifiers for common permission checks
     */
    modifier validProvider(address _provider) {
        require(users[_provider].isProvider, "Provider not authorized");
        _;
    }

    modifier validClient(address _client) {
        require(users[_client].isClient, "Client not authorized");
        _;
    }

    modifier canCreateOrder() {
        UserInfo storage userInfo = users[msg.sender];
        require(userInfo.isClient || (userInfo.permissions & PERMISSION_CREATE_ORDER) != 0, "Not authorized to create orders");
        _;
    }

    /**
     * @dev Grant permission to user (admin only)
     */
    function grantPermission(address user, uint8 permission) external onlyOwner {
        require(user != address(0), "Invalid user address");
        users[user].permissions |= permission;
        emit PermissionGranted(user, permission);
    }

    /**
     * @dev Revoke permission from user (admin only)
     */
    function revokePermission(address user, uint8 permission) external onlyOwner {
        require(user != address(0), "Invalid user address");
        users[user].permissions &= ~permission;
        emit PermissionRevoked(user, permission);
    }

    /**
     * @dev Authorize provider (optimized)
     */
    function authorizeProvider(address provider) external onlyOwner {
        require(provider != address(0), "Invalid provider address");
        users[provider].isProvider = true;
        users[provider].permissions |= PERMISSION_PROVIDER_SERVICE;
        emit ProviderAuthorized(provider);
    }

    /**
     * @dev Authorize client (optimized)
     */
    function authorizeClient(address client) external onlyOwner {
        require(client != address(0), "Invalid client address");
        users[client].isClient = true;
        users[client].permissions |= PERMISSION_CREATE_ORDER;
        emit ClientAuthorized(client);
    }

    /**
     * @dev Authorize admin (optimized)
     */
    function authorizeAdmin(address admin) external onlyOwner {
        require(admin != address(0), "Invalid admin address");
        users[admin].isAdmin = true;
        users[admin].permissions |= PERMISSION_ADMIN_FUNCTIONS | PERMISSION_DISPUTE_RESOLUTION;
        emit AdminAuthorized(admin);
    }

    // Additional events for permission management (optimized)
    event PermissionGranted(address indexed user, uint8 permission);
    event PermissionRevoked(address indexed user, uint8 permission);
    event ProviderAuthorized(address indexed provider);
    event ClientAuthorized(address indexed client);
    event AdminAuthorized(address indexed admin);

    // Modifiers
    modifier whenNotPaused() {
        require(!marketPaused, "Market is paused");
        _;
    }

    modifier requiresPermission(uint8 permission) {
        require(hasPermission(msg.sender, permission), "Insufficient permissions");
        _;
    }
}