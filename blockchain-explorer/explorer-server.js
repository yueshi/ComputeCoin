const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

// 创建provider连接
const provider = new ethers.JsonRpcProvider(RPC_URL);

// hardhat-deploy 部署工件路径
const DEPLOYMENTS_PATH = process.env.DEPLOYMENTS_PATH || path.join(__dirname, '../deployments/localhost');

// 合约ABI定义
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)"
];

const ERC721_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)"
];

// 已知合约地址映射（本地Hardhat网络部署的合约）
let KNOWN_CONTRACTS = {};

// 从hardhat-deploy工件加载部署信息
function loadHardhatDeployArtifacts() {
  try {
    if (fs.existsSync(DEPLOYMENTS_PATH)) {
      const deployments = {};
      const files = fs.readdirSync(DEPLOYMENTS_PATH);
      
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const contractName = file.replace('.json', '');
          const deploymentPath = path.join(DEPLOYMENTS_PATH, file);
          const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
          
          if (deploymentData.address) {
            deployments[deploymentData.address.toLowerCase()] = {
              name: contractName,
              address: deploymentData.address,
              abi: deploymentData.abi || [],
              deployment: deploymentData
            };
          }
        }
      });
      
      console.log(`✅ Loaded ${Object.keys(deployments).length} contracts from hardhat-deploy`);
      return deployments;
    } else {
      console.log(`⚠️  Deployments path not found: ${DEPLOYMENTS_PATH}`);
      console.log(`Using fallback hardcoded contract addresses...`);
      return getFallbackContracts();
    }
  } catch (error) {
    console.error(`❌ Error loading hardhat-deploy artifacts:`, error.message);
    console.log(`Using fallback hardcoded contract addresses...`);
    return getFallbackContracts();
  }
}

// 回退到硬编码的合约地址
function getFallbackContracts() {
  return {
    "0x7a2088a1bfc9d81c55368ae168c2c02570cb814f": { name: "CCToken", type: "erc20" },
    "0xc5a5c42992ddecbae36851359345fe25997f5c42d": { name: "CustomerNFT", type: "erc721" },
    "0x67d269191c92caf3cd7723f116c85e6e9bf55933": { name: "ProviderNFT", type: "erc721" },
    "0xe6e340d132b5f46d1e472debcd681b2abc16e57e": { name: "StakingPool", type: "other" },
    "0xc3e53f4d16ae77db1c982e75a937b9f60fe63690": { name: "ComputeMarket", type: "other" },
    "0x84ea74d481ee0a5332c457a4d796187f6ba67feb": { name: "ProviderIncentive", type: "other" }
  };
}

// 根据合约名称和ABI检测合约类型
function detectContractType(contractName, abi) {
  const abiStr = JSON.stringify(abi);
  
  if (abiStr.includes('"name":"totalSupply"') && abiStr.includes('"name":"decimals"')) {
    return 'erc20';
  } else if (abiStr.includes('"name":"totalSupply"') && abiStr.includes('"name":"ownerOf"')) {
    return 'erc721';
  } else if (contractName.toLowerCase().includes('token') && contractName.toLowerCase().includes('nft')) {
    return 'erc721';
  } else if (contractName.toLowerCase().includes('token')) {
    return 'erc20';
  } else {
    return 'other';
  }
}

// 初始化已知合约映射
function initializeKnownContracts() {
  const deployments = loadHardhatDeployArtifacts();
  const contracts = {};
  
  Object.entries(deployments).forEach(([address, data]) => {
    const contractType = detectContractType(data.name, data.abi);
    contracts[address.toLowerCase()] = {
      name: data.name,
      type: contractType,
      abi: data.abi,
      deployment: data.deployment
    };
  });
  
  return contracts;
}

// 加载合约信息
KNOWN_CONTRACTS = initializeKnownContracts();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API路由

// 获取网络信息
app.get('/api/network', async (req, res) => {
  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const gasPrice = await provider.getFeeData();
    
    res.json({
      chainId: Number(network.chainId),
      name: network.name,
      blockNumber: Number(blockNumber),
      gasPrice: {
        gasPrice: gasPrice?.gasPrice ? gasPrice.gasPrice.toString() : '0',
        maxFeePerGas: gasPrice?.maxFeePerGas ? gasPrice.maxFeePerGas.toString() : null,
        maxPriorityFeePerGas: gasPrice?.maxPriorityFeePerGas ? gasPrice.maxPriorityFeePerGas.toString() : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取区块列表
app.get('/api/blocks', async (req, res) => {
  try {
    const latestBlock = await provider.getBlockNumber();
    const limit = parseInt(req.query.limit) || 10;
    const start = parseInt(req.query.start) || latestBlock;
    
    const blocks = [];
    for (let i = start; i > Math.max(start - limit, 0); i--) {
      try {
        const block = await provider.getBlock(i);
        
        if (!block) {
          console.warn(`Block ${i} not found, skipping...`);
          continue;
        }
        
        blocks.push({
          number: block.number,
          hash: block.hash,
          timestamp: block.timestamp,
          miner: block.miner,
          transactions: block.transactions ? block.transactions.length : 0,
          gasUsed: block.gasUsed ? block.gasUsed.toString() : '0',
          gasLimit: block.gasLimit ? block.gasLimit.toString() : '0'
        });
      } catch (err) {
        console.error(`Error fetching block ${i}:`, err.message);
        console.error(`Stack trace:`, err.stack);
      }
    }
    
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取区块详情
app.get('/api/block/:blockNumber', async (req, res) => {
  try {
    const blockNumber = req.params.blockNumber;
    const block = await provider.getBlock(parseInt(blockNumber), false);
    
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }
    
    // 获取区块内的完整交易数据
    const transactions = [];
    const maxTransactions = 10; // 限制交易数量以提高性能
    
    if (block.transactions && block.transactions.length > 0) {
      const txHashesToFetch = block.transactions.slice(0, maxTransactions);
      
      for (const txHash of txHashesToFetch) {
        try {
          const tx = await provider.getTransaction(txHash);
          if (tx) {
            transactions.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.value ? tx.value.toString() : '0',
              gasPrice: tx.gasPrice ? tx.gasPrice.toString() : null,
              gasLimit: tx.gasLimit ? tx.gasLimit.toString() : '0'
            });
          }
        } catch (txError) {
          console.error(`Error fetching transaction ${txHash} in block ${blockNumber}:`, txError.message);
        }
      }
    }
    
    res.json({
      number: block.number,
      hash: block.hash,
      parentHash: block.parentHash,
      timestamp: block.timestamp,
      miner: block.miner,
      transactions: transactions,
      gasUsed: block.gasUsed ? block.gasUsed.toString() : '0',
      gasLimit: block.gasLimit ? block.gasLimit.toString() : '0'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取交易列表
app.get('/api/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const latestBlock = await provider.getBlockNumber();
    
    const transactions = [];
    let blockCount = 0;
    
    for (let i = latestBlock; i >= 0 && transactions.length < limit; i--) {
      try {
        // 先获取区块基础信息（不包含完整交易数据）
        const block = await provider.getBlock(i, false);
        if (block && block.transactions && block.transactions.length > 0) {
          // 获取该区块的最后几笔交易（限制数量避免性能问题）
          const txHashes = block.transactions.slice(-Math.ceil(limit / 5));
          
          // 逐个获取完整交易数据
          for (const txHash of txHashes) {
            if (transactions.length >= limit) break;
            
            try {
              const tx = await provider.getTransaction(txHash);
              if (tx) {
                transactions.push({
                  hash: tx.hash,
                  blockNumber: tx.blockNumber,
                  from: tx.from,
                  to: tx.to,
                  value: tx.value ? tx.value.toString() : '0',
                  gasPrice: tx.gasPrice ? tx.gasPrice.toString() : null,
                  timestamp: block.timestamp
                });
              }
            } catch (txError) {
              console.error(`Error fetching transaction ${txHash}:`, txError.message);
            }
          }
        }
        blockCount++;
        if (blockCount > 20) break; // 减少查询的区块数量以提高性能
      } catch (err) {
        console.error(`Error processing block ${i}:`, err.message);
      }
    }
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取交易详情
app.get('/api/transaction/:hash', async (req, res) => {
  try {
    const hash = req.params.hash;
    const tx = await provider.getTransaction(hash);
    const receipt = await provider.getTransactionReceipt(hash);
    
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json({
      hash: tx.hash,
      blockNumber: tx.blockNumber,
      from: tx.from,
      to: tx.to,
      value: tx.value ? tx.value.toString() : '0',
      gasPrice: tx.gasPrice ? tx.gasPrice.toString() : null,
      gasLimit: tx.gasLimit ? tx.gasLimit.toString() : '0',
      nonce: tx.nonce,
      data: tx.data,
      status: receipt ? receipt.status : null,
      gasUsed: receipt && receipt.gasUsed ? receipt.gasUsed.toString() : null,
      logs: receipt ? receipt.logs : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取地址信息
app.get('/api/address/:address', async (req, res) => {
  try {
    const address = req.params.address;
    
    // 验证地址格式
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    
    const balance = await provider.getBalance(address);
    const code = await provider.getCode(address);
    const transactionCount = await provider.getTransactionCount(address);
    
    res.json({
      address,
      balance: balance.toString(),
      transactionCount,
      isContract: code !== '0x',
      code: code !== '0x' ? code : null
    });
  } catch (error) {
    console.error(`Error fetching address ${req.params.address}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 获取准确的交易统计信息
app.get('/api/stats/transactions', async (req, res) => {
  try {
    const latestBlock = await provider.getBlockNumber();
    let totalTransactions = 0;
    
    // 遍历所有区块统计交易数
    for (let i = 0; i <= latestBlock; i++) {
      try {
        const block = await provider.getBlock(i, false);
        if (block && block.transactions) {
          totalTransactions += block.transactions.length;
        }
      } catch (err) {
        console.error(`Error counting block ${i}:`, err.message);
      }
    }
    
    res.json({
      totalTransactions,
      latestBlock,
      averageTxPerBlock: latestBlock > 0 ? (totalTransactions / (latestBlock + 1)).toFixed(2) : '0.00'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 格式化代币数量
function formatTokenAmount(amount, decimals = 18) {
  if (!amount) return '0';
  const divisor = Math.pow(10, decimals);
  const value = parseInt(amount) / divisor;
  
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(2) + 'K';
  } else {
    return value.toFixed(decimals > 6 ? 6 : decimals);
  }
}

// 获取代币和NFT基本信息
app.get('/api/stats/tokens', async (req, res) => {
  try {
    const tokenInfo = [];
    const processedAddresses = new Set(); // 用于去重的地址集合
    
    // 辅助函数：检查地址是否已处理
    const isAddressProcessed = (address) => {
      return processedAddresses.has(address.toLowerCase());
    };
    
    // 辅助函数：标记地址为已处理
    const markAddressProcessed = (address) => {
      processedAddresses.add(address.toLowerCase());
    };
    
    // 从hardhat-deploy工件自动发现代币和NFT
    for (const [address, contractData] of Object.entries(KNOWN_CONTRACTS)) {
      // 跳过已经处理过的地址
      if (isAddressProcessed(address)) {
        continue;
      }
      
      try {
        const abi = contractData.abi || ERC20_ABI;
        const contract = new ethers.Contract(address, abi, provider);
        
        if (contractData.type === 'erc20') {
          // ERC20代币
          const name = await contract.name();
          const symbol = await contract.symbol();
          const totalSupply = await contract.totalSupply();
          const decimals = await contract.decimals();
          
          // 获取CCToken的特殊统计信息
          let soldTokens = '0';
          let remainingTokens = totalSupply.toString();
          
          if (contractData.name === 'CCToken') {
            try {
              // 计算已售出的代币 = 总供应量 - 合约余额
              const contractBalance = await contract.balanceOf(address);
              const totalSupplyBN = totalSupply;
              const contractBalanceBN = contractBalance;
              
              soldTokens = totalSupplyBN.sub(contractBalanceBN).toString();
              remainingTokens = contractBalanceBN.toString();
            } catch (calcError) {
              console.error(`Error calculating CCToken stats:`, calcError.message);
            }
          }
          
          tokenInfo.push({
            type: 'erc20',
            address: address,
            name: name,
            symbol: symbol,
            totalSupply: totalSupply.toString(),
            decimals: Number(decimals),
            formattedSupply: formatTokenAmount(totalSupply.toString(), Number(decimals)),
            // CCToken统计信息
            soldTokens: soldTokens,
            remainingTokens: remainingTokens,
            formattedSoldTokens: formatTokenAmount(soldTokens, Number(decimals)),
            formattedRemainingTokens: formatTokenAmount(remainingTokens, Number(decimals)),
            isCCToken: contractData.name === 'CCToken'
          });
        } else if (contractData.type === 'erc721') {
          // ERC721 NFT
          const name = await contract.name();
          const symbol = await contract.symbol();
          const totalSupply = await contract.totalSupply();
          
          tokenInfo.push({
            type: 'erc721',
            address: address,
            name: name,
            symbol: symbol,
            totalSupply: totalSupply.toString(),
            decimals: 0,
            formattedSupply: totalSupply.toString()
          });
        }
        
        // 标记地址为已处理
        markAddressProcessed(address);
      } catch (err) {
        console.error(`Error fetching token info for ${contractData.name} (${address}):`, err.message);
      }
    }
    
    res.json({
      tokens: tokenInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 搜索功能
app.get('/api/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    
    // 检查是否是地址
    if (query.match(/^0x[a-fA-F0-9]{40}$/)) {
      const code = await provider.getCode(query);
      return res.json({ type: code !== '0x' ? 'contract' : 'address', data: query });
    }
    
    // 检查是否是交易哈希
    if (query.match(/^0x[a-fA-F0-9]{64}$/)) {
      try {
        const tx = await provider.getTransaction(query);
        if (tx) return res.json({ type: 'transaction', data: query });
      } catch (err) {
        // 不是交易哈希
      }
    }
    
    // 检查是否是区块号或区块哈希
    if (query.match(/^\d+$/) || query.match(/^0x[a-fA-F0-9]{64}$/)) {
      try {
        const block = await provider.getBlock(query);
        if (block) return res.json({ type: 'block', data: query });
      } catch (err) {
        // 不是有效的区块
      }
    }
    
    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取合约详细信息
app.get('/api/contract/:address/info', async (req, res) => {
  try {
    const address = req.params.address;
    const code = await provider.getCode(address);
    
    if (code === '0x') {
      return res.status(404).json({ error: 'Not a contract' });
    }
    
    const contractInfo = {
      address,
      bytecode: code,
      type: 'unknown',
      name: null,
      symbol: null,
      totalSupply: null,
      decimals: null,
      isNFT: false,
      isToken: false,
      deployment: null
    };
    
    // 检查已知合约映射
    const knownContract = KNOWN_CONTRACTS[address.toLowerCase()];
    if (knownContract) {
      contractInfo.name = knownContract.name;
      contractInfo.type = knownContract.type;
      contractInfo.deployment = knownContract.deployment;
    }
    
    // 使用hardhat-deploy的ABI进行合约交互
    let contractABI = null;
    if (knownContract && knownContract.abi) {
      contractABI = knownContract.abi;
    }
    
    // 尝试作为ERC20合约读取（优先使用部署的ABI）
    try {
      const abi = contractABI || ERC20_ABI;
      const erc20Contract = new ethers.Contract(address, abi, provider);
      const name = await erc20Contract.name();
      const symbol = await erc20Contract.symbol();
      const totalSupply = await erc20Contract.totalSupply();
      const decimals = await erc20Contract.decimals();
      
      contractInfo.name = name;
      contractInfo.symbol = symbol;
      contractInfo.totalSupply = totalSupply.toString();
      contractInfo.decimals = Number(decimals);
      contractInfo.isToken = true;
      contractInfo.type = 'erc20';
    } catch (erc20Error) {
      // 不是ERC20合约，继续尝试ERC721
    }
    
    // 如果ERC20失败，尝试作为ERC721合约读取
    if (!contractInfo.isToken) {
      try {
        const abi = contractABI || ERC721_ABI;
        const erc721Contract = new ethers.Contract(address, abi, provider);
        const name = await erc721Contract.name();
        const symbol = await erc721Contract.symbol();
        const totalSupply = await erc721Contract.totalSupply();
        
        contractInfo.name = name;
        contractInfo.symbol = symbol;
        contractInfo.totalSupply = totalSupply.toString();
        contractInfo.isNFT = true;
        contractInfo.type = 'erc721';
      } catch (erc721Error) {
        // 不是ERC721合约，保持基本信息
      }
    }
    
    // 确保所有数据都是JSON可序列化的
    const response = {
      address: contractInfo.address,
      bytecode: contractInfo.bytecode,
      type: contractInfo.type,
      name: contractInfo.name,
      symbol: contractInfo.symbol,
      totalSupply: contractInfo.totalSupply,
      decimals: contractInfo.decimals,
      isNFT: contractInfo.isNFT,
      isToken: contractInfo.isToken,
      deployment: contractInfo.deployment
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取合约ABI（简化版）
app.get('/api/contract/:address/abi', async (req, res) => {
  try {
    const address = req.params.address;
    const code = await provider.getCode(address);
    
    if (code === '0x') {
      return res.status(404).json({ error: 'Not a contract' });
    }
    
    // 尝试从hardhat-deploy工件获取ABI
    const knownContract = KNOWN_CONTRACTS[address.toLowerCase()];
    const abi = knownContract ? knownContract.abi : null;
    
    res.json({
      address,
      bytecode: code,
      abi: abi,
      contractName: knownContract ? knownContract.name : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 重新加载hardhat-deploy工件
app.post('/api/deployments/reload', (req, res) => {
  try {
    console.log('🔄 Reloading hardhat-deploy artifacts...');
    KNOWN_CONTRACTS = initializeKnownContracts();
    
    const contractCount = Object.keys(KNOWN_CONTRACTS).length;
    console.log(`✅ Reloaded ${contractCount} contracts`);
    
    res.json({
      success: true,
      message: `Reloaded ${contractCount} contracts from hardhat-deploy`,
      contracts: Object.keys(KNOWN_CONTRACTS).map(addr => ({
        address: addr,
        name: KNOWN_CONTRACTS[addr].name,
        type: KNOWN_CONTRACTS[addr].type
      }))
    });
  } catch (error) {
    console.error('❌ Error reloading deployments:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 提供前端页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Blockchain Explorer running on http://localhost:${PORT}`);
  console.log(`🔗 Connected to Hardhat network at ${RPC_URL}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/*`);
  console.log(`🔧 Hardhat-deploy support enabled`);
  console.log(`📁 Deployments path: ${DEPLOYMENTS_PATH}`);
  console.log(`📋 Loaded ${Object.keys(KNOWN_CONTRACTS).length} contracts from hardhat-deploy`);
});

module.exports = app;