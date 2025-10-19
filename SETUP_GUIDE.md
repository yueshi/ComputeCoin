# CC Pay 项目搭建和测试指南

## 项目概述

CC Pay 是一个基于区块链的 DePIN（去中心化物理基础设施网络）市场平台，包含：
- 6个核心智能合约（Solidity）
- React前端应用（TypeScript）
- Express.js后端服务（TypeScript）
- SQLite数据库支持

## 环境要求

### 系统要求
- **操作系统**: macOS, Linux, Windows 10+
- **Node.js**: 18.0+ （推荐使用 LTS 版本）
- **npm**: 9.0+ 或 yarn 1.22+
- **Git**: 2.30+

### 开发工具推荐
- **代码编辑器**: VS Code
- **浏览器**: Chrome/Firefox（安装 MetaMask 插件）
- **终端**: Windows Terminal / iTerm2 / Terminator

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd cc_pay
```

### 2. 安装依赖
```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install

# 返回根目录
cd ..
```

### 3. 环境配置

#### 前端环境配置
```bash
cd frontend
cp .env.example .env
```

编辑 `.env` 文件：
```env
VITE_API_URL=http://localhost:3001/api
```

#### 后端环境配置
```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：
```env
DB_TYPE=sqlite
SQLITE_PATH=./database/sqlite.db
JWT_SECRET=your_jwt_secret_here_make_it_strong_and_random
JWT_EXPIRES_IN=24h
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8088
```

## 详细部署步骤

### 第一步：启动区块链网络

#### 选项A：本地测试网络（推荐开发使用）
```bash
# 在项目根目录
npm run node

# 或使用 Hardhat
npx hardhat node
```

这将在 `http://localhost:8545` 启动本地测试网络。

#### 选项B：测试网络部署
- **Polygon Mumbai**: Chain ID 80001
- **Sepolia Testnet**: Chain ID 11155111

### 第二步：部署智能合约

```bash
# 部署到本地测试网络
npm run deploy:localhost

# 或使用 Hardhat
npx hardhat run scripts/deploy.js --network localhost
```

部署完成后，合约地址将保存在 `frontend/src/config/contracts.js` 文件中。

### 第三步：启动后端服务

```bash
cd backend
npm run dev
```

后端服务将在 `http://localhost:3001` 启动。

### 第四步：启动前端应用

```bash
cd frontend
npm run dev
```

前端应用将在 `http://localhost:8088` 启动。

## 开发工具脚本

### 便捷启动脚本

项目提供了便捷的启动脚本：

```bash
# 启动后端服务
./start_backend.sh

# 启动前端开发服务器
./start_frontend.sh
```

### 合约相关命令

```bash
# 编译合约
npm run compile

# 运行测试
npm test

# 运行测试覆盖率
npm run coverage

# 清理合约构建文件
npx hardhat clean
```

## 测试验证

### 1. 智能合约测试

```bash
# 运行所有合约测试
npm test

# 运行特定合约测试
npx hardhat test test/CCToken.test.js
npx hardhat test test/Integration.test.js

# 运行集成测试（完整经济循环）
npx hardhat test test/EconomicCycle.test.js
```

**预期结果：**
- 核心功能测试应该全部通过
- 集成测试验证完整的经济循环：质押 → 铸造NFT → 获得折扣 → 购买服务 → 销毁代币 → 获得奖励

### 2. 前端功能测试

#### 钱包连接测试
1. 打开 `http://localhost:8088`
2. 点击右上角"连接钱包"按钮
3. 确保能成功连接 MetaMask
4. 验证钱包地址显示正确

#### 页面导航测试
1. 测试所有导航菜单：
   - 首页 (Home)
   - DePIN市场 (Marketplace)
   - 兑换 (Exchange)
   - 质押 (Staking)
   - NFTs (NFT Management)
   - 个人中心 (Profile)

#### 语言切换测试
1. 点击右上角语言切换按钮（中/E）
2. 验证页面内容正确切换为中英文
3. 确认所有翻译文本正确显示

### 3. 后端API测试

#### 健康检查
```bash
curl http://localhost:3001/api/health
```

#### 用户认证测试
```bash
# 测试用户签名登录
curl -X POST http://localhost:3001/api/auth/signature-login \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x...",
    "signature": "0x...",
    "message": "Login to CC Pay"
  }'
```

### 4. 完整业务流程测试

#### 测试用户购买算力服务流程
1. **连接钱包** → 成功显示钱包信息
2. **进入质押页面** → 可以看到ETH和CC余额
3. **质押ETH/CC** → 成功质押，获得NFT
4. **进入市场页面** → 浏览可用的算力服务
5. **购买服务** → 使用CC代币支付，享受NFT折扣
6. **查看NFT** → 在个人中心查看持有的NFT和权益

#### 测试算力提供者流程
1. **质押CC代币** → 铸造Provider NFT
2. **获得奖励** → 查看奖励记录
3. **升级NFT** → 通过质押更多代币升级NFT等级

## 故障排除

### 常见问题

#### 1. 合约部署失败
```bash
# 检查网络连接
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545

# 重新部署合约
npx hardhat clean
npm run compile
npm run deploy:localhost
```

#### 2. 前端无法连接钱包
- 确保安装了 MetaMask
- 检查网络配置是否正确（localhost:8545）
- 确认 Chain ID 设置为 31337

#### 3. 后端服务启动失败
```bash
# 检查端口是否被占用
lsof -i :3001

# 检查数据库文件权限
ls -la backend/database/

# 重新安装后端依赖
cd backend && rm -rf node_modules && npm install
```

#### 4. 前端页面显示中文（切换英文后）
- 检查 `frontend/src/locales/en.json` 文件是否完整
- 确认浏览器 localStorage 中语言设置
- 清除浏览器缓存后重试

#### 5. 合约交互失败
- 确认钱包已连接到正确网络
- 检查钱包余额是否足够支付 gas fee
- 验证合约地址配置是否正确

### 日志查看

#### 前端日志
```bash
# 开启调试模式
cd frontend
VITE_DEBUG=true npm run dev
```

#### 后端日志
```bash
cd backend
npm run dev  # 默认输出详细日志
```

#### 合约调用日志
在浏览器开发者工具的 Console 中查看详细的合约调用日志。

## 生产环境部署

### 1. 环境变量配置
```env
NODE_ENV=production
JWT_SECRET=your_production_jwt_secret
PORT=3001
FRONTEND_URL=https://your-domain.com
```

### 2. 前端构建
```bash
cd frontend
npm run build
```

### 3. 后端构建
```bash
cd backend
npm run build
npm start
```

### 4. 合约部署到主网
```bash
# 部署到主网前请充分测试
npx hardhat run scripts/deploy.js --network mainnet
```

## 技术架构说明

### 智能合约层（6个核心合约）
- **CCToken.sol**: ERC-20代币，总供应量10亿
- **CustomerNFT.sol**: 客户NFT，提供5%-15%折扣
- **ProviderNFT.sol**: 提供商NFT，提供105%-115%奖励加成
- **StakingPool.sol**: 质押合约，支持ETH和CC代币质押
- **ComputeMarket.sol**: 计算市场，支持CC代币支付
- **ProviderIncentive.sol**: 提供商激励合约

### 前端技术栈
- **React 18** + **TypeScript**
- **Vite** 构建工具
- **Wagmi** + **Viem** Web3集成
- **Tailwind CSS** 样式框架
- **i18next** 国际化支持

### 后端技术栈
- **Express.js** + **TypeScript**
- **SQLite** 数据库（支持迁移到PostgreSQL）
- **JWT** 身份认证
- **ethers.js** 签名验证

## 安全注意事项

1. **私钥安全**: 永远不要在代码中硬编码私钥
2. **环境变量**: 生产环境使用强密钥
3. **合约审计**: 主网部署前进行专业安全审计
4. **输入验证**: 所有用户输入都要进行验证
5. **访问控制**: 实施适当的访问控制机制

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如有问题，请：
1. 查看本文档的故障排除部分
2. 搜索已有的 Issues
3. 创建新的 Issue 提供详细信息

---

**注意**: 这是一个完整的DeFi平台示例，仅用于教育和开发目的。在生产环境中使用前，请确保进行全面的安全审计和测试。