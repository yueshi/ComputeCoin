const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProviderNFT", function () {
    let providerNFT;
    let ccToken;
    let owner, provider1, provider2, stakingPool;
    
    beforeEach(async function () {
        [owner, provider1, provider2, stakingPool] = await ethers.getSigners();
        
        // Deploy mock CC token
        const MockERC20 = await ethers.getContractFactory("MockUSDC");
        ccToken = await MockERC20.deploy();
        await ccToken.waitForDeployment();
        
        // Deploy ProviderNFT
        const ProviderNFT = await ethers.getContractFactory("ProviderNFT");
        providerNFT = await ProviderNFT.deploy(
            await ccToken.getAddress(), // ccusdToken
            await ccToken.getAddress()  // ccToken
        );
        await providerNFT.waitForDeployment();
        
        // Add ETH reserve to enable minting
        await ccToken.addReserve(ethers.ZeroAddress, ethers.parseEther("1000"), { 
            value: ethers.parseEther("1000") 
        });
        
        // Set staking pool address for authorization
        await providerNFT.setStakingPool(await stakingPool.getAddress());
        
        // Mint tokens to owner for testing
        await ccToken.mint(owner.address, ethers.parseUnits("100000", 6));
    });
    
    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await providerNFT.owner()).to.equal(owner.address);
        });
        
        it("Should have correct name and symbol", async function () {
            expect(await providerNFT.name()).to.equal("Provider NFT");
            expect(await providerNFT.symbol()).to.equal("PNFT");
        });
        
        it("Should initialize with correct tier bonuses", async function () {
            expect(await providerNFT.tierBonusMultipliers(1)).to.equal(10500); // BRONZE 1.05x
            expect(await providerNFT.tierBonusMultipliers(2)).to.equal(11200); // SILVER 1.12x
            expect(await providerNFT.tierBonusMultipliers(3)).to.equal(11800); // GOLD 1.18x
            expect(await providerNFT.tierBonusMultipliers(4)).to.equal(12500); // PLATINUM 1.25x
        });
        
        it("Should initialize with correct device requirements", async function () {
            expect(await providerNFT.tierDeviceRequirements(1)).to.equal(1);   // BRONZE
            expect(await providerNFT.tierDeviceRequirements(2)).to.equal(3);   // SILVER
            expect(await providerNFT.tierDeviceRequirements(3)).to.equal(5);   // GOLD
            expect(await providerNFT.tierDeviceRequirements(4)).to.equal(10);  // PLATINUM
        });
        
        it("Should initialize with correct security parameters", async function () {
            expect(await providerNFT.maxNFTsPerTier()).to.equal(5000);
            expect(await providerNFT.mintingPaused()).to.be.false;
        });
    });
    
    describe("mintNFT", function () {
        it("Should allow staking pool to mint NFT", async function () {
            const deviceCount = 10;
            
            await providerNFT.connect(stakingPool).mintNFT(
                provider1.address,
                1, // SILVER
                deviceCount
            );
            
            expect(await providerNFT.balanceOf(provider1.address)).to.equal(1);
            
            const nftData = await providerNFT.nftData(1);
            expect(nftData.tier).to.equal(1); // SILVER
            expect(nftData.isActive).to.be.true;
        });
        
        it("Should fail mintNFT from unauthorized address", async function () {
            await expect(
                providerNFT.connect(provider1).mintNFT(
                    provider1.address,
                    0, // BRONZE
                    5
                )
            ).to.be.revertedWith("Not authorized to mint");
        });
        
        it("Should fail if provider already has NFT", async function () {
            await providerNFT.connect(stakingPool).mintNFT(
                provider1.address,
                1, // BRONZE
                5
            );
            
            await expect(
                providerNFT.connect(stakingPool).mintNFT(
                    provider1.address,
                    2, // SILVER
                    10
                )
            ).to.be.revertedWith("Provider already has NFT");
        });
        
        it("Should emit correct events", async function () {
            const deviceCount = 25;
            
            await expect(providerNFT.connect(stakingPool).mintNFT(
                provider1.address,
                2, // GOLD
                deviceCount
            ))
                .to.emit(providerNFT, "Transfer")
                .withArgs(ethers.ZeroAddress, provider1.address, 1);
        });
    });
    
    describe("upgradeNFT", function () {
        beforeEach(async function () {
            await providerNFT.connect(stakingPool).mintNFT(
                provider1.address,
                1, // BRONZE
                5
            );
        });
        
        it("Should allow provider to upgrade NFT", async function () {
            const additionalDeviceCount = 20; // Total 25 for SILVER
            
            // Transfer CC tokens for upgrade cost from owner to provider1
            const upgradeCost = ethers.parseUnits("500", 6); // BRONZE to SILVER costs 500 USDC (6 decimals)
            await ccToken.transfer(provider1.address, upgradeCost);
            await ccToken.connect(provider1).approve(await providerNFT.getAddress(), upgradeCost);
            
            await providerNFT.connect(provider1).upgradeTier(1, 2, additionalDeviceCount); // Upgrade to SILVER
            
            const nftData = await providerNFT.nftData(1);
            expect(nftData.tier).to.equal(2); // SILVER
        });
        
        it("Should fail upgrade from non-owner", async function () {
            await expect(
                providerNFT.connect(provider2).upgradeTier(1, 1, 10)
            ).to.be.revertedWith("Not token owner");
        });
        
        it("Should fail upgrade to same tier", async function () {
            await expect(
                providerNFT.connect(provider1).upgradeTier(1, 0, 5)
            ).to.be.revertedWith("Not an upgrade");
        });
        
        it("Should fail upgrade to lower tier", async function () {
            await expect(
                providerNFT.connect(provider1).upgradeTier(1, 0, 1) // Try to downgrade
            ).to.be.revertedWith("Not an upgrade");
        });
    });
    
    describe("completeJob", function () {
        beforeEach(async function () {
            await providerNFT.connect(stakingPool).mintNFT(
                provider1.address,
                2, // SILVER
                5
            );
        });
        
        it("Should allow provider to record job completion", async function () {
            const reward = ethers.parseEther("100");
            const rating = 5;
            
            await providerNFT.connect(provider1).completeJob(1, reward, rating);
            
            const nftData = await providerNFT.nftData(1);
            expect(nftData.completedJobs).to.equal(1);
            expect(nftData.totalRewards).to.equal(reward);
            expect(nftData.performanceScore).to.be.gt(1000); // Base score is 1000
        });
        
        it("Should fail job completion from non-owner", async function () {
            await expect(
                providerNFT.connect(provider2).completeJob(1, ethers.parseEther("100"), 5)
            ).to.be.revertedWith("Not token owner");
        });
        
        it("Should fail with invalid rating", async function () {
            await expect(
                providerNFT.connect(provider1).completeJob(1, ethers.parseEther("100"), 6)
            ).to.be.revertedWith("Invalid rating");
        });
        
        it("Should emit JobCompleted event", async function () {
            const reward = ethers.parseEther("100");
            const rating = 4;
            
            await expect(providerNFT.connect(provider1).completeJob(1, reward, rating))
                .to.emit(providerNFT, "JobCompleted")
                .withArgs(1, reward, 1080); // (1000*9 + 1000 + 800)/10 = 1080
        });
    });
    
    describe("getProviderStats", function () {
        beforeEach(async function () {
            await providerNFT.connect(stakingPool).mintNFT(
                provider1.address,
                3, // GOLD
                5
            );
        });
        
        it("Should return correct provider statistics", async function () {
            const stats = await providerNFT.getProviderStats(provider1.address);
            
            expect(stats.tier).to.equal(3); // GOLD
            expect(stats.completedJobs).to.equal(0);
            expect(stats.totalRewards).to.equal(0);
            expect(stats.performanceScore).to.equal(1000); // Base score
        });
        
        it("Should return zero stats for non-existent provider", async function () {
            const stats = await providerNFT.getProviderStats(provider2.address);
            
            expect(stats.tier).to.equal(0); // NONE
            expect(stats.completedJobs).to.equal(0);
            expect(stats.totalRewards).to.equal(0);
            expect(stats.performanceScore).to.equal(0);
        });
    });
    
    describe("deactivateNFT", function () {
        beforeEach(async function () {
            await providerNFT.connect(stakingPool).mintNFT(
                provider1.address,
                1, // BRONZE
                5
            );
        });
        
        it("Should allow owner to deactivate NFT", async function () {
            await providerNFT.deactivateNFT(1);
            
            const nftData = await providerNFT.nftData(1);
            expect(nftData.isActive).to.be.false;
        });
        
        it("Should fail deactivate from non-owner", async function () {
            await expect(
                providerNFT.connect(provider1).deactivateNFT(1)
            ).to.be.revertedWithCustomError(providerNFT, "OwnableUnauthorizedAccount");
        });
    });
    
    describe("View functions", function () {
        beforeEach(async function () {
            await providerNFT.connect(stakingPool).mintNFT(
                provider1.address,
                2, // SILVER
                5
            );
        });
        
        it("Should return correct bonus multiplier", async function () {
            expect(await providerNFT.getBonusMultiplier(provider1.address)).to.equal(11200); // SILVER = 1.12x
        });
        
        it("Should return correct performance score", async function () {
            expect(await providerNFT.getPerformanceScore(provider1.address)).to.equal(1000); // Base score
        });
        
        it("Should return correct NFT info", async function () {
            const info = await providerNFT.getNFTInfo(1);
            expect(info.tier).to.equal(2); // SILVER
            expect(info.bonusMultiplier).to.equal(11200); // 1.12x
            expect(info.deviceRequirement).to.equal(3); // 3 devices
        });
        
        it("Should return correct provider statistics", async function () {
            const stats = await providerNFT.getProviderStats(provider1.address);
            expect(stats.tier).to.equal(2); // SILVER
            expect(stats.completedJobs).to.equal(0);
            expect(stats.totalRewards).to.equal(0);
            expect(stats.performanceScore).to.equal(1000);
        });
        
        it("Should return zero stats for non-existent provider", async function () {
            const stats = await providerNFT.getProviderStats(provider2.address);
            expect(stats.tier).to.equal(0); // NONE
            expect(stats.completedJobs).to.equal(0);
            expect(stats.totalRewards).to.equal(0);
            expect(stats.performanceScore).to.equal(0);
        });
        
        it("Should return available balance", async function () {
            const balance = await providerNFT.getAvailableBalance();
            expect(balance).to.equal(0); // Initially empty
        });
    });
    
    describe("Owner functions", function () {
        it("Should allow owner to set staking pool", async function () {
            await providerNFT.setStakingPool(provider2.address);
            expect(await providerNFT.stakingPool()).to.equal(provider2.address);
        });
        
        it("Should allow owner to set provider incentive", async function () {
            await providerNFT.setProviderIncentive(provider2.address);
            expect(await providerNFT.providerIncentive()).to.equal(provider2.address);
        });
        
        it("Should allow owner to update tier multipliers", async function () {
            await providerNFT.setTierBonusMultiplier(0, 10800); // BRONZE to 1.08x
            expect(await providerNFT.tierBonusMultipliers(0)).to.equal(10800);
        });
        
        it("Should allow owner to set minting paused", async function () {
            await providerNFT.setMintingPaused(true);
            expect(await providerNFT.mintingPaused()).to.be.true;
            
            await providerNFT.setMintingPaused(false);
            expect(await providerNFT.mintingPaused()).to.be.false;
        });
        
        it("Should allow owner to set max NFTs per tier", async function () {
            await providerNFT.setMaxNFTsPerTier(1000);
            expect(await providerNFT.maxNFTsPerTier()).to.equal(1000);
        });
        
        it("Should allow owner to emergency withdraw", async function () {
            // Transfer some tokens to contract first
            const transferAmount = ethers.parseEther("0.01");
            await ccToken.transfer(await providerNFT.getAddress(), transferAmount);
            
            const initialBalance = await ccToken.balanceOf(owner.address);
            await providerNFT.emergencyWithdraw(await ccToken.getAddress(), ethers.parseEther("0.005"));
            
            const finalBalance = await ccToken.balanceOf(owner.address);
            expect(finalBalance - initialBalance).to.equal(ethers.parseEther("0.005"));
        });
        
        it("Should fail owner functions from non-owner", async function () {
            await expect(
                providerNFT.connect(provider1).setStakingPool(provider2.address)
            ).to.be.revertedWithCustomError(providerNFT, "OwnableUnauthorizedAccount");
        });
    });
    
    describe("Edge cases", function () {
        it("Should handle maximum tier values", async function () {
            await providerNFT.connect(stakingPool).mintNFT(
                provider2.address, // Use provider2 since provider1 already has NFT
                4, // PLATINUM
                10
            );
            
            const stats = await providerNFT.getProviderStats(provider2.address);
            expect(stats.tier).to.equal(4);
            expect(await providerNFT.getBonusMultiplier(provider2.address)).to.equal(12500); // 1.25x
        });
        
        it("Should handle insufficient devices", async function () {
            await expect(
                providerNFT.connect(stakingPool).mintNFT(
                    provider2.address, // Use provider2 since provider1 already has NFT
                    3, // GOLD requires 5 devices
                    3 // Only 3 devices
                )
            ).to.be.revertedWith("Insufficient devices");
        });
        
        it("Should handle invalid tier values", async function () {
            await expect(
                providerNFT.connect(stakingPool).mintNFT(
                    provider1.address,
                    0, // NONE tier
                    1
                )
            ).to.be.revertedWith("Invalid tier");
        });
        
        it("Should fail when provider already has NFT", async function () {
            await providerNFT.connect(stakingPool).mintNFT(
                provider1.address,
                1, // BRONZE
                1
            );
            
            await expect(
                providerNFT.connect(stakingPool).mintNFT(
                    provider1.address,
                    2, // SILVER
                    3
                )
            ).to.be.revertedWith("Provider already has NFT");
        });
        
        it("Should handle paused minting", async function () {
            await providerNFT.setMintingPaused(true);
            
            await expect(
                providerNFT.connect(stakingPool).mintNFT(
                    provider2.address,
                    0, // BRONZE
                    1
                )
            ).to.be.revertedWith("Minting is paused");
        });
    });
});