#!/usr/bin/env node

/**
 * Batch Updater for Ultra Minimal Device System
 * 极简批量更新脚本 - 支持自动化批量设备状态和性能更新
 * 目标：每周执行一次，处理1000台设备，Gas成本最低
 */

const { ethers } = require('ethers');
const UltraMinimalDeviceService = require('../services/ultra-minimal-device-service');

class BatchUpdater {
    constructor(config) {
        this.config = {
            // 网络配置
            rpcUrl: config.rpcUrl || process.env.RPC_URL || 'http://localhost:8545',
            registryAddress: config.registryAddress || process.env.REGISTRY_ADDRESS,
            oracleAddress: config.oracleAddress || process.env.ORACLE_ADDRESS,
            privateKey: config.privateKey || process.env.PRIVATE_KEY,

            // 批量更新配置
            batchSize: config.batchSize || 1000,
            maxGasPrice: config.maxGasPrice || ethers.utils.parseUnits('50', 'gwei'),
            gasLimit: config.gasLimit || 3000000,

            // 数据库配置
            databasePath: config.databasePath || './ultra_minimal_devices.db',

            // 监控配置
            enableMonitoring: config.enableMonitoring !== false,
            logLevel: config.logLevel || 'info'
        };

        this.initialize();
    }

    /**
     * 初始化批量更新器
     */
    async initialize() {
        try {
            // 初始化区块链连接
            this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
            this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);

            // 加载合约ABI
            this.registryABI = require('../contracts/artifacts/UltraMinimalDeviceRegistry.json');
            this.oracleABI = require('../contracts/artifacts/UltraMinimalOracle.json');

            // 初始化合约实例
            this.registryContract = new ethers.Contract(
                this.config.registryAddress,
                this.registryABI.abi,
                this.wallet
            );

            this.oracleContract = new ethers.Contract(
                this.config.oracleAddress,
                this.oracleABI.abi,
                this.wallet
            );

            // 初始化设备服务
            this.deviceService = new UltraMinimalDeviceService(this.config);

            this.logger = this.createLogger();

            this.logger.info('批量更新器初始化成功', {
                registryAddress: this.config.registryAddress,
                oracleAddress: this.config.oracleAddress,
                batchSize: this.config.batchSize
            });

        } catch (error) {
            console.error('批量更新器初始化失败:', error);
            process.exit(1);
        }
    }

    /**
     * 执行完整的批量更新流程
     */
    async executeBatchUpdate(options = {}) {
        const startTime = Date.now();
        this.logger.info('开始执行批量更新流程');

        try {
            // 1. 检查系统状态
            await this.checkSystemStatus();

            // 2. 准备批量数据
            const batchData = await this.prepareBatchData(options);

            if (batchData.deviceIds.length === 0) {
                this.logger.info('没有需要更新的设备');
                return { success: true, message: '没有需要更新的设备' };
            }

            // 3. 提交批量更新到预言机
            const batchResult = await this.submitBatchUpdate(batchData);

            // 4. 等待签名收集
            const signatureResult = await this.waitForSignatures(batchResult.batchId);

            // 5. 监控处理结果
            const finalResult = await this.monitorBatchProcessing(batchResult.batchId);

            const duration = Date.now() - startTime;

            this.logger.info('批量更新流程完成', {
                duration: `${duration}ms`,
                deviceCount: batchData.deviceIds.length,
                batchId: batchResult.batchId,
                success: finalResult.success
            });

            return {
                success: finalResult.success,
                batchId: batchResult.batchId,
                deviceCount: batchData.deviceIds.length,
                duration,
                gasUsed: finalResult.gasUsed,
                txHash: finalResult.txHash
            };

        } catch (error) {
            this.logger.error('批量更新流程失败', error);
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * 检查系统状态
     */
    async checkSystemStatus() {
        this.logger.info('检查系统状态...');

        try {
            // 检查合约连接
            const totalDevices = await this.registryContract.totalDevices();
            const lastGlobalUpdate = await this.registryContract.lastGlobalUpdate();

            // 检查是否可以更新
            const canUpdate = await this.registryContract.canUpdateBatch();
            const nextUpdateTime = await this.registryContract.getNextUpdateTime();

            // 检查预言机状态
            const oracleStats = await this.oracleContract.getOracleStats();

            this.logger.info('系统状态检查完成', {
                totalDevices: totalDevices.toString(),
                lastGlobalUpdate: new Date(lastGlobalUpdate.toNumber() * 1000).toISOString(),
                canUpdate,
                nextUpdateTime: new Date(nextUpdateTime.toNumber() * 1000).toISOString(),
                activeSigners: oracleStats.activeSigners.toString()
            });

            if (!canUpdate) {
                throw new Error(`更新时间未到，下次可更新时间: ${new Date(nextUpdateTime.toNumber() * 1000).toISOString()}`);
            }

        } catch (error) {
            this.logger.error('系统状态检查失败', error);
            throw error;
        }
    }

    /**
     * 准备批量数据
     */
    async prepareBatchData(options = {}) {
        this.logger.info('准备批量数据...');

        try {
            // 获取需要更新的设备
            let devices = this.deviceService.getActiveDevices();

            // 应用过滤条件
            if (options.deviceType !== undefined) {
                devices = devices.filter(d => d.device_type === options.deviceType);
            }

            if (options.providerAddress) {
                devices = devices.filter(d => d.provider_address === options.providerAddress);
            }

            if (options.maxDevices) {
                devices = devices.slice(0, options.maxDevices);
            }

            this.logger.info(`找到 ${devices.length} 台需要更新的设备`);

            // 准备批量数据
            const deviceIds = [];
            const performanceTiers = [];
            const statuses = [];

            for (const device of devices) {
                // 计算性能等级
                const tier = await this.deviceService.calculatePerformanceTier(device.chain_device_id);

                // 确定设备状态
                const status = await this.determineDeviceStatus(device.chain_device_id);

                deviceIds.push(device.chain_device_id);
                performanceTiers.push(tier);
                statuses.push(status);
            }

            // 生成数据哈希
            const dataHash = this.generateDataHash(deviceIds, performanceTiers, statuses);

            const batchData = {
                deviceIds,
                performanceTiers,
                statuses,
                dataHash,
                deviceCount: deviceIds.length,
                avgTier: this.calculateAverageTier(performanceTiers)
            };

            this.logger.info('批量数据准备完成', {
                deviceCount: batchData.deviceCount,
                avgTier: batchData.avgTier
            });

            return batchData;

        } catch (error) {
            this.logger.error('准备批量数据失败', error);
            throw error;
        }
    }

    /**
     * 提交批量更新到预言机
     */
    async submitBatchUpdate(batchData) {
        this.logger.info('提交批量更新到预言机...');

        try {
            const batchId = this.generateBatchId();

            // 估算Gas
            const gasEstimate = await this.oracleContract.estimateGas.submitBatchUpdate(
                batchId,
                batchData.deviceIds,
                batchData.performanceTiers,
                batchData.statuses,
                batchData.dataHash
            );

            // 设置Gas价格
            const gasPrice = await this.provider.getGasPrice();
            const finalGasPrice = gasPrice.gt(this.config.maxGasPrice) ? this.config.maxGasPrice : gasPrice;

            this.logger.info('Gas估算完成', {
                estimatedGas: gasEstimate.toString(),
                gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
                estimatedCost: ethers.utils.formatEther(gasEstimate.mul(gasPrice))
            });

            // 提交交易
            const tx = await this.oracleContract.submitBatchUpdate(
                batchId,
                batchData.deviceIds,
                batchData.performanceTiers,
                batchData.statuses,
                batchData.dataHash,
                {
                    gasLimit: this.config.gasLimit,
                    gasPrice: finalGasPrice
                }
            );

            this.logger.info('批量更新交易已提交', {
                batchId,
                txHash: tx.hash,
                deviceCount: batchData.deviceCount
            });

            // 等待交易确认
            const receipt = await tx.wait();

            this.logger.info('批量更新交易已确认', {
                batchId,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString(),
                actualCost: ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice))
            });

            return {
                batchId,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed,
                gasPrice: receipt.effectiveGasPrice,
                deviceCount: batchData.deviceCount
            };

        } catch (error) {
            this.logger.error('提交批量更新失败', error);
            throw error;
        }
    }

    /**
     * 等待签名收集
     */
    async waitForSignatures(batchId, timeout = 300000) { // 5分钟超时
        this.logger.info(`等待批次 ${batchId} 的签名收集...`);

        const startTime = Date.now();
        const checkInterval = 10000; // 10秒检查一次

        return new Promise((resolve, reject) => {
            const checkSignatures = async () => {
                try {
                    const batchInfo = await this.oracleContract.getBatchInfo(batchId);

                    this.logger.info('签名收集进度', {
                        batchId,
                        signatureCount: batchInfo.signatureCount.toString(),
                        requiredSignatures: batchInfo.requiredSignatures.toString(),
                        processed: batchInfo.processed
                    });

                    if (batchInfo.processed) {
                        this.logger.info('批次已处理完成', { batchId });
                        resolve({
                            batchId,
                            signatureCount: batchInfo.signatureCount.toString(),
                            processed: true
                        });
                        return;
                    }

                    if (batchInfo.signatureCount >= batchInfo.requiredSignatures) {
                        this.logger.info('已收集足够签名，等待处理', { batchId });
                        // 等待一个小间隔后再次检查
                        setTimeout(checkSignatures, 5000);
                        return;
                    }

                    // 检查超时
                    if (Date.now() - startTime > timeout) {
                        reject(new Error(`签名收集超时: ${timeout}ms`));
                        return;
                    }

                    // 继续等待
                    setTimeout(checkSignatures, checkInterval);

                } catch (error) {
                    this.logger.error('检查签名状态失败', error);
                    reject(error);
                }
            };

            // 开始检查
            setTimeout(checkSignatures, 5000); // 5秒后开始检查
        });
    }

    /**
     * 监控批次处理结果
     */
    async monitorBatchProcessing(batchId, maxWaitTime = 600000) { // 10分钟最大等待时间
        this.logger.info(`监控批次 ${batchId} 的处理结果...`);

        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkProcessing = async () => {
                try {
                    const batchInfo = await this.oracleContract.getBatchInfo(batchId);

                    if (batchInfo.processed) {
                        this.logger.info('批次处理完成', {
                            batchId,
                            avgTier: batchInfo.avgTier,
                            signatureCount: batchInfo.signatureCount.toString()
                        });

                        // 查询交易收据获取Gas使用情况
                        const txReceipt = await this.provider.getTransactionReceipt(batchInfo.txHash);

                        resolve({
                            batchId,
                            success: true,
                            avgTier: batchInfo.avgTier,
                            signatureCount: batchInfo.signatureCount.toString(),
                            txHash: batchInfo.txHash,
                            gasUsed: txReceipt.gasUsed,
                            processedAt: new Date().toISOString()
                        });
                        return;
                    }

                    // 检查超时
                    if (Date.now() - startTime > maxWaitTime) {
                        reject(new Error(`批次处理超时: ${maxWaitTime}ms`));
                        return;
                    }

                    // 继续监控
                    setTimeout(checkProcessing, 30000); // 30秒检查一次

                } catch (error) {
                    this.logger.error('监控批次处理失败', error);
                    reject(error);
                }
            };

            // 开始监控
            setTimeout(checkProcessing, 10000); // 10秒后开始检查
        });
    }

    /**
     * 确定设备状态 (简化版本)
     */
    async determineDeviceStatus(deviceId) {
        try {
            // 检查设备最近的活跃度
            const lastUpdate = await this.registryContract.getDeviceSummary(deviceId);

            // 简化的状态判断逻辑
            const now = Math.floor(Date.now() / 1000);
            const daysSinceUpdate = (now - lastUpdate.lastUpdate) / 86400;

            if (daysSinceUpdate > 7) {
                return 4; // SUSPENDED
            } else if (daysSinceUpdate > 3) {
                return 3; // MAINTENANCE
            } else if (daysSinceUpdate > 1) {
                return 2; // INACTIVE
            } else {
                return 1; // ACTIVE
            }

        } catch (error) {
            this.logger.error('确定设备状态失败', { deviceId, error });
            return 0; // PENDING
        }
    }

    /**
     * 生成批次ID
     */
    generateBatchId() {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 生成数据哈希
     */
    generateDataHash(deviceIds, performanceTiers, statuses) {
        const dataString = JSON.stringify({
            deviceIds,
            performanceTiers,
            statuses,
            timestamp: Date.now()
        });
        return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(dataString));
    }

    /**
     * 计算平均等级
     */
    calculateAverageTier(tiers) {
        if (tiers.length === 0) return 0;
        const sum = tiers.reduce((acc, tier) => acc + tier, 0);
        return sum / tiers.length;
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
            },
            debug: (message, data = {}) => {
                if (this.config.logLevel === 'debug') {
                    console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, data);
                }
            }
        };
    }
}

// 命令行接口
if (require.main === module) {
    const program = require('commander');

    program
        .version('1.0.0')
        .description('Ultra Minimal Device System Batch Updater')
        .option('-c, --config <path>', '配置文件路径')
        .option('--device-type <type>', '设备类型过滤')
        .option('--provider <address>', '提供商地址过滤')
        .option('--max-devices <count>', '最大设备数量', parseInt)
        .option('--dry-run', '仅显示将要更新的设备，不执行实际更新')
        .action(async (options) => {
            try {
                // 加载配置
                let config = {};
                if (options.config) {
                    config = require(options.config);
                }

                const updater = new BatchUpdater(config);

                if (options.dryRun) {
                    // 仅准备数据，不执行更新
                    const batchData = await updater.prepareBatchData({
                        deviceType: options.deviceType ? parseInt(options.deviceType) : undefined,
                        providerAddress: options.provider,
                        maxDevices: options.maxDevices
                    });

                    console.log('=== 预演模式 ===');
                    console.log(`将更新 ${batchData.deviceCount} 台设备`);
                    console.log(`平均性能等级: ${batchData.avgTier.toFixed(2)}`);
                    console.log('设备ID列表:', batchData.deviceIds.slice(0, 10), '...');

                } else {
                    // 执行实际更新
                    const result = await updater.executeBatchUpdate({
                        deviceType: options.deviceType ? parseInt(options.deviceType) : undefined,
                        providerAddress: options.provider,
                        maxDevices: options.maxDevices
                    });

                    console.log('=== 批量更新结果 ===');
                    console.log(`成功: ${result.success}`);
                    console.log(`批次ID: ${result.batchId}`);
                    console.log(`设备数量: ${result.deviceCount}`);
                    console.log(`耗时: ${result.duration}ms`);
                    console.log(`Gas使用: ${result.gasUsed || 'N/A'}`);
                    console.log(`交易哈希: ${result.txHash || 'N/A'}`);
                }

            } catch (error) {
                console.error('批量更新失败:', error.message);
                process.exit(1);
            }
        });

    program.parse(process.argv);
}

module.exports = BatchUpdater;