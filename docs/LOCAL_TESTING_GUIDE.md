# 本地测试操作指南

## 环境状态 ✅ 已完成清理和编译修复

### 原始合约已安全备份
- **备份位置**: `/backup_original/` 和 `contracts_old/` 目录
- **增强版本**: 已迁移到标准合约名称（无 _Enhanced 后缀）
- **部署脚本**: 已更新配置，指向正确的增强版合约名称
- **编译状态**: ✅ 所有编译错误已修复，合约成功编译

### 合约名称映射
| 功能 | 合约名称 | 文件名 | 状态 |
|------|----------|--------|------|
| CC 代币 | CCToken | CCToken.sol | ✅ 增强版 |
| 稳定币 | MockUSDCE | MockUSDC.sol | ✅ 增强版 |
| 客户NFT | CustomerNFT | CustomerNFT.sol | ✅ 增强版 |
| 提供商NFT | ProviderNFT | ProviderNFT.sol | ✅ 增强版 |
| 质押池 | StakingPool | StakingPool.sol | ✅ 增强版 |
| 计算市场 | ComputeMarket | ComputeMarket.sol | ✅ 增强版 |
| 激励系统 | ProviderIncentive | ProviderIncentive.sol | ✅ 增强版 |

## 快速测试步骤

### 1. 启动本地区块链节点
```bash
npm run node
```
**说明**: 在单独终端中运行，保持节点运行

### 2. 编译合约
```bash
npm run compile
```
**验证**: 确保所有合约编译成功，无错误

### 3. 部署增强版系统
```bash
npx hardhat deploy --network localhost --tags Enhanced
```
**预期**: 部署所有7个增强版合约并执行资金分配

### 4. 验证部署
```bash
npx hardhat deployments --network localhost
```
**检查**: 确认所有合约地址已生成

## 测试脚本

### 完整经济周期测试
```bash
npx hardhat test test/EconomicCycle.test.js --network localhost
```

### 单独合约测试
```bash
# CC代币测试
npx hardhat test test/CCToken.test.js --network localhost

# 客户NFT测试  
npx hardhat test test/CustomerNFT.test.js --network localhost

# 经济模型集成测试
npx hardhat test test/ --network localhost --grep "Economic"
```

## 关键功能验证清单

### ✅ 安全控制功能
- [ ] 日购买限额: 10 ETH
- [ ] 日质押限额: 100 ETH  
- [ ] 平台手续费: 2.5%
- [ ] CC燃烧率: 1.5%
- [ ] CCUSD储备率: 85%
- [ ] 紧急暂停功能

### ✅ 经济模型验证
- [ ] 用户质押ETH/CC铸造NFT
- [ ] NFT折扣系统 (5%-15%)
- [ ] 提供商奖励乘数 (105%-115%)
- [ ] CC代币燃烧机制
- [ ] 混合支付系统 (CC + CCUSD)

### ✅ 增强功能
- [ ] CCUSD储备支撑系统
- [ ] 动态参数调整
- [ ] 多层安全防护
- [ ] 应急提取机制

## 故障排除

### 编译错误
```bash
# 清理并重新编译
npx hardhat clean
npx hardhat compile
```

### 部署失败
```bash
# 检查节点状态
npx hardhat run scripts/check-node.js --network localhost

# 重新部署
npx hardhat deploy --network localhost --reset
```

### 合约交互问题
```bash
# 验证合约字节码
npx hardhat verify --network localhost <CONTRACT_ADDRESS>
```

## 安全注意事项

### 🔐 测试环境安全
- 使用测试网络，避免主网误操作
- 验证所有合约地址后再进行交互
- 检查交易参数和金额

### ⚠️ 重要提醒
- 原始合约已安全备份在 `/backup_original/`
- 当前使用增强版合约，具有更多安全功能
- 部署脚本已更新配置，使用正确合约名称
- 缓存已清理，确保使用最新代码

## 下一步操作

1. **基础验证**: 完成上述快速测试步骤
2. **功能测试**: 运行完整测试套件
3. **性能测试**: 验证gas使用和执行效率
4. **安全审计**: 全面检查增强功能安全性
5. **生产准备**: 准备主网部署配置

---

**状态**: ✅ 环境已清理完成，可安全进行本地测试