# Profile页面活动记录优化方案

## 🎯 目标
实现一个实时、全面的活动记录系统，展示用户的所有区块链交互历史。

## 📋 当前问题
1. 静态硬编码内容，缺乏真实活动数据
2. 事件监听与活动记录脱节
3. 缺乏交易历史的持久化存储
4. 用户体验不佳，信息不完整

## 💡 解决方案

### 方案一：前端活动状态管理 (推荐)

#### 1. 活动数据结构设计
```javascript
const activityTypes = {
  STAKE: { name: '质押', icon: '📈', color: 'green' },
  UNSTAKE: { name: '解质押', icon: '📉', color: 'red' },
  DEPOSIT: { name: '充值', icon: '💰', color: 'blue' },
  WITHDRAW: { name: '取款', icon: '💸', color: 'orange' },
  CLAIM_REWARDS: { name: '领取奖励', icon: '🎁', color: 'purple' },
  MINT_NFT: { name: '铸造NFT', icon: '🖼️', color: 'indigo' },
  CREATE_ORDER: { name: '创建订单', icon: '📋', color: 'cyan' },
  COMPLETE_ORDER: { name: '完成订单', icon: '✅', color: 'green' }
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  amount?: string;
  token?: string;
  timestamp: number;
  txHash?: string;
  status: 'pending' | 'success' | 'failed';
}
```

#### 2. 状态管理增强
```javascript
// 在Profile页面添加活动状态
const [activities, setActivities] = useState<Activity[]>([]);
const [isLoadingActivities, setIsLoadingActivities] = useState(false);

// 活动记录工具函数
const addActivity = (activity: Omit<Activity, 'id' | 'timestamp'>) => {
  const newActivity: Activity = {
    ...activity,
    id: `activity_${Date.now()}_${Math.random()}`,
    timestamp: Date.now()
  };
  setActivities(prev => [newActivity, ...prev].slice(0, 50)); // 保留最近50条
};
```

#### 3. 事件监听器集成
```javascript
// 在现有事件监听器中添加活动记录
useWatchContractEvent({
  address: CONTRACT_ADDRESSES.STAKING_POOL,
  abi: CONTRACT_ABI.STAKING_POOL_ABI,
  eventName: 'Staked',
  onLogs: (logs) => {
    const userStakeEvent = logs.find(log => log.args.user === address);
    if (userStakeEvent) {
      addActivity({
        type: 'STAKE',
        title: '质押成功',
        description: `成功质押 ${formatEther(userStakeEvent.args.amount)} ${userStakeEvent.args.assetType === 0 ? 'ETH' : 'CC'}`,
        amount: formatEther(userStakeEvent.args.amount),
        token: userStakeEvent.args.assetType === 0 ? 'ETH' : 'CC',
        txHash: userStakeEvent.transactionHash,
        status: 'success'
      });
    }
  }
});
```

#### 4. 交易状态追踪
```javascript
// 监听交易状态变化
useEffect(() => {
  if (isConfirmed && pendingAction) {
    addActivity({
      type: pendingAction.type === 'deposit' ? 'DEPOSIT' : 'WITHDRAW',
      title: `${pendingAction.type === 'deposit' ? '充值' : '取款'}成功`,
      description: `${pendingAction.type === 'deposit' ? '存入' : '取出'} ${pendingAction.amount} ETH`,
      amount: pendingAction.amount.toString(),
      token: 'ETH',
      txHash: writeContract?.data,
      status: 'success'
    });
  }
}, [isConfirmed, pendingAction]);
```

#### 5. 活动记录UI组件
```jsx
const ActivityItem = ({ activity }) => {
  const config = activityTypes[activity.type];
  
  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
        ${activity.status === 'success' ? 'bg-green-100 text-green-600' : 
          activity.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
          'bg-red-100 text-red-600'}`}>
        {config.icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{activity.title}</p>
        <p className="text-sm text-gray-600">{activity.description}</p>
        {activity.txHash && (
          <a 
            href={`https://polygonscan.com/tx/${activity.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            查看交易详情 →
          </a>
        )}
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-500">
          {new Date(activity.timestamp).toLocaleString()}
        </p>
        {activity.amount && (
          <p className="text-sm font-medium text-gray-900">
            {activity.amount} {activity.token}
          </p>
        )}
      </div>
    </div>
  );
};
```

### 方案二：后端活动记录API (长期)

#### 1. 数据库设计
```sql
CREATE TABLE user_activities (
  id VARCHAR(64) PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  activity_type ENUM('STAKE', 'UNSTAKE', 'DEPOSIT', 'WITHDRAW', 'CLAIM_REWARDS', 'MINT_NFT', 'CREATE_ORDER', 'COMPLETE_ORDER'),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(36, 18),
  token_symbol VARCHAR(10),
  tx_hash VARCHAR(66),
  status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  block_number BIGINT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wallet_address (wallet_address),
  INDEX idx_timestamp (timestamp)
);
```

#### 2. API端点
```typescript
// 获取用户活动记录
GET /api/activities/:walletAddress
GET /api/activities/:walletAddress/recent?limit=20

// 添加活动记录
POST /api/activities
{
  "walletAddress": "0x...",
  "activityType": "STAKE",
  "title": "质押成功",
  "description": "质押了 100 CC 代币",
  "amount": "100",
  "tokenSymbol": "CC",
  "txHash": "0x...",
  "status": "success"
}
```

## 🎨 UI/UX 优化

### 活动记录页面布局
```jsx
<div className="space-y-4">
  {/* 活动筛选器 */}
  <div className="flex space-x-2 mb-6">
    {['全部', '质押', '充值', 'NFT', '订单'].map(filter => (
      <button key={filter} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
        {filter}
      </button>
    ))}
  </div>

  {/* 活动列表 */}
  <div className="space-y-3">
    {activities.map(activity => (
      <ActivityItem key={activity.id} activity={activity} />
    ))}
  </div>

  {/* 加载更多 */}
  {hasMoreActivities && (
    <button className="w-full py-3 text-center text-blue-600 hover:text-blue-800">
      加载更多活动
    </button>
  )}
</div>
```

### 实时更新指示器
```jsx
<div className="flex items-center justify-between mb-4">
  <h2 className="text-xl font-bold text-gray-900">最近活动</h2>
  <div className="flex items-center space-x-2 text-xs text-gray-500">
    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
    <span>实时更新</span>
  </div>
</div>
```

## 📈 实施优先级

### 阶段一：基础功能 (1-2天)
1. 添加活动状态管理
2. 集成现有事件监听器
3. 实现基础UI组件
4. 添加交易状态追踪

### 阶段二：增强功能 (2-3天)
1. 添加活动筛选和搜索
2. 实现活动详情弹窗
3. 优化性能和错误处理
4. 添加动画和过渡效果

### 阶段三：后端集成 (3-5天)
1. 设计和创建数据库表
2. 实现API端点
3. 添加数据同步机制
4. 实现分页和加载更多

## 🎯 预期效果

1. **实时性**: 区块链操作立即反映在活动记录中
2. **完整性**: 覆盖所有类型的用户交互
3. **可追溯**: 提供交易哈希链接到区块浏览器
4. **用户友好**: 清晰的视觉层次和交互反馈
5. **性能优化**: 高效的状态管理和数据更新

这个方案将大幅提升Profile页面的实用性和用户体验，让用户能够清晰地了解自己的所有区块链活动历史。