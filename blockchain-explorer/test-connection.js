const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function testConnection() {
  console.log('🚀 Testing Blockchain Explorer with Hardhat-Deploy Support...\n');
  
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  try {
    // Test basic connection
    console.log('1️⃣ Testing basic network connection...');
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`✅ Current block number: ${blockNumber}`);
    
    // Test hardhat-deploy artifacts loading
    console.log('\n2️⃣ Testing hardhat-deploy artifacts loading...');
    const deploymentsPath = path.join(__dirname, '../deployments/localhost');
    
    if (fs.existsSync(deploymentsPath)) {
      console.log(`✅ Deployments directory found: ${deploymentsPath}`);
      
      const files = fs.readdirSync(deploymentsPath);
      const deploymentFiles = files.filter(file => file.endsWith('.json'));
      
      console.log(`📁 Found ${deploymentFiles.length} deployment files:`);
      deploymentFiles.forEach(file => {
        const deploymentPath = path.join(deploymentsPath, file);
        try {
          const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
          console.log(`  📋 ${file.replace('.json', '')}: ${deploymentData.address}`);
        } catch (err) {
          console.log(`  ❌ ${file}: Error reading deployment`);
        }
      });
    } else {
      console.log(`⚠️  Deployments directory not found: ${deploymentsPath}`);
      console.log(`   Using fallback hardcoded contract addresses`);
    }
    
    // Test API endpoints
    console.log('\n3️⃣ Testing API endpoints...');
    
    // Test network endpoint
    try {
      const networkResponse = await fetch('http://localhost:3000/api/network');
      if (networkResponse.ok) {
        const networkData = await networkResponse.json();
        console.log(`✅ Network API working: Chain ID ${networkData.chainId}, Block ${networkData.blockNumber}`);
      } else {
        console.log(`❌ Network API error: ${networkResponse.status}`);
      }
    } catch (err) {
      console.log(`❌ Network API not available - start the explorer server first`);
    }
    
    // Test token discovery endpoint
    try {
      const tokensResponse = await fetch('http://localhost:3000/api/stats/tokens');
      if (tokensResponse.ok) {
        const tokensData = await tokensResponse.json();
        console.log(`✅ Token discovery API working: Found ${tokensData.tokens.length} tokens`);
        tokensData.tokens.forEach(token => {
          console.log(`   💎 ${token.name} (${token.symbol}) - ${token.type.toUpperCase()}`);
        });
      } else {
        console.log(`❌ Token discovery API error: ${tokensResponse.status}`);
      }
    } catch (err) {
      console.log(`❌ Token discovery API not available`);
    }
    
    // Test reload endpoint
    try {
      const reloadResponse = await fetch('http://localhost:3000/api/deployments/reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json();
        console.log(`✅ Reload API working: ${reloadData.message}`);
      } else {
        console.log(`❌ Reload API error: ${reloadResponse.status}`);
      }
    } catch (err) {
      console.log(`❌ Reload API not available`);
    }
    
    console.log('\n🎉 Explorer test completed!');
    console.log('\n📚 Next steps:');
    console.log('   1. Start the explorer: npm start');
    console.log('   2. Open browser: http://localhost:3000');
    console.log('   3. Deploy contracts: npx hardhat deploy --network localhost');
    console.log('   4. Click "Reload Contracts" button in the explorer');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   - Hardhat network is running: npx hardhat node');
    console.log('   - Explorer server is running: npm start');
    console.log('   - No firewall blocking port 8545 or 3000');
  }
}

// Run the test
testConnection();