# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a lightweight blockchain explorer for Hardhat local networks. The application provides a web interface for viewing blockchain data including blocks, transactions, and addresses.

## Architecture

The project consists of:

1. **explorer-server.js** - Express.js backend server that connects to Hardhat network via JSON-RPC
2. **public/index.html** - Frontend UI with Tailwind CSS styling
3. **public/app.js** - Frontend JavaScript for API interactions and UI rendering

## Key Features

- Real-time blockchain data viewing (blocks, transactions, addresses)
- Search functionality for addresses, transaction hashes, and block numbers
- Network statistics dashboard
- Detailed views for blocks, transactions, and addresses
- **Contract information display** - Shows contract name, symbol, total supply, and token type (ERC-20/ERC-721)
- Auto-refresh every 30 seconds

## Development Commands

```bash
# Install dependencies
npm install

# Start the explorer server
npm start

# Development mode with auto-restart
npm run dev

# Test connection to Hardhat network
npm test
```

## Configuration

The explorer connects to Hardhat network via these environment variables:
- `PORT` - Server port (default: 3000)
- `RPC_URL` - Hardhat JSON-RPC endpoint (default: http://127.0.0.1:8545)

## API Endpoints

All API endpoints are prefixed with `/api`:

- `GET /api/network` - Network information (chain ID, block number, gas price)
- `GET /api/blocks` - Recent blocks list
- `GET /api/block/:blockNumber` - Specific block details with transactions
- `GET /api/transactions` - Recent transactions
- `GET /api/transaction/:hash` - Specific transaction details
- `GET /api/address/:address` - Address information (balance, nonce, code)
- `GET /api/search/:query` - Universal search for addresses, transactions, blocks
- `GET /api/contract/:address/info` - **Contract detailed information** (name, symbol, total supply, token type)
- `GET /api/contract/:address/abi` - Contract bytecode information
- `GET /api/stats/transactions` - **Accurate transaction statistics** (total count, latest block, average per block)

## Technical Stack

- Node.js/Express.js backend
- Ethers.js v6 for blockchain interaction
- Vanilla JavaScript frontend
- Tailwind CSS for styling
- RESTful API architecture

## Contract Information Feature

The explorer now supports automatic detection and display of contract information:

- **ERC-20 Token Detection**: Automatically identifies ERC-20 tokens and displays name, symbol, total supply, and decimals
- **ERC-721 NFT Detection**: Identifies NFT contracts and shows name, symbol, and total supply
- **Token Amount Formatting**: Properly formats large token amounts with appropriate decimal places
- **Contract Type Identification**: Distinguishes between ERC-20 tokens, ERC-721 NFTs, and regular smart contracts
- **Known Contract Mapping**: Pre-configured with local Hardhat network contract addresses for instant recognition

### Implementation Details

- Uses standard ERC-20 and ERC-721 ABIs to query contract information
- Attempts to read contract metadata (name, symbol, totalSupply) automatically
- Gracefully handles contracts that don't implement standard interfaces
- Displays contract information in a visually distinct blue panel in the address details view
- Pre-configured with local deployment addresses for CCToken, CCUSDToken, CustomerNFT, ProviderNFT, StakingPool, ComputeMarket, and ProviderIncentive contracts

### Local Contract Addresses

Based on `deployment-localhost.json`, the explorer recognizes these contracts:

**ERC-20 Tokens:**
- CCToken: `0x7a2088a1bfc9d81c55368ae168c2c02570cb814f`
- CCUSDToken: `0x09635f643e140090a9a8dcd712ed6285858cebef`

**ERC-721 NFTs:**
- CustomerNFT: `0xc5a5c42992ddecbae36851359345fe25997f5c42d`
- ProviderNFT: `0x67d269191c92caf3cd7723f116c85e6e9bf55933`

**Other Contracts:**
- StakingPool: `0xe6e340d132b5f46d1e472debcd681b2abc16e57e`
- ComputeMarket: `0xc3e53f4d16ae77db1c982e75a937b9f60fe63690`
- ProviderIncentive: `0x84ea74d481ee0a5332c457a4d796187f6ba67feb`