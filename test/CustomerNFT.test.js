const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CustomerNFT", function () {
    let customerNFT;
    let mockUSDCToken;
    let mockCCToken;
    let mockRewardToken;
    let owner;
    let user1;
    let user2;
    let stakingPool;
    
    const TEST_AMOUNT = ethers.parseUnits("100000", 6); // 100k USDC (6 decimals)
    
    beforeEach(async function () {
        [owner, user1, user2, stakingPool] = await ethers.getSigners();
        
        // Deploy mock tokens
        const MockERC20 = await ethers.getContractFactory("MockUSDC");
        mockUSDCToken = await MockERC20.deploy();
        await mockUSDCToken.waitForDeployment();
        
        mockCCToken = await MockERC20.deploy();
        await mockCCToken.waitForDeployment();
        
        mockRewardToken = await MockERC20.deploy();
        await mockRewardToken.waitForDeployment();
        
        // Deploy CustomerNFT
        const CustomerNFT = await ethers.getContractFactory("CustomerNFT");
        customerNFT = await CustomerNFT.deploy(
            await mockUSDCToken.getAddress(),
            await mockCCToken.getAddress()
        );
        await customerNFT.waitForDeployment();
        
        // Set staking pool
        await customerNFT.setStakingPool(stakingPool.address);
        
        // Add ETH reserve to MockUSDC to enable minting
        await mockUSDCToken.addReserve(ethers.ZeroAddress, ethers.parseEther("1000"), { 
            value: ethers.parseEther("1000") 
        });
        
        // Mint tokens to users
        await mockUSDCToken.mint(user1.address, TEST_AMOUNT);
        await mockCCToken.mint(user1.address, TEST_AMOUNT);
        await mockRewardToken.mint(await customerNFT.getAddress(), TEST_AMOUNT);
    });
    
    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await customerNFT.owner()).to.equal(owner.address);
        });
        
        it("Should have correct name and symbol", async function () {
            expect(await customerNFT.name()).to.equal("Customer NFT");
            expect(await customerNFT.symbol()).to.equal("CUSTNFT");
        });
        
        it("Should initialize with correct tier discounts", async function () {
            expect(await customerNFT.tierDiscounts(0)).to.equal(500);   // BRONZE 5%
            expect(await customerNFT.tierDiscounts(1)).to.equal(800);   // SILVER 8%
            expect(await customerNFT.tierDiscounts(2)).to.equal(1200);  // GOLD 12%
            expect(await customerNFT.tierDiscounts(3)).to.equal(1500);  // PLATINUM 15%
        });
        
        it("Should initialize with correct monthly rewards", async function () {
            expect(await customerNFT.tierMonthlyRewards(0)).to.equal(ethers.parseEther("200"));   // BRONZE
            expect(await customerNFT.tierMonthlyRewards(1)).to.equal(ethers.parseEther("500"));   // SILVER
            expect(await customerNFT.tierMonthlyRewards(2)).to.equal(ethers.parseEther("1200"));  // GOLD
            expect(await customerNFT.tierMonthlyRewards(3)).to.equal(ethers.parseEther("3000"));  // PLATINUM
        });
        
        it("Should initialize with correct stake requirements", async function () {
            // ETH requirements
            expect(await customerNFT.ethStakeRequirements(0)).to.equal(ethers.parseEther("0.1"));  // BRONZE
            expect(await customerNFT.ethStakeRequirements(1)).to.equal(ethers.parseEther("0.5"));  // SILVER
            expect(await customerNFT.ethStakeRequirements(2)).to.equal(ethers.parseEther("2.0"));  // GOLD
            expect(await customerNFT.ethStakeRequirements(3)).to.equal(ethers.parseEther("5.0"));  // PLATINUM
            
            // CC requirements
            expect(await customerNFT.ccStakeRequirements(0)).to.equal(ethers.parseEther("100"));   // BRONZE
            expect(await customerNFT.ccStakeRequirements(1)).to.equal(ethers.parseEther("500"));   // SILVER
            expect(await customerNFT.ccStakeRequirements(2)).to.equal(ethers.parseEther("2000"));  // GOLD
            expect(await customerNFT.ccStakeRequirements(3)).to.equal(ethers.parseEther("5000"));  // PLATINUM
        });
    });
    
    describe("mintFromStake", function () {
        it("Should allow staking pool to mint NFT with stake", async function () {
            const ethAmount = ethers.parseEther("1");
            const ccAmount = ethers.parseEther("1000");
            const paymentAmount = ethers.parseEther("100");
            
            await customerNFT.connect(stakingPool).mintFromStake(
                user1.address,
                1, // SILVER
                ethAmount,
                ccAmount,
                paymentAmount
            );
            
            expect(await customerNFT.balanceOf(user1.address)).to.equal(1);
            expect(await customerNFT.getUserNFT(user1.address)).to.equal(1);
            expect(await customerNFT.hasNFT(user1.address)).to.be.true;
            
            const nftData = await customerNFT.nftData(1);
            expect(nftData.tier).to.equal(1); // SILVER
            expect(nftData.isActive).to.be.true;
            
            const stakeInfo = await customerNFT.nftStakeInfo(1);
            expect(stakeInfo.owner).to.equal(user1.address);
            expect(stakeInfo.ethAmount).to.equal(ethAmount);
            expect(stakeInfo.ccAmount).to.equal(ccAmount);
            expect(stakeInfo.isActive).to.be.true;
            
            expect(await customerNFT.totalETHStaked()).to.equal(ethAmount);
            expect(await customerNFT.totalCCStaked()).to.equal(ccAmount);
        });
        
        it("Should fail mintFromStake from unauthorized address", async function () {
            await expect(
                customerNFT.connect(user1).mintFromStake(
                    user2.address,
                    0, // BRONZE
                    0,
                    0,
                    0
                )
            ).to.be.revertedWith("Not authorized: only StakingPool can call");
        });
        
        it("Should fail mintFromStake for user who already has NFT", async function () {
            // Mint first NFT
            await customerNFT.connect(stakingPool).mintFromStake(
                user1.address,
                0, // BRONZE
                0,
                0,
                0
            );
            
            // Try to mint second NFT
            await expect(
                customerNFT.connect(stakingPool).mintFromStake(
                    user1.address,
                    1, // SILVER
                    0,
                    0,
                    0
                )
            ).to.be.revertedWith("User already has NFT");
        });
        
        it("Should emit correct events", async function () {
            const ethAmount = ethers.parseEther("0.5");
            const ccAmount = ethers.parseEther("500");
            const paymentAmount = ethers.parseEther("50");
            
            await expect(customerNFT.connect(stakingPool).mintFromStake(
                user1.address,
                1, // SILVER
                ethAmount,
                ccAmount,
                paymentAmount
            ))
                .to.emit(customerNFT, "CustomerNFTMinted")
                .withArgs(1, user1.address, 1, paymentAmount, ccAmount)
                .to.emit(customerNFT, "NFTStaked")
                .withArgs(1, user1.address, ethAmount, ccAmount);
        });
    });
    
    describe("mintDirect", function () {
        it("Should allow owner to mint NFT directly", async function () {
            const paymentAmount = ethers.parseEther("100");
            const ccAmount = ethers.parseEther("1000");
            
            await customerNFT.mintDirect(
                user1.address,
                2, // GOLD
                paymentAmount,
                ccAmount
            );
            
            expect(await customerNFT.balanceOf(user1.address)).to.equal(1);
            expect(await customerNFT.getUserNFT(user1.address)).to.equal(1);
            
            const nftData = await customerNFT.nftData(1);
            expect(nftData.tier).to.equal(2); // GOLD
            expect(nftData.ccusdAmount).to.equal(paymentAmount);
            expect(nftData.ccAmount).to.equal(ccAmount);
            
            const stakeInfo = await customerNFT.nftStakeInfo(1);
            expect(stakeInfo.isActive).to.be.false; // Direct mint has no stake rewards
        });
        
        it("Should fail mintDirect from non-owner", async function () {
            await expect(
                customerNFT.connect(user1).mintDirect(
                    user2.address,
                    0, // BRONZE
                    ethers.parseEther("100"),
                    0
                )
            ).to.be.revertedWithCustomError(customerNFT, "OwnableUnauthorizedAccount");
        });
        
        it("Should fail mintDirect without payment", async function () {
            await expect(
                customerNFT.mintDirect(
                    user1.address,
                    0, // BRONZE
                    0,
                    0
                )
            ).to.be.revertedWith("Payment required");
        });
    });
    
    describe("burnNFT", function () {
        beforeEach(async function () {
            // Mint an NFT first
            await customerNFT.connect(stakingPool).mintFromStake(
                user1.address,
                1, // SILVER
                ethers.parseEther("1"),
                ethers.parseEther("1000"),
                0
            );
        });
        
        it("Should allow NFT owner to burn their NFT", async function () {
            await customerNFT.connect(user1).burnNFT(1);
            
            expect(await customerNFT.balanceOf(user1.address)).to.equal(0);
            expect(await customerNFT.hasNFT(user1.address)).to.be.false;
            expect(await customerNFT.ownerOf(1)).to.be.reverted; // NFT no longer exists
        });
        
        it("Should update stake status when NFT is burned", async function () {
            await customerNFT.connect(user1).burnNFT(1);
            
            const stakeInfo = await customerNFT.nftStakeInfo(1);
            expect(stakeInfo.isActive).to.be.false;
        });
        
        it("Should fail burnNFT from non-owner", async function () {
            await expect(
                customerNFT.connect(user2).burnNFT(1)
            ).to.be.revertedWith("Not NFT owner");
        });
        
        it("Should emit correct events", async function () {
            await expect(customerNFT.connect(user1).burnNFT(1))
                .to.emit(customerNFT, "CustomerNFTBurned")
                .withArgs(1, user1.address)
                .to.emit(customerNFT, "NFTUnstaked")
                .withArgs(1, user1.address, ethers.parseEther("1"), ethers.parseEther("1000"));
        });
    });
    
    describe("withdrawStake", function () {
        const ethAmount = ethers.parseEther("1");
        const ccAmount = ethers.parseEther("1000");
        
        beforeEach(async function () {
            // Mint and burn NFT to enable stake withdrawal
            await customerNFT.connect(stakingPool).mintFromStake(
                user1.address,
                1, // SILVER
                ethAmount,
                ccAmount,
                0
            );
            
            // Send ETH to contract for withdrawal
            await owner.sendTransaction({
                to: await customerNFT.getAddress(),
                value: ethAmount
            });
            
            await customerNFT.connect(user1).burnNFT(1);
        });
        
        it("Should allow stake withdrawal after NFT is burned", async function () {
            const initialBalance = await ethers.provider.getBalance(user1.address);
            
            await customerNFT.connect(user1).withdrawStake(1);
            
            const finalBalance = await ethers.provider.getBalance(user1.address);
            // Should receive ETH back (approximately, accounting for gas)
            expect(finalBalance - initialBalance).to.be.closeTo(ethAmount, ethers.parseEther("0.01"));
            
            expect(await mockCCToken.balanceOf(user1.address)).to.equal(ccAmount);
            expect(await customerNFT.totalETHStaked()).to.equal(0);
            expect(await customerNFT.totalCCStaked()).to.equal(0);
        });
        
        it("Should fail withdrawStake while NFT is still active", async function () {
            // Mint new NFT
            await customerNFT.connect(stakingPool).mintFromStake(
                user2.address,
                0, // BRONZE
                0,
                ethers.parseEther("100"),
                0
            );
            
            await expect(
                customerNFT.connect(user2).withdrawStake(2)
            ).to.be.revertedWith("NFT still active, burn first");
        });
        
        it("Should fail withdrawStake from non-owner", async function () {
            await expect(
                customerNFT.connect(user2).withdrawStake(1)
            ).to.be.revertedWith("Not stake owner");
        });
    });
    
    describe("claimRewards", function () {
        beforeEach(async function () {
            await customerNFT.connect(stakingPool).mintFromStake(
                user1.address,
                1, // SILVER
                ethers.parseEther("1"),
                ethers.parseEther("1000"),
                0
            );
        });
        
        it("Should allow claiming rewards for active stake", async function () {
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
            await ethers.provider.send("evm_mine");
            
            const initialBalance = await mockRewardToken.balanceOf(user1.address);
            
            await customerNFT.connect(user1).claimRewards(1);
            
            const finalBalance = await mockRewardToken.balanceOf(user1.address);
            expect(finalBalance - initialBalance).to.be.gt(0);
        });
        
        it("Should fail claimRewards for inactive stake", async function () {
            await customerNFT.connect(user1).burnNFT(1);
            
            await expect(
                customerNFT.connect(user1).claimRewards(1)
            ).to.be.revertedWith("Stake not active for rewards");
        });
        
        it("Should fail claimRewards from non-owner", async function () {
            await expect(
                customerNFT.connect(user2).claimRewards(1)
            ).to.be.revertedWith("Not NFT owner");
        });
    });
    
    describe("View functions", function () {
        beforeEach(async function () {
            await customerNFT.connect(stakingPool).mintFromStake(
                user1.address,
                2, // GOLD
                ethers.parseEther("1"),
                ethers.parseEther("1000"),
                0
            );
        });
        
        it("Should return correct discount for tier", async function () {
            expect(await customerNFT.getDiscount(1)).to.equal(1200); // GOLD = 12%
        });
        
        it("Should return correct monthly reward for tier", async function () {
            expect(await customerNFT.getMonthlyReward(1)).to.equal(ethers.parseEther("1200")); // GOLD
        });
        
        it("Should return correct tier for NFT", async function () {
            expect(await customerNFT.getTier(1)).to.equal(2); // GOLD
        });
        
        it("Should return correct tier multiplier", async function () {
            expect(await customerNFT.getTierMultiplier(0)).to.equal(10000); // BRONZE = 1.0x
            expect(await customerNFT.getTierMultiplier(1)).to.equal(12000); // SILVER = 1.2x
            expect(await customerNFT.getTierMultiplier(2)).to.equal(15000); // GOLD = 1.5x
            expect(await customerNFT.getTierMultiplier(3)).to.equal(20000); // PLATINUM = 2.0x
        });
        
        it("Should return correct stake requirements", async function () {
            const [ethReq, ccReq] = await customerNFT.getStakeRequirements(2); // GOLD
            expect(ethReq).to.equal(ethers.parseEther("2.0"));
            expect(ccReq).to.equal(ethers.parseEther("2000"));
        });
    });
    
    describe("calculateRewards", function () {
        beforeEach(async function () {
            await customerNFT.connect(stakingPool).mintFromStake(
                user1.address,
                1, // SILVER
                ethers.parseEther("1"),
                ethers.parseEther("1000"),
                0
            );
        });
        
        it("Should calculate rewards based on time and tier", async function () {
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
            await ethers.provider.send("evm_mine");
            
            const rewards = await customerNFT.calculateRewards(1);
            expect(rewards).to.be.gt(0);
        });
        
        it("Should return 0 for inactive stake", async function () {
            await customerNFT.connect(user1).burnNFT(1);
            
            const rewards = await customerNFT.calculateRewards(1);
            expect(rewards).to.equal(0);
        });
        
        it("Should return 0 for non-existent NFT", async function () {
            await expect(
                customerNFT.calculateRewards(999)
            ).to.be.revertedWith("NFT does not exist");
        });
    });
    
    describe("Owner functions", function () {
        it("Should allow owner to set payment receiver", async function () {
            await customerNFT.setPaymentReceiver(user2.address);
            expect(await customerNFT.paymentReceiver()).to.equal(user2.address);
        });
        
        it("Should allow owner to update token addresses", async function () {
            await customerNFT.setTokenAddresses(
                user1.address,
                user2.address,
                stakingPool.address
            );
            
            expect(await customerNFT.ccusdToken()).to.equal(user1.address);
            expect(await customerNFT.ccToken()).to.equal(user2.address);
            expect(await customerNFT.rewardToken()).to.equal(stakingPool.address);
        });
        
        it("Should allow owner to update stake requirements", async function () {
            await customerNFT.updateStakeRequirements(
                0, // BRONZE
                ethers.parseEther("0.2"),
                ethers.parseEther("200")
            );
            
            const [ethReq, ccReq] = await customerNFT.getStakeRequirements(0);
            expect(ethReq).to.equal(ethers.parseEther("0.2"));
            expect(ccReq).to.equal(ethers.parseEther("200"));
        });
        
        it("Should fail owner functions from non-owner", async function () {
            await expect(
                customerNFT.connect(user1).setPaymentReceiver(user2.address)
            ).to.be.revertedWithCustomError(customerNFT, "OwnableUnauthorizedAccount");
        });
    });
    
    describe("Edge cases", function () {
        it("Should handle maximum tier values", async function () {
            await customerNFT.connect(stakingPool).mintFromStake(
                user1.address,
                3, // PLATINUM
                ethers.parseEther("10"),
                ethers.parseEther("10000"),
                0
            );
            
            expect(await customerNFT.getTier(1)).to.equal(3);
            expect(await customerNFT.getDiscount(1)).to.equal(1500); // 15%
            expect(await customerNFT.getMonthlyReward(1)).to.equal(ethers.parseEther("3000"));
        });
        
        it("Should fail with invalid tier", async function () {
            await expect(
                customerNFT.connect(stakingPool).mintFromStake(
                    user1.address,
                    4, // Invalid tier
                    0,
                    0,
                    0
                )
            ).to.be.revertedWith("Invalid tier");
        });
        
        it("Should handle zero address validation", async function () {
            await expect(
                customerNFT.connect(stakingPool).mintFromStake(
                    ethers.ZeroAddress,
                    0, // BRONZE
                    0,
                    0,
                    0
                )
            ).to.be.revertedWith("Invalid user address");
        });
    });
});