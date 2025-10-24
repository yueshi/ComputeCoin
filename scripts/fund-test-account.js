// 为测试账户提供CC代币
const { ethers } = require("hardhat");

async function fundTestAccount() {
    console.log("💰 为测试账户提供CC代币...\n");

    const [owner, client] = await ethers.getSigners();

    const ccTokenAddress = "0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8";
    const CCToken = await ethers.getContractFactory("CCToken");
    const ccToken = CCToken.attach(ccTokenAddress);

    try {
        // 检查当前余额
        const ownerBalance = await ccToken.balanceOf(owner.address);
        const clientBalance = await ccToken.balanceOf(client.address);

        console.log(`👤 账户状态:`);
        console.log(`   Owner余额: ${ethers.formatEther(ownerBalance)} CC`);
        console.log(`   Client余额: ${ethers.formatEther(clientBalance)} CC`);

        // 转账1000 CC给客户
        const transferAmount = ethers.parseEther("1000");
        console.log(`\n💸 转账1000 CC给客户账户...`);

        const transferTx = await ccToken.transfer(client.address, transferAmount);
        await transferTx.wait();

        console.log(`   ✅ 转账成功`);

        // 再次检查余额
        const newClientBalance = await ccToken.balanceOf(client.address);
        console.log(`\n💰 转账后状态:`);
        console.log(`   Client新余额: ${ethers.formatEther(newClientBalance)} CC`);

    } catch (error) {
        console.error("❌ 转账失败:", error.message);
    }
}

fundTestAccount()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });