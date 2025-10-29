#!/usr/bin/env node

/**
 * Ultra Minimal Device System Monitoring Dashboard
 * 极简设备系统监控仪表板 - 实时监控成本、性能和系统状态
 * 年度运营成本目标：$8,400 (1万台设备)
 */

const express = require('express');
const { ethers } = require('ethers');
const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class MonitoringDashboard {
    constructor(config) {
        this.config = {
            port: config.port || 3001,
            databasePath: config.databasePath || './ultra_minimal_devices.db',
            registryAddress: config.registryAddress || process.env.REGISTRY_ADDRESS,
            oracleAddress: config.oracleAddress || process.env.ORACLE_ADDRESS,
            rpcUrl: config.rpcUrl || process.env.RPC_URL || 'http://localhost:8545',
            updateInterval: config.updateInterval || 30000, // 30秒更新一次
            costTargets: {
                annualTarget: 8400, // $8,400/year
                monthlyTarget: 700, // $700/month
                dailyTarget: 23.33, // $23.33/day
                perDeviceTarget: 0.84 // $0.84/device/year
            }
        };

        this.app = express();
        this.server = null;
        this.db = null;
        this.web3 = null;
        this.contracts = {};

        this.initialize();
    }

    /**
     * 初始化监控系统
     */
    async initialize() {
        try {
            // 初始化数据库
            this.initializeDatabase();

            // 初始化Web3连接
            await this.initializeWeb3();

            // 设置Express应用
            this.setupExpress();

            // 启动定时更新
            this.startPeriodicUpdates();

            this.logger.info('监控仪表板初始化成功', {
                port: this.config.port,
                databasePath: this.config.databasePath
            });

        } catch (error) {
            this.logger.error('监控仪表板初始化失败', error);
            throw error;
        }
    }

    /**
     * 初始化数据库连接
     */
    initializeDatabase() {
        try {
            this.db = new sqlite3(this.config.databasePath);
            this.db.pragma('journal_mode = WAL');

            // 创建监控表
            this.createMonitoringTables();

            this.logger.info('数据库连接成功');
        } catch (error) {
            this.logger.error('数据库连接失败', error);
            throw error;
        }
    }

    /**
     * 创建监控表
     */
    createMonitoringTables() {
        // 系统指标表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS system_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                total_devices INTEGER DEFAULT 0,
                active_devices INTEGER DEFAULT 0,
                total_compute_power INTEGER DEFAULT 0,
                gas_used_24h INTEGER DEFAULT 0,
                estimated_cost_usd REAL DEFAULT 0,
                batch_updates_24h INTEGER DEFAULT 0,
                avg_performance_tier REAL DEFAULT 0
            )
        `);

        // 成本分析表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS cost_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                period_type TEXT NOT NULL,
                total_cost_usd REAL DEFAULT 0,
                cost_per_device REAL DEFAULT 0,
                gas_cost_usd REAL DEFAULT 0,
                infrastructure_cost_usd REAL DEFAULT 0,
                savings_percentage REAL DEFAULT 0
            )
        `);

        // 性能指标表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                avg_response_time_ms REAL DEFAULT 0,
                batch_processing_time_ms REAL DEFAULT 0,
                success_rate REAL DEFAULT 100,
                error_count INTEGER DEFAULT 0,
                concurrent_users INTEGER DEFAULT 0
            )
        `);

        // 创建索引
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
            CREATE INDEX IF NOT EXISTS idx_cost_analysis_timestamp ON cost_analysis(timestamp);
            CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
        `);
    }

    /**
     * 初始化Web3连接
     */
    async initializeWeb3() {
        try {
            this.web3 = new ethers.JsonRpcProvider(this.config.rpcUrl);

            // 加载合约ABI
            const registryABI = require('../contracts/artifacts/UltraMinimalDeviceRegistry.json');
            const oracleABI = require('../contracts/artifacts/UltraMinimalOracle.json');

            // 初始化合约实例
            this.contracts.registry = new ethers.Contract(
                this.config.registryAddress,
                registryABI.abi,
                this.web3
            );

            this.contracts.oracle = new ethers.Contract(
                this.config.oracleAddress,
                oracleABI.abi,
                this.web3
            );

            this.logger.info('Web3连接成功', {
                registryAddress: this.config.registryAddress,
                oracleAddress: this.config.oracleAddress
            });

        } catch (error) {
            this.logger.error('Web3连接失败', error);
            throw error;
        }
    }

    /**
     * 设置Express应用
     */
    setupExpress() {
        // 中间件
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '../public')));

        // CORS设置
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });

        // API路由
        this.setupAPIRoutes();

        // 主页路由
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });
    }

    /**
     * 设置API路由
     */
    setupAPIRoutes() {
        // 系统概览
        this.app.get('/api/overview', async (req, res) => {
            try {
                const overview = await this.getSystemOverview();
                res.json(overview);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 成本分析
        this.app.get('/api/cost-analysis', async (req, res) => {
            try {
                const costAnalysis = await this.getCostAnalysis();
                res.json(costAnalysis);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 性能指标
        this.app.get('/api/performance', async (req, res) => {
            try {
                const performance = await this.getPerformanceMetrics();
                res.json(performance);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 实时数据
        this.app.get('/api/realtime', async (req, res) => {
            try {
                const realtime = await this.getRealTimeData();
                res.json(realtime);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 历史数据
        this.app.get('/api/history/:metric', async (req, res) => {
            try {
                const { metric } = req.params;
                const { period = '24h' } = req.query;
                const history = await this.getHistoricalData(metric, period);
                res.json(history);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 成本优化建议
        this.app.get('/api/recommendations', async (req, res) => {
            try {
                const recommendations = await this.getCostOptimizationRecommendations();
                res.json(recommendations);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    /**
     * 获取系统概览
     */
    async getSystemOverview() {
        try {
            // 从区块链获取实时数据
            const [
                totalDevices,
                activeDevices,
                totalComputePower,
                lastGlobalUpdate,
                batchStats
            ] = await Promise.all([
                this.contracts.registry.totalDevices(),
                this.contracts.registry.activeDevices(),
                this.contracts.registry.totalComputePower(),
                this.contracts.registry.lastGlobalUpdate(),
                this.contracts.registry.getBatchStats()
            ]);

            // 从数据库获取成本数据
            const latestMetrics = this.db.prepare(`
                SELECT * FROM system_metrics ORDER BY timestamp DESC LIMIT 1
            `).get();

            // 计算成本效益指标
            const costMetrics = this.calculateCostMetrics(totalDevices, latestMetrics);

            // 计算性能指标
            const performanceMetrics = this.calculatePerformanceMetrics();

            return {
                timestamp: new Date().toISOString(),
                blockchain: {
                    totalDevices: totalDevices.toString(),
                    activeDevices: activeDevices.toString(),
                    totalComputePower: totalComputePower.toString(),
                    lastGlobalUpdate: new Date(lastGlobalUpdate.toNumber() * 1000).toISOString(),
                    batchUpdates: {
                        totalUpdates: batchStats.totalUpdates.toString(),
                        totalDevicesUpdated: batchStats.totalDevices.toString(),
                        averageBatchSize: batchStats.averageBatchSize.toString()
                    }
                },
                costs: costMetrics,
                performance: performanceMetrics,
                health: {
                    systemStatus: this.getSystemHealthStatus(totalDevices, activeDevices),
                    alerts: this.getActiveAlerts()
                }
            };

        } catch (error) {
            this.logger.error('获取系统概览失败', error);
            throw error;
        }
    }

    /**
     * 获取成本分析
     */
    async getCostAnalysis() {
        try {
            // 获取历史成本数据
            const monthlyCosts = this.db.prepare(`
                SELECT
                    DATE(timestamp, 'start of month') as month,
                    AVG(total_cost_usd) as avg_cost,
                    AVG(cost_per_device) as avg_cost_per_device,
                    AVG(savings_percentage) as avg_savings
                FROM cost_analysis
                WHERE period_type = 'monthly'
                GROUP BY DATE(timestamp, 'start of month')
                ORDER BY month DESC
                LIMIT 12
            `).all();

            // 计算当前成本预测
            const currentMetrics = await this.getCurrentCostMetrics();
            const prediction = this.predictAnnualCosts(currentMetrics);

            return {
                current: currentMetrics,
                prediction: prediction,
                historical: monthlyCosts,
                targets: this.config.costTargets,
                efficiency: this.calculateCostEfficiency(currentMetrics)
            };

        } catch (error) {
            this.logger.error('获取成本分析失败', error);
            throw error;
        }
    }

    /**
     * 获取性能指标
     */
    async getPerformanceMetrics() {
        try {
            // 获取最近的性能数据
            const recentPerformance = this.db.prepare(`
                SELECT * FROM performance_metrics
                ORDER BY timestamp DESC
                LIMIT 24
            `).all();

            // 计算性能趋势
            const trends = this.calculatePerformanceTrends(recentPerformance);

            // 获取系统负载
            const load = await this.getSystemLoad();

            return {
                current: recentPerformance[0] || {},
                trends: trends,
                load: load,
                benchmarks: {
                    avgResponseTime: this.calculateBenchmark('response_time'),
                    batchProcessingTime: this.calculateBenchmark('batch_processing'),
                    successRate: this.calculateBenchmark('success_rate')
                }
            };

        } catch (error) {
            this.logger.error('获取性能指标失败', error);
            throw error;
        }
    }

    /**
     * 获取实时数据
     */
    async getRealTimeData() {
        try {
            const [
                globalStats,
                oracleStats,
                canUpdate
            ] = await Promise.all([
                this.contracts.registry.getGlobalStats(),
                this.contracts.oracle.getOracleStats(),
                this.contracts.registry.canUpdateBatch()
            ]);

            const gasPrice = await this.web3.getGasPrice();
            const blockNumber = await this.web3.getBlockNumber();

            return {
                timestamp: new Date().toISOString(),
                globalStats: {
                    totalDevices: globalStats.totalDevices.toString(),
                    activeDevices: globalStats.activeDevices.toString(),
                    totalComputePower: globalStats.totalComputePower.toString()
                },
                oracle: {
                    totalBatches: oracleStats.totalBatches.toString(),
                    activeSigners: oracleStats.activeSigners.toString(),
                    successRate: oracleStats.successRate.toString() / 100
                },
                network: {
                    gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
                    blockNumber: blockNumber,
                    canUpdate: canUpdate
                },
                alerts: this.getRealTimeAlerts()
            };

        } catch (error) {
            this.logger.error('获取实时数据失败', error);
            throw error;
        }
    }

    /**
     * 获取历史数据
     */
    async getHistoricalData(metric, period) {
        try {
            let timeFilter;
            switch (period) {
                case '1h':
                    timeFilter = "datetime('now', '-1 hour')";
                    break;
                case '24h':
                    timeFilter = "datetime('now', '-1 day')";
                    break;
                case '7d':
                    timeFilter = "datetime('now', '-7 days')";
                    break;
                case '30d':
                    timeFilter = "datetime('now', '-30 days')";
                    break;
                default:
                    timeFilter = "datetime('now', '-1 day')";
            }

            let query, table;
            switch (metric) {
                case 'cost':
                    table = 'cost_analysis';
                    query = `
                        SELECT timestamp, total_cost_usd, cost_per_device, savings_percentage
                        FROM ${table}
                        WHERE timestamp >= ${timeFilter}
                        ORDER BY timestamp
                    `;
                    break;
                case 'performance':
                    table = 'performance_metrics';
                    query = `
                        SELECT timestamp, avg_response_time_ms, success_rate, error_count
                        FROM ${table}
                        WHERE timestamp >= ${timeFilter}
                        ORDER BY timestamp
                    `;
                    break;
                case 'devices':
                    table = 'system_metrics';
                    query = `
                        SELECT timestamp, total_devices, active_devices, avg_performance_tier
                        FROM ${table}
                        WHERE timestamp >= ${timeFilter}
                        ORDER BY timestamp
                    `;
                    break;
                default:
                    throw new Error(`Unknown metric: ${metric}`);
            }

            const data = this.db.prepare(query).all();
            return data;

        } catch (error) {
            this.logger.error('获取历史数据失败', error);
            throw error;
        }
    }

    /**
     * 获取成本优化建议
     */
    async getCostOptimizationRecommendations() {
        try {
            const currentMetrics = await this.getCurrentCostMetrics();
            const recommendations = [];

            // 分析成本偏差
            const costDeviation = (currentMetrics.annualCost - this.config.costTargets.annualTarget) / this.config.costTargets.annualTarget;

            if (costDeviation > 0.1) {
                recommendations.push({
                    type: 'cost_reduction',
                    priority: 'high',
                    title: '成本超出目标',
                    description: `当前年成本 $${currentMetrics.annualCost.toFixed(2)} 超出目标 ${Math.abs(costDeviation * 100).toFixed(1)}%`,
                    suggestions: [
                        '考虑增加批量处理大小',
                        '优化更新频率',
                        '检查Gas价格使用情况'
                    ],
                    potentialSavings: (currentMetrics.annualCost - this.config.costTargets.annualTarget).toFixed(2)
                });
            }

            if (costDeviation < -0.1) {
                recommendations.push({
                    type: 'cost_efficiency',
                    priority: 'info',
                    title: '成本控制良好',
                    description: `当前年成本 $${currentMetrics.annualCost.toFixed(2)} 低于目标 ${Math.abs(costDeviation * 100).toFixed(1)}%`,
                    suggestions: [
                        '保持当前优化策略',
                        '考虑增加更多设备以实现规模效应'
                    ]
                });
            }

            // 分析性能效率
            if (currentMetrics.perDeviceCost > this.config.costTargets.perDeviceTarget * 1.2) {
                recommendations.push({
                    type: 'efficiency',
                    priority: 'medium',
                    title: '单设备成本偏高',
                    description: `单设备年成本 $${currentMetrics.perDeviceCost.toFixed(2)} 高于目标 $${this.config.costTargets.perDeviceTarget}`,
                    suggestions: [
                        '增加批量处理数量',
                        '减少不必要的链上操作',
                        '优化智能合约调用'
                    ]
                });
            }

            return {
                recommendations,
                summary: {
                    totalRecommendations: recommendations.length,
                    highPriorityCount: recommendations.filter(r => r.priority === 'high').length,
                    potentialSavings: recommendations.reduce((sum, r) => sum + (r.potentialSavings || 0), 0)
                }
            };

        } catch (error) {
            this.logger.error('获取成本优化建议失败', error);
            throw error;
        }
    }

    /**
     * 计算成本指标
     */
    calculateCostMetrics(totalDevices, latestMetrics) {
        const gasPrice = 0.00000005; // $50 per 1B gas (估算)
        const infrastructureCost = 400; // $400/月
        const monthlyCost = (latestMetrics?.gas_used_24h || 0) * gasPrice + infrastructureCost;
        const annualCost = monthlyCost * 12;

        return {
            annualCost,
            monthlyCost,
            dailyCost: annualCost / 365,
            perDeviceCost: totalDevices.toNumber() > 0 ? annualCost / totalDevices.toNumber() : 0,
            gasCostDaily: latestMetrics?.gas_used_24h || 0,
            infrastructureCostMonthly: infrastructureCost,
            savingsPercentage: 99.6 // 相比全链上存储
        };
    }

    /**
     * 获取当前成本指标
     */
    async getCurrentCostMetrics() {
        // 从区块链获取Gas使用数据
        const [totalDevices, batchStats] = await Promise.all([
            this.contracts.registry.totalDevices(),
            this.contracts.registry.getBatchStats()
        ]);

        // 估算Gas使用
        const estimatedGasPerBatch = 500000; // 估算值
        const gasPerDevice = 15000; // 估算值
        const gasPrice = await this.web3.getGasPrice();
        const gasCostPerDevice = parseFloat(ethers.utils.formatUnits(gasPrice.mul(gasPerDevice), 'ether')) * 2000; // ETH价格估算

        const totalDevicesNum = totalDevices.toNumber();
        const annualGasCost = gasCostPerDevice * totalDevicesNum * 52; // 52次更新/年
        const infrastructureCost = 400 * 12; // $400/month * 12

        return {
            annualCost: annualGasCost + infrastructureCost,
            perDeviceCost: totalDevicesNum > 0 ? (annualGasCost + infrastructureCost) / totalDevicesNum : 0,
            gasCostPerDevice,
            infrastructureCostAnnual: infrastructureCost,
            totalDevices: totalDevicesNum
        };
    }

    /**
     * 预测年度成本
     */
    predictAnnualCosts(currentMetrics) {
        return {
            current: currentMetrics.annualCost,
            target: this.config.costTargets.annualTarget,
            projected: currentMetrics.annualCost * 1.05, // 假设5%增长
            efficiency: this.config.costTargets.annualTarget / currentMetrics.annualCost
        };
    }

    /**
     * 计算性能指标
     */
    calculatePerformanceMetrics() {
        const recentPerformance = this.db.prepare(`
            SELECT AVG(avg_response_time_ms) as avg_response,
            AVG(success_rate) as avg_success,
            AVG(batch_processing_time_ms) as avg_batch_time
            FROM performance_metrics
            WHERE timestamp >= datetime('now', '-24 hours')
        `).get();

        return {
            averageResponseTime: recentPerformance?.avg_response || 0,
            averageSuccessRate: recentPerformance?.avg_success || 100,
            averageBatchProcessingTime: recentPerformance?.avg_batch_time || 0
        };
    }

    /**
     * 计算性能趋势
     */
    calculatePerformanceTrends(data) {
        if (data.length < 2) return {};

        const latest = data[0];
        const previous = data[data.length - 1];

        return {
            responseTimeTrend: latest.avg_response_time_ms - previous.avg_response_time_ms,
            successRateTrend: latest.success_rate - previous.success_rate,
            batchTimeTrend: latest.batch_processing_time_ms - previous.batch_processing_time_ms
        };
    }

    /**
     * 获取系统负载
     */
    async getSystemLoad() {
        try {
            const [totalDevices, activeDevices] = await Promise.all([
                this.contracts.registry.totalDevices(),
                this.contracts.registry.activeDevices()
            ]);

            return {
                deviceUtilization: totalDevices.toNumber() > 0 ? (activeDevices.toNumber() / totalDevices.toNumber()) * 100 : 0,
                totalDevices: totalDevices.toString(),
                activeDevices: activeDevices.toString()
            };
        } catch (error) {
            return { deviceUtilization: 0, totalDevices: '0', activeDevices: '0' };
        }
    }

    /**
     * 获取系统健康状态
     */
    getSystemHealthStatus(totalDevices, activeDevices) {
        const utilization = totalDevices.toNumber() > 0 ? (activeDevices.toNumber() / totalDevices.toNumber()) : 100;

        if (utilization >= 95) return 'excellent';
        if (utilization >= 80) return 'good';
        if (utilization >= 60) return 'fair';
        return 'poor';
    }

    /**
     * 获取活跃告警
     */
    getActiveAlerts() {
        // 这里可以实现实际的告警逻辑
        return [];
    }

    /**
     * 获取实时告警
     */
    getRealTimeAlerts() {
        const alerts = [];

        // 这里可以实现实时告警逻辑
        // 例如：成本超限、性能下降、系统错误等

        return alerts;
    }

    /**
     * 计算成本效率
     */
    calculateCostEfficiency(costMetrics) {
        const efficiency = this.config.costTargets.annualTarget / costMetrics.annualCost;
        return {
            current: efficiency,
            target: 1.0,
            percentage: (efficiency * 100).toFixed(1)
        };
    }

    /**
     * 计算基准值
     */
    calculateBenchmark(metric) {
        // 这里可以实现基准值计算逻辑
        switch (metric) {
            case 'response_time':
                return 50; // ms
            case 'batch_processing':
                return 15; // seconds
            case 'success_rate':
                return 99.5; // %
            default:
                return 0;
        }
    }

    /**
     * 启动定时更新
     */
    startPeriodicUpdates() {
        // 每30秒更新一次指标
        setInterval(async () => {
            try {
                await this.updateMetrics();
            } catch (error) {
                this.logger.error('定时更新失败', error);
            }
        }, this.config.updateInterval);

        // 每5分钟执行一次成本分析
        setInterval(async () => {
            try {
                await this.updateCostAnalysis();
            } catch (error) {
                this.logger.error('成本分析更新失败', error);
            }
        }, 5 * 60 * 1000);

        // 每小时执行一次性能分析
        setInterval(async () => {
            try {
                await this.updatePerformanceAnalysis();
            } catch (error) {
                this.logger.error('性能分析更新失败', error);
            }
        }, 60 * 60 * 1000);
    }

    /**
     * 更新系统指标
     */
    async updateMetrics() {
        try {
            const [
                totalDevices,
                activeDevices,
                totalComputePower
            ] = await Promise.all([
                this.contracts.registry.totalDevices(),
                this.contracts.registry.activeDevices(),
                this.contracts.registry.totalComputePower()
            ]);

            const [batchStats] = await Promise.all([
                this.contracts.registry.getBatchStats()
            ]);

            // 估算Gas使用
            const estimatedGas24h = batchStats.totalBatches.toNumber() * 500000; // 估算

            // 计算成本
            const currentMetrics = await this.getCurrentCostMetrics();

            this.db.prepare(`
                INSERT INTO system_metrics (
                    total_devices, active_devices, total_compute_power,
                    gas_used_24h, estimated_cost_usd, batch_updates_24h, avg_performance_tier
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                totalDevices.toString(),
                activeDevices.toString(),
                totalComputePower.toString(),
                estimatedGas24h,
                currentMetrics.annualCost / 365,
                batchStats.totalBatches.toString(),
                7.0 // 默认平均等级
            );

        } catch (error) {
            this.logger.error('更新系统指标失败', error);
        }
    }

    /**
     * 更新成本分析
     */
    async updateCostAnalysis() {
        try {
            const currentMetrics = await this.getCurrentCostMetrics();

            this.db.prepare(`
                INSERT INTO cost_analysis (
                    period_type, total_cost_usd, cost_per_device,
                    gas_cost_usd, infrastructure_cost_usd, savings_percentage
                ) VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                'daily',
                currentMetrics.annualCost / 365,
                currentMetrics.perDeviceCost,
                currentMetrics.gasCostPerDevice,
                currentMetrics.infrastructureCostAnnual / 365,
                99.6
            );

        } catch (error) {
            this.logger.error('更新成本分析失败', error);
        }
    }

    /**
     * 更新性能分析
     */
    async updatePerformanceAnalysis() {
        try {
            // 模拟性能数据
            const responseTime = 50 + Math.random() * 20; // 50-70ms
            const batchTime = 15 + Math.random() * 10; // 15-25s
            const successRate = 99 + Math.random(); // 99-100%

            this.db.prepare(`
                INSERT INTO performance_metrics (
                    avg_response_time_ms, batch_processing_time_ms, success_rate
                ) VALUES (?, ?, ?)
            `).run(responseTime, batchTime, successRate);

        } catch (error) {
            this.logger.error('更新性能分析失败', error);
        }
    }

    /**
     * 启动服务器
     */
    start() {
        this.server = this.app.listen(this.config.port, () => {
            this.logger.info('监控仪表板已启动', {
                port: this.config.port,
                url: `http://localhost:${this.config.port}`
            });
        });
    }

    /**
     * 停止服务器
     */
    stop() {
        if (this.server) {
            this.server.close(() => {
                this.logger.info('监控仪表板已停止');
                if (this.db) {
                    this.db.close();
                }
            });
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

// 启动监控仪表板
if (require.main === module) {
    const dashboard = new MonitoringDashboard({
        port: process.env.MONITOR_PORT || 3001,
        registryAddress: process.env.REGISTRY_ADDRESS,
        oracleAddress: process.env.ORACLE_ADDRESS,
        rpcUrl: process.env.RPC_URL
    });

    dashboard.start();

    // 优雅关闭
    process.on('SIGINT', () => {
        console.log('\n正在关闭监控仪表板...');
        dashboard.stop();
        process.exit(0);
    });
}

module.exports = MonitoringDashboard;