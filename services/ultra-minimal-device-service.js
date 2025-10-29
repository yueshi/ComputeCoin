/**
 * Ultra Minimal Device Service
 * 极简设备管理服务 - 成本最优化的设备管理系统
 * 年度运营成本目标：$8,400 (1万台设备)
 */

const { ethers } = require('ethers');
const sqlite3 = require('better-sqlite3');
const cron = require('node-cron');
const EventEmitter = require('events');

class UltraMinimalDeviceService extends EventEmitter {
    constructor(config) {
        super();

        this.config = {
            // 区块链配置
            rpcUrl: config.rpcUrl || process.env.RPC_URL,
            registryAddress: config.registryAddress,
            oracleAddress: config.oracleAddress,
            privateKey: config.privateKey || process.env.PRIVATE_KEY,

            // 数据库配置
            databasePath: config.databasePath || './ultra_minimal_devices.db',

            // 批量更新配置
            batchSize: config.batchSize || 1000,
            updateInterval: config.updateInterval || '0 2 * * 0', // 每周日凌晨2点

            // 预言机配置
            oracleNodes: config.oracleNodes || [],
            requiredSignatures: config.requiredSignatures || 3,

            // 监控配置
            enableMonitoring: config.enableMonitoring !== false,
            logLevel: config.logLevel || 'info'
        };

        // 初始化区块链连接
        this.initializeBlockchain();

        // 初始化数据库
        this.initializeDatabase();

        // 初始化预言机服务
        this.initializeOracle();

        // 启动定时任务
        this.startScheduledTasks();

        this.logger = this.createLogger();
    }

    /**
     * 初始化区块链连接
     */
    initializeBlockchain() {
        try {
            this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
            this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);

            // 加载合约ABI
            this.registryABI = require('./abis/UltraMinimalDeviceRegistry.json');
            this.oracleABI = require('./abis/UltraMinimalOracle.json');

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

            this.logger.info('区块链连接初始化成功', {
                registryAddress: this.config.registryAddress,
                oracleAddress: this.config.oracleAddress,
                walletAddress: this.wallet.address
            });
        } catch (error) {
            this.logger.error('区块链连接初始化失败', error);
            throw error;
        }
    }

    /**
     * 初始化数据库
     */
    initializeDatabase() {
        try {
            this.db = new sqlite3(this.config.databasePath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');

            // 创建表结构
            this.createTables();

            this.logger.info('数据库初始化成功', {
                databasePath: this.config.databasePath
            });
        } catch (error) {
            this.logger.error('数据库初始化失败', error);
            throw error;
        }
    }

    /**
     * 创建数据库表结构
     */
    createTables() {
        // 设备信息表 - 极简版本
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS devices (
                chain_device_id INTEGER PRIMARY KEY,
                provider_address TEXT NOT NULL,
                device_type INTEGER NOT NULL,
                compute_power INTEGER NOT NULL,
                device_info TEXT,
                network_info TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 性能指标表 - 仅核心指标
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS device_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chain_device_id INTEGER NOT NULL,
                cpu_utilization REAL,
                gpu_utilization REAL,
                memory_usage INTEGER,
                temperature REAL,
                error_count INTEGER DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chain_device_id) REFERENCES devices(chain_device_id)
            )
        `);

        // 批量更新记录表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS batch_updates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id TEXT UNIQUE NOT NULL,
                device_count INTEGER NOT NULL,
                avg_tier REAL,
                status TEXT DEFAULT 'pending',
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                processed_at DATETIME,
                tx_hash TEXT
            )
        `);

        // 创建索引优化查询
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_devices_provider ON devices(provider_address);
            CREATE INDEX IF NOT EXISTS idx_metrics_device_time ON device_metrics(chain_device_id, timestamp);
            CREATE INDEX IF NOT EXISTS idx_batch_status ON batch_updates(status);
        `);
    }

    /**
     * 初始化预言机服务
     */
    initializeOracle() {
        this.oracleService = {
            submitBatch: this.submitBatchToOracle.bind(this),
            collectSignatures: this.collectSignatures.bind(this),
            processBatch: this.processBatchUpdate.bind(this)
        };

        this.logger.info('预言机服务初始化成功');
    }

    /**
     * 注册新设备 - 极简版本
     */
    async registerDevice(deviceInfo) {
        try {
            this.logger.info('开始注册设备', { provider: deviceInfo.provider });

            // 1. 链下存储完整信息
            const result = this.db.prepare(`
                INSERT INTO devices (provider_address, device_type, compute_power, device_info, network_info)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                deviceInfo.provider,
                deviceInfo.deviceType,
                deviceInfo.computePower,
                JSON.stringify(deviceInfo.deviceInfo || {}),
                JSON.stringify(deviceInfo.networkInfo || {})
            );

            const offchainId = result.lastInsertRowid;

            // 2. 链上注册核心信息
            const tx = await this.registryContract.registerDevice(
                deviceInfo.provider,
                deviceInfo.deviceType,
                deviceInfo.computePower
            );

            const receipt = await tx.wait();
            const chainDeviceId = this.extractDeviceIdFromReceipt(receipt);

            // 3. 更新链下记录，关联链上ID
            this.db.prepare(`
                UPDATE devices SET chain_device_id = ? WHERE id = ?
            `).run(chainDeviceId, offchainId);

            this.logger.info('设备注册成功', {
                offchainId,
                chainDeviceId,
                txHash: receipt.hash
            });

            this.emit('deviceRegistered', {
                offchainId,
                chainDeviceId,
                provider: deviceInfo.provider,
                deviceType: deviceInfo.deviceType
            });

            return {
                offchainId,
                chainDeviceId,
                txHash: receipt.hash
            };

        } catch (error) {
            this.logger.error('设备注册失败', error);
            throw error;
        }
    }

    /**
     * 收集设备性能指标 - 完全链下存储
     */
    async collectDeviceMetrics(deviceId, metrics) {
        try {
            this.db.prepare(`
                INSERT INTO device_metrics (chain_device_id, cpu_utilization, gpu_utilization, memory_usage, temperature, error_count)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                deviceId,
                metrics.cpuUtilization,
                metrics.gpuUtilization,
                metrics.memoryUsage,
                metrics.temperature,
                metrics.errorCount || 0
            );

            this.logger.debug('设备指标已记录', { deviceId });

        } catch (error) {
            this.logger.error('记录设备指标失败', { deviceId, error });
            throw error;
        }
    }

    /**
     * 计算设备性能等级 (0-10)
     */
    async calculatePerformanceTier(deviceId, timeRange = 7) {
        try {
            // 获取过去N天的指标
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - timeRange);

            const metrics = this.db.prepare(`
                SELECT
                    AVG(cpu_utilization) as avgCpu,
                    AVG(gpu_utilization) as avgGpu,
                    AVG(temperature) as avgTemp,
                    COUNT(*) as dataPoints,
                    SUM(error_count) as totalErrors
                FROM device_metrics
                WHERE chain_device_id = ? AND timestamp >= ?
            `).get(deviceId, cutoffDate.toISOString());

            if (!metrics || metrics.dataPoints === 0) {
                return 5; // 默认中等
            }

            // 计算各项指标评分
            const utilizationScore = Math.min(
                ((metrics.avgCpu + metrics.avgGpu) / 2) / 100 * 3, // 30%权重，满分3分
                3
            );

            const temperatureScore = Math.max(0, (100 - metrics.avgTemp) / 100 * 2); // 20%权重，满分2分

            const reliabilityScore = ((metrics.dataPoints - metrics.totalErrors) / metrics.dataPoints) * 2; // 20%权重，满分2分

            const consistencyScore = Math.min(metrics.dataPoints / (timeRange * 24), 1) * 3; // 30%权重，满分3分

            // 综合评分 (0-10)
            const totalScore = utilizationScore + temperatureScore + reliabilityScore + consistencyScore;

            return Math.min(10, Math.max(0, Math.round(totalScore)));

        } catch (error) {
            this.logger.error('计算性能等级失败', { deviceId, error });
            return 5; // 默认中等
        }
    }

    /**
     * 执行周度批量更新 - 核心功能
     */
    async performWeeklyBatchUpdate() {
        try {
            this.logger.info('开始执行周度批量更新');

            // 1. 获取所有需要更新的设备
            const devices = this.getActiveDevices();

            if (devices.length === 0) {
                this.logger.info('没有活跃设备需要更新');
                return;
            }

            // 2. 分批处理设备
            const batches = this.createBatches(devices, this.config.batchSize);

            this.logger.info(`将处理 ${devices.length} 台设备，分为 ${batches.length} 个批次`);

            const results = [];
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const result = await this.processBatch(batch, i + 1);
                results.push(result);

                // 批次间延迟，避免网络拥堵
                if (i < batches.length - 1) {
                    await this.sleep(1000);
                }
            }

            this.logger.info('周度批量更新完成', {
                totalDevices: devices.length,
                totalBatches: batches.length,
                results: results.map(r => ({ batchId: r.batchId, success: r.success }))
            });

            this.emit('weeklyBatchUpdateCompleted', {
                totalDevices: devices.length,
                batchesProcessed: results.length,
                successCount: results.filter(r => r.success).length
            });

            return results;

        } catch (error) {
            this.logger.error('周度批量更新失败', error);
            throw error;
        }
    }

    /**
     * 创建批次
     */
    createBatches(devices, batchSize) {
        const batches = [];
        for (let i = 0; i < devices.length; i += batchSize) {
            batches.push(devices.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * 处理单个批次
     */
    async processBatch(deviceBatch, batchNumber) {
        try {
            const batchId = this.generateBatchId();

            // 1. 计算每个设备的性能等级和状态
            const deviceIds = [];
            const performanceTiers = [];
            const statuses = [];

            for (const device of deviceBatch) {
                const tier = await this.calculatePerformanceTier(device.chain_device_id);
                const status = await this.determineDeviceStatus(device.chain_device_id);

                deviceIds.push(device.chain_device_id);
                performanceTiers.push(tier);
                statuses.push(status);
            }

            // 2. 生成数据哈希
            const dataHash = this.generateDataHash(deviceIds, performanceTiers, statuses);

            // 3. 提交到预言机
            const submitResult = await this.submitBatchToOracle(
                batchId,
                deviceIds,
                performanceTiers,
                statuses,
                dataHash
            );

            // 4. 记录批次信息
            this.db.prepare(`
                INSERT INTO batch_updates (batch_id, device_count, avg_tier, status, submitted_at)
                VALUES (?, ?, ?, 'submitted', ?)
            `).run(
                batchId,
                deviceIds.length,
                this.calculateAverageTier(performanceTiers),
                new Date().toISOString()
            );

            this.logger.info(`批次 ${batchNumber} 提交成功`, {
                batchId,
                deviceCount: deviceIds.length,
                avgTier: this.calculateAverageTier(performanceTiers)
            });

            return {
                batchId,
                batchNumber,
                success: true,
                deviceCount: deviceIds.length,
                avgTier: this.calculateAverageTier(performanceTiers),
                submitResult
            };

        } catch (error) {
            this.logger.error(`批次 ${batchNumber} 处理失败`, error);
            return {
                batchNumber,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 提交批次到预言机
     */
    async submitBatchToOracle(batchId, deviceIds, performanceTiers, statuses, dataHash) {
        try {
            const tx = await this.oracleContract.submitBatchUpdate(
                batchId,
                deviceIds,
                performanceTiers,
                statuses,
                dataHash
            );

            const receipt = await tx.wait();

            this.logger.info('批次提交到预言机成功', {
                batchId,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            });

            return {
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed
            };

        } catch (error) {
            this.logger.error('提交批次到预言机失败', { batchId, error });
            throw error;
        }
    }

    /**
     * 确定设备状态
     */
    async determineDeviceStatus(deviceId) {
        try {
            // 获取最近24小时的指标
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const recentMetrics = this.db.prepare(`
                SELECT COUNT(*) as dataPoints, SUM(error_count) as totalErrors
                FROM device_metrics
                WHERE chain_device_id = ? AND timestamp >= ?
            `).get(deviceId, yesterday.toISOString());

            if (!recentMetrics || recentMetrics.dataPoints === 0) {
                return 0; // PENDING
            }

            const errorRate = recentMetrics.totalErrors / recentMetrics.dataPoints;

            if (errorRate > 0.5) {
                return 5; // SUSPENDED
            } else if (errorRate > 0.1) {
                return 3; // MAINTENANCE
            } else if (recentMetrics.dataPoints < 12) { // 少于12个数据点
                return 1; // INACTIVE
            } else {
                return 1; // ACTIVE
            }

        } catch (error) {
            this.logger.error('确定设备状态失败', { deviceId, error });
            return 0; // PENDING
        }
    }

    /**
     * 获取活跃设备
     */
    getActiveDevices() {
        try {
            const devices = this.db.prepare(`
                SELECT d.chain_device_id, d.provider_address, d.device_type, d.compute_power
                FROM devices d
                WHERE d.created_at >= datetime('now', '-30 days')
                ORDER BY d.chain_device_id
            `).all();

            return devices;
        } catch (error) {
            this.logger.error('获取活跃设备失败', error);
            return [];
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
     * 启动定时任务
     */
    startScheduledTasks() {
        // 周度批量更新任务
        cron.schedule(this.config.updateInterval, async () => {
            this.logger.info('定时任务：开始周度批量更新');
            try {
                await this.performWeeklyBatchUpdate();
            } catch (error) {
                this.logger.error('定时任务执行失败', error);
            }
        });

        // 每日数据清理任务
        cron.schedule('0 3 * * *', async () => {
            this.logger.info('定时任务：开始数据清理');
            try {
                await this.cleanupOldData();
            } catch (error) {
                this.logger.error('数据清理失败', error);
            }
        });

        this.logger.info('定时任务已启动', {
            updateInterval: this.config.updateInterval
        });
    }

    /**
     * 清理旧数据
     */
    async cleanupOldData() {
        try {
            // 删除30天前的指标数据
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30);

            const result = this.db.prepare(`
                DELETE FROM device_metrics WHERE timestamp < ?
            `).run(cutoffDate.toISOString());

            this.logger.info('旧数据清理完成', {
                deletedRecords: result.changes,
                cutoffDate: cutoffDate.toISOString()
            });

        } catch (error) {
            this.logger.error('数据清理失败', error);
        }
    }

    /**
     * 启动服务
     */
    start() {
        this.logger.info('Ultra Minimal Device Service 已启动', {
            config: this.config,
            version: '1.0.0'
        });

        this.emit('serviceStarted');
    }

    /**
     * 停止服务
     */
    stop() {
        this.logger.info('正在停止 Ultra Minimal Device Service');

        // 关闭数据库连接
        if (this.db) {
            this.db.close();
        }

        this.emit('serviceStopped');
    }

    /**
     * 获取服务统计信息
     */
    getStats() {
        try {
            const deviceCount = this.db.prepare('SELECT COUNT(*) as count FROM devices').get();
            const metricsCount = this.db.prepare('SELECT COUNT(*) as count FROM device_metrics').get();
            const batchCount = this.db.prepare('SELECT COUNT(*) as count FROM batch_updates').get();

            return {
                totalDevices: deviceCount.count,
                totalMetrics: metricsCount.count,
                totalBatches: batchCount.count,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            };

        } catch (error) {
            this.logger.error('获取统计信息失败', error);
            return null;
        }
    }

    // 辅助方法
    extractDeviceIdFromReceipt(receipt) {
        // 从交易收据中提取设备ID
        // 这里需要根据实际的事件日志来实现
        for (const log of receipt.logs) {
            if (log.topics[0] === '0x...'/* DeviceRegistered event topic */) {
                return parseInt(log.topics[1], 16);
            }
        }
        throw new Error('无法从交易收据中提取设备ID');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    createLogger() {
        return {
            info: (message, data = {}) => {
                if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
                    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, data);
                }
            },
            warn: (message, data = {}) => {
                if (this.config.logLevel !== 'error') {
                    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, data);
                }
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

module.exports = UltraMinimalDeviceService;