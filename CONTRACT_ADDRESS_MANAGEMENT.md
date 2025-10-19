# 智能合约地址自动管理系统

## 概述

这个系统解决了cc_pay项目中合约地址硬编码的问题，通过自动读取Hardhat部署文件来动态获取最新的合约地址。

## 🎯 解决的问题

1. **硬编码问题** - 无需手动更新 `contracts.js` 中的合约地址
2. **同步问题** - 部署后自动同步到前端配置
3. **版本不一致** - 统一的地址管理避免多个文件不同步
4. **网络切换** - 支持多网络环境的自动切换
5. **备用机制** - 提供多重备用方案确保系统稳定性

## 📁 文件结构

```
cc_pay/
├── scripts/
│   └── generate-frontend-deployment.js    # 前端部署文件生成脚本
├── deployments/                            # Hardhat自动生成的部署文件
│   └── localhost/
│       ├── CCToken.json
│       ├── CustomerNFT.json
│       └── ...
└── frontend/
    ├── public/
    │   └── deployments/                    # 自动生成的部署文件
    │       ├── localhost/
    │       │   ├── deployment-complete.json
    │       │   └── *.json
    │       └── networks.json
    └── src/config/
        ├── contractAddressManager.js        # 地址管理器
        ├── contracts-dynamic.js             # 动态合约配置
        └── CONTRACT_ADDRESSES.md            # 使用说明
```

## 🚀 快速开始

### 1. 部署合约

```bash
# 启动本地区块链
npm run node

# 部署合约
npm run deploy:localhost
```

### 2. 生成前端配置

```bash
# 生成前端部署文件
npm run generate:frontend

# 或者一步完成部署和生成
npm run deploy:and:generate

# 或者快速完成完整流程
npm run quick:deploy
```

### 3. 在前端使用

```javascript
import { getContractAddress, getAllContractAddresses } from '@/config/contractAddressManager';

// 获取单个合约地址
const ccTokenAddress = await getContractAddress('CC_TOKEN');

// 获取所有合约地址
const allAddresses = await getAllContractAddresses();

// 获取特定网络的地址
const polygonAddress = await getContractAddress('CC_TOKEN', 137);
```

## 🔧 详细功能

### 自动地址管理器 (`contractAddressManager.js`)

核心功能：
- **多重读取策略** - 支持从多个源读取合约地址
- **缓存机制** - 5分钟缓存提高性能
- **网络适配** - 自动检测和适配不同网络
- **备用方案** - 多级备用确保系统稳定
- **错误处理** - 完善的错误处理和日志记录

### 读取策略优先级

1. **deployment-complete.json** - 部署摘要文件
2. **单个合约JSON文件** - 从 `/deployments/{network}/{contract}.json` 读取
3. **环境变量** - `REACT_APP_CONTRACT_{NAME}_{NETWORK}`
4. **默认配置** - 备用硬编码地址

### 支持的合约

| 合约名称 | 配置键 | 说明 |
|---------|--------|------|
| CCToken | CC_TOKEN | 主代币合约 |
| CustomerNFT | CUSTOMER_NFT | 客户NFT合约 |
| ProviderNFT | PROVIDER_NFT | 提供商NFT合约 |
| StakingPool | STAKING_POOL | 质押池合约 |
| ComputeMarket | COMPUTE_MARKET | 计算市场合约 |
| ProviderIncentive | PROVIDER_INCENTIVE | 提供商激励合约 |
| MockUSDC | CCSD_TOKEN | 稳定币合约 |
| CCUSDReservePool | CCUSD_RESERVE_POOL | 储备池合约 |
| EthToCCUSDConverter | ETH_CCUSD_CONVERTER | 兑换合约 |
| RiskManagement | RISK_MANAGEMENT | 风险管理合约 |

### 支持的网络

| 网络名称 | Chain ID | 说明 |
|---------|---------|------|
| localhost | 1337 | 本地开发网络 |
| hardhat | 31337 | Hardhat内置网络 |
| polygon | 137 | Polygon主网 |
| mumbai | 80001 | Polygon测试网 |
| bsc | 56 | BSC主网 |
| bsc_testnet | 97 | BSC测试网 |

## 📝 使用示例

### React组件中的使用

```javascript
import React, { useState, useEffect } from 'react';
import { getContractAddress, useContractAddresses } from '@/config/contractAddressManager';

function MyComponent() {
  const [ccTokenAddress, setCcTokenAddress] = useState('');
  const { addresses, loading, error } = useContractAddresses();

  useEffect(() => {
    async function loadAddress() {
      try {
        const address = await getContractAddress('CC_TOKEN');
        setCcTokenAddress(address);
      } catch (error) {
        console.error('加载合约地址失败:', error);
      }
    }

    loadAddress();
  }, []);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <p>CC Token 地址: {ccTokenAddress}</p>
      <p>所有合约: {JSON.stringify(addresses, null, 2)}</p>
    </div>
  );
}
```

### 验证合约部署

```javascript
import { validateContractAddresses } from '@/config/contractAddressManager';

async function checkContracts() {
  const validation = await validateContractAddresses();

  console.log(`验证结果: ${validation.valid ? '✅ 通过' : '❌ 失败'}`);
  console.log(`已部署合约: ${validation.deployedContracts}/${validation.totalContracts}`);

  if (validation.failedContracts.length > 0) {
    console.warn('未部署的合约:', validation.failedContracts);
  }
}
```

### 多网络支持

```javascript
import { getContractAddress } from '@/config/contractAddressManager';

// 获取当前网络
const currentAddress = await getContractAddress('CC_TOKEN');

// 获取特定网络
const polygonAddress = await getContractAddress('CC_TOKEN', 137);
const bscAddress = await getContractAddress('CC_TOKEN', 56);
```

## 🔧 环境变量配置

可以在 `.env` 文件中设置备用地址：

```bash
# 本地网络备用地址
REACT_APP_CONTRACT_CC_TOKEN_1337=0x5FbDB2315678afecb367f032d93F642f64180aa3
REACT_APP_CONTRACT_CUSTOMER_NFT_1337=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

# Polygon主网备用地址
REACT_APP_CONTRACT_CC_TOKEN_137=0x...
REACT_APP_CONTRACT_CUSTOMER_NFT_137=0x...

# API配置
REACT_APP_DEPLOYMENT_API_URL=/deployments
REACT_APP_DEFAULT_NETWORK_ID=1337
```

## 🛠️ 开发工作流

### 标准部署流程

```bash
# 1. 编译合约
npm run compile

# 2. 启动区块链节点
npm run node

# 3. 部署合约
npm run deploy:localhost

# 4. 生成前端配置
npm run generate:frontend

# 5. 启动前端应用
cd frontend && npm run dev
```

### 一键部署命令

```bash
# 完整快速部署（推荐）
npm run quick:deploy

# 分步部署和生成
npm run deploy:and:generate
```

## 🔄 更新流程

当需要更新合约时：

1. **更新合约代码**
2. **重新部署**：`npm run deploy:localhost`
3. **生成前端配置**：`npm run generate:frontend`
4. **重启前端应用**：新的合约地址会自动加载

## 🚨 故障排除

### 常见问题

1. **找不到合约地址**
   ```javascript
   // 检查部署文件是否存在
   const isDeployed = await isContractDeployed('CC_TOKEN');
   console.log('合约是否已部署:', isDeployed);
   ```

2. **网络切换问题**
   ```javascript
   // 清除缓存重试
   import { clearContractAddressCache } from '@/config/contractAddressManager';
   clearContractAddressCache();
   ```

3. **前端文件未生成**
   ```bash
   # 手动运行生成脚本
   npm run generate:frontend
   ```

### 调试模式

在浏览器控制台中查看详细日志：

```javascript
// 查看部署信息
import { getDeploymentInfo } from '@/config/contractAddressManager';
const info = await getDeploymentInfo();
console.log('部署信息:', info);
```

## 📈 性能优化

- **缓存机制** - 地址缓存5分钟，减少重复请求
- **并行加载** - 多个合约地址并行获取
- **懒加载** - 按需加载合约地址
- **错误缓存** - 缓存失败结果避免重复尝试

## 🔒 安全考虑

1. **地址验证** - 验证合约地址的有效性
2. **错误处理** - 优雅处理部署文件缺失
3. **备用机制** - 多重备用确保系统可用性
4. **网络检测** - 自动检测当前网络环境

## 📚 API参考

### contractAddressManager

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `getContractAddress(name, networkId)` | 获取单个合约地址 | `contractName`, `networkId?` | `Promise<string>` |
| `getAllContractAddresses(networkId)` | 获取所有合约地址 | `networkId?` | `Promise<Object>` |
| `isContractDeployed(name, networkId)` | 检查合约是否部署 | `contractName`, `networkId?` | `Promise<boolean>` |
| `getDeploymentInfo(networkId)` | 获取部署信息 | `networkId?` | `Promise<Object>` |
| `clearCache()` | 清除缓存 | - | `void` |

### ContractAddressManager类

| 方法 | 描述 |
|------|------|
| `constructor(networkId)` | 创建管理器实例 |
| `getAddress(contractName)` | 获取合约地址 |
| `getAllAddresses()` | 获取所有地址 |
| `validate()` | 验证地址配置 |
| `clearCache()` | 清除缓存 |

## 🆙 迁移指南

### 从旧的硬编码系统迁移

1. **替换导入**：
   ```javascript
   // 旧方式
   import { CONTRACT_ADDRESSES } from '@/config/contracts';

   // 新方式
   import { getContractAddress } from '@/config/contractAddressManager';
   ```

2. **更新使用方式**：
   ```javascript
   // 旧方式
   const ccTokenAddress = CONTRACT_ADDRESSES.CC_TOKEN;

   // 新方式
   const ccTokenAddress = await getContractAddress('CC_TOKEN');
   ```

3. **添加错误处理**：
   ```javascript
   try {
     const address = await getContractAddress('CC_TOKEN');
     // 使用地址
   } catch (error) {
     console.error('获取合约地址失败:', error);
     // 处理错误
   }
   ```

## 🤝 贡献

如需改进此系统，请遵循以下原则：

1. **向后兼容** - 确保现有代码正常工作
2. **多重备用** - 提供多种备用方案
3. **详细日志** - 记录详细的操作日志
4. **性能优先** - 优化加载速度和缓存策略