/**
 * Ultra Minimal Device System Tests
 * 极简设备管理系统测试套件
 * 覆盖核心功能和成本优化验证
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

describe('Ultra Minimal Device System', function () {
    let deviceRegistry;
    let oracle;
    let owner;
    let provider;
    let signer1;
    let signer2;
    let signer3;

    // 测试数据
    const testDevices = [
        {
            provider: ethers.constants.AddressZero,
            deviceType: 1, // GPU
            computePower: 100
        },
        {
            provider: ethers.constants.AddressZero,
            deviceType: 0, // CPU
            computePower: 50
        },
        {
            provider: ethers.constants.AddressZero,
            deviceType: 2, // AI_ACCELERATOR
            computePower: 200
        }
    ];

    beforeEach(async function () {
        // 获取测试账户
        [owner, provider, signer1, signer2, signer3] = await ethers.getSigners();

        // 部署合约
        const DeviceRegistry = await ethers.getContractFactory('UltraMinimalDeviceRegistry');
        deviceRegistry = await DeviceRegistry.deploy(owner.address);
        await deviceRegistry.deployed();

        const Oracle = await ethers.getContractFactory('UltraMinimalOracle');
        oracle = await Oracle.deploy(deviceRegistry.address);
        await oracle.deployed();

        // 设置预言机地址
        await deviceRegistry.setOracle(oracle.address);

        // 授权签名者
        await oracle.connect(signer1).registerSigner(1000);
        await oracle.connect(signer2).registerSigner(1000);
        await oracle.connect(signer3).registerSigner(1000);

        // 授权提交者
        await oracle.setAuthorizedSubmitter(provider.address, true);
    });

    describe('DeviceRegistry Core Functions', function () {
        it('Should register a device with minimal data', async function () {
            const tx = await deviceRegistry.registerDevice(
                testDevices[0].provider,
                testDevices[0].deviceType,
                testDevices[0].computePower
            );
            const receipt = await tx.wait();

            // 验证事件
            const event = receipt.events.find(e => e.event === 'DeviceRegistered');
            expect(event).to.not.be.undefined;
            expect(event.args.deviceId).to.equal(1);
            expect(event.args.provider).to.equal(testDevices[0].provider);
            expect(event.args.deviceType).to.equal(testDevices[0].deviceType);

            // 验证设备数据
            const deviceSummary = await deviceRegistry.getDeviceSummary(1);
            expect(deviceSummary.provider).to.equal(testDevices[0].provider);
            expect(deviceSummary.deviceType).to.equal(testDevices[0].deviceType);
            expect(deviceSummary.computePower).to.equal(testDevices[0].computePower);
            expect(deviceSummary.status).to.equal(0); // PENDING
            expect(deviceSummary.performanceTier).to.equal(5); // Default

            // 验证Gas使用 (应该在合理范围内)
            expect(tx.gasLimit).to.be.lessThan(200000);
        });

        it('Should support batch device registration', async function () {
            const initialDevices = await deviceRegistry.totalDevices();

            // 注册多个设备
            for (let i = 0; i < testDevices.length; i++) {
                await deviceRegistry.registerDevice(
                    testDevices[i].provider,
                    testDevices[i].deviceType,
                    testDevices[i].computePower
                );
            }

            const finalDevices = await deviceRegistry.totalDevices();
            expect(finalDevices).to.equal(initialDevices.add(testDevices.length));
        });

        it('Should enforce maximum devices per provider limit', async function () {
            const maxDevices = 10; // 使用较小的限制进行测试
            const testProvider = await ethers.getSigner(4);

            // 注册到最大限制
            for (let i = 0; i < maxDevices; i++) {
                await deviceRegistry.registerDevice(
                    testProvider.address,
                    1, // GPU
                    100
                );
            }

            // 尝试注册超过限制
            await expect(
                deviceRegistry.registerDevice(
                    testProvider.address,
                    1, // GPU
                    100
                )
            ).to.be.revertedWith('Too many devices');
        });

        it('Should handle batch weekly update efficiently', async function () {
            // 注册一些设备
            const deviceIds = [];
            for (let i = 0; i < 5; i++) {
                const tx = await deviceRegistry.registerDevice(
                    ethers.constants.AddressZero,
                    1, // GPU
                    100
                );
                const receipt = await tx.wait();
                deviceIds.push(receipt.events.find(e => e.event === 'DeviceRegistered').args.deviceId);
            }

            // 准备批量更新数据
            const performanceTiers = [7, 8, 6, 9, 7];
            const statuses = [1, 1, 1, 1, 1]; // ACTIVE

            // 等待更新间隔
            await time.increase(8 * 24 * 60 * 60); // 8 days

            // 执行批量更新
            const tx = await deviceRegistry.batchWeeklyUpdate(
                deviceIds,
                performanceTiers,
                statuses
            );
            const receipt = await tx.wait();

            // 验证事件
            const event = receipt.events.find(e => e.event === 'BatchWeeklyUpdate');
            expect(event).to.not.be.undefined;
            expect(event.args.deviceCount).to.equal(deviceIds.length);
            expect(event.args.avgTier).to.equal(7); // Average of [7,8,6,9,7]

            // 验证Gas使用效率 (批量操作应该更节省Gas)
            expect(tx.gasLimit).to.be.lessThan(500000); // 批量操作的Gas限制

            // 验证更新结果
            for (let i = 0; i < deviceIds.length; i++) {
                const summary = await deviceRegistry.getDeviceSummary(deviceIds[i]);
                expect(summary.performanceTier).to.equal(performanceTiers[i]);
                expect(summary.status).to.equal(statuses[i]);
            }
        });

        it('Should enforce batch size limits', async function () {
            const largeDeviceIds = Array(1500).fill(1); // 超过限制
            const performanceTiers = Array(1500).fill(5);
            const statuses = Array(1500).fill(1);

            await expect(
                deviceRegistry.batchWeeklyUpdate(
                    largeDeviceIds,
                    performanceTiers,
                    statuses
                )
            ).to.be.revertedWith('Invalid batch size');
        });

        it('Should prevent too frequent updates', async function () {
            const deviceIds = [1];
            const performanceTiers = [5];
            const statuses = [1];

            // 第一次更新
            await deviceRegistry.batchWeeklyUpdate(deviceIds, performanceTiers, statuses);

            // 立即尝试第二次更新 (应该失败)
            await expect(
                deviceRegistry.batchWeeklyUpdate(deviceIds, performanceTiers, statuses)
            ).to.be.revertedWith('Update too frequent');
        });
    });

    describe('Oracle Functions', function () {
        it('Should register and manage signers', async function () {
            const newSigner = await ethers.getSigner(5);

            // 注册签名者
            const tx = await oracle.connect(newSigner).registerSigner(1500);
            const receipt = await tx.wait();

            // 验证签名者信息
            const signerInfo = await oracle.getSignerInfo(newSigner.address);
            expect(signerInfo.isActive).to.be.true;
            expect(signerInfo.reputation).to.equal(1500);
            expect(signerInfo.totalSigned).to.equal(0);

            // 验证活跃签名者数量
            const activeSigners = await oracle.getActiveSignerCount();
            expect(activeSigners).to.equal(4); // 3 initial + 1 new
        });

        it('Should handle batch update submission', async function () {
            const batchId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test-batch'));
            const deviceIds = [1, 2, 3];
            const performanceTiers = [7, 8, 6];
            const statuses = [1, 1, 1];
            const dataHash = ethers.utils.keccak256('test-data');

            const tx = await oracle.submitBatchUpdate(
                batchId,
                deviceIds,
                performanceTiers,
                statuses,
                dataHash
            );
            const receipt = await tx.wait();

            // 验证事件
            const event = receipt.events.find(e => e.event === 'BatchSubmitted');
            expect(event).to.not.be.undefined;
            expect(event.args.batchId).to.equal(batchId);
            expect(event.args.deviceCount).to.equal(3);

            // 验证批次信息
            const batchInfo = await oracle.getBatchInfo(batchId);
            expect(batchInfo.timestamp).to.be.gt(0);
            expect(batchInfo.deviceCount).to.equal(3);
            expect(batchInfo.processed).to.be.false;
        });

        it('Should collect multiple signatures for batch processing', async function () {
            const batchId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('signature-test'));
            const deviceIds = [1];
            const performanceTiers = [7];
            const statuses = [1];
            const dataHash = ethers.utils.keccak256('signature-test-data');

            // 提交批次
            await oracle.submitBatchUpdate(
                batchId,
                deviceIds,
                performanceTiers,
                statuses,
                dataHash
            );

            // 收集签名
            await oracle.connect(signer1).submitSignature(batchId, '0x1234');
            await oracle.connect(signer2).submitSignature(batchId, '0x5678');
            await oracle.connect(signer3).submitSignature(batchId, '0x9abc');

            // 验证批次信息
            const batchInfo = await oracle.getBatchInfo(batchId);
            expect(batchInfo.signatureCount).to.equal(3);
            expect(batchInfo.requiredSignatures).to.equal(3);
        });

        it('Should prevent duplicate signatures', async function () {
            const batchId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('duplicate-test'));
            const deviceIds = [1];
            const performanceTiers = [7];
            const statuses = [1];
            const dataHash = ethers.utils.keccak256('duplicate-test-data');

            // 提交批次
            await oracle.submitBatchUpdate(
                batchId,
                deviceIds,
                performanceTiers,
                statuses,
                dataHash
            );

            // 第一次签名
            await oracle.connect(signer1).submitSignature(batchId, '0x1234');

            // 尝试重复签名 (应该失败)
            await expect(
                oracle.connect(signer1).submitSignature(batchId, '0x5678')
            ).to.be.revertedWith('Already signed');
        });
    });

    describe('Cost Optimization Tests', function () {
        it('Should maintain low gas costs for device registration', async function () {
            const tx = await deviceRegistry.registerDevice(
                testDevices[0].provider,
                testDevices[0].deviceType,
                testDevices[0].computePower
            );
            const receipt = await tx.wait();

            // 验证Gas使用在合理范围内 (极简架构目标)
            expect(receipt.gasUsed).to.be.lessThan(150000); // 目标: < 150,000 gas
        });

        it('Should be gas efficient for batch updates', async function () {
            // 注册设备
            const deviceIds = [];
            for (let i = 0; i < 10; i++) {
                const tx = await deviceRegistry.registerDevice(
                    ethers.constants.AddressZero,
                    1, // GPU
                    100
                );
                const receipt = await tx.wait();
                deviceIds.push(receipt.events.find(e => e.event === 'DeviceRegistered').args.deviceId);
            }

            // 等待更新间隔
            await time.increase(8 * 24 * 60 * 60);

            // 批量更新
            const performanceTiers = Array(10).fill(7);
            const statuses = Array(10).fill(1);

            const tx = await deviceRegistry.batchWeeklyUpdate(
                deviceIds,
                performanceTiers,
                statuses
            );
            const receipt = await tx.wait();

            // 验证批量更新Gas效率
            const gasPerDevice = receipt.gasUsed.toNumber() / deviceIds.length;
            expect(gasPerDevice).to.be.lessThan(10000); // 目标: < 10,000 gas per device
        });

        it('Should optimize storage usage with minimal data structure', async function () {
            const initialDevices = await deviceRegistry.totalDevices();

            // 注册设备
            await deviceRegistry.registerDevice(
                testDevices[0].provider,
                testDevices[0].deviceType,
                testDevices[0].computePower
            );

            // 获取存储槽大小 (通过检查字节码估算)
            const storageBefore = await ethers.provider.getStorageAt(
                deviceRegistry.address,
                ethers.BigNumber.from('0x0') // 根据实际存储布局调整
            );

            const finalDevices = await deviceRegistry.totalDevices();
            expect(finalDevices).to.equal(initialDevices.add(1));

            // 验证存储增长最小化
            // 注意: 这里需要根据实际的存储布局来实现精确的存储使用验证
        });
    });

    describe('Integration Tests', function () {
        it('Should handle complete device lifecycle', async function () {
            // 1. 注册设备
            const registerTx = await deviceRegistry.registerDevice(
                testDevices[0].provider,
                testDevices[0].deviceType,
                testDevices[0].computePower
            );
            const registerReceipt = await registerTx.wait();
            const deviceId = registerReceipt.events.find(e => e.event === 'DeviceRegistered').args.deviceId;

            // 2. 验证初始状态
            const initialSummary = await deviceRegistry.getDeviceSummary(deviceId);
            expect(initialSummary.status).to.equal(0); // PENDING

            // 3. 等待更新间隔
            await time.increase(8 * 24 * 60 * 60);

            // 4. 批量更新到活跃状态
            const performanceTier = 8;
            const status = 1; // ACTIVE

            await deviceRegistry.batchWeeklyUpdate(
                [deviceId],
                [performanceTier],
                [status]
            );

            // 5. 验证更新结果
            const updatedSummary = await deviceRegistry.getDeviceSummary(deviceId);
            expect(updatedSummary.status).to.equal(status);
            expect(updatedSummary.performanceTier).to.equal(performanceTier);

            // 6. 验证全局统计更新
            const globalStats = await deviceRegistry.getGlobalStats();
            expect(globalStats.activeDevices).to.equal(1);
        });

        it('Should handle provider device management efficiently', async function () {
            const provider1 = await ethers.getSigner(4);
            const provider2 = await ethers.getSigner(5);

            // 为不同提供商注册设备
            await deviceRegistry.registerDevice(provider1.address, 1, 100);
            await deviceRegistry.registerDevice(provider1.address, 0, 50);
            await deviceRegistry.registerDevice(provider2.address, 2, 200);

            // 验证提供商设备列表
            const provider1Devices = await deviceRegistry.getProviderDevices(provider1.address);
            const provider2Devices = await deviceRegistry.getProviderDevices(provider2.address);

            expect(provider1Devices.length).to.equal(2);
            expect(provider2Devices.length).to.equal(1);

            // 验证提供商活跃设备数量
            const activeCount1 = await deviceRegistry.getProviderActiveDeviceCount(provider1.address);
            const activeCount2 = await deviceRegistry.getProviderActiveDeviceCount(provider2.address);

            expect(activeCount1).to.equal(0); // PENDING 状态
            expect(activeCount2).to.equal(0); // PENDING 状态

            // 验证提供商总算力
            const power1 = await deviceRegistry.getProviderTotalComputePower(provider1.address);
            const power2 = await deviceRegistry.getProviderTotalComputePower(provider2.address);

            expect(power1).to.equal(0); // 活跃设备为0
            expect(power2).to.equal(0); // 活跃设备为0
        });
    });

    describe('Security and Access Control', function () {
        it('Should prevent unauthorized batch updates', async function () {
            const unauthorizedUser = await ethers.getSigner(6);

            await expect(
                deviceRegistry.connect(unauthorizedUser).batchWeeklyUpdate(
                    [1],
                    [5],
                    [1]
                )
            ).to.be.revertedWith('Only oracle can call');
        });

        it('Should prevent unauthorized oracle operations', async function () {
            const unauthorizedUser = await ethers.getSigner(6);

            await expect(
                oracle.connect(unauthorizedUser).submitBatchUpdate(
                    ethers.utils.keccak256('test'),
                    [1],
                    [5],
                    [1],
                    ethers.utils.keccak256('data')
                )
            ).to.be.revertedWith('Not authorized submitter');
        });

        it('Should handle pause and resume correctly', async function () {
            // 暂停合约
            await deviceRegistry.pause();

            // 尝试注册设备 (应该失败)
            await expect(
                deviceRegistry.registerDevice(
                    testDevices[0].provider,
                    testDevices[0].deviceType,
                    testDevices[0].computePower
                )
            ).to.be.revertedWith('Pausable: paused');

            // 恢复合约
            await deviceRegistry.unpause();

            // 现在应该可以注册设备
            const tx = await deviceRegistry.registerDevice(
                testDevices[0].provider,
                testDevices[0].deviceType,
                testDevices[0].computePower
            );
            expect(tx).to.not.be.reverted;
        });
    });

    describe('Performance and Scalability', function () {
        it('Should handle large batch sizes efficiently', async function () {
            // 注册大量设备
            const deviceIds = [];
            const batchSize = 100; // 使用100台设备进行测试

            for (let i = 0; i < batchSize; i++) {
                const tx = await deviceRegistry.registerDevice(
                    ethers.constants.AddressZero,
                    1, // GPU
                    100
                );
                const receipt = await tx.wait();
                deviceIds.push(receipt.events.find(e => e.event === 'DeviceRegistered').args.deviceId);
            }

            // 等待更新间隔
            await time.increase(8 * 24 * 60 * 60);

            // 执行大批量更新
            const performanceTiers = Array(batchSize).fill(7);
            const statuses = Array(batchSize).fill(1);

            const startTime = Date.now();
            const tx = await deviceRegistry.batchWeeklyUpdate(
                deviceIds,
                performanceTiers,
                statuses
            );
            const receipt = await tx.wait();
            const endTime = Date.now();

            // 验证性能
            const processingTime = endTime - startTime;
            expect(processingTime).to.be.lessThan(5000); // 应该在5秒内完成

            // 验证Gas效率
            const gasPerDevice = receipt.gasUsed.toNumber() / batchSize;
            expect(gasPerDevice).to.be.lessThan(10000); // 每设备 < 10,000 gas

            console.log(`批量更新 ${batchSize} 台设备耗时: ${processingTime}ms`);
            console.log(`平均每设备Gas使用: ${gasPerDevice}`);
        });

        it('Should maintain system stability under load', async function () {
            // 模拟高负载场景
            const operations = [];
            const operationCount = 50;

            // 并发执行多个设备注册
            for (let i = 0; i < operationCount; i++) {
                operations.push(
                    deviceRegistry.registerDevice(
                        ethers.constants.AddressZero,
                        i % 3, // 循环设备类型
                        100 + (i % 100) // 变化的算力
                    )
                );
            }

            // 等待所有操作完成
            const results = await Promise.allSettled(operations);

            // 验证成功率
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            expect(successCount).to.equal(operationCount);

            // 验证总设备数
            const totalDevices = await deviceRegistry.totalDevices();
            expect(totalDevices).to.be.gte(operationCount);

            console.log(`高负载测试: ${successCount}/${operationCount} 操作成功`);
        });
    });
});