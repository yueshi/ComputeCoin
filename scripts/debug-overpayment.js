// 调试ComputeMarketLite合约Overpayment错误的脚本
const { ethers } = require("hardhat");

async function debugOverpayment() {
    console.log("🔍 开始调试ComputeMarketLite Overpayment错误...\n");

    // 获取签名者
    const [owner, client] = await ethers.getSigners();
    console.log(`👤 账户信息:`);
    console.log(`   Owner: ${owner.address}`);
    console.log(`   Client: ${client.address}\n`);

    // 获取合约实例
    const ComputeMarketLite = await ethers.getContractFactory("ComputeMarketLite");
    const CCToken = await ethers.getContractFactory("CCToken");
    const CustomerNFT = await ethers.getContractFactory("CustomerNFT");

    // 合约地址（从deployment文件获取）
    const marketAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"; // ComputeMarketLite
    const ccTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // CCToken
    const customerNftAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // CustomerNFT
    const ccusdTokenAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"; // CCUSD (MockUSDC)

    const market = ComputeMarketLite.attach(marketAddress);
    const ccToken = CCToken.attach(ccTokenAddress);
    const customerNFT = CustomerNFT.attach(customerNftAddress);

    try {
        console.log("📊 检查合约状态...");

        // 1. 检查CC价格
        const ccPrice = await market.ccTokenPrice();
        console.log(`💰 CC价格: ${ethers.formatEther(ccPrice)} CCUSD/CC`);

        // 2. 假设我们要测试的订单ID（需要根据实际情况调整）
        const orderId = 1; // 假设订单ID为1

        console.log(`📋 检查订单 ${orderId} 状态...`);

        // 3. 获取订单详情
        const order = await market.getOrder(orderId);
        console.log(`📦 订单详情:`);
        console.log(`   ID: ${order[0]}`);
        console.log(`   客户: ${order[1]}`);
        console.log(`   提供商: ${order[2]}`);
        console.log(`   最终价格: ${ethers.formatUnits(order[3], 6)} CCUSD`); // 6位精度
        console.log(`   状态: ${order[4]}`);
        console.log(`   创建时间: ${new Date(Number(order[5]) * 1000).toISOString()}`);
        console.log(`   支付时间: ${order[6] > 0 ? new Date(Number(order[6]) * 1000).toISOString() : '未支付'}`);
        console.log(`   客户NFT ID: ${order[7]}`);
        console.log(`   主要支付代币: ${order[8]}`); // 0=NONE, 1=CC, 2=CCUSD
        console.log(`   总支付金额: ${ethers.formatUnits(order[9], 6)} CCUSD`); // 6位精度
        console.log(`   汇率: ${order[10]}`);
        console.log(`   支付次数: ${order[11]}`);

        // 4. 计算支付参数
        const finalPriceCCUSD = order[3]; // 原始wei值
        const finalPriceHuman = ethers.formatUnits(order[3], 6); // 人类可读
        const ccPriceHuman = ethers.formatEther(ccPrice); // CC价格

        // 计算需要的CC数量
        const ccAmountNeeded = (parseFloat(finalPriceHuman) / parseFloat(ccPriceHuman)).toFixed(6);
        const ccAmountWei = ethers.parseEther(ccAmountNeeded); // 18位wei

        console.log(`\n💡 支付计算:`);
        console.log(`   订单价格: ${finalPriceHuman} CCUSD`);
        console.log(`   CC价格: ${ccPriceHuman} CCUSD/CC`);
        console.log(`   需要CC数量: ${ccAmountNeeded} CC`);
        console.log(`   CC数量(wei): ${ccAmountWei.toString()}`);

        // 5. 计算USD等值
        const usdEquivalent = (ccAmountWei * ccPrice) / ethers.parseEther("1");
        console.log(`   USD等值(wei): ${usdEquivalent.toString()}`);
        console.log(`   USD等值(人类): ${ethers.formatUnits(usdEquivalent, 6)} CCUSD`);

        // 6. 检查是否会超额支付
        const currentPaid = order[9]; // 当前已支付金额(6位wei)
        const newTotalPaid = currentPaid + usdEquivalent;
        const isOverpayment = newTotalPaid > finalPriceCCUSD;

        console.log(`\n🚨 超额支付检查:`);
        console.log(`   当前已支付: ${ethers.formatUnits(currentPaid, 6)} CCUSD`);
        console.log(`   本次支付: ${ethers.formatUnits(usdEquivalent, 6)} CCUSD`);
        console.log(`   支付后总计: ${ethers.formatUnits(newTotalPaid, 6)} CCUSD`);
        console.log(`   订单价格: ${ethers.formatUnits(finalPriceCCUSD, 6)} CCUSD`);
        console.log(`   是否超额: ${isOverpayment ? '❌ 是' : '✅ 否'}`);

        if (isOverpayment) {
            const overpaymentAmount = newTotalPaid - finalPriceCCUSD;
            console.log(`   超额金额: ${ethers.formatUnits(overpaymentAmount, 6)} CCUSD`);
        }

        // 7. 检查用户CC余额
        const userBalance = await ccToken.balanceOf(client.address);
        console.log(`\n💼 用户CC余额: ${ethers.formatEther(userBalance)} CC`);

        // 8. 检查授权额度
        const allowance = await ccToken.allowance(client.address, marketAddress);
        console.log(`   授权额度: ${ethers.formatEther(allowance)} CC`);

        console.log(`\n🎯 调试建议:`);
        if (isOverpayment) {
            console.log(`   1. 超额支付错误已确认`);
            console.log(`   2. 建议检查订单的当前支付状态`);
            console.log(`   3. 可能需要调整支付金额或检查之前的支付记录`);
        } else {
            console.log(`   1. 支付金额正常，错误可能来自其他原因`);
            console.log(`   2. 建议检查合约执行时的具体参数`);
            console.log(`   3. 可能是授权或余额不足的问题`);
        }

    } catch (error) {
        console.error("❌ 调试过程中出错:", error.message);
        if (error.reason) {
            console.error(`   错误原因: ${error.reason}`);
        }
    }
}

// 运行调试
debugOverpayment()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });