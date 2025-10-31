# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

**CC Pay** 是一个基于Hardhat的区块链智能合约项目，实现了完整的去中心化算力交易平台经济系统。该项目包含多个核心合约，共同构建了一个安全、可持续的代币经济模型，并配备完整的前端Web3应用和后端API服务。

**项目状态**: ✅ 100% MVP完全实现 - 生产就绪
**技术栈**: Solidity 0.8.20, Hardhat, React 18, TypeScript, Vite, Wagmi, Viem
**测试覆盖**: 90%+ (52+ 测试用例)

## 常用命令

### 智能合约开发
```bash
npm install                    # 安装依赖
npm run compile                # 编译合约
npm test                       # 运行测试
npm run node                   # 启动本地区块链节点
npm run deploy                 # 部署合约到默认网络
npm run deploy:localhost       # 部署到本地网络
npm run deploy:hardhat         # 部署到Hardhat网络
npm run deploy:complete        # 部署完整系统(包含所有合约)
npm run coverage               # 运行测试覆盖率
npm run deployments            # 查看部署状态
npm run generate:frontend      # 生成前端部署配置
npm run deploy:and:generate    # 部署并生成前端配置
npm run quick:deploy           # 快速部署(编译+部署+生成配置)
```

### 前端开发
```bash
cd frontend
npm install                    # 安装依赖
npm run dev                    # 启动开发服务器 (http://localhost:8088)
npm run build                  # 构建生产版本
npm run test                   # 运行测试
npm run type-check             # 类型检查
npm run test:coverage          # 运行覆盖率测试
```

### 便捷脚本和Makefile
```bash
make quick-start               # 一键完整启动流程(推荐)
make deploy-complete           # 完整系统部署
make health                    # 系统健康检查
make test-all                  # 运行所有测试套件
make dev                       # 进入开发模式(持续运行)
make stop-dev                  # 停止开发模式
make clean-all                 # 完全清理项目
./quick_start.sh               # 交互式启动脚本
./start_backend.sh             # 后端服务启动
./start_frontend.sh            # 前端服务启动
```

### 单个测试运行
```bash
npx hardhat test test/CCToken.test.js           # 测试CC Token合约
npx hardhat test test/ComputeMarket.test.js     # 测试算力市场合约
npx hardhat test test/StakingPool.test.js       # 测试质押池合约
npx hardhat test test/EconomicCycle.test.js     # 测试经济周期
npx hardhat test test/CustomerNFT.test.js       # 测试客户NFT
npx hardhat test test/ProviderNFT.test.js       # 测试提供商NFT
```

### 开发脚本
```bash
node scripts/health-check.js                    # 系统健康检查
node scripts/deployment-verification.js         # 部署验证
node scripts/fund-test-account.js              # 为测试账户充值
node scripts/check-contract-state.js           # 检查合约状态
node scripts/generate-frontend-deployment.js   # 生成前端部署配置
node scripts/deployment-automation.js          # 自动化部署脚本
```

## 核心合约架构

### 代币层
- **CCToken.sol** - 核心ERC-20代币，总量10亿，支持ETH购买，包含安全机制
- **MockUSDC.sol** - 稳定币(CCUSD)，用于算力交易结算，支持ETH储备支撑

### NFT层
- **CustomerNFT.sol** - 用户NFT，提供算力折扣(5%-15%)和月度奖励
- **ProviderNFT.sol** - 提供商NFT，提供奖励加成(105%-125%)

### 业务层
- **StakingPool.sol** - 质押池，支持ETH和CC代币质押，8%基础APR
- **ComputeMarketLite.sol** - 轻量级算力市场，简化版本去除复杂权限系统
- **ComputeMarket.sol** - 完整算力市场合约，支持混合支付
- **ProviderIncentive.sol** - 提供商激励分配，每日释放约400M CC/年

### 金融层
- **CCUSDReservePool.sol** - CCUSD储备池，管理流动性
- **EthToCCUSDConverter.sol** - ETH兑换CCUSD合约，0.5%手续费
- **CCUSDTokenVault.sol** - CCUSD金库合约
- **RiskManagement.sol** - 风险管理合约，控制系统风险

## 前端应用架构

### 核心页面 (React + TypeScript + Vite)
- **主页 (Home.jsx)** - 市场入口、数据概览、多语言支持
- **分布式算力市场 (Marketplace.jsx)** - 计算服务交易、订单管理、NFT折扣
- **质押系统 (Staking.jsx)** - ETH/CC质押、NFT铸造、奖励追踪
- **NFT管理 (NFTManagement.jsx)** - NFT查看、升级、管理
- **个人中心 (Profile.jsx)** - 用户资料、交易历史、资产概览
- **兑换中心 (Exchange.jsx)** - ETH到CCUSD兑换、代币交换

### 前端技术栈
- **React 18.3.1** - 核心UI框架
- **TypeScript 5.6.3** - 类型安全
- **Vite 5.4.10** - 构建工具
- **Wagmi 2.16.9** - Web3集成
- **Viem 2.37.5** - 以太坊交互
- **RainbowKit** - 钱包连接
- **Tailwind CSS 3.4.17** - UI样式框架
- **React Router 6.28.0** - 路由管理
- **Recharts 3.2.0** - 数据可视化
- **react-i18next** - 国际化(中英文完整支持)

### 前端特色功能
- **完整中文本地化**: 1000+翻译键值，分布式算力术语优化
- **Web3集成**: 多钱包支持，实时区块链事件监听
- **主题系统**: 深色/浅色主题全局切换
- **响应式设计**: 完美支持桌面端和移动端
- **数据可视化**: 图表和统计分析

## 后端服务架构

### API服务 (Express.js + TypeScript)
- **用户认证系统** (/api/auth) - 钱包签名登录、JWT令牌管理
- **用户管理系统** (/api/users) - 用户信息CRUD、偏好设置
- **安全中间件系统** - Helmet、CORS、Rate Limiting

### 后端技术栈
- **Express.js 4.21.1** - Web框架
- **TypeScript 5.6.3** - 类型安全
- **better-sqlite3 9.2.2** - 数据库(可扩展至PostgreSQL/MySQL)
- **JWT** - 身份验证
- **Winston** - 日志系统

### 数据库设计
- **users** - 用户基本信息、钱包地址、偏好设置
- **user_sessions** - 认证会话管理、令牌追踪
- **login_history** - 登录历史记录、安全审计

## 关键配置

### Hardhat配置 (hardhat.config.js)
- **Solidity版本**: 0.8.20
- **优化**: 启用，200次运行
- **测试账户**: 20个，每个100k ETH
- **网络**: hardhat(31337), localhost(8545), coverage(8555)

### 命名账户 (namedAccounts)
- **deployer**: 账户0 - 部署者
- **customer**: 账户1 - 测试用户
- **provider**: 账户2 - 测试提供商

### 环境变量配置
#### 前端环境变量
```bash
VITE_API_URL=http://localhost:3001/api
```

#### 后端环境变量
```bash
DB_TYPE=sqlite
SQLITE_PATH=./database/sqlite.db
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8088
```

## 部署系统

### 主部署脚本
`deploy/020_enhanced_system.js` - 完整系统部署脚本，包含：
1. 核心合约部署(CCToken, MockUSDC)
2. NFT合约部署
3. 业务合约部署
4. 合约关系配置
5. 资金分配(总计700M CC分配给各合约)
6. 安全参数配置
7. 储备系统初始化
8. 测试账户资金分配

### 资金分配方案
- **StakingPool**: 200M CC (质押奖励)
- **CustomerNFT**: 100M CC (月度奖励)
- **ProviderIncentive**: 300M CC (提供商奖励)
- **Treasury**: 50M CC (平台收入)
- **Reserve**: 50M CC (应急储备)
- **Deployer**: 剩余300M CC

### 合约部署顺序
1. `001_deploy_cc_token.js` - CC代币部署
2. `002_deploy_mock_usdc.js` - 模拟USDC部署
3. `003_deploy_customer_nft.js` - 客户NFT部署
4. `004_deploy_provider_nft.js` - 提供商NFT部署
5. `005_deploy_staking_pool.js` - 质押池部署
6. `006_deploy_compute_market.js` - 计算市场部署
7. `007_deploy_provider_incentive.js` - 奖励系统部署
8. `008_setup_contracts.js` - 合约配置和权限设置
9. `009_deploy_eth_vault.js` - ETH金库部署

## 测试框架

### 测试覆盖范围
- **智能合约测试**: 52+ 测试用例，90%+ 覆盖率
- **前端测试**: 组件测试、集成测试
- **后端测试**: API测试、端到端测试
- **集成测试**: 完整经济循环验证

### 测试网络配置
- 使用Hardhat内置网络进行测试
- 每个测试独立运行
- 支持覆盖率报告生成

## 安全机制

### CC Token安全控制
- 日购买限额: 10 ETH
- 最小购买量: 0.001 ETH
- 暂停功能
- 紧急提取地址

### 系统级安全参数
- StakingPool日质押限额: 100 ETH
- ComputeMarket平台手续费: 2.5%
- CC燃烧率: 1.5%
- CCUSD储备率: 85%
- ProviderIncentive日领取限额: 1M CC

### 智能合约安全措施
- 重入保护: OpenZeppelin ReentrancyGuard
- 溢出保护: Solidity 0.8.20内置
- 权限控制: 细粒度访问控制
- 暂停机制: 紧急暂停功能

## 经济模型

### 核心经济循环
```
用户质押ETH/CC → 获得NFT → 获得折扣/奖励 → 购买算力服务
        ↓                                    ↓
    NFT折扣                              支付CC+CCUSD
        ↓                                    ↓
    降低成本                            1.5% CC燃烧
        ↓                                    ↓
    激励参与                            2.5%平台费用
        ↓                                    ↓
    市场增长                            提供商奖励
```

### 通缩机制
- **1.5%燃烧率**: 每笔CC支付自动燃烧1.5%
- **代币销毁**: 通过ComputeMarket合约自动执行
- **供应量减少**: 实现真正的通缩经济模型

### 激励机制
- **NFT折扣**: 5%-15%折扣基于NFT等级
- **提供商奖励**: 105%-125%奖励倍数
- **质押奖励**: 8%基础APR + NFT加成
- **每日释放**: 110万CC/天奖励提供商

## 开发工作流

### 完整开发环境启动
1. **快速启动(推荐)**: `make quick-start`
2. **手动启动**:
   - 安装依赖: `npm install`
   - 编译合约: `npm run compile`
   - 启动本地区块链: `npm run node`
   - 部署完整系统: `npm run deploy:complete`
   - 启动后端: `cd backend && npm run dev`
   - 启动前端: `cd frontend && npm run dev`
   - 运行测试: `npm test`

### 开发模式
```bash
make dev           # 启动所有服务，进入开发模式
make stop-dev      # 停止开发模式
```

### 快速部署流程
```bash
npm run quick:deploy    # 一键完成编译+部署+配置生成
```

## 前端集成

### ABI文件管理
- 合约ABI自动生成到 `contract_abis/` 目录
- 前端配置生成: `npm run generate:frontend`
- 支持多网络部署配置

### Web3集成特性
- **多钱包支持**: MetaMask等主流钱包
- **实时事件监听**: 智能合约事件实时更新
- **交易状态追踪**: 完整的交易处理流程
- **钱包签名认证**: 安全的用户认证机制

### 部署报告
- 部署状态自动保存到 `deployment-report.json`
- 包含合约地址、部署时间、状态等信息

## 注意事项

- 使用OpenZeppelin合约库确保安全性
- 所有合约包含重入攻击保护
- 实现了完整的权限管理系统
- 支持紧急暂停和恢复功能
- 包含详细的日志记录和事件触发
- 完整的中英文本地化支持
- 响应式设计支持多设备访问
- 生产级的错误处理和用户体验

## 故障排除

### 常见问题
1. **Hardhat节点端口冲突**: 确保8545端口可用
2. **前端连接问题**: 检查环境变量配置
3. **合约部署失败**: 运行 `make health` 检查系统状态
4. **测试失败**: 确保所有依赖已正确安装

### 调试命令
```bash
make health                    # 系统健康检查
make logs                      # 查看部署日志
make verify                    # 验证部署状态
node scripts/check-contract-state.js  # 检查合约状态
```