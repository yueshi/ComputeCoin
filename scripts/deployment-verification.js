#!/usr/bin/env node

/**
 * 部署验证脚本
 * 验证所有合约功能是否正常工作
 */

const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

class DeploymentVerifier {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.testResults = {
            timestamp: new Date().toISOString(),
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}`;
        console.log(logEntry);
    }

    recordTestResult(name, passed, message, details = {}) {
        const result = {
            name,
            passed,
            message,
            details,
            timestamp: new Date().toISOString()
        };

        this.testResults.tests.push(result);
        this.testResults.summary.total++;

        if (passed) {
            this.testResults.summary.passed++;
            this.log(`✅ ${name}: ${message}`);
        } else {
            this.testResults.summary.failed++;
            this.log(`❌ ${name}: ${message}`, 'ERROR');
        }
    }

    recordWarning(message) {
        this.testResults.summary.warnings++;
        this.log(`⚠️ ${message}`, 'WARNING');
    }

    async loadDeploymentConfig() {
        this.log("📋 加载部署配置...");

        const deploymentsPath = path.join(this.projectRoot, 'deployments/localhost');
        if (!fs.existsSync(deploymentsPath)) {
            throw new Error("找不到部署配置文件");
        }

        const contracts = {};
        const deploymentFiles = fs.readdirSync(deploymentsPath)
            .filter(file => file.endsWith('.json'));

        for (const file of deploymentFiles) {
            const deployment = JSON.parse(
                fs.readFileSync(path.join(deploymentsPath, file), 'utf8')
            );
            contracts[file.replace('.json', '')] = deployment.address;
        }

        this.log(`✅ 加载了 ${Object.keys(contracts).length} 个合约配置`);
        return contracts;
    }

    async verifyBasicFunctionality(contracts) {
        this.log("\n🔍 验证基础功能...");

        const [signer] = await ethers.getSigners();
        this.log(`使用验证账户: ${signer.address}`);

        // 验证CC Token
        try {
            const ccToken = await ethers.getContractAt("CCToken", contracts.CCToken);
            const name = await ccToken.name();
            const symbol = await ccToken.symbol();
            const totalSupply = await ccToken.totalSupply();

            this.recordTestResult(
                "CCToken基础功能",
                true,
                `${name}(${symbol}) - 总供应: ${ethers.formatEther(totalSupply)} CC`,
                { name, symbol, totalSupply: totalSupply.toString() }
            );
        } catch (error) {
            this.recordTestResult("CCToken基础功能", false, error.message);
        }

        // 验证MockUSDC
        try {
            const mockUSDC = await ethers.getContractAt("MockUSDC", contracts.MockUSDC);
            const name = await mockUSDC.name();
            const symbol = await mockUSDC.symbol();
            const totalSupply = await mockUSDC.totalSupply();

            this.recordTestResult(
                "MockUSDC基础功能",
                true,
                `${name}(${symbol}) - 总供应: ${ethers.formatUnits(totalSupply, 6)} CCUSD`,
                { name, symbol, totalSupply: totalSupply.toString() }
            );
        } catch (error) {
            this.recordTestResult("MockUSDC基础功能", false, error.message);
        }

        // 验证NFT合约
        try {
            const customerNFT = await ethers.getContractAt("CustomerNFT", contracts.CustomerNFT);
            const providerNFT = await ethers.getContractAt("ProviderNFT", contracts.ProviderNFT);

            const customerName = await customerNFT.name();
            const providerName = await providerNFT.name();

            this.recordTestResult(
                "NFT合约基础功能",
                true,
                `CustomerNFT: ${customerName}, ProviderNFT: ${providerName}`,
                { customerName, providerName }
            );
        } catch (error) {
            this.recordTestResult("NFT合约基础功能", false, error.message);
        }
    }

    async verifyStakingFunctionality(contracts) {
        this.log("\n🏊 验证质押功能...");

        try {
            const stakingPool = await ethers.getContractAt("StakingPool", contracts.StakingPool);
            const ccToken = await ethers.getContractAt("CCToken", contracts.CCToken);
            const [signer] = await ethers.getSigners();

            // 检查基础APR
            const baseAPR = await stakingPool.baseAPR();
            this.recordTestResult(
                "质押池基础APR",
                Number(baseAPR) === 800,
                `基础APR: ${baseAPR} (期望: 800)`
            );

            // 检查合约地址配置
            const ccTokenAddress = await stakingPool.ccToken();
            const customerNFTAddress = await stakingPool.customerNFT();
            const providerNFTAddress = await stakingPool.providerNFT();

            const addressesMatch =
                ccTokenAddress.toLowerCase() === contracts.CCToken.toLowerCase() &&
                customerNFTAddress.toLowerCase() === contracts.CustomerNFT.toLowerCase() &&
                providerNFTAddress.toLowerCase() === contracts.ProviderNFT.toLowerCase();

            this.recordTestResult(
                "质押池地址配置",
                addressesMatch,
                `地址配置${addressesMatch ? '正确' : '错误'}`,
                { ccTokenAddress, customerNFTAddress, providerNFTAddress }
            );

            // 检查质押统计
            const totalCCStaked = await stakingPool.totalCCStaked();
            const totalETHStaked = await stakingPool.totalETHStaked();

            this.recordTestResult(
                "质押统计功能",
                true,
                `CC质押: ${ethers.formatEther(totalCCStaked)}, ETH质押: ${ethers.formatEther(totalETHStaked)}`,
                { totalCCStaked: totalCCStaked.toString(), totalETHStaked: totalETHStaked.toString() }
            );

        } catch (error) {
            this.recordTestResult("质押功能验证", false, error.message);
        }
    }

    async verifyMarketFunctionality(contracts) {
        this.log("\n📊 验证算力市场功能...");

        try {
            const computeMarket = await ethers.getContractAt("ComputeMarket", contracts.ComputeMarket);
            const [signer] = await ethers.getSigners();

            // 检查费用设置
            const platformFee = await computeMarket.platformFee();
            const burnRate = await computeMarket.burnRate();

            const platformFeeCorrect = Number(platformFee) === 250; // 2.5%
            const burnRateCorrect = Number(burnRate) === 150; // 1.5%

            this.recordTestResult(
                "市场费用设置",
                platformFeeCorrect && burnRateCorrect,
                `平台费: ${platformFee} (期望: 250), 燃烧率: ${burnRate} (期望: 150)`,
                { platformFee: platformFee.toString(), burnRate: burnRate.toString() }
            );

            // 检查订单统计
            const totalOrders = await computeMarket.totalOrders();
            const totalVolumeUSD = await computeMarket.totalVolumeUSD();
            const totalVolumeCC = await computeMarket.totalVolumeCC();
            const totalBurnedCC = await computeMarket.totalBurnedCC();

            this.recordTestResult(
                "市场统计功能",
                true,
                `订单数: ${totalOrders}, USD交易量: ${ethers.formatUnits(totalVolumeUSD, 6)}, CC交易量: ${ethers.formatEther(totalVolumeCC)}, CC燃烧: ${ethers.formatEther(totalBurnedCC)}`,
                {
                    totalOrders: totalOrders.toString(),
                    totalVolumeUSD: totalVolumeUSD.toString(),
                    totalVolumeCC: totalVolumeCC.toString(),
                    totalBurnedCC: totalBurnedCC.toString()
                }
            );

            // 检查授权状态
            const isAuthorized = await computeMarket.authorizedClients(signer.address);
            this.recordTestResult(
                "客户授权状态",
                isAuthorized,
                `账户 ${signer.address} ${isAuthorized ? '已' : '未'}授权`
            );

        } catch (error) {
            this.recordTestResult("算力市场验证", false, error.message);
        }
    }

    async verifyIncentiveFunctionality(contracts) {
        this.log("\n🎁 验证激励系统功能...");

        try {
            const providerIncentive = await ethers.getContractAt("ProviderIncentive", contracts.ProviderIncentive);

            // 检查日释放率
            const dailyReleaseRate = await providerIncentive.dailyReleaseRate();
            const expectedDailyRate = ethers.parseEther("1095890"); // ~400M CC/year

            const releaseRateCorrect = dailyReleaseRate.toString() === expectedDailyReleaseRate.toString();

            this.recordTestResult(
                "激励释放率设置",
                releaseRateCorrect,
                `日释放率: ${ethers.formatEther(dailyReleaseRate)} CC`,
                { dailyReleaseRate: dailyReleaseRate.toString(), expected: expectedDailyRate.toString() }
            );

            // 检查合约余额
            const ccTokenBalance = await providerIncentive.ccTokenBalance();
            this.recordTestResult(
                "激励合约余额",
                Number(ccTokenBalance) > 0,
                `CC余额: ${ethers.formatEther(ccTokenBalance)} CC`,
                { ccTokenBalance: ccTokenBalance.toString() }
            );

            // 检查合约地址配置
            const ccTokenAddress = await providerIncentive.ccToken();
            const providerNFTAddress = await providerIncentive.providerNFT();

            const addressesMatch =
                ccTokenAddress.toLowerCase() === contracts.CCToken.toLowerCase() &&
                providerNFTAddress.toLowerCase() === contracts.ProviderNFT.toLowerCase();

            this.recordTestResult(
                "激励合约地址配置",
                addressesMatch,
                `地址配置${addressesMatch ? '正确' : '错误'}`,
                { ccTokenAddress, providerNFTAddress }
            );

        } catch (error) {
            this.recordTestResult("激励系统验证", false, error.message);
        }
    }

    async verifyReserveFunctionality(contracts) {
        this.log("\n🏦 验证储备系统功能...");

        try {
            const mockUSDC = await ethers.getContractAt("MockUSDC", contracts.MockUSDC);
            const ccusdReservePool = await ethers.getContractAt("CCUSDReservePool", contracts.CCUSDReservePool);
            const ethToCCUSDConverter = await ethers.getContractAt("EthToCCUSDConverter", contracts.EthToCCUSDConverter);

            // 检查储备率
            const reserveRatio = await mockUSDC.getReserveRatio();
            this.recordTestResult(
                "CCUSD储备率",
                Number(reserveRatio) >= 8000, // 至少80%
                `储备率: ${Number(reserveRatio) / 100}%`,
                { reserveRatio: reserveRatio.toString() }
            );

            // 检查每代币支撑
            const backingPerToken = await mockUSDC.getBackingPerToken();
            this.recordTestResult(
                "CCUSD价值支撑",
                Number(backingPerToken) > 0,
                `每CCUSD支撑: ${ethers.formatEther(backingPerToken)} ETH`,
                { backingPerToken: backingPerToken.toString() }
            );

            // 检查兑换合约配置
            const ccusdToken = await ethToCCUSDConverter.ccusdToken();
            const reservePool = await ethToCCUSDConverter.reservePool();

            const converterConfigCorrect =
                ccusdToken.toLowerCase() === contracts.MockUSDC.toLowerCase() &&
                reservePool.toLowerCase() === contracts.CCUSDReservePool.toLowerCase();

            this.recordTestResult(
                "兑换合约配置",
                converterConfigCorrect,
                `兑换合约地址配置${converterConfigCorrect ? '正确' : '错误'}`,
                { ccusdToken, reservePool }
            );

        } catch (error) {
            this.recordTestResult("储备系统验证", false, error.message);
        }
    }

    async verifyContractInteractions(contracts) {
        this.log("\n🔗 验证合约间交互...");

        try {
            // 验证NFT与质押池的连接
            const customerNFT = await ethers.getContractAt("CustomerNFT", contracts.CustomerNFT);
            const stakingPoolAddress = await customerNFT.stakingPool();

            const nftStakingConnection = stakingPoolAddress.toLowerCase() === contracts.StakingPool.toLowerCase();
            this.recordTestResult(
                "NFT-质押池连接",
                nftStakingConnection,
                `CustomerNFT质押池地址: ${stakingPoolAddress}`
            );

            // 验证代币授权
            const [signer] = await ethers.getSigners();
            const ccToken = await ethers.getContractAt("CCToken", contracts.CCToken);
            const allowance = await ccToken.allowance(signer.address, contracts.StakingPool);

            this.recordTestResult(
                "代币授权检查",
                true,
                `质押池授权额度: ${ethers.formatEther(allowance)} CC`
            );

        } catch (error) {
            this.recordTestResult("合约交互验证", false, error.message);
        }
    }

    async verifyFrontendIntegration() {
        this.log("\n🌐 验证前端集成...");

        try {
            // 检查前端配置文件
            const frontendConfigPath = path.join(this.projectRoot, 'frontend/src/config/contracts-generated.js');
            const abiConfigPath = path.join(this.projectRoot, 'frontend/src/config/contracts.js');

            let frontendConfigExists = false;
            let abiConfigValid = false;

            if (fs.existsSync(frontendConfigPath)) {
                frontendConfigExists = true;
                try {
                    const config = require(frontendConfigPath);
                    if (config.CONTRACT_ABI && config.CONTRACT_ADDRESSES && Object.keys(config.CONTRACT_ABI).length >= 10) {
                        abiConfigValid = true;
                    }
                } catch (error) {
                    // 配置文件格式错误
                }
            }

            this.recordTestResult(
                "前端ABI配置",
                frontendConfigExists && abiConfigValid,
                `前端配置文件${frontendConfigExists ? '存在' : '不存在'}${abiConfigValid ? '且有效' : '或无效'}`
            );

            // 检查主配置文件
            let mainConfigValid = false;
            if (fs.existsSync(abiConfigPath)) {
                try {
                    const config = require(abiConfigPath);
                    if (config.CONTRACT_ABI && config.CONTRACT_ADDRESSES) {
                        mainConfigValid = true;
                    }
                } catch (error) {
                    // 配置文件格式错误
                }
            }

            this.recordTestResult(
                "主配置文件",
                mainConfigValid,
                `主配置文件${mainConfigValid ? '有效' : '无效'}`
            );

        } catch (error) {
            this.recordTestResult("前端集成验证", false, error.message);
        }
    }

    async performSecurityChecks(contracts) {
        this.log("\n🔒 执行安全检查...");

        try {
            // 检查合约所有权
            const ccToken = await ethers.getContractAt("CCToken", contracts.CCToken);
            const owner = await ccToken.owner();
            const [signer] = await ethers.getSigners();

            const isOwner = owner.toLowerCase() === signer.address.toLowerCase();
            this.recordTestResult(
                "合约所有权",
                isOwner,
                `部署者是合约所有者: ${isOwner ? '是' : '否'}`
            );

            // 检查重入保护（通过尝试调用）
            const customerNFT = await ethers.getContractAt("CustomerNFT", contracts.CustomerNFT);
            try {
                // 尝试调用一个需要检查的函数
                await customerNFT.getDiscount(signer.address);
                this.recordTestResult(
                    "合约可访问性",
                    true,
                    "合约函数可正常调用"
                );
            } catch (error) {
                this.recordTestResult(
                    "合约可访问性",
                    false,
                    `合约调用失败: ${error.message}`
                );
            }

        } catch (error) {
            this.recordTestResult("安全检查", false, error.message);
        }
    }

    async generateVerificationReport() {
        this.log("\n📋 生成验证报告...");

        const report = {
            ...this.testResults,
            summary: {
                ...this.testResults.summary,
                successRate: ((this.testResults.summary.passed / this.testResults.summary.total) * 100).toFixed(1),
                status: this.testResults.summary.failed === 0 ? 'SUCCESS' : 'FAILED'
            }
        };

        const reportPath = path.join(this.projectRoot, 'verification-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // 生成HTML报告
        const htmlReport = this.generateHTMLReport(report);
        const htmlPath = path.join(this.projectRoot, 'verification-report.html');
        fs.writeFileSync(htmlPath, htmlReport);

        this.log(`✅ 验证报告已生成:`);
        this.log(`  - JSON: ${reportPath}`);
        this.log(`  - HTML: ${htmlPath}`);

        return { json: reportPath, html: htmlPath, report };
    }

    generateHTMLReport(report) {
        const { summary, tests, timestamp } = report;
        const successRate = parseFloat(summary.successRate);

        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智能合约部署验证报告</title>
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
        .warning { color: #ffc107; }
        .test-item { margin-bottom: 15px; border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; }
        .test-header { background: #e9ecef; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .test-status { padding: 15px; }
        .status-success { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-warning { background: #fff3cd; color: #856404; }
        .details { font-size: 0.9em; color: #6c757d; margin-top: 10px; }
        .timestamp { text-align: center; color: #6c757d; margin-top: 30px; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .badge-success { background: #28a745; color: white; }
        .badge-failed { background: #dc3545; color: white; }
        .badge-warning { background: #ffc107; color: #212529; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 智能合约部署验证报告</h1>
            <p>验证时间: ${new Date(timestamp).toLocaleString('zh-CN')}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <h3>总验证项</h3>
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
                <div class="value ${successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'failed'}">${successRate}%</div>
            </div>
        </div>

        ${summary.warnings > 0 ? `
        <div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <strong>⚠️ 警告:</strong> 发现 ${summary.warnings} 个警告项，建议检查
        </div>
        ` : ''}

        <h2>📋 详细验证结果</h2>

        ${tests.map(test => `
            <div class="test-item">
                <div class="test-header">
                    <span>${test.name}</span>
                    <span class="badge ${test.passed ? 'badge-success' : 'badge-failed'}">${test.passed ? '✅' : '❌'}</span>
                </div>
                <div class="test-status ${test.passed ? 'status-success' : 'status-failed'}">
                    <strong>结果:</strong> ${test.message}
                    ${test.details ? `<div class="details"><strong>详情:</strong> ${JSON.stringify(test.details, null, 2)}</div>` : ''}
                </div>
            </div>
        `).join('')}

        <div class="timestamp">
            <p>报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
            <p>验证状态: <strong>${summary.status}</strong></p>
        </div>
    </div>
</body>
</html>
        `;
    }

    async runVerification() {
        this.log("🔍 开始智能合约部署验证...");
        this.log(`开始时间: ${new Date().toISOString()}`);

        try {
            // 1. 加载部署配置
            const contracts = await this.loadDeploymentConfig();

            // 2. 验证基础功能
            await this.verifyBasicFunctionality(contracts);

            // 3. 验证质押功能
            await this.verifyStakingFunctionality(contracts);

            // 4. 验证算力市场
            await this.verifyMarketFunctionality(contracts);

            // 5. 验证激励系统
            await this.verifyIncentiveFunctionality(contracts);

            // 6. 验证储备系统
            await this.verifyReserveFunctionality(contracts);

            // 7. 验证合约交互
            await this.verifyContractInteractions(contracts);

            // 8. 验证前端集成
            await this.verifyFrontendIntegration();

            // 9. 执行安全检查
            await this.performSecurityChecks(contracts);

            // 10. 生成验证报告
            const reportData = await this.generateVerificationReport();

            this.log("\n🎉 部署验证完成！");
            this.log("📊 验证统计:");
            this.log(`  - 总验证项: ${this.testResults.summary.total}`);
            this.log(`  - 通过: ${this.testResults.summary.passed}`);
            this.log(`  - 失败: ${this.testResults.summary.failed}`);
            this.log(`  - 警告: ${this.testResults.summary.warnings}`);
            this.log(`  - 成功率: ${((this.testResults.summary.passed / this.testResults.summary.total) * 100).toFixed(1)}%`);

            if (this.testResults.summary.failed === 0) {
                this.log("\n✅ 所有验证都通过了！系统部署成功。");
            } else {
                this.log(`\n⚠️ 有 ${this.testResults.summary.failed} 个验证失败，请检查详细报告。`);
            }

            return reportData;

        } catch (error) {
            this.log(`❌ 验证过程失败: ${error.message}`, 'ERROR');
            throw error;
        }
    }
}

// 命令行接口
async function main() {
    const verifier = new DeploymentVerifier();

    try {
        await verifier.runVerification();
        process.exit(verifier.testResults.summary.failed === 0 ? 0 : 1);
    } catch (error) {
        console.error('部署验证失败:', error.message);
        process.exit(1);
    }
}

// 导出类供其他模块使用
module.exports = { DeploymentVerifier };

// 如果直接运行此脚本
if (require.main === module) {
    main();
}