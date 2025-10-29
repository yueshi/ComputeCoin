#!/usr/bin/env node

/**
 * Deploy Ultra Minimal Device System
 * 极简设备管理系统部署脚本
 * 目标：快速部署，Gas成本最优，年度运营成本$8,400
 */

const { ethers } = require('hardhat');
const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

class UltraMinimalDeployer {
    constructor() {
        this.deployments = {};
        this.config = {
            // 网络配置
            network: hre.network.name,
            gasPrice: ethers.utils.parseUnits('20', 'gwei'), // 使用较低的Gas价格
            gasLimit: 3000000,

            // 合约配置
            requiredSignatures: 3,
            maxDevicesPerProvider: 10000,

            // 初始配置
            initialSigners: [], // 将从配置文件或命令行参数加载
        };

        this.logger = this.createLogger();
    }

    /**
     * 执行完整部署流程
     */
    async deploy() {
        const startTime = Date.now();
        this.logger.info('开始部署极简设备管理系统...');

        try {
            // 1. 预部署检查
            await this.preDeployCheck();

            // 2. 部署核心合约
            await this.deployCoreContracts();

            // 3. 配置合约权限
            await this.setupPermissions();

            // 4. 验证部署结果
            await this.verifyDeployment();

            // 5. 保存部署信息
            await this.saveDeploymentInfo();

            const duration = Date.now() - startTime;
            this.logger.info('部署完成!', {
                duration: `${duration}ms`,
                contracts: Object.keys(this.deployments).length,
                totalGasUsed: this.calculateTotalGasUsed()
            });

            return this.deployments;

        } catch (error) {
            this.logger.error('部署失败:', error);
            throw error;
        }
    }

    /**
     * 预部署检查
     */
    async preDeployCheck() {
        this.logger.info('执行预部署检查...');

        // 检查网络连接
        const network = await ethers.provider.getNetwork();
        this.logger.info('网络信息', {
            name: network.name,
            chainId: network.chainId
        });

        // 检查账户余额
        const [deployer] = await ethers.getSigners();
        const balance = await deployer.getBalance();

        this.logger.info('部署账户信息', {
            address: deployer.address,
            balance: ethers.utils.formatEther(balance) + ' ETH'
        });

        if (balance.lt(ethers.utils.parseEther('0.1'))) {
            throw new Error('部署账户余额不足，至少需要0.1 ETH');
        }

        // 检查Gas价格
        const gasPrice = await ethers.provider.getGasPrice();
        this.logger.info('当前Gas价格', {
            gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei') + ' gwei'
        });

        // 检查现有合约
        await this.checkExistingContracts();
    }

    /**
     * 部署核心合约
     */
    async deployCoreContracts() {
        this.logger.info('部署核心合约...');

        const [deployer] = await ethers.getSigners();

        // 1. 部署 UltraMinimalDeviceRegistry
        this.logger.info('部署 UltraMinimalDeviceRegistry...');
        const DeviceRegistry = await ethers.getContractFactory('UltraMinimalDeviceRegistry');
        const deviceRegistry = await DeviceRegistry.deploy(deployer.address);
        await deviceRegistry.deployed();

        this.deployments.deviceRegistry = {
            address: deviceRegistry.address,
            txHash: deviceRegistry.deployTransaction.hash,
            gasUsed: deviceRegistry.deployTransaction.gasLimit
        };

        this.logger.info('UltraMinimalDeviceRegistry 部署成功', {
            address: deviceRegistry.address,
            txHash: deviceRegistry.deployTransaction.hash
        });

        // 2. 部署 UltraMinimalOracle
        this.logger.info('部署 UltraMinimalOracle...');
        const Oracle = await ethers.getContractFactory('UltraMinimalOracle');
        const oracle = await Oracle.deploy(deviceRegistry.address);
        await oracle.deployed();

        this.deployments.oracle = {
            address: oracle.address,
            txHash: oracle.deployTransaction.hash,
            gasUsed: oracle.deployTransaction.gasLimit
        };

        this.logger.info('UltraMinimalOracle 部署成功', {
            address: oracle.address,
            txHash: oracle.deployTransaction.hash
        });

        // 3. 更新 DeviceRegistry 的预言机地址
        this.logger.info('设置 DeviceRegistry 的预言机地址...');
        const setOracleTx = await deviceRegistry.setOracle(oracle.address);
        await setOracleTx.wait();

        this.logger.info('预言机地址设置完成', {
            txHash: setOracleTx.hash
        });

        // 4. 注册初始签名者
        await this.registerInitialSigners(oracle);

        this.deployments.setupTxHashes = [setOracleTx.hash];
    }

    /**
     * 注册初始签名者
     */
    async registerInitialSigners(oracleContract) {
        this.logger.info('注册初始签名者...');

        const signers = this.getInitialSigners();
        let registeredCount = 0;

        for (const signerConfig of signers) {
            try {
                // 获取签名者账户
                const signer = await ethers.getSigner(signerConfig.address);

                // 使用签名者账户注册
                const registerTx = await oracleContract.connect(signer).registerSigner(
                    signerConfig.reputation || 1000
                );
                await registerTx.wait();

                registeredCount++;
                this.logger.info('签名者注册成功', {
                    address: signerConfig.address,
                    reputation: signerConfig.reputation || 1000
                });

            } catch (error) {
                this.logger.warn('签名者注册失败', {
                    address: signerConfig.address,
                    error: error.message
                });
            }
        }

        this.logger.info(`初始签名者注册完成: ${registeredCount}/${signers.length}`);
    }

    /**
     * 设置合约权限
     */
    async setupPermissions() {
        this.logger.info('设置合约权限...');

        const [deployer] = await ethers.getSigners();
        const deviceRegistry = await ethers.getContractAt(
            'UltraMinimalDeviceRegistry',
            this.deployments.deviceRegistry.address
        );
        const oracle = await ethers.getContractAt(
            'UltraMinimalOracle',
            this.deployments.oracle.address
        );

        // 1. 设置授权更新者
        const authorizedUpdaters = this.getAuthorizedUpdaters();
        for (const updater of authorizedUpdaters) {
            try {
                const tx = await deviceRegistry.setAuthorizedUpdater(updater, true);
                await tx.wait();
                this.logger.info('授权更新者设置成功', { address: updater });
            } catch (error) {
                this.logger.warn('授权更新者设置失败', { address: updater, error: error.message });
            }
        }

        // 2. 设置预言机的授权提交者
        const authorizedSubmitters = this.getAuthorizedSubmitters();
        for (const submitter of authorizedSubmitters) {
            try {
                const tx = await oracle.setAuthorizedSubmitter(submitter, true);
                await tx.wait();
                this.logger.info('授权提交者设置成功', { address: submitter });
            } catch (error) {
                this.logger.warn('授权提交者设置失败', { address: submitter, error: error.message });
            }
        }
    }

    /**
     * 验证部署结果
     */
    async verifyDeployment() {
        this.logger.info('验证部署结果...');

        const deviceRegistry = await ethers.getContractAt(
            'UltraMinimalDeviceRegistry',
            this.deployments.deviceRegistry.address
        );
        const oracle = await ethers.getContractAt(
            'UltraMinimalOracle',
            this.deployments.oracle.address
        );

        try {
            // 验证设备注册合约
            const totalDevices = await deviceRegistry.totalDevices();
            const oracleAddress = await deviceRegistry.oracle();
            const owner = await deviceRegistry.owner();

            this.logger.info('DeviceRegistry 验证结果', {
                address: this.deployments.deviceRegistry.address,
                totalDevices: totalDevices.toString(),
                oracleAddress,
                owner,
                isCorrect: oracleAddress === this.deployments.oracle.address
            });

            // 验证预言机合约
            const registryAddress = await oracle.deviceRegistry();
            const activeSigners = await oracle.getActiveSignerCount();

            this.logger.info('Oracle 验证结果', {
                address: this.deployments.oracle.address,
                registryAddress,
                activeSigners: activeSigners.toString(),
                isCorrect: registryAddress === this.deployments.deviceRegistry.address
            });

            // 执行基本功能测试
            await this.runBasicTests(deviceRegistry, oracle);

        } catch (error) {
            this.logger.error('部署验证失败', error);
            throw error;
        }
    }

    /**
     * 运行基本功能测试
     */
    async runBasicTests(deviceRegistry, oracle) {
        this.logger.info('运行基本功能测试...');

        const [testAccount] = await ethers.getSigners();

        try {
            // 测试设备注册
            this.logger.info('测试设备注册...');
            const registerTx = await deviceRegistry.registerDevice(
                testAccount.address,
                1, // DeviceType.GPU
                100 // 100 TFLOPS
            );
            const receipt = await registerTx.wait();

            // 从事件中提取设备ID
            const event = receipt.events.find(e => e.event === 'DeviceRegistered');
            const deviceId = event.args.deviceId;

            this.logger.info('设备注册测试通过', {
                deviceId: deviceId.toString(),
                txHash: receipt.hash
            });

            // 测试设备查询
            this.logger.info('测试设备查询...');
            const deviceSummary = await deviceRegistry.getDeviceSummary(deviceId);

            this.logger.info('设备查询测试通过', {
                provider: deviceSummary.provider,
                status: deviceSummary.status.toString(),
                deviceType: deviceSummary.deviceType.toString(),
                computePower: deviceSummary.computePower.toString()
            });

            // 测试全局统计
            this.logger.info('测试全局统计...');
            const globalStats = await deviceRegistry.getGlobalStats();

            this.logger.info('全局统计测试通过', {
                totalDevices: globalStats.totalDevices.toString(),
                activeDevices: globalStats.activeDevices.toString(),
                totalComputePower: globalStats.totalComputePower.toString()
            });

            this.logger.info('所有基本功能测试通过! ✓');

        } catch (error) {
            this.logger.error('功能测试失败', error);
            throw error;
        }
    }

    /**
     * 保存部署信息
     */
    async saveDeploymentInfo() {
        this.logger.info('保存部署信息...');

        const deploymentInfo = {
            network: this.config.network,
            timestamp: new Date().toISOString(),
            contracts: this.deployments,
            config: {
                requiredSignatures: this.config.requiredSignatures,
                maxDevicesPerProvider: this.config.maxDevicesPerProvider
            },
            gasUsage: this.calculateGasUsage()
        };

        // 保存到文件
        const deploymentDir = path.join(__dirname, '../deployments');
        if (!fs.existsSync(deploymentDir)) {
            fs.mkdirSync(deploymentDir, { recursive: true });
        }

        const deploymentFile = path.join(deploymentDir, `ultra-minimal-${this.config.network}-${Date.now()}.json`);
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

        // 更新最新部署文件
        const latestFile = path.join(deploymentDir, 'ultra-minimal-latest.json');
        fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));

        this.logger.info('部署信息已保存', {
            deploymentFile,
            latestFile
        });

        // 生成前端配置文件
        await this.generateFrontendConfig(deploymentInfo);
    }

    /**
     * 生成前端配置文件
     */
    async generateFrontendConfig(deploymentInfo) {
        const frontendConfig = {
            contracts: {
                deviceRegistry: {
                    address: deploymentInfo.contracts.deviceRegistry.address,
                    network: deploymentInfo.network
                },
                oracle: {
                    address: deploymentInfo.contracts.oracle.address,
                    network: deploymentInfo.network
                }
            },
            network: deploymentInfo.network,
            deployedAt: deploymentInfo.timestamp
        };

        const configDir = path.join(__dirname, '../frontend/src/config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        const configFile = path.join(configDir, 'contracts.json');
        fs.writeFileSync(configFile, JSON.stringify(frontendConfig, null, 2));

        this.logger.info('前端配置已生成', { configFile });
    }

    /**
     * 计算Gas使用情况
     */
    calculateGasUsage() {
        let totalGasUsed = 0;
        const gasUsage = {};

        // 计算合约部署Gas
        if (this.deployments.deviceRegistry) {
            gasUsage.deviceRegistry = this.deployments.deviceRegistry.gasUsed.toString();
            totalGasUsed += parseInt(this.deployments.deviceRegistry.gasUsed);
        }

        if (this.deployments.oracle) {
            gasUsage.oracle = this.deployments.oracle.gasUsed.toString();
            totalGasUsed += parseInt(this.deployments.oracle.gasUsed);
        }

        return {
            total: totalGasUsed.toString(),
            byContract: gasUsage
        };
    }

    /**
     * 计算总Gas使用
     */
    calculateTotalGasUsed() {
        let total = 0;
        for (const contract of Object.values(this.deployments)) {
            if (contract.gasUsed) {
                total += parseInt(contract.gasUsed);
            }
        }
        return total.toString();
    }

    /**
     * 检查现有合约
     */
    async checkExistingContracts() {
        // 这里可以添加检查现有合约的逻辑
        this.logger.info('检查现有合约...');
    }

    /**
     * 获取初始签名者配置
     */
    getInitialSigners() {
        // 从环境变量或配置文件加载
        const signersStr = process.env.INITIAL_SIGNERS || '[]';
        try {
            return JSON.parse(signersStr);
        } catch {
            return [
                { address: process.env.SIGNER_1_ADDRESS, reputation: 1000 },
                { address: process.env.SIGNER_2_ADDRESS, reputation: 1000 },
                { address: process.env.SIGNER_3_ADDRESS, reputation: 1000 }
            ].filter(s => s.address);
        }
    }

    /**
     * 获取授权更新者列表
     */
    getAuthorizedUpdaters() {
        const updatersStr = process.env.AUTHORIZED_UPDATERS || '[]';
        try {
            return JSON.parse(updatersStr);
        } catch {
            return [];
        }
    }

    /**
     * 获取授权提交者列表
     */
    getAuthorizedSubmitters() {
        const submittersStr = process.env.AUTHORIZED_SUBMITTERS || '[]';
        try {
            return JSON.parse(submittersStr);
        } catch {
            return [];
        }
    }

    /**
     * 创建日志记录器
     */
    createLogger() {
        return {
            info: (message, data = {}) => {
                console.log(`[INFO] ${new Date().toISOString()}: ${message}`, data);
            },
            warn: (message, data = {}) => {
                console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, data);
            },
            error: (message, error) => {
                console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error);
            }
        };
    }
}

// 主函数
async function main() {
    const deployer = new UltraMinimalDeployer();

    try {
        const deployments = await deployer.deploy();

        console.log('\n🎉 部署成功完成!');
        console.log('\n📋 部署摘要:');
        console.log(`- 网络: ${deployer.config.network}`);
        console.log(`- DeviceRegistry: ${deployments.deviceRegistry.address}`);
        console.log(`- Oracle: ${deployments.oracle.address}`);
        console.log(`- 总Gas使用: ${deployer.calculateTotalGasUsed()}`);

        console.log('\n📄 配置文件已保存到:');
        console.log('- deployments/ultra-minimal-latest.json');
        console.log('- frontend/src/config/contracts.json');

    } catch (error) {
        console.error('\n❌ 部署失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('部署脚本执行失败:', error);
            process.exit(1);
        });
}

module.exports = UltraMinimalDeployer;