#!/usr/bin/env node

/**
 * 智能合约测试运行器
 * 提供全面的测试执行和报告功能
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.results = {
            timestamp: new Date().toISOString(),
            tests: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0
            }
        };
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        console.log(logEntry.trim());
    }

    async runCommand(command, description) {
        this.log(`执行: ${description}`);

        try {
            const startTime = Date.now();
            const output = execSync(command, {
                encoding: 'utf8',
                cwd: this.projectRoot,
                stdio: 'pipe'
            });

            const duration = (Date.now() - startTime) / 1000;
            this.log(`✅ ${description} 完成 (${duration.toFixed(2)}s)`);

            return { success: true, output, duration };
        } catch (error) {
            this.log(`❌ ${description} 失败: ${error.message}`, 'ERROR');
            return { success: false, error: error.message, output: error.stdout };
        }
    }

    async runContractTests() {
        this.log("\n🧪 运行合约测试套件...");

        const testSuites = [
            {
                name: "CCToken",
                file: "test/CCToken.test.js",
                description: "核心代币功能测试"
            },
            {
                name: "CustomerNFT",
                file: "test/CustomerNFT.test.js",
                description: "客户NFT功能测试"
            },
            {
                name: "ProviderNFT",
                file: "test/ProviderNFT.test.js",
                description: "提供商NFT功能测试"
            },
            {
                name: "StakingPool",
                file: "test/StakingPool.test.js",
                description: "质押池功能测试"
            },
            {
                name: "ComputeMarket",
                file: "test/ComputeMarket.test.js",
                description: "算力市场功能测试"
            },
            {
                name: "ProviderIncentive",
                file: "test/ProviderIncentive.test.js",
                description: "提供商激励测试"
            },
            {
                name: "EconomicCycle",
                file: "test/EconomicCycle.test.js",
                description: "完整经济周期测试"
            }
        ];

        for (const suite of testSuites) {
            this.log(`\n📋 运行 ${suite.name} 测试套件...`);

            const result = await this.runCommand(
                `npx hardhat test ${suite.file} --verbose`,
                suite.description
            );

            this.results.tests[suite.name] = {
                file: suite.file,
                description: suite.description,
                success: result.success,
                duration: result.duration || 0,
                output: result.output || ''
            };

            if (result.success) {
                this.results.summary.passed++;
                this.log(`✅ ${suite.name} 测试通过`);
            } else {
                this.results.summary.failed++;
                this.log(`❌ ${suite.name} 测试失败`);
            }

            this.results.summary.total++;
        }
    }

    async runCoverageTests() {
        this.log("\n📊 运行覆盖率测试...");

        const result = await this.runCommand(
            'npm run coverage',
            "代码覆盖率分析"
        );

        this.results.tests.Coverage = {
            file: "coverage/",
            description: "代码覆盖率分析",
            success: result.success,
            duration: result.duration || 0,
            output: result.output || ''
        };

        if (result.success) {
            this.results.summary.passed++;
            this.log("✅ 覆盖率测试完成");
        } else {
            this.results.summary.failed++;
            this.log("❌ 覆盖率测试失败");
        }

        this.results.summary.total++;
    }

    async runSpecificTests(pattern) {
        this.log(`\n🎯 运行特定测试: ${pattern}`);

        const result = await this.runCommand(
            `npx hardhat test --grep "${pattern}"`,
            `特定测试: ${pattern}`
        );

        this.results.tests[`${pattern}Tests`] = {
            file: "grep/" + pattern,
            description: `特定测试: ${pattern}`,
            success: result.success,
            duration: result.duration || 0,
            output: result.output || ''
        };

        if (result.success) {
            this.results.summary.passed++;
            this.log(`✅ 特定测试通过: ${pattern}`);
        } else {
            this.results.summary.failed++;
            this.log(`❌ 特定测试失败: ${pattern}`);
        }

        this.results.summary.total++;
    }

    async runGasAnalysis() {
        this.log("\n⛽ 运行Gas分析...");

        const gasAnalysisCommands = [
            {
                name: "CCToken Gas分析",
                command: "npx hardhat test test/CCToken.test.js --grep 'gas'"
            },
            {
                name: "StakingPool Gas分析",
                command: "npx hardhat test test/StakingPool.test.js --grep 'gas'"
            },
            {
                name: "ComputeMarket Gas分析",
                command: "npx hardhat test test/ComputeMarket.test.js --grep 'gas'"
            }
        ];

        for (const analysis of gasAnalysisCommands) {
            const result = await this.runCommand(
                analysis.command,
                analysis.name
            );

            this.results.tests[analysis.name] = {
                file: "gas-analysis",
                description: analysis.name,
                success: result.success,
                duration: result.duration || 0,
                output: result.output || ''
            };

            if (result.success) {
                this.results.summary.passed++;
            } else {
                this.results.summary.failed++;
            }

            this.results.summary.total++;
        }
    }

    async runIntegrationTests() {
        this.log("\n🔗 运行集成测试...");

        // 运行完整经济周期测试
        const result = await this.runCommand(
            'npx hardhat test test/EconomicCycle.test.js',
            "完整经济周期集成测试"
        );

        this.results.tests.Integration = {
            file: "test/EconomicCycle.test.js",
            description: "完整经济周期集成测试",
            success: result.success,
            duration: result.duration || 0,
            output: result.output || ''
        };

        if (result.success) {
            this.results.summary.passed++;
            this.log("✅ 集成测试通过");
        } else {
            this.results.summary.failed++;
            this.log("❌ 集成测试失败");
        }

        this.results.summary.total++;
    }

    async generateTestReport() {
        this.log("\n📋 生成测试报告...");

        const reportPath = path.join(this.projectRoot, 'test-report.json');
        const htmlReportPath = path.join(this.projectRoot, 'test-report.html');

        // 生成JSON报告
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

        // 生成HTML报告
        const htmlContent = this.generateHTMLReport();
        fs.writeFileSync(htmlReportPath, htmlContent);

        this.log(`✅ 测试报告已生成:`);
        this.log(`  - JSON: ${reportPath}`);
        this.log(`  - HTML: ${htmlReportPath}`);

        return { json: reportPath, html: htmlReportPath };
    }

    generateHTMLReport() {
        const { summary, tests, timestamp } = this.results;
        const successRate = ((summary.passed / summary.total) * 100).toFixed(1);

        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智能合约测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #495057; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .success { color: #28a745; }
        .failed { color: #dc3545; }
        .test-suite { margin-bottom: 20px; border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; }
        .test-header { background: #e9ecef; padding: 15px; font-weight: bold; }
        .test-status { padding: 15px; }
        .status-success { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .timestamp { text-align: center; color: #6c757d; margin-top: 30px; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 智能合约测试报告</h1>
            <p>生成时间: ${new Date(timestamp).toLocaleString('zh-CN')}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <h3>总测试数</h3>
                <div class="value">${summary.total}</div>
            </div>
            <div class="metric">
                <h3>通过</h3>
                <div class="value success">${summary.passed}</div>
            </div>
            <div class="metric">
                <h3>失败</h3>
                <div class="value failed">${summary.failed}</div>
            </div>
            <div class="metric">
                <h3>成功率</h3>
                <div class="value ${successRate >= 80 ? 'success' : 'failed'}">${successRate}%</div>
            </div>
        </div>

        <h2>📋 详细测试结果</h2>

        ${Object.entries(tests).map(([name, test]) => `
            <div class="test-suite">
                <div class="test-header">
                    ${test.description} (${test.file})
                    ${test.success ? '✅' : '❌'}
                </div>
                <div class="test-status ${test.success ? 'status-success' : 'status-failed'}">
                    <strong>状态:</strong> ${test.success ? '通过' : '失败'}<br>
                    <strong>用时:</strong> ${test.duration.toFixed(2)}秒<br>
                    ${test.output ? '<strong>输出:</strong><pre>' + test.output.substring(0, 500) + (test.output.length > 500 ? '...' : '') + '</pre>' : ''}
                </div>
            </div>
        `).join('')}

        <div class="timestamp">
            <p>报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    async run(options = {}) {
        const startTime = Date.now();

        this.log("🎯 开始执行智能合约测试");
        this.log(`开始时间: ${new Date().toISOString()}`);

        try {
            // 检查是否需要启动本地节点
            if (options.startNode) {
                this.log("🌐 启动本地测试节点...");
                await this.runCommand('npx hardhat node &', "启动测试节点");
                await new Promise(resolve => setTimeout(resolve, 5000)); // 等待节点启动
            }

            // 运行基础测试
            if (options.runBasic !== false) {
                await this.runContractTests();
            }

            // 运行覆盖率测试
            if (options.runCoverage) {
                await this.runCoverageTests();
            }

            // 运行特定测试
            if (options.pattern) {
                await this.runSpecificTests(options.pattern);
            }

            // 运行Gas分析
            if (options.runGas) {
                await this.runGasAnalysis();
            }

            // 运行集成测试
            if (options.runIntegration) {
                await this.runIntegrationTests();
            }

            // 生成测试报告
            const reportPaths = await this.generateTestReport();

            const duration = (Date.now() - startTime) / 1000;

            this.log("\n🎉 测试执行完成！");
            this.log(`⏱️ 总用时: ${duration.toFixed(2)} 秒`);
            this.log("📊 测试统计:");
            this.log(`  - 总测试数: ${this.results.summary.total}`);
            this.log(`  - 通过: ${this.results.summary.passed}`);
            this.log(`  - 失败: ${this.results.summary.failed}`);
            this.log(`  - 成功率: ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)}%`);

            return {
                success: this.results.summary.failed === 0,
                summary: this.results.summary,
                reports: reportPaths,
                duration
            };

        } catch (error) {
            this.log(`❌ 测试执行失败: ${error.message}`, 'ERROR');
            throw error;
        }
    }
}

// 命令行接口
async function main() {
    const args = process.argv.slice(2);
    const options = {};

    // 解析命令行参数
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--start-node':
                options.startNode = true;
                break;
            case '--coverage':
                options.runCoverage = true;
                break;
            case '--gas':
                options.runGas = true;
                break;
            case '--integration':
                options.runIntegration = true;
                break;
            case '--no-basic':
                options.runBasic = false;
                break;
            case '--pattern':
                options.pattern = args[++i];
                break;
            case '--help':
                console.log(`
智能合约测试运行器

用法: node test-runner.js [选项]

选项:
  --start-node        启动本地测试节点
  --coverage          运行代码覆盖率测试
  --gas               运行Gas使用分析
  --integration       运行集成测试
  --no-basic          跳过基础测试
  --pattern <regex>   运行匹配模式的测试
  --help              显示帮助信息

示例:
  node test-runner.js --start-node --coverage
  node test-runner.js --pattern "staking"
  node test-runner.js --gas --integration
  node test-runner.js --coverage --no-basic
                `);
                process.exit(0);
        }
    }

    const testRunner = new TestRunner();

    try {
        await testRunner.run(options);
        process.exit(0);
    } catch (error) {
        console.error('测试执行失败:', error.message);
        process.exit(1);
    }
}

// 导出类供其他模块使用
module.exports = { TestRunner };

// 如果直接运行此脚本
if (require.main === module) {
    main();
}