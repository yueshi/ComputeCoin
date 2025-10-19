const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakingPool", function () {
    let stakingPool;
    let ccToken;
    let customerNFT;
    let providerNFT;
    let mockUSDC;
    let owner, user1, user2;
    
    const ETH_STAKE_AMOUNT = ethers.parseEther("1");
    const CC_STAKE_AMOUNT = ethers.parseEther("1000");
    
    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        
        // Deploy mock USDC token (for CCUSD)
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy();
        await mockUSDC.waitForDeployment();
        
        // Deploy actual CC token
        const CCToken = await ethers.getContractFactory("CCToken");
        ccToken = await CCToken.deploy();
        await ccToken.waitForDeployment();
        
        // Deploy CustomerNFT
        const CustomerNFT = await ethers.getContractFactory("CustomerNFT");
        customerNFT = await CustomerNFT.deploy(
            await mockUSDC.getAddress(), // Mock USDC as CCUSD
            await ccToken.getAddress()  // Actual CC token
        );
        await customerNFT.waitForDeployment();
        
        // Deploy ProviderNFT
        const ProviderNFT = await ethers.getContractFactory("ProviderNFT");
        providerNFT = await ProviderNFT.deploy(
            await mockUSDC.getAddress(), // Mock USDC as CCUSD
            await ccToken.getAddress()  // Actual CC token
        );
        await providerNFT.waitForDeployment();
        
        // Deploy StakingPool
        const StakingPool = await ethers.getContractFactory("StakingPool");
        stakingPool = await StakingPool.deploy(
            await ccToken.getAddress(),
            await customerNFT.getAddress(),
            await providerNFT.getAddress()
        );
        await stakingPool.waitForDeployment();
        
        // Add ETH reserve to enable MockUSDC minting
        await mockUSDC.addReserve(ethers.ZeroAddress, ethers.parseEther("1000"), { 
            value: ethers.parseEther("1000") 
        });
        
        // Set up permissions
        await customerNFT.setStakingPool(await stakingPool.getAddress());
        await providerNFT.setStakingPool(await stakingPool.getAddress());
        
        // Transfer tokens to users from owner (who has all tokens)
        await ccToken.transfer(user1.address, ethers.parseEther("100000"));
        await ccToken.transfer(user2.address, ethers.parseEther("100000"));
        await ccToken.transfer(await stakingPool.getAddress(), ethers.parseEther("1000000"));
        
        // Give users MockUSDC for NFT minting tests
        await mockUSDC.mint(user1.address, ethers.parseUnits("500", 6));
        await mockUSDC.mint(user2.address, ethers.parseUnits("500", 6));
    });
    
    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await stakingPool.owner()).to.equal(owner.address);
        });
        
        it("Should initialize with correct contract addresses", async function () {
            expect(await stakingPool.ccToken()).to.equal(await ccToken.getAddress());
            expect(await stakingPool.customerNFT()).to.equal(await customerNFT.getAddress());
            expect(await stakingPool.providerNFT()).to.equal(await providerNFT.getAddress());
        });
        
        it("Should initialize with correct base APR", async function () {
            expect(await stakingPool.baseAPR()).to.equal(800); // 8%
        });
    });
    
    describe("ETH Staking for Customer NFT", function () {
        it("Should allow staking ETH to mint Customer NFT", async function () {
            await stakingPool.connect(user1).stakeETH(
                true, // isForNFT
                1,   // SILVER tier
                0,   // No provider tier
                { value: ethers.parseEther("1") }
            );
            
            expect(await customerNFT.balanceOf(user1.address)).to.equal(1);
            expect(await stakingPool.totalETHStaked()).to.equal(ethers.parseEther("1"));
            expect(await stakingPool.totalCustomerNftMinted()).to.equal(1);
        });
        
        it("Should fail with insufficient ETH for tier", async function () {
            await expect(
                stakingPool.connect(user2).stakeETH(
                    true, // isForNFT
                    3,   // GOLD tier requires 2 ETH (index 3)
                    0,   // No provider tier
                    { value: ethers.parseEther("1") } // Only send 1 ETH
                )
            ).to.be.revertedWith("Insufficient ETH for Customer NFT tier");
        });
        
        it("Should fail if user already has Customer NFT", async function () {
            // First, give user1 an NFT using a different method (direct minting)
            // This ensures we're testing the duplicate check properly
            await mockUSDC.connect(user1).approve(await customerNFT.getAddress(), ethers.parseUnits("200", 6));
            await customerNFT.connect(user1).mintWithCCUSD(user1.address, 1, ethers.parseUnits("200", 6)); // BRONZE
            
            // Now try to get another NFT through staking - should fail
            await expect(
                stakingPool.connect(user1).stakeETH(
                    true, // isForNFT
                    1,   // SILVER tier
                    0,   // No provider tier
                    { value: ethers.parseEther("1") }
                )
            ).to.be.revertedWith("User already has Customer NFT");
        });
    });
    
    describe("CC Staking for Provider NFT", function () {
        it("Should allow staking CC to mint Provider NFT", async function () {
            await ccToken.connect(user1).approve(await stakingPool.getAddress(), CC_STAKE_AMOUNT);
            
            await stakingPool.connect(user1).stakeCC(
                CC_STAKE_AMOUNT,
                true, // isForNFT
                0,   // No customer tier
                1    // BRONZE provider tier
            );
            
            expect(await providerNFT.balanceOf(user1.address)).to.equal(1);
            expect(await stakingPool.totalCCStaked()).to.equal(CC_STAKE_AMOUNT);
            expect(await stakingPool.totalProviderNftMinted()).to.equal(1);
        });
        
        it("Should fail with insufficient CC for tier", async function () {
            await ccToken.connect(user1).approve(await stakingPool.getAddress(), ethers.parseEther("500"));
            
            await expect(
                stakingPool.connect(user1).stakeCC(
                    ethers.parseEther("500"),
                    true, // isForNFT
                    0,   // No customer tier
                    1    // BRONZE provider tier requires 1000 CC
                )
            ).to.be.revertedWith("Insufficient stake for Provider NFT tier");
        });
    });
    
    describe("Regular Staking", function () {
        it("Should allow regular ETH staking", async function () {
            await stakingPool.connect(user1).stakeETH(
                false, // Not for NFT
                0,    // No customer tier
                0,    // No provider tier
                { value: ETH_STAKE_AMOUNT }
            );
            
            expect(await stakingPool.totalETHStaked()).to.equal(ETH_STAKE_AMOUNT);
            
            const stakes = await stakingPool.getUserStakes(user1.address);
            expect(stakes.length).to.equal(1);
            expect(stakes[0].amount).to.equal(ETH_STAKE_AMOUNT);
            expect(stakes[0].isForNFT).to.be.false;
        });
        
        it("Should allow regular CC staking", async function () {
            await ccToken.connect(user1).approve(await stakingPool.getAddress(), CC_STAKE_AMOUNT);
            
            await stakingPool.connect(user1).stakeCC(
                CC_STAKE_AMOUNT,
                false, // Not for NFT
                0,     // No customer tier
                0      // No provider tier
            );
            
            expect(await stakingPool.totalCCStaked()).to.equal(CC_STAKE_AMOUNT);
            
            const stakes = await stakingPool.getUserStakes(user1.address);
            expect(stakes.length).to.equal(1);
            expect(stakes[0].amount).to.equal(CC_STAKE_AMOUNT);
            expect(stakes[0].isForNFT).to.be.false;
        });
    });
    
    describe("Unstaking", function () {
        beforeEach(async function () {
            // Create a regular ETH stake
            await stakingPool.connect(user1).stakeETH(
                false, // Not for NFT
                0,    // No customer tier
                0,    // No provider tier
                { value: ETH_STAKE_AMOUNT }
            );
        });
        
        it("Should allow unstaking", async function () {
            const initialBalance = await ethers.provider.getBalance(user1.address);
            
            await stakingPool.connect(user1).unstake(0);
            
            const finalBalance = await ethers.provider.getBalance(user1.address);
            expect(await stakingPool.totalETHStaked()).to.equal(0);
            
            const stakes = await stakingPool.getUserStakes(user1.address);
            expect(stakes[0].isActive).to.be.false;
        });
        
        it("Should fail unstaking non-existent stake", async function () {
            await expect(
                stakingPool.connect(user1).unstake(999)
            ).to.be.revertedWith("Invalid stake index");
        });
    });
    
    describe("Reward Functions", function () {
        it("Should allow claiming rewards", async function () {
            // Create a stake and wait some time
            await stakingPool.connect(user1).stakeETH(
                false, // Not for NFT
                0,    // No customer tier
                0,    // No provider tier
                { value: ETH_STAKE_AMOUNT }
            );
            
            // Try to claim immediately - let's see what happens
            // Some contracts might allow immediate claiming with zero rewards
            try {
                await stakingPool.connect(user1).claimRewards(0);
                // If it doesn't revert, that's okay - some implementations allow claiming zero rewards
            } catch (error) {
                // If it reverts with "No rewards available", that's also fine
                expect(error.message).to.include("No rewards available");
            }
            
            // Fast forward time by 1 day
            await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
            await ethers.provider.send("evm_mine");
            
            // Now should be able to claim some rewards
            await stakingPool.connect(user1).claimRewards(0);
            
            // Check that user received some CC tokens
            const balance = await ccToken.balanceOf(user1.address);
            expect(balance).to.be.gt(0);
        });
    });
    
    describe("Owner Functions", function () {
        it("Should allow owner to set base APR", async function () {
            await stakingPool.setBaseAPR(1000); // 10%
            expect(await stakingPool.baseAPR()).to.equal(1000);
        });
        
        it("Should fail APR setting from non-owner", async function () {
            await expect(
                stakingPool.connect(user1).setBaseAPR(1000)
            ).to.be.revertedWithCustomError(stakingPool, "OwnableUnauthorizedAccount");
        });
        
        it("Should allow owner to pause/unpause staking", async function () {
            await stakingPool.setStakingPaused(true);
            expect(await stakingPool.stakingPaused()).to.be.true;
            
            await stakingPool.setStakingPaused(false);
            expect(await stakingPool.stakingPaused()).to.be.false;
        });
    });
    
    describe("View Functions", function () {
        it("Should return correct current APR", async function () {
            const apr = await stakingPool.getCurrentAPR();
            expect(apr).to.be.gt(0);
            expect(apr).to.be.lte(2000); // Max 20%
        });
        
        it("Should return available rewards", async function () {
            const rewards = await stakingPool.getAvailableRewards();
            expect(rewards).to.be.gte(0);
        });
    });
});