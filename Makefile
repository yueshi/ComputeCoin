# CC Token 智能合约部署 Makefile
# 提供简单易用的部署命令

.PHONY: help install compile test deploy clean quick-start

# 默认目标
.DEFAULT_GOAL := help

# 项目信息
PROJECT_NAME := CC Token 智能合约系统
NETWORK := localhost
TAGS := CompleteSystem

# 颜色定义
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
BLUE := \033[0;34m
NC := \033[0m # No Color

# 帮助信息
help:
	@echo "$(BLUE)$(PROJECT_NAME) - 自动化部署 Makefile$(NC)"
	@echo ""
	@echo "$(YELLOW)🚀 快速开始:$(NC)"
	@echo "  make quick-start     # 完整快速启动流程"
	@echo "  make deploy          # 部署到本地网络"
	@echo "  make test            # 运行测试"
	@echo ""
	@echo "$(YELLOW)📦 开发命令:$(NC)"
	@echo "  make install         # 安装依赖"
	@echo "  make compile         # 编译合约"
	@echo "  make clean           # 清理缓存"
	@echo "  make node            # 启动本地节点"
	@echo ""
	@echo "$(YELLOW)🧪 测试命令:$(NC)"
	@echo "  make test            # 运行所有测试"
	@echo "  make test-coverage   # 运行覆盖率测试"
	@echo "  make test-gas        # 运行Gas分析"
	@echo "  make test-integration # 运行集成测试"
	@echo ""
	@echo "$(YELLOW)🚀 部署命令:$(NC)"
	@echo "  make deploy          # 部署到localhost"
	@echo "  make deploy-hardhat  # 部署到hardhat网络"
	@echo "  make deploy-complete # 完整系统部署"
	@echo "  make deploy-prod     # 部署到生产网络"
	@echo ""
	@echo "$(YELLOW)🔧 工具命令:$(NC)"
	@echo "  make health          # 健康检查"
	@echo "  make generate-abi    # 生成ABI配置"
	@echo "  make generate-frontend # 生成前端配置"
	@echo "  make verify          # 验证部署"
	@echo "  make logs            # 查看部署日志"
	@echo ""
	@echo "$(YELLOW)🧹 清理命令:$(NC)"
	@echo "  make clean           # 清理编译缓存"
	@echo "  make clean-deploy    # 清理部署记录"
	@echo "  make clean-all       # 完全清理"
	@echo ""

# 安装依赖
install:
	@echo "$(GREEN)📦 安装项目依赖...$(NC)"
	npm install
	@echo "$(GREEN)✅ 依赖安装完成$(NC)"

# 编译合约
compile:
	@echo "$(GREEN)🔨 编译智能合约...$(NC)"
	npx hardhat compile
	@echo "$(GREEN)✅ 合约编译完成$(NC)"

# 启动本地节点
node:
	@echo "$(GREEN)🌐 启动本地Hardhat节点...$(NC)"
	npx hardhat node

# 运行测试
test:
	@echo "$(GREEN)🧪 运行智能合约测试...$(NC)"
	npx hardhat test

# 运行覆盖率测试
test-coverage:
	@echo "$(GREEN)📊 运行代码覆盖率测试...$(NC)"
	npm run coverage

# 运行Gas分析
test-gas:
	@echo "$(GREEN)⛽ 运行Gas使用分析...$(NC)"
	node scripts/test-runner.js --gas --start-node

# 运行集成测试
test-integration:
	@echo "$(GREEN)🔗 运行集成测试...$(NC)"
	npx hardhat test test/EconomicCycle.test.js

# 部署到localhost
deploy:
	@echo "$(GREEN)🚀 开始部署到本地网络...$(NC)"
	node scripts/deployment-automation.js --network localhost --tags $(TAGS)

# 部署到hardhat网络
deploy-hardhat:
	@echo "$(GREEN)🚀 开始部署到Hardhat网络...$(NC)"
	node scripts/deployment-automation.js --network hardhat --tags $(TAGS)

# 完整系统部署
deploy-complete:
	@echo "$(GREEN)🚀 开始完整系统部署...$(NC)"
	node scripts/deployment-automation.js --network localhost --tags CompleteSystem --reset

# 生产网络部署（需要配置）
deploy-prod:
	@echo "$(RED)⚠️  生产网络部署需要先配置网络参数$(NC)"
	@echo "$(YELLOW)请编辑 hardhat.config.js 配置生产网络$(NC)"
	@echo "$(YELLOW)然后运行: node scripts/deployment-automation.js --network mainnet$(NC)"

# 健康检查
health:
	@echo "$(GREEN)🏥 执行系统健康检查...$(NC)"
	node scripts/health-check.js

# 生成ABI配置
generate-abi:
	@echo "$(GREEN)📋 生成ABI配置...$(NC)"
	node scripts/generate-abi-config.js

# 生成前端配置
generate-frontend:
	@echo "$(GREEN)🌐 生成前端配置...$(NC)"
	node scripts/generate-frontend-deployment.js

# 验证部署
verify:
	@echo "$(GREEN)✅ 验证部署状态...$(NC)"
	npx hardhat deployments
	make health

# 查看日志
logs:
	@echo "$(BLUE)📋 查看部署日志...$(NC)"
	@if [ -f deployment.log ]; then \
		tail -n 50 deployment.log; \
	else \
		echo "$(YELLOW)没有找到部署日志文件$(NC)"; \
	fi

# 清理编译缓存
clean:
	@echo "$(YELLOW)🧹 清理编译缓存...$(NC)"
	rm -rf artifacts/ cache/
	@echo "$(GREEN)✅ 编译缓存清理完成$(NC)"

# 清理部署记录
clean-deploy:
	@echo "$(YELLOW)🧹 清理部署记录...$(NC)"
	rm -rf deployments/
	@echo "$(GREEN)✅ 部署记录清理完成$(NC)"

# 完全清理
clean-all: clean clean-deploy
	@echo "$(YELLOW)🧹 清理所有临时文件...$(NC)"
	rm -f deployment.log deployment-report.json test-report.json test-report.html
	rm -f deployment.log.backup deployment-error.json
	@echo "$(GREEN)✅ 完全清理完成$(NC)"

# 快速启动（推荐）
quick-start:
	@echo "$(BLUE)🎯 开始快速启动流程...$(NC)"
	@echo "$(YELLOW)步骤1: 安装依赖$(NC)"
	make install
	@echo "$(YELLOW)步骤2: 编译合约$(NC)"
	make compile
	@echo "$(YELLOW)步骤3: 部署系统$(NC)"
	make deploy-complete
	@echo "$(YELLOW)步骤4: 运行测试$(NC)"
	make test
	@echo "$(YELLOW)步骤5: 健康检查$(NC)"
	make health
	@echo "$(GREEN)🎉 快速启动完成！$(NC)"
	@echo "$(BLUE)📋 下一步:$(NC)"
	@echo "  1. 启动后端: cd backend && npm run dev"
	@echo "  2. 启动前端: cd frontend && npm run dev"
	@echo "  3. 访问应用: http://localhost:8088"

# 开发模式（持续运行）
dev:
	@echo "$(BLUE)🔄 进入开发模式...$(NC)"
	@echo "$(YELLOW)启动所有服务...$(NC)"
	@if pgrep -f "hardhat node" > /dev/null; then \
		echo "$(GREEN)✅ Hardhat节点已在运行$(NC)"; \
	else \
		echo "$(YELLOW)启动Hardhat节点...$(NC)"; \
		npx hardhat node > /dev/null 2>&1 & \
		sleep 5; \
	fi
	@echo "$(YELLOW)部署合约...$(NC)"
	npx hardhat deploy --network localhost --tags CompleteSystem
	@echo "$(YELLOW)生成前端配置...$(NC)"
	node scripts/generate-abi-config.js
	node scripts/generate-frontend-deployment.js
	@echo "$(GREEN)🎯 开发环境就绪！$(NC)"
	@echo "$(BLUE)💡 提示: 使用 'make stop-dev' 停止开发模式$(NC)"

# 停止开发模式
stop-dev:
	@echo "$(YELLOW)🛑 停止开发模式...$(NC)"
	@pkill -f "hardhat node" || true
	@echo "$(GREEN)✅ 开发模式已停止$(NC)"

# 批量测试
test-all: test test-coverage test-integration
	@echo "$(GREEN)🧪 运行所有测试套件...$(NC)"
	@echo "$(BLUE)✅ 所有测试完成$(NC)"

# 部署验证流程
deploy-verify: deploy test health
	@echo "$(GREEN)🚀 部署验证流程完成$(NC)"

# 生成所有报告
reports:
	@echo "$(GREEN)📊 生成所有报告...$(NC)"
	node scripts/test-runner.js --coverage --gas --integration
	@echo "$(GREEN)✅ 报告生成完成$(NC)"
	@echo "$(BLUE)📋 查看报告:$(NC)"
	@echo "  - 测试报告: test-report.html"
	@echo "  - 部署报告: deployment-report.json"

# Git相关
git-status:
	@echo "$(BLUE)📋 Git状态:$(NC)"
	git status

git-commit:
	@echo "$(BLUE)📝 提交更改...$(NC)"
	git add .
	git commit -m "update: 更新合约部署和配置"

git-push:
	@echo "$(BLUE)📤 推送到远程仓库...$(NC)"
	git push

# 版本信息
version:
	@echo "$(BLUE)📦 项目信息:$(NC)"
	@echo "  项目: $(PROJECT_NAME)"
	@echo "  Node.js: $(shell node --version)"
	@echo "  NPM: $(shell npm --version)"
	@echo "  Hardhat: $(shell npx hardhat --version)"
	@echo "  Solidity: $(shell npx hardhat compile --verbose | grep -o 'Solidity [0-9.]*\\.[0-9.]*\\.[0-9.]*' | head -1)"

# 网络信息
networks:
	@echo "$(BLUE)🌐 网络配置:$(NC)"
	@echo "  localhost: http://127.0.0.1:8545"
	@echo "  hardhat: 内置测试网络"
	@echo "  mainnet: 生产网络（需配置）"

# 帮用命令列表
list-commands:
	@echo "$(BLUE)📋 可用命令列表:$(NC)"
	@make help

# 检查工具安装
check-tools:
	@echo "$(BLUE)🔧 检查工具安装状态:$(NC)"
	@echo "  Node.js: $(shell node --version 2>/dev/null || echo '未安装')"
	@echo "  NPM: $(shell npm --version 2>/dev/null || echo '未安装')"
	@echo "  Hardhat: $(shell npx hardhat --version 2>/dev/null || echo '未安装')"
	@echo "  Git: $(shell git --version 2>/dev/null || echo '未安装')"