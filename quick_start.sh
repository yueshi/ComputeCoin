#!/bin/bash

# 增强版CC Token经济系统 - 快速启动脚本
# 此脚本将帮助您快速启动本地测试环境

echo "🚀 启动增强版CC Token经济系统测试环境"
echo "=================================================="

# 检查是否在正确的目录
if [ ! -f "hardhat.config.js" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo ""
echo "🔧 环境状态检查..."
echo "✅ 原始合约已备份到 /backup_original/"
echo "✅ 增强版合约已部署到标准位置"
echo "✅ 缓存已清理，环境干净"
echo ""

echo "📋 选择操作："
echo "1) 完整测试 - 启动节点 + 编译 + 部署 + 验证"
echo "2) 仅启动节点"
echo "3) 仅编译合约"
echo "4) 仅部署到本地网络"
echo "5) 运行测试套件"
echo "6) 查看部署状态"
echo ""

read -p "请选择 (1-6): " choice

case $choice in
    1)
        echo "🔄 执行完整测试流程..."
        
        # 启动节点（后台）
        echo "📡 启动本地区块链节点..."
        npx hardhat node > node.log 2>&1 &
        NODE_PID=$!
        echo "节点PID: $NODE_PID"
        
        # 等待节点启动
        echo "⏳ 等待节点启动..."
        sleep 5
        
        # 编译合约
        echo "🔨 编译合约..."
        npm run compile
        
        # 部署合约
        echo "🚀 部署增强版系统..."
        npx hardhat deploy --network localhost --tags Enhanced
        
        # 验证部署
        echo "📊 验证部署状态..."
        npx hardhat deployments --network localhost
        
        echo "✅ 完整测试流程完成！"
        echo "📊 节点日志: node.log"
        echo "⏹️  停止节点: kill $NODE_PID"
        ;;
        
    2)
        echo "📡 启动本地区块链节点..."
        npx hardhat node
        ;;
        
    3)
        echo "🔨 编译合约..."
        npm run compile
        ;;
        
    4)
        echo "🚀 部署到本地网络..."
        npx hardhat deploy --network localhost --tags Enhanced
        ;;
        
    5)
        echo "🧪 运行测试套件..."
        npm test
        ;;
        
    6)
        echo "📊 查看部署状态..."
        npx hardhat deployments --network localhost
        ;;
        
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "📚 更多信息："
echo "- 查看详细指南: cat LOCAL_TESTING_GUIDE.md"
echo "- 查看合约地址: npx hardhat deployments --network localhost"
echo "- 运行特定测试: npx hardhat test test/EconomicCycle.test.js"
echo ""
echo "✅ 操作完成！"