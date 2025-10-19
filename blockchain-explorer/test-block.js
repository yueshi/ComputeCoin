const { ethers } = require('ethers');

async function testBlock() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  try {
    const block = await provider.getBlock(38, true);
    console.log('Block number:', block.number);
    console.log('Transactions count:', block.transactions.length);
    
    if (block.transactions.length > 0) {
      const tx = block.transactions[0];
      console.log('First transaction object keys:', Object.keys(tx));
      console.log('Transaction hash:', tx.hash);
      console.log('Transaction from:', tx.from);
      console.log('Transaction to:', tx.to);
      console.log('Transaction value:', tx.value);
      console.log('Transaction gasPrice:', tx.gasPrice);
      console.log('Transaction gasLimit:', tx.gasLimit);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBlock();
