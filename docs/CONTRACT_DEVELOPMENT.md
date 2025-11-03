# Smart Contract Development Guide

## Overview

This guide covers smart contract development for the CC Token Platform. The platform consists of 7 core contracts that implement a complete decentralized compute marketplace with token economics.

## Contract Architecture

### Core Contracts

1. **CCToken.sol** - ERC-20 token with burnable functionality
2. **CustomerNFT.sol** - NFT system for customer discounts
3. **ProviderNFT.sol** - NFT system for provider incentives
4. **StakingPool.sol** - Multi-asset staking with NFT minting
5. **ComputeMarket.sol** - Marketplace for compute services
6. **ProviderIncentive.sol** - Reward distribution system
7. **ETHVault.sol** - ETH vault with staking integration

### Contract Interactions

```
CCToken ←→ ComputeMarket ←→ ProviderIncentive
    ↓              ↓              ↓
StakingPool ←→ CustomerNFT   ProviderNFT
    ↓
ETHVault
```

## Development Environment Setup

### Prerequisites

- Node.js v16.0.0+
- npm v8.0.0+
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd cc_pay

# Install dependencies
npm install

# Install OpenZeppelin contracts
npm install @openzeppelin/contracts
```

### Hardhat Configuration

The project uses Hardhat for contract development and testing.

```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      chainId: 1337
    }
  }
}
```

## Contract Development

### Standard Contract Structure

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YourContract is ERC20, Ownable {
    // State variables
    mapping(address => uint256) private balances;
    
    // Events
    event ActionPerformed(address indexed user, uint256 value);
    
    // Modifiers
    modifier onlyValidUser() {
        require(msg.sender != address(0), "Invalid user");
        _;
    }
    
    // Constructor
    constructor() ERC20("Token Name", "SYMBOL") Ownable(msg.sender) {
        // Initialization
    }
    
    // Functions
    function yourFunction() external onlyValidUser {
        // Function logic
    }
}
```

### Best Practices

1. **Use OpenZeppelin Libraries**: Leverage battle-tested contracts
2. **Implement Access Control**: Use `Ownable` or role-based access
3. **Add Events**: Emit events for all state changes
4. **Input Validation**: Validate all function parameters
5. **Gas Optimization**: Minimize storage operations and external calls
6. **Error Handling**: Use descriptive error messages
7. **Security Checks**: Implement reentrancy guards where needed

## Testing

### Test Structure

Tests are located in `/test/` directory using Hardhat's testing framework.

```javascript
// test/YourContract.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("YourContract", function () {
  let yourContract;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const YourContract = await ethers.getContractFactory("YourContract");
    yourContract = await YourContract.deploy();
    await yourContract.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await yourContract.owner()).to.equal(owner.address);
    });
  });

  describe("Functions", function () {
    it("Should execute function correctly", async function () {
      await yourContract.connect(user1).yourFunction();
      // Add assertions
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/YourContract.test.js

# Run tests with verbose output
npx hardhat test --verbose

# Run tests with gas reporting
npx hardhat test --gas

# Run tests with coverage
npm run coverage
```

### Integration Testing

The project includes comprehensive integration tests that validate the complete economic cycle:

```bash
# Run integration tests
npx hardhat test test/integration/
```

## Deployment

### Local Deployment

```bash
# Start local Hardhat node
npm run node

# Deploy all contracts
npm run deploy:localhost

# Deploy specific contract
npx hardhat run deploy/001_deploy_cc_token.js --network localhost
```

### Deployment Scripts

Deployment scripts are numbered and located in `/deploy/`:

```javascript
// deploy/001_deploy_your_contract.js
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('YourContract', {
    from: deployer,
    args: [], // Constructor arguments
    log: true,
    gasLimit: 3000000,
  });
};
```

### Contract Verification

```bash
# Verify contract on Etherscan
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Contract-Specific Guidelines

### CCToken.sol

- ERC-20 token with burnable functionality
- Total supply: 1,000,000,000 CC tokens
- 18 decimal places
- Custom `burnFrom()` function for marketplace integration

### CustomerNFT.sol & ProviderNFT.sol

- Dual NFT system with tier-based benefits
- Customer NFT tiers: BRONZE (5%), SILVER (8%), GOLD (12%), PLATINUM (15%)
- Provider NFT tiers: 105%, 110%, 115%, 120% bonuses
- Monthly reward distribution for Customer NFTs

### StakingPool.sol

- Multi-asset staking (ETH and CC tokens)
- Base APR: 8% with dynamic adjustment
- NFT minting integration
- Reward calculation and distribution

### ComputeMarket.sol

- CCUSD + CC mixed payment system
- 1.5% CC burn rate (deflationary mechanism)
- 2.5% platform fee
- Complete order lifecycle management

### ProviderIncentive.sol

- Daily reward distribution (~1.1M CC tokens)
- NFT-based reward multipliers
- Time-weighted reward calculation
- Batch operations support

### ETHVault.sol

- ETH deposit and withdrawal management
- Integration with StakingPool
- Emergency withdrawal functions
- Balance tracking and analytics

## Gas Optimization

### Storage Optimization

```solidity
// Pack structs to save gas
struct UserInfo {
    uint128 amount;     // Use smaller types where possible
    uint128 timestamp;
}
```

### Loop Optimization

```solidity
// Batch operations to reduce gas costs
function batchUpdate(address[] calldata users, uint256[] calldata amounts) 
    external onlyOwner {
    require(users.length == amounts.length, "Array length mismatch");
    
    for (uint256 i = 0; i < users.length; i++) {
        _updateUser(users[i], amounts[i]);
    }
}
```

### Event Optimization

```solidity
// Emit events instead of storing non-critical data
event ActionCompleted(address indexed user, uint256 value, bytes32 indexed id);
```

## Security Considerations

### Reentrancy Protection

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract YourContract is ReentrancyGuard {
    function withdraw() external nonReentrant {
        // Withdrawal logic
    }
}
```

### Access Control

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract YourContract is Ownable {
    function adminFunction() external onlyOwner {
        // Admin-only logic
    }
}
```

### Input Validation

```solidity
function transfer(address to, uint256 amount) external override {
    require(to != address(0), "Transfer to zero address");
    require(amount > 0, "Transfer amount must be positive");
    require(balanceOf(msg.sender) >= amount, "Insufficient balance");
    
    _transfer(msg.sender, to, amount);
}
```

## Debugging

### Hardhat Console

```solidity
import "hardhat/console.sol";

contract YourContract {
    function yourFunction() external {
        console.log("Function called by:", msg.sender);
        console.log("Value:", someValue);
    }
}
```

### Test Logging

```javascript
// Add logging to tests
console.log("Contract deployed at:", yourContract.address);
console.log("User balance:", await yourContract.balanceOf(user1.address));
```

## Common Issues and Solutions

### 1. Gas Limit Exceeded

**Issue**: Transaction fails due to gas limit

**Solution**: 
```solidity
// Increase gas limit in deployment
await contract.deploy({ gasLimit: 5000000 });
```

### 2. Revert Without Reason

**Issue**: Transaction reverts without clear error message

**Solution**:
```solidity
// Add descriptive require statements
require(condition, "Describe what went wrong");
```

### 3. Integer Overflow

**Issue**: Math operations cause overflow

**Solution**:
```solidity
// Use SafeMath or Solidity 0.8+ built-in protection
uint256 result = a + b; // Automatic revert on overflow in 0.8+
```

## Advanced Features

### Upgradeable Contracts

For production, consider using upgradeable contracts:

```bash
npm install @openzeppelin/hardhat-upgrades
```

```javascript
// deploy upgradeable contract
const { deployProxy } = require('@openzeppelin/hardhat-upgrades');
const YourContract = await ethers.getContractFactory("YourContract");
const yourContract = await deployProxy(YourContract, [arg1, arg2]);
```

### Cross-Chain Interactions

For multi-chain deployments:

```javascript
// Configure multiple networks
module.exports = {
  networks: {
    ethereum: {
      url: process.env.ETHEREUM_RPC,
      accounts: [process.env.PRIVATE_KEY]
    },
    polygon: {
      url: process.env.POLYGON_RPC,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

## Resources

- [Solidity Documentation](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethereum Smart Contract Security](https://consensys.github.io/smart-contract-best-practices/)

## Contributing

1. Follow the established contract patterns
2. Write comprehensive tests
3. Document function behavior
4. Use gas optimization techniques
5. Consider security implications
6. Get code review before deployment