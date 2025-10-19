# Hardhat-Deploy Integration Setup

This blockchain explorer now supports automatic contract detection and interaction using hardhat-deploy deployment artifacts.

## Features

- ✅ **Automatic Contract Discovery**: Automatically loads contracts from hardhat-deploy deployment artifacts
- ✅ **Dynamic ABI Loading**: Uses actual contract ABIs from deployments for accurate interaction
- ✅ **Contract Type Detection**: Automatically detects ERC-20, ERC-721, and other contract types
- ✅ **One-Click Reload**: Frontend button to reload contracts after new deployments
- ✅ **Fallback Support**: Falls back to hardcoded addresses if deployments not found

## Configuration

### Environment Variables

```bash
# Optional: Custom deployments path (default: ../deployments/localhost)
DEPLOYMENTS_PATH=/path/to/your/deployments/localhost

# Optional: Custom RPC endpoint
RPC_URL=http://127.0.0.1:8545

# Optional: Custom port
PORT=3000
```

### Default Deployment Path

The explorer looks for hardhat-deploy artifacts at:
```
../deployments/localhost/
```

This path is relative to the explorer-server.js file.

## Usage

### 1. Start Your Hardhat Network

```bash
# In your main project directory
npx hardhat node
```

### 2. Deploy Contracts with Hardhat-Deploy

```bash
# Deploy to localhost
npx hardhat deploy --network localhost
```

### 3. Start the Explorer

```bash
# In the blockchain-explorer directory
npm start
```

### 4. Reload Contracts After Deployment

- **Frontend**: Click the "Reload Contracts" button in the top navigation
- **CLI**: `npm run hardhat:reload`
- **API**: `curl -X POST http://localhost:3000/api/deployments/reload`

## API Endpoints

### Contract Information

- `GET /api/contract/:address/info` - Get detailed contract information
- `GET /api/contract/:address/abi` - Get contract ABI from deployments
- `POST /api/deployments/reload` - Reload hardhat-deploy artifacts

### Token Discovery

- `GET /api/stats/tokens` - Automatically discover and list all tokens/NFTs from deployments

## Contract Detection

The explorer automatically detects contract types based on:

1. **ABI Analysis**: Checks for ERC-20/ERC-721 function signatures
2. **Contract Name**: Keywords like "Token", "NFT" in contract names
3. **Hardhat-Deploy Metadata**: Uses deployment information when available

## Supported Contract Types

- **ERC-20 Tokens**: Full support with name, symbol, decimals, totalSupply
- **ERC-721 NFTs**: Full support with name, symbol, totalSupply
- **Other Contracts**: Basic information display with deployment metadata

## Troubleshooting

### Contracts Not Showing

1. Check that hardhat-deploy artifacts exist in the correct path
2. Verify the deployment files contain valid JSON with address field
3. Use the "Reload Contracts" button after deployment
4. Check browser console for error messages

### Deployment Path Issues

Set the correct path:
```bash
export DEPLOYMENTS_PATH=/full/path/to/your/deployments/localhost
npm start
```

### Fallback Mode

If hardhat-deploy artifacts are not found, the explorer will use fallback hardcoded addresses from the original deployment.

## Integration Example

```javascript
// Your hardhat deploy script
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('MyToken', {
    from: deployer,
    args: ['MyToken', 'MTK', 1000000],
    log: true,
  });
};
```

The explorer will automatically detect this deployment and display it properly.