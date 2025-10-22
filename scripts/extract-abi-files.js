#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const contractsDir = path.join(__dirname, '../artifacts/contracts');
const outputDir = path.join(__dirname, '../contract_abis');

console.log('🔨 开始提取合约ABI文件...');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const contractDirs = fs.readdirSync(contractsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

contractDirs.forEach(contractDir => {
  const contractName = path.basename(contractDir, '.sol');
  const artifactPath = path.join(contractsDir, contractDir, `${contractName}.json`);

  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      const abiPath = path.join(outputDir, `${contractName}_abi.json`);

      fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));

      const functions = artifact.abi.filter(item => item.type === 'function').length;
      const events = artifact.abi.filter(item => item.type === 'event').length;

      console.log(`✅ ${contractName} ABI 提取成功 (${functions} 个函数, ${events} 个事件)`);
    } catch (error) {
      console.error(`❌ ${contractName} ABI 提取失败:`, error.message);
    }
  } else {
    console.warn(`⚠️  ${contractName} 编译文件不存在，跳过`);
  }
});

console.log('🎉 ABI文件提取完成!');
console.log(`📁 输出目录: ${outputDir}`);