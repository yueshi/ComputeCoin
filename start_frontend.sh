#!/bin/bash

# CC Platform Frontend 启动脚本

echo "🚀 启动 CC Platform Frontend..."

# 进入 frontend 目录
cd /Users/james/cc_service/cc_pay/frontend

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖包安装失败"
        exit 1
    fi
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，使用默认配置"
    echo "创建默认 .env 文件..."
    echo "VITE_API_URL=http://localhost:3001/api" > .env
fi

# 启动开发服务器
echo "🌟 启动开发服务器..."
echo "前端地址: http://localhost:8088"
echo "后端API: ${VITE_API_URL:-http://localhost:3001/api}"
echo ""

npm run dev
