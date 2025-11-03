# CC Token Economy - Customer NFT 系统设计更新记录

## 更新时间
2025-09-30

## 设计目标
实现一个完整的Customer NFT系统，支持双路径获取（质押vs直接铸造），灵活销毁机制，以及完整的生命周期管理。

## 核心设计原则

### 1. 双路径获取机制
- **质押路径**: 用户通过质押ETH/CC获取NFT，同时获得CC代币激励和购买折扣
- **直接支付路径**: 用户直接支付CCUSD/CC获取NFT，仅获得购买折扣

### 2. 灵活销毁机制
- NFT销毁后质押资产保留
- 停止NFT特定激励，但基础质押收益继续
- 用户可随时提取质押资产

### 3. 完整生命周期管理
- NFT铸造（两种方式）
- 激励收益计算和领取
- NFT销毁
- 质押资产提取

## 合约架构更新

### CustomerNFT.sol 主要功能

#### 新增核心函数
```solidity
// 质押池铸造NFT（包含质押信息）
function mintFromStake(
    address _user,
    Tier _tier,
    uint256 _ethAmount,
    uint256 _ccAmount,
    uint256 _paymentInCCUSD
) external onlyStakingPool returns (uint256 tokenId)

// 直接铸造NFT（仅折扣，无质押激励）
function mintDirect(
    address _user,
    Tier _tier,
    uint256 _paymentInCCUSD,
    uint256 _ccAmount
) external onlyOwner returns (uint256 tokenId)

// 销毁NFT（质押资产保留）
function burnNFT(uint256 _tokenId) external

// 提取质押资产（仅当NFT已销毁）
function withdrawStake(uint256 _tokenId) external

// 获取质押激励收益
function claimRewards(uint256 _tokenId) external
```

#### 数据结构增强
```solidity
// 质押信息结构
struct NFTStakeInfo {
    address owner;
    uint256 tokenId;
    uint256 ethAmount;
    uint256 ccAmount;
    uint256 startTime;
    uint256 lastRewardTime;
    bool isActive;
}

// NFT数据结构（增强版）
struct CustomerNFTData {
    Tier tier;
    uint256 activationTime;
    uint256 usdcAmount;
    uint256 ccAmount;
    bool isActive;
}
```

#### 等级配置
- **BRONZE**: 5% 折扣, 200 CC 月度奖励
- **SILVER**: 8% 折扣, 500 CC 月度奖励  
- **GOLD**: 12% 折扣, 1200 CC 月度奖励
- **PLATINUM**: 15% 折扣, 3000 CC 月度奖励

### StakingPool.sol 主要功能

#### 新增质押函数
```solidity
// 质押ETH获取Customer NFT
function stakeETHForCustomerNFT(CustomerNFT.Tier _tier) external payable

// 质押CC获取Customer NFT
function stakeCCForCustomerNFT(uint256 _amount, CustomerNFT.Tier _tier) external

// 质押CC获取Provider NFT
function stakeCCForProviderNFT(uint256 _amount, ProviderNFT.Tier _tier) external

// 质押ETH获取Provider NFT (仅限Gold等级)
function stakeETHForProviderNFT(ProviderNFT.Tier _tier) external payable

// 直接铸造Customer NFT（仅折扣，无质押激励）
function directMintCustomerNFT(
    address _user,
    CustomerNFT.Tier _tier,
    uint256 _usdcAmount,
    uint256 _ccAmount
) external onlyOwner
```

#### 质押要求配置
```solidity
// Customer NFT质押要求
customerNftEthRequirements[CustomerNFT.Tier.BRONZE] = 0.1 ether;
customerNftEthRequirements[CustomerNFT.Tier.SILVER] = 0.5 ether;
customerNftEthRequirements[CustomerNFT.Tier.GOLD] = 2.0 ether;
customerNftEthRequirements[CustomerNFT.Tier.PLATINUM] = 5.0 ether;

customerNftCcRequirements[CustomerNFT.Tier.BRONZE] = 100 * 10**18;
customerNftCcRequirements[CustomerNFT.Tier.SILVER] = 500 * 10**18;
customerNftCcRequirements[CustomerNFT.Tier.GOLD] = 2000 * 10**18;
customerNftCcRequirements[CustomerNFT.Tier.PLATINUM] = 5000 * 10**18;
```

## 部署脚本更新

### CustomerNFT 部署参数
- 4个参数: usdcToken, ccToken, rewardToken, paymentReceiver
- 更新前: 3个参数，缺少rewardToken

### StakingPool 部署后配置
- 自动设置CustomerNFT合约中的stakingPool地址
- 自动设置ProviderNFT合约中的stakingPool地址
- 确保合约间正确链接

## 前端配置更新

### CustomerNFT ABI 新增函数
- mintFromStake
- mintDirect  
- burnNFT
- withdrawStake
- claimRewards
- calculateRewards
- hasNFT
- getUserNFT

### StakingPool ABI 新增函数
- stakeETHForCustomerNFT
- stakeCCForCustomerNFT
- stakeCCForProviderNFT
- stakeETHForProviderNFT
- directMintCustomerNFT
- unstake

### 事件定义更新
- CustomerNFTMintedFromStake
- ProviderNFTMintedFromStake
- CustomerNFTDirectMinted
- Unstaked

## 经济模型详情

### 激励机制
1. **基础年化收益率**: 5%
2. **等级加成倍数**:
   - BRONZE: 1.0x
   - SILVER: 1.2x
   - GOLD: 1.5x
   - PLATINUM: 2.0x

### 收益计算
```solidity
// 年化收益 = 总质押价值 * 基础APR * 等级加成 * (时间 / 年)
uint256 annualRewards = (totalStakeValue * baseAPR * tierMultiplier) / 10000;
uint256 rewards = (annualRewards * timeElapsed) / (365 days);
```

### 质押价值计算
- ETH价值按3000美元计算
- CC价值按1美元计算
- 总质押价值 = (ethAmount * 3000) + ccAmount

## 用户流程

### 质押获取路径
1. 用户选择NFT等级
2. 质押对应数量的ETH或CC
3. 自动铸造Customer NFT
4. 开始获得基础质押收益 + NFT等级加成收益
5. 获得对应等级的购买折扣

### 直接支付路径
1. 用户选择NFT等级
2. 支付对应数量的CCUSD或CC
3. 合约所有者执行directMintCustomerNFT
4. 获得对应等级的购买折扣（无质押激励）

### NFT销毁流程
1. 用户调用burnNFT销毁NFT
2. 质押资产保留在合约中
3. 停止NFT特定激励收益
4. 基础质押收益继续
5. 用户可调用withdrawStake提取质押资产

## 安全特性

### 访问控制
- onlyStakingPool: 限制mintFromStake只能由质押池调用
- onlyOwner: 限制mintDirect只能由合约所有者调用
- ReentrancyGuard: 防止重入攻击

### 资产安全
- 质押资产与NFT状态分离
- 分阶段提取机制（先销毁NFT，再提取资产）
- 紧急提取函数

### 事件追踪
- 完整的事件记录所有关键操作
- 便于前端监听和状态同步
- 审计和监控支持

## 技术实现亮点

### 模块化设计
- CustomerNFT专注NFT管理和激励计算
- StakingPool专注质押逻辑和NFT铸造
- 清晰的职责分离

### 灵活配置
- 等级要求可动态调整
- 激励参数可配置
- 支持未来扩展

### 前端集成
- 完整的ABI定义
- 事件驱动的状态更新
- 用户友好的交互界面

## 测试要点

### 功能测试
- 双路径NFT铸造
- 质押收益计算
- NFT销毁和资产提取
- 等级折扣应用

### 边界测试
- 最小/最大质押金额
- 无效等级处理
- 权限验证
- 重复铸造防护

### 集成测试
- 合约间交互
- 前端事件监听
- 完整用户流程

## 后续计划

1. **CustomerNFT激励合约** (可选)
   - 专门的激励代币管理
   - 更复杂的激励模型

2. **测试验证**
   - 单元测试覆盖
   - 集成测试验证
   - 前端功能测试

3. **部署和监控**
   - 生产环境部署
   - 性能监控
   - 用户反馈收集

## 总结

本次设计更新成功实现了完整的Customer NFT系统，支持灵活的获取方式、安全的资产管理、以及完整的生命周期。系统既满足了用户获得折扣的需求，又通过质押激励鼓励长期参与，为CC Token Economy增添了重要的用户权益层。