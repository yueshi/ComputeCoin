// 统一的NFT等级图标配置
import {
  TrophyIcon,
  StarIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  BoltIcon,
  FireIcon,
  SparklesIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

// NFT等级图标配置 - Customer NFT
export const CUSTOMER_NFT_ICONS = {
  1: TrophyIcon,           // BRONZE - 奖杯图标
  2: StarIcon,             // SILVER - 星星图标
  3: ShieldCheckIcon,      // GOLD - 盾牌图标
  4: BoltIcon,             // PLATINUM - 闪电图标
  // 也支持字符串键名
  BRONZE: TrophyIcon,
  SILVER: StarIcon,
  GOLD: ShieldCheckIcon,
  PLATINUM: BoltIcon
};

// NFT等级图标配置 - Provider NFT
export const PROVIDER_NFT_ICONS = {
  1: CheckCircleIcon,      // BRONZE - 勾选图标
  2: SparklesIcon,         // SILVER - 火花图标
  3: FireIcon,             // GOLD - 火焰图标
  4: CpuChipIcon,          // PLATINUM - 芯片图标
  // 也支持字符串键名
  BRONZE: CheckCircleIcon,
  SILVER: SparklesIcon,
  GOLD: FireIcon,
  PLATINUM: CpuChipIcon
};

// 通用NFT等级图标配置（向后兼容）
export const NFT_TIER_ICONS = [
  TrophyIcon,    // BRONZE
  StarIcon,      // SILVER
  ShieldCheckIcon, // GOLD
  BoltIcon       // PLATINUM
];

// 等级索引映射 (合约枚举值到数组索引)
export const TIER_INDICES = {
  1: 0,    // BRONZE (合约枚举1 -> 数组索引0)
  2: 1,    // SILVER (合约枚举2 -> 数组索引1)
  3: 2,    // GOLD (合约枚举3 -> 数组索引2)
  4: 3,    // PLATINUM (合约枚举4 -> 数组索引3)
  // 也支持字符串键名
  BRONZE: 0,
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3
};

// 统一的获取NFT等级图标函数
export function getNFTTierIcon(nftType, tier) {
  if (nftType === 'CUSTOMER') {
    return CUSTOMER_NFT_ICONS[tier] || TrophyIcon;
  } else if (nftType === 'PROVIDER') {
    return PROVIDER_NFT_ICONS[tier] || TrophyIcon;
  }

  // 默认使用通用配置
  const tierIndex = TIER_INDICES[tier] || 0;
  return NFT_TIER_ICONS[tierIndex];
}

// 向后兼容的简化函数 (处理数组索引)
export function getTierIcon(tierIndex) {
  // tierIndex是数组索引 (0=BRONZE, 1=SILVER, 2=GOLD, 3=PLATINUM)
  return NFT_TIER_ICONS[tierIndex] || TrophyIcon;
}

// 新增：处理合约枚举值的简化函数
export function getTierIconByEnum(tierEnum) {
  const tierIndex = TIER_INDICES[tierEnum] || 0;
  return NFT_TIER_ICONS[tierIndex];
}