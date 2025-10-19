#!/bin/bash

# CC Platform Profile Backend 启动脚本

echo "🚀 启动 CC Platform Profile Backend..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

# 进入 backend 目录
cd ~/cc_pay/backend

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖包安装失败"
        exit 1
    fi
fi

# 检查数据库目录
if [ ! -d "database" ]; then
    echo "📁 创建数据库目录..."
    mkdir -p database
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，使用默认配置"
fi

# 编译 TypeScript
echo "🔨 编译 TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ TypeScript 编译失败"
    exit 1
fi

# 启动服务器
echo "🌟 启动服务器..."
echo "前端地址: ${FRONTEND_URL:-http://localhost:8088}"
echo "后端地址: http://localhost:3001"
echo "健康检查: http://localhost:3001/health"
echo ""

npm start
