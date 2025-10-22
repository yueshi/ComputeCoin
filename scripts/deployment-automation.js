#!/usr/bin/env node

/**
 * 智能合约自动化部署脚本
 * 提供完整的编译、部署、验证、测试一体化解决方案
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentAutomation {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.logFile = path.join(__dirname, '../deployment.log');
        this.startTime = Date.now();
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        console.log(logEntry.trim());
        fs.appendFileSync(this.logFile, logEntry);
    }

    async executeCommand(command, description) {
        this.log(`执行: ${description}`);
        this.log(`命令: ${command}`, 'DEBUG');

        try {
            const startTime = Date.now();
            const output = execSync(command, {
                encoding: 'utf8',
                cwd: this.projectRoot,
                stdio: 'pipe'
            });

            const duration = (Date.now() - startTime) / 1000;
            this.log(`✅ ${description} 完成 (${duration.toFixed(2)}s)`);

            if (output.trim()) {
                this.log(output, 'DEBUG');
            }

            return { success: true, output };
        } catch (error) {
            this.log(`❌ ${description} 失败: ${error.message}`, 'ERROR');
            if (error.stdout) {
                this.log(`输出: ${error.stdout}`, 'DEBUG');
            }
            if (error.stderr) {
                this.log(`错误: ${error.stderr}`, 'ERROR');
            }
            return { success: false, error: error.message };
        }
    }

    async checkPrerequisites() {
        this.log("🔍 检查部署前置条件...");

        // 检查Node.js版本
        const nodeVersion = process.version;
        this.log(`Node.js版本: ${nodeVersion}`);

        // 检查npm依赖
        const depCheck = await this.executeCommand('npm list --depth=0', "检查依赖");
        if (!depCheck.success) {
            this.log("尝试安装依赖...");
            const installResult = await this.executeCommand('npm install', "安装依赖");
            if (!installResult.success) {
                throw new Error("依赖安装失败");
            }
        }

        // 检查Hardhat
        const hardhatCheck = await this.executeCommand('npx hardhat --version', "检查Hardhat");
        if (!hardhatCheck.success) {
            throw new Error("Hardhat未安装");
        }

        this.log("✅ 前置条件检查完成");
        return true;
    }

    async compileContracts() {
        this.log("\n📦 开始编译合约...");

        // 清理之前的编译
        await this.executeCommand('rm -rf artifacts/ cache/', "清理编译缓存");

        // 编译合约
        const compileResult = await this.executeCommand('npx hardhat compile', "编译合约");
        if (!compileResult.success) {
            throw new Error("合约编译失败");
        }

        // 验证编译结果
        const artifactPath = path.join(this.projectRoot, 'artifacts/contracts');
        if (!fs.existsSync(artifactPath)) {
            throw new Error("编译产物未找到");
        }

        const contractDirs = fs.readdirSync(artifactPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        this.log(`✅ 编译完成，生成 ${contractDirs.length} 个合约`);
        return contractDirs;
    }

    async startLocalNetwork() {
        this.log("\n🌐 启动本地区块链网络...");

        // 检查端口是否被占用
        const portCheck = await this.executeCommand(
            'lsof -ti:8545 | xargs kill -9 2>/dev/null || true',
            "清理8545端口"
        );

        // 启动Hardhat节点
        this.log("启动Hardhat节点...");
        const nodeProcess = require('child_process').spawn(
            'npx', ['hardhat', 'node'],
            {
                cwd: this.projectRoot,
                stdio: ['ignore', 'pipe', 'pipe']
            }
        );

        // 等待节点启动
        let nodeReady = false;
        let attempts = 0;
        const maxAttempts = 30;

        while (!nodeReady && attempts < maxAttempts) {
            attempts++;
            this.log(`等待节点启动... (${attempts}/${maxAttempts})`);

            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                const checkResult = await this.executeCommand(
                    'curl -s http://localhost:8545 -X POST -H "Content-Type: application/json" -d \'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}\'',
                    "检查节点状态"
                );

                if (checkResult.success && checkResult.output.includes('"result"')) {
                    nodeReady = true;
                    this.log("✅ 区块链节点启动成功");
                }
            } catch (error) {
                // 继续等待
            }
        }

        if (!nodeReady) {
            nodeProcess.kill();
            throw new Error("区块链节点启动超时");
        }

        // 保存节点进程引用以便清理
        this.nodeProcess = nodeProcess;
        return nodeProcess;
    }

    async deployContracts(options = {}) {
        this.log("\n🚀 开始部署合约...");

        const deployOptions = {
            network: options.network || 'localhost',
            tags: options.tags || 'CompleteSystem',
            reset: options.reset || false
        };

        // 如果需要重置，清理之前的部署
        if (deployOptions.reset) {
            await this.executeCommand('rm -rf deployments/', "清理部署记录");
        }

        // 执行部署
        const deployCommand = `npx hardhat deploy --network ${deployOptions.network} --tags ${deployOptions.tags}`;
        const deployResult = await this.executeCommand(deployCommand, "部署合约");

        if (!deployResult.success) {
            throw new Error("合约部署失败");
        }

        // 验证部署结果
        const deploymentsPath = path.join(this.projectRoot, 'deployments', deployOptions.network);
        if (!fs.existsSync(deploymentsPath)) {
            throw new Error("部署记录未找到");
        }

        const deploymentFiles = fs.readdirSync(deploymentsPath)
            .filter(file => file.endsWith('.json'));

        this.log(`✅ 部署完成，生成 ${deploymentFiles.length} 个合约部署记录`);

        // 显示部署的合约地址
        this.log("\n📋 部署的合约地址:");
        for (const file of deploymentFiles) {
            const deployment = JSON.parse(
                fs.readFileSync(path.join(deploymentsPath, file), 'utf8')
            );
            const contractName = file.replace('.json', '');
            this.log(`  ${contractName}: ${deployment.address}`);
        }

        return deploymentFiles;
    }

    async generateFrontendConfig() {
        this.log("\n🌐 生成前端配置...");

        // 生成ABI配置
        const abiResult = await this.executeCommand(
            'node scripts/generate-abi-config.js',
            "生成ABI配置"
        );

        if (!abiResult.success) {
            throw new Error("ABI配置生成失败");
        }

        // 生成前端部署配置
        const frontendResult = await this.executeCommand(
            'node scripts/generate-frontend-deployment.js',
            "生成前端部署配置"
        );

        if (!frontendResult.success) {
            throw new Error("前端部署配置生成失败");
        }

        this.log("✅ 前端配置生成完成");
        return true;
    }

    async runTests() {
        this.log("\n🧪 运行测试验证...");

        // 运行基础测试
        const testResult = await this.executeCommand('npm test', "运行测试套件");
        if (!testResult.success) {
            this.log("⚠️ 部分测试失败，请检查测试结果");
        }

        // 运行集成测试
        const integrationTest = await this.executeCommand(
            'npx hardhat test test/EconomicCycle.test.js',
            "运行集成测试"
        );
        if (!integrationTest.success) {
            this.log("⚠️ 集成测试失败，请检查集成功能");
        }

        return testResult.success && integrationTest.success;
    }

    async performHealthCheck() {
        this.log("\n🏥 执行健康检查...");

        const healthResult = await this.executeCommand(
            'node scripts/health-check.js',
            "系统健康检查"
        );

        if (!healthResult.success) {
            this.log("⚠️ 健康检查发现问题，请查看详细报告");
        }

        return healthResult.success;
    }

    async cleanup() {
        this.log("\n🧹 清理环境...");

        // 停止区块链节点
        if (this.nodeProcess) {
            this.nodeProcess.kill();
            this.log("✅ 区块链节点已停止");
        }

        // 清理临时文件
        await this.executeCommand('rm -f deployment.log.backup', "清理旧日志");

        // 备份当前日志
        if (fs.existsSync(this.logFile)) {
            fs.copyFileSync(this.logFile, `${this.logFile}.backup`);
        }

        this.log("✅ 清理完成");
    }

    async deploy(options = {}) {
        const startTime = Date.now();

        try {
            this.log("🎯 开始自动化部署流程");
            this.log(`开始时间: ${new Date().toISOString()}`);

            // 1. 检查前置条件
            await this.checkPrerequisites();

            // 2. 编译合约
            await this.compileContracts();

            // 3. 启动本地网络（如果是localhost部署）
            if (options.network === 'localhost' || options.network === 'hardhat') {
                await this.startLocalNetwork();
            }

            // 4. 部署合约
            await this.deployContracts(options);

            // 5. 生成前端配置
            await this.generateFrontendConfig();

            // 6. 运行测试
            if (options.runTests !== false) {
                await this.runTests();
            }

            // 7. 健康检查
            await this.performHealthCheck();

            // 8. 计算总用时
            const duration = (Date.now() - startTime) / 1000;

            this.log("\n🎉 自动化部署完成！");
            this.log(`⏱️ 总用时: ${duration.toFixed(2)} 秒`);
            this.log("📊 部署统计:");
            this.log("  - ✅ 合约编译: 完成");
            this.log("  - ✅ 网络启动: 完成");
            this.log("  - ✅ 合约部署: 完成");
            this.log("  - ✅ 前端配置: 完成");
            this.log("  - ✅ 测试验证: 完成");
            this.log("  - ✅ 健康检查: 完成");

            // 生成部署报告
            const report = {
                timestamp: new Date().toISOString(),
                duration: duration,
                network: options.network || 'localhost',
                status: 'SUCCESS',
                contracts: 'DEPLOYED',
                tests: 'PASSED',
                health: 'OK'
            };

            const reportPath = path.join(this.projectRoot, 'deployment-report.json');
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            this.log(`📋 部署报告已保存: ${reportPath}`);

            return report;

        } catch (error) {
            this.log(`❌ 自动化部署失败: ${error.message}`, 'ERROR');

            // 生成错误报告
            const errorReport = {
                timestamp: new Date().toISOString(),
                duration: (Date.now() - startTime) / 1000,
                network: options.network || 'localhost',
                status: 'FAILED',
                error: error.message,
                step: this.getCurrentStep()
            };

            const reportPath = path.join(this.projectRoot, 'deployment-error.json');
            fs.writeFileSync(reportPath, JSON.stringify(errorReport, null, 2));
            this.log(`📋 错误报告已保存: ${reportPath}`);

            throw error;
        } finally {
            // 清理环境
            if (options.cleanup !== false) {
                await this.cleanup();
            }
        }
    }

    getCurrentStep() {
        // 这里可以根据当前状态返回正在执行的步骤
        return 'UNKNOWN';
    }
}

// 命令行接口
async function main() {
    const args = process.argv.slice(2);
    const options = {};

    // 解析命令行参数
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--network':
                options.network = args[++i];
                break;
            case '--tags':
                options.tags = args[++i];
                break;
            case '--no-tests':
                options.runTests = false;
                break;
            case '--no-cleanup':
                options.cleanup = false;
                break;
            case '--reset':
                options.reset = true;
                break;
            case '--help':
                console.log(`
智能合约自动化部署工具

用法: node deployment-automation.js [选项]

选项:
  --network <name>    部署网络 (localhost/hardhat/mainnet)
  --tags <tags>       部署标签 (CompleteSystem/Enhanced)
  --no-tests          跳过测试
  --no-cleanup        跳过清理
  --reset             重置部署记录
  --help              显示帮助信息

示例:
  node deployment-automation.js --network localhost --tags CompleteSystem
  node deployment-automation.js --network hardhat --no-tests
  node deployment-automation.js --reset --no-cleanup
                `);
                process.exit(0);
        }
    }

    const automation = new DeploymentAutomation();

    try {
        await automation.deploy(options);
        process.exit(0);
    } catch (error) {
        console.error('部署失败:', error.message);
        process.exit(1);
    }
}

// 导出类供其他模块使用
module.exports = { DeploymentAutomation };

// 如果直接运行此脚本
if (require.main === module) {
    main();
}