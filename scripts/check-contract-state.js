// 检查合约状态的脚本
const { ethers } = require("hardhat");

async function checkContractState() {
    console.log("🔍 检查ComputeMarketLite合约状态...\n");

    const [owner] = await ethers.getSigners();

    // 合约地址
    const marketAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
    const ccTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    const ComputeMarketLite = await ethers.getContractFactory("ComputeMarketLite");
    const CCToken = await ethers.getContractFactory("CCToken");

    const market = ComputeMarketLite.attach(marketAddress);
    const ccToken = CCToken.attach(ccTokenAddress);

    try {
        // 1. 检查CC价格
        const ccPrice = await market.ccTokenPrice();
        console.log(`💰 CC Token价格:`);
        console.log(`   原始值: ${ccPrice.toString()}`);
        console.log(`   作为18位精度解析: ${ethers.formatEther(ccPrice)} CCUSD/CC`);
        console.log(`   作为6位精度解析: ${ethers.formatUnits(ccPrice, 6)} CCUSD/CC`);

        // 2. 检查CC代币精度
        const ccDecimals = await ccToken.decimals();
        console.log(`\n🪙 CC Token精度: ${ccDecimals}`);

        // 3. 模拟计算
        console.log(`\n🧮 支付计算模拟:`);
        const orderPrice = ethers.parseUnits("50", 6); // 50 CCUSD (6位精度)
        console.log(`   订单价格: ${orderPrice.toString()} wei (${ethers.formatUnits(orderPrice, 6)} CCUSD)`);

        // 计算需要的CC数量
        const ccAmount = (parseFloat(ethers.formatUnits(orderPrice, 6)) / parseFloat(ethers.formatEther(ccPrice))).toString();
        console.log(`   需要CC数量: ${ccAmount} CC`);

        const ccAmountWei = ethers.parseEther(ccAmount);
        console.log(`   CC数量(wei): ${ccAmountWei.toString()}`);

        // 按合约逻辑计算USD等值
        const usdEquivalent = (ccAmountWei * ccPrice) / ethers.parseEther("1");
        console.log(`   USD等值计算结果: ${usdEquivalent.toString()}`);
        console.log(`   USD等值(6位精度): ${ethers.formatUnits(usdEquivalent, 6)} CCUSD`);
        console.log(`   USD等值(18位精度): ${ethers.formatEther(usdEquivalent)} CCUSD`);

        // 4. 检查是否应该转换精度
        console.log(`\n🔬 精度分析:`);
        const expectedUSD = ethers.parseUnits("50", 6); // 期望的50 CCUSD
        console.log(`   期望USD等值: ${expectedUSD.toString()}`);
        console.log(`   实际USD等值: ${usdEquivalent.toString()}`);
        console.log(`   是否相等: ${expectedUSD.toString() === usdEquivalent.toString()}`);

        if (expectedUSD.toString() !== usdEquivalent.toString()) {
            const ratio = Number(usdEquivalent.toString()) / Number(expectedUSD.toString());
            console.log(`   比例差异: ${ratio}`);
        }

    } catch (error) {
        console.error("❌ 错误:", error.message);
    }
}

checkContractState()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });