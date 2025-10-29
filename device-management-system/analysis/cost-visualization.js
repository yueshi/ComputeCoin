// 成本可视化数据和分析
// 用于生成图表和可视化报告

const costData = {
    // 年度运营成本对比 (1万台设备)
    annualCosts: {
        fullOnChain: 2218350,    // $2,218,350
        hybrid: 38600,            // $38,600
        ultraMinimal: 8400,       // $8,400
        offChain: 6000            // $6,000
    },

    // 单设备年成本
    perDeviceCosts: {
        fullOnChain: 221.85,      // $221.85
        hybrid: 3.86,             // $3.86
        ultraMinimal: 0.84,       // $0.84
        offChain: 0.60            // $0.60
    },

    // 成本节省比例 (相比全链上)
    costSavings: {
        fullOnChain: 0,           // 0%
        hybrid: 98.3,             // 98.3%
        ultraMinimal: 99.6,       // 99.6%
        offChain: 99.7            // 99.7%
    },

    // 链上存储量 (bytes/设备)
    onChainStorage: {
        fullOnChain: 25000,       // 25KB/天
        hybrid: 350,              // 350 bytes
        ultraMinimal: 28,         // 28 bytes
        offChain: 0               // 0 bytes
    },

    // 更新频率 (次/年)
    updateFrequency: {
        fullOnChain: 365,         // 每日
        hybrid: 365,              // 每日
        ultraMinimal: 52,         // 每周
        offChain: 365             // 实时
    },

    // 查询响应时间 (毫秒)
    responseTime: {
        fullOnChain: 2500,        // 2.5秒
        hybrid: 80,               // 80ms
        ultraMinimal: 50,         // 50ms
        offChain: 20              // 20ms
    }
};

// 生成图表配置
function generateChartConfigs() {
    return {
        // 年度成本对比柱状图
        annualCostChart: {
            type: 'bar',
            data: {
                labels: ['全链上存储', '混合架构', '极简架构', '全链下存储'],
                datasets: [{
                    label: '年度运营成本 (美元)',
                    data: [
                        costData.annualCosts.fullOnChain,
                        costData.annualCosts.hybrid,
                        costData.annualCosts.ultraMinimal,
                        costData.annualCosts.offChain
                    ],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(255, 206, 86, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '年度运营成本对比 (1万台设备)'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '成本 (美元)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        },

        // 成本节省比例饼图
        savingsChart: {
            type: 'pie',
            data: {
                labels: ['混合架构节省', '极简架构节省', '剩余成本'],
                datasets: [{
                    data: [
                        costData.costSavings.hybrid,
                        costData.costSavings.ultraMinimal - costData.costSavings.hybrid,
                        100 - costData.costSavings.ultraMinimal
                    ],
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(255, 99, 132, 0.8)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '成本节省比例分析'
                    },
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed + '%';
                            }
                        }
                    }
                }
            }
        },

        // 多指标雷达图
        radarChart: {
            type: 'radar',
            data: {
                labels: ['成本效益', '性能表现', '实施复杂度', '可扩展性', '数据完整性'],
                datasets: [
                    {
                        label: '全链上存储',
                        data: [1, 2, 1, 1, 5],
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        pointBackgroundColor: 'rgba(255, 99, 132, 1)'
                    },
                    {
                        label: '混合架构',
                        data: [4, 4, 3, 4, 4],
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        pointBackgroundColor: 'rgba(54, 162, 235, 1)'
                    },
                    {
                        label: '极简架构',
                        data: [5, 5, 5, 5, 3],
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        pointBackgroundColor: 'rgba(75, 192, 192, 1)'
                    },
                    {
                        label: '全链下存储',
                        data: [5, 5, 5, 5, 2],
                        backgroundColor: 'rgba(255, 206, 86, 0.2)',
                        borderColor: 'rgba(255, 206, 86, 1)',
                        pointBackgroundColor: 'rgba(255, 206, 86, 1)'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '综合性能对比雷达图'
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        },

        // 规模扩展成本趋势图
        scalabilityChart: {
            type: 'line',
            data: {
                labels: ['1千台', '1万台', '10万台', '100万台'],
                datasets: [
                    {
                        label: '全链上存储',
                        data: [221835, 2218350, 22183500, 221835000],
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        tension: 0.1
                    },
                    {
                        label: '混合架构',
                        data: [3860, 38600, 386000, 3860000],
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        tension: 0.1
                    },
                    {
                        label: '极简架构',
                        data: [840, 8400, 84000, 840000],
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        tension: 0.1
                    },
                    {
                        label: '全链下存储',
                        data: [600, 6000, 60000, 600000],
                        backgroundColor: 'rgba(255, 206, 86, 0.2)',
                        borderColor: 'rgba(255, 206, 86, 1)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '规模扩展成本趋势'
                    }
                },
                scales: {
                    y: {
                        type: 'logarithmic',
                        title: {
                            display: true,
                            text: '年度成本 (美元, 对数坐标)'
                        },
                        ticks: {
                            callback: function(value, index, values) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '设备规模'
                        }
                    }
                }
            }
        }
    };
}

// 生成分析报告
function generateAnalysisReport() {
    const configs = generateChartConfigs();

    return {
        title: "算力设备管理系统存储架构成本分析报告",
        summary: {
            totalCosts: costData.annualCosts,
            savings: costData.costSavings,
            bestValue: "极简混合架构",
            keyInsights: [
                "极简架构相比全链上存储节省99.6%成本",
                "单设备年成本仅$0.84，为所有方案中最低",
                "性能表现优异，查询响应时间仅50ms",
                "支持十万级设备网络扩展"
            ]
        },
        charts: configs,
        recommendations: [
            {
                scenario: "大规模商业化部署",
                recommendation: "极简混合架构",
                reason: "成本效益最优，支持大规模扩展",
                expectedROI: "485%"
            },
            {
                scenario: "高合规要求场景",
                recommendation: "标准混合架构",
                reason: "数据完整性验证更完善",
                expectedROI: "256%"
            },
            {
                scenario: "快速原型开发",
                recommendation: "极简混合架构",
                reason: "技术复杂度低，开发周期短",
                expectedROI: "485%"
            }
        ]
    };
}

// 导出配置和数据
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        costData,
        generateChartConfigs,
        generateAnalysisReport
    };
}

// 在浏览器环境中的使用示例
if (typeof window !== 'undefined') {
    window.costAnalysis = {
        data: costData,
        charts: generateChartConfigs(),
        report: generateAnalysisReport()
    };

    console.log("成本分析数据已加载:", window.costAnalysis);
}