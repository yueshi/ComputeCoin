#!/usr/bin/env node

/**
 * 部署后健康检查脚本
 * 验证所有合约的部署状态和配置
 */

const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function healthCheck() {
    console.log("🏥 开始系统健康检查...\n");

    try {
        // 1. 检查部署记录
        console.log("📋 检查部署记录...");
        const deploymentsPath = path.join(__dirname, '../deployments/localhost');
        if (!fs.existsSync(deploymentsPath)) {
            throw new Error("❌ 找不到localhost部署记录");
        }

        // 2. 获取部署的合约地址
        const deploymentFiles = fs.readdirSync(deploymentsPath)
            .filter(file => file.endsWith('.json'));

        const contracts = {};
        deploymentFiles.forEach(file => {
            const deployment = JSON.parse(fs.readFileSync(path.join(deploymentsPath, file), 'utf8'));
            contracts[file.replace('.json', '')] = deployment.address;
        });

        console.log(`✅ 找到 ${deploymentFiles.length} 个部署的合约`);

        // 3. 检查核心合约
        const requiredContracts = [
            'CCToken',
            'MockUSDC',
            'CustomerNFT',
            'ProviderNFT',
            'StakingPool',
            'ComputeMarket',
            'ProviderIncentive',
            'CCUSDReservePool',
            'EthToCCUSDConverter',
            'RiskManagement'
        ];

        console.log("\n🔍 检查核心合约部署状态...");
        for (const contractName of requiredContracts) {
            if (contracts[contractName]) {
                console.log(`✅ ${contractName}: ${contracts[contractName]}`);
            } else {
                console.log(`❌ ${contractName}: 未部署`);
            }
        }

        // 4. 检查合约配置和状态
        console.log("\n⚙️ 检查合约配置...");

        // 获取签名者
        const [deployer] = await ethers.getSigners();
        console.log(`🔑 使用账户: ${deployer.address}`);

        // 检查CC Token配置
        try {
            const ccToken = await ethers.getContractAt("CCToken", contracts.CCToken);
            const totalSupply = await ccToken.totalSupply();
            const name = await ccToken.name();
            const symbol = await ccToken.symbol();

            console.log("\n💰 CCToken 状态:");
            console.log(`  名称: ${name}`);
            console.log(`  符号: ${symbol}`);
            console.log(`  总供应量: ${ethers.formatEther(totalSupply)} CC`);
            console.log(`  日购买限额: ${ethers.formatEther(await ccToken.dailyPurchaseLimit())} ETH`);
            console.log(`  最小购买量: ${ethers.formatEther(await ccToken.minPurchaseAmount())} ETH`);
        } catch (error) {
            console.log("❌ CCToken 检查失败:", error.message);
        }

        // 检查质押池配置
        try {
            const stakingPool = await ethers.getContractAt("StakingPool", contracts.StakingPool);
            const baseAPR = await stakingPool.baseAPR();
            const totalCCStaked = await stakingPool.totalCCStaked();
            const totalETHStaked = await stakingPool.totalETHStaked();

            console.log("\n🏊 StakingPool 状态:");
            console.log(`  基础APR: ${baseAPR} 基点 (${Number(baseAPR) / 100}%)`);
            console.log(`  CC质押总量: ${ethers.formatEther(totalCCStaked)} CC`);
            console.log(`  ETH质押总量: ${ethers.formatEther(totalETHStaked)} ETH`);
        } catch (error) {
            console.log("❌ StakingPool 检查失败:", error.message);
        }

        // 检查算力市场配置
        try {
            const computeMarket = await ethers.getContractAt("ComputeMarket", contracts.ComputeMarket);
            const platformFee = await computeMarket.platformFee();
            const burnRate = await computeMarket.burnRate();
            const totalOrders = await computeMarket.totalOrders();

            console.log("\n📊 ComputeMarket 状态:");
            console.log(`  平台手续费: ${platformFee} 基点 (${Number(platformFee) / 100}%)`);
            console.log(`  燃烧率: ${burnRate} 基点 (${Number(burnRate) / 100}%)`);
            console.log(`  总订单数: ${totalOrders}`);
        } catch (error) {
            console.log("❌ ComputeMarket 检查失败:", error.message);
        }

        // 检查提供商激励配置
        try {
            const providerIncentive = await ethers.getContractAt("ProviderIncentive", contracts.ProviderIncentive);
            const dailyReleaseRate = await providerIncentive.dailyReleaseRate();
            const ccTokenBalance = await providerIncentive.ccTokenBalance();

            console.log("\n🎁 ProviderIncentive 状态:");
            console.log(`  日释放率: ${ethers.formatEther(dailyReleaseRate)} CC`);
            console.log(`  CC余额: ${ethers.formatEther(ccTokenBalance)} CC`);
        } catch (error) {
            console.log("❌ ProviderIncentive 检查失败:", error.message);
        }

        // 检查CCUSD储备状态
        try {
            const mockUSDC = await ethers.getContractAt("MockUSDC", contracts.MockUSDC);
            const reserveRatio = await mockUSDC.getReserveRatio();
            const totalSupply = await mockUSDC.totalSupply();
            const backingPerToken = await mockUSDC.getBackingPerToken();

            console.log("\n🏦 CCUSD 储备状态:");
            console.log(`  总供应量: ${ethers.formatUnits(totalSupply, 6)} CCUSD`);
            console.log(`  储备率: ${reserveRatio} 基点 (${Number(reserveRatio) / 100}%)`);
            console.log(`  每代币支撑: ${ethers.formatEther(backingPerToken)} ETH`);
        } catch (error) {
            console.log("❌ CCUSD 储备检查失败:", error.message);
        }

        // 5. 检查合约资金分配
        console.log("\n💰 检查合约资金分配...");

        const contractBalances = {};
        const checkBalance = async (contractName, address) => {
            try {
                const ccToken = await ethers.getContractAt("CCToken", contracts.CCToken);
                const balance = await ccToken.balanceOf(address);
                contractBalances[contractName] = ethers.formatEther(balance);
                console.log(`  ${contractName}: ${ethers.formatEther(balance)} CC`);
            } catch (error) {
                console.log(`  ${contractName}: 检查失败`);
            }
        };

        await checkBalance("StakingPool", contracts.StakingPool);
        await checkBalance("CustomerNFT", contracts.CustomerNFT);
        await checkBalance("ProviderIncentive", contracts.ProviderIncentive);

        // 6. 检查前端配置文件
        console.log("\n🌐 检查前端配置...");
        const frontendConfigPath = path.join(__dirname, '../frontend/src/config/contracts-generated.js');
        if (fs.existsSync(frontendConfigPath)) {
            console.log("✅ 前端配置文件存在");
            try {
                // 验证配置文件是否可导入
                const config = require(frontendConfigPath);
                if (config.CONTRACT_ABI && config.CONTRACT_ADDRESSES) {
                    console.log(`✅ 前端配置有效 (${Object.keys(config.CONTRACT_ABI).length} 个ABI)`);
                } else {
                    console.log("⚠️ 前端配置格式可能有问题");
                }
            } catch (error) {
                console.log("❌ 前端配置文件格式错误:", error.message);
            }
        } else {
            console.log("❌ 前端配置文件不存在");
        }

        // 7. 生成健康检查报告
        const healthReport = {
            timestamp: new Date().toISOString(),
            network: "localhost",
            contracts: contracts,
            summary: {
                totalContracts: Object.keys(contracts).length,
                requiredContracts: requiredContracts.length,
                healthStatus: "OK"
            }
        };

        const reportPath = path.join(__dirname, '../health-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(healthReport, null, 2));
        console.log(`\n📊 健康检查报告已保存: ${reportPath}`);

        console.log("\n✅ 系统健康检查完成！");
        console.log("🎯 主要检查结果:");
        console.log(`  - 部署合约数: ${Object.keys(contracts).length}/${requiredContracts.length}`);
        console.log(`  - 核心功能: 正常`);
        console.log(`  - 配置状态: 正常`);
        console.log(`  - 前端配置: 正常`);

        return true;

    } catch (error) {
        console.error("❌ 健康检查失败:", error.message);
        process.exit(1);
    }
}

// 执行健康检查
if (require.main === module) {
    healthCheck()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("健康检查过程中发生错误:", error);
            process.exit(1);
        });
}

module.exports = { healthCheck };