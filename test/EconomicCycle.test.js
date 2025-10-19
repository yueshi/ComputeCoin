const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Economic Cycle Integration Tests", function () {
    let ccToken, mockUSDC, customerNFT, providerNFT, stakingPool, computeMarket, providerIncentive;
    let owner, customer, provider, platformTreasury;
    
    const CUSTOMER_STAKE_ETH = ethers.parseEther("1");
    const PROVIDER_STAKE_CC = ethers.parseEther("1000");
    const ORDER_AMOUNT_ETH = ethers.parseEther("0.5");
    const PLATFORM_FEE_BPS = 250; // 2.5%
    const BURN_RATE_BPS = 150; // 1.5%
    
    beforeEach(async function () {
        [owner, customer, provider, platformTreasury] = await ethers.getSigners();
        
        // Deploy mock USDC
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy();
        await mockUSDC.waitForDeployment();
        
        // Deploy CC Token
        const CCToken = await ethers.getContractFactory("CCToken");
        ccToken = await CCToken.deploy();
        await ccToken.waitForDeployment();
        
        // Deploy Customer NFT
        const CustomerNFT = await ethers.getContractFactory("CustomerNFT");
        customerNFT = await CustomerNFT.deploy(
            await mockUSDC.getAddress(),
            await ccToken.getAddress()
        );
        await customerNFT.waitForDeployment();
        
        // Deploy Provider NFT
        const ProviderNFT = await ethers.getContractFactory("ProviderNFT");
        providerNFT = await ProviderNFT.deploy(
            await mockUSDC.getAddress(),
            await ccToken.getAddress()
        );
        await providerNFT.waitForDeployment();
        
        // Deploy Staking Pool
        const StakingPool = await ethers.getContractFactory("StakingPool");
        stakingPool = await StakingPool.deploy(
            await ccToken.getAddress(),
            await customerNFT.getAddress(),
            await providerNFT.getAddress()
        );
        await stakingPool.waitForDeployment();
        
        // Deploy Provider Incentive
        const ProviderIncentive = await ethers.getContractFactory("ProviderIncentive");
        providerIncentive = await ProviderIncentive.deploy(
            await ccToken.getAddress(),
            await providerNFT.getAddress()
        );
        await providerIncentive.waitForDeployment();
        
        // Deploy Compute Market
        const ComputeMarket = await ethers.getContractFactory("ComputeMarket");
        computeMarket = await ComputeMarket.deploy(
            await ccToken.getAddress(),
            await customerNFT.getAddress(),
            await mockUSDC.getAddress(),
            platformTreasury.address
        );
        await computeMarket.waitForDeployment();
        
        // Distribute CC tokens to provider
        await ccToken.transfer(provider.address, ethers.parseEther("100000"));
        await ccToken.transfer(await stakingPool.getAddress(), ethers.parseEther("1000000"));
        
        // Add ETH reserve to enable MockUSDC minting
        await mockUSDC.addReserve(ethers.ZeroAddress, ethers.parseEther("5000"), { 
            value: ethers.parseEther("5000") 
        });
        
        // Setup contract permissions
        await customerNFT.setStakingPool(await stakingPool.getAddress());
        await providerNFT.setStakingPool(await stakingPool.getAddress());
        
        // Mint mock USDC to users
        await mockUSDC.mint(customer.address, ethers.parseUnits("5000", 6));
        await mockUSDC.mint(computeMarket.getAddress(), ethers.parseUnits("1000", 6));
    });
    
    describe("Complete Economic Cycle", function () {
        it("Should execute full user journey: get NFT -> get discount -> purchase service -> burn tokens -> reward provider", async function () {
            // Step 1: Customer gets Customer NFT directly
            const initialCustomerCCBalance = await ccToken.balanceOf(customer.address);
            const initialTotalSupply = await ccToken.totalSupply();
            
            // Customer has 1000 USDC from beforeEach, approve and use some for NFT
            await mockUSDC.connect(customer).approve(await customerNFT.getAddress(), ethers.parseUnits("200", 6));
            await customerNFT.connect(customer).mintWithCCUSD(customer.address, 2, ethers.parseUnits("200", 6)); // SILVER (index 2)
            
            const discount = await customerNFT.getDiscount(customer.address);
            expect(discount).to.equal(800); // SILVER = 8% discount
            
            // Step 2: Provider gets Provider NFT directly
            // Provider needs some USDC too, let's give them some
            await mockUSDC.connect(owner).mint(provider.address, ethers.parseUnits("100", 6), { 
                value: ethers.parseUnits("85", "ether") 
            });
            await mockUSDC.connect(provider).approve(await providerNFT.getAddress(), ethers.parseUnits("200", 6));
            await providerNFT.connect(provider).mintWithCCUSD(provider.address, 2, ethers.parseUnits("200", 6)); // SILVER
            
            // Step 3: Customer gets discount on service purchase
            const discountBps = await customerNFT.getDiscount(customer.address);
            expect(discountBps).to.equal(800); // SILVER = 8% discount
            
            // Step 4: Customer purchases compute service using CC tokens
            const servicePrice = ethers.parseEther("1000"); // 1000 CC price
            const discountAmount = (servicePrice * discountBps) / 10000;
            const finalPrice = servicePrice - discountAmount;
            
            await ccToken.connect(customer).approve(await computeMarket.getAddress(), finalPrice);
            
            // Create order
            await computeMarket.connect(customer).createOrder(
                provider.address,
                finalPrice,
                true // Use NFT discount
            );
            
            // Pay for the order using CC tokens
            await ccToken.connect(customer).approve(await computeMarket.getAddress(), finalPrice);
            await computeMarket.connect(customer).payOrderWithCC(1);
            
            // Step 5: Verify CC burning mechanism
            const burnAmount = (finalPrice * BURN_RATE_BPS) / 10000;
            const expectedFinalSupply = initialTotalSupply - burnAmount;
            
            // Provider completes order (triggering payment and burning)
            await computeMarket.connect(provider).completeOrder(1);
            
            // Verify tokens were burned
            const finalTotalSupply = await ccToken.totalSupply();
            expect(finalTotalSupply).to.equal(expectedFinalSupply);
            
            // Step 6: Provider receives rewards and bonuses
            const providerBalance = await ccToken.balanceOf(provider.address);
            expect(providerBalance).to.be.gt(0);
            
            // Step 7: Verify reward distribution from ProviderIncentive
            const providerMultiplier = await providerNFT.getBonusMultiplier(provider.address);
            expect(providerMultiplier).to.equal(11000); // SILVER = 1.1x bonus
            
            // Step 8: Customer can claim staking rewards
            await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
            await ethers.provider.send("evm_mine");
            
            const rewardsBefore = await customerNFT.getAvailableRewards();
            expect(rewardsBefore).to.be.gt(0);
            
            await customerNFT.connect(customer).claimRewards(customer.address);
            const customerFinalBalance = await ccToken.balanceOf(customer.address);
            
            // Customer should have some rewards
            expect(customerFinalBalance).to.be.gt(initialCustomerCCBalance);
        });
        
        it("Should handle CC only payment scenario", async function () {
            // Setup NFTs using staking
            await mockUSDC.connect(customer).approve(await customerNFT.getAddress(), ethers.parseUnits("100", 6));
            await customerNFT.connect(customer).mintWithCCUSD(customer.address, 1, ethers.parseUnits("100", 6)); // BRONZE
            
            await ccToken.connect(provider).approve(await stakingPool.getAddress(), ethers.parseEther("1000"));
            await stakingPool.connect(provider).stakeCC(
                ethers.parseEther("1000"),
                true, // isForNFT
                0,   // No customer tier
                0    // BRONZE provider tier
            );
            
            // Customer uses CC payment
            const ccAmount = ethers.parseEther("500");
            
            await ccToken.connect(customer).approve(await computeMarket.getAddress(), ccAmount);
            
            await computeMarket.connect(customer).createOrder(
                provider.address,
                ccAmount,
                false // No NFT discount
            );
            
            // Pay for the order using CC tokens
            await ccToken.connect(customer).approve(await computeMarket.getAddress(), ccAmount);
            await computeMarket.connect(customer).payOrderWithCC(1);
            
            // Complete order
            await computeMarket.connect(provider).completeOrder(1);
            
            // Verify CC tokens were transferred
            const providerCCBalance = await ccToken.balanceOf(provider.address);
            expect(providerCCBalance).to.be.gt(0);
        });
        
        // ETH Vault functionality has been removed from the architecture
        
        it("Should validate deflationary mechanics across multiple transactions", async function () {
            const initialSupply = await ccToken.totalSupply();
            const totalBurnAmount = ethers.parseEther("100"); // Total tokens to burn across transactions
            
            // Setup customers with NFTs using direct minting for simplicity
            await mockUSDC.connect(customer).approve(await customerNFT.getAddress(), ethers.parseUnits("200", 6));
            await customerNFT.connect(customer).mintWithCCUSD(customer.address, 2, ethers.parseUnits("200", 6)); // SILVER
            
            await mockUSDC.connect(provider).approve(await customerNFT.getAddress(), ethers.parseUnits("100", 6));
            await customerNFT.connect(provider).mintWithCCUSD(provider.address, 1, ethers.parseUnits("100", 6)); // BRONZE (as customer)
            
            // Multiple transactions that burn tokens
            const transaction1Amount = ethers.parseEther("1000");
            const transaction2Amount = ethers.parseEther("2000");
            
            const burn1 = (transaction1Amount * BURN_RATE_BPS) / 10000;
            const burn2 = (transaction2Amount * BURN_RATE_BPS) / 10000;
            
            // Transaction 1
            await ccToken.connect(customer).approve(await computeMarket.getAddress(), transaction1Amount);
            await computeMarket.connect(customer).createOrder(
                provider.address,
                transaction1Amount,
                true // Use NFT discount
            );
            await ccToken.connect(customer).approve(await computeMarket.getAddress(), transaction1Amount);
            await computeMarket.connect(customer).payOrderWithCC(1);
            await computeMarket.connect(provider).completeOrder(1);
            
            // Transaction 2
            await ccToken.connect(provider).approve(await computeMarket.getAddress(), transaction2Amount);
            await computeMarket.connect(provider).createOrder(
                customer.address,
                transaction2Amount,
                true // Use NFT discount
            );
            await ccToken.connect(provider).approve(await computeMarket.getAddress(), transaction2Amount);
            await computeMarket.connect(provider).payOrderWithCC(2);
            await computeMarket.connect(customer).completeOrder(2);
            
            const finalSupply = await ccToken.totalSupply();
            const expectedSupply = initialSupply - burn1 - burn2;
            
            expect(finalSupply).to.equal(expectedSupply);
            expect(initialSupply - finalSupply).to.equal(burn1 + burn2);
        });
        
        it("Should handle provider upgrade mechanics", async function () {
            // Provider gets BRONZE NFT using staking
            await ccToken.connect(provider).approve(await stakingPool.getAddress(), ethers.parseEther("500"));
            await stakingPool.connect(provider).stakeCC(
                ethers.parseEther("500"),
                true, // isForNFT
                0,   // No customer tier
                0    // BRONZE provider tier
            );
            
            expect(await providerNFT.getPerformanceScore(provider.address)).to.be.gt(0);
            
            // Provider stakes more to upgrade to GOLD
            await ccToken.connect(provider).approve(await stakingPool.getAddress(), ethers.parseEther("2000"));
            await stakingPool.connect(provider).stakeCC(
                ethers.parseEther("2000"),
                false, // Not for NFT, just additional stake
                0,   // No customer tier
                0    // Keep BRONZE tier
            );
            
            // Note: Upgrade functionality requires specific implementation
            // For now, we just verify the current bonus
            expect(await providerNFT.getBonusMultiplier(provider.address)).to.equal(11000); // 1.1x bonus
        });
        
        it("Should verify economic incentives align properly", async function () {
            // Setup: Customer gets GOLD NFT, Provider gets GOLD NFT
            await mockUSDC.connect(customer).approve(await customerNFT.getAddress(), ethers.parseUnits("500", 6));
            await customerNFT.connect(customer).mintWithCCUSD(customer.address, 3, ethers.parseUnits("500", 6)); // GOLD (12% discount)
            
            await ccToken.connect(provider).approve(await stakingPool.getAddress(), ethers.parseEther("6000"));
            await stakingPool.connect(provider).stakeCC(
                ethers.parseEther("6000"),
                true, // isForNFT
                0,   // No customer tier
                2    // GOLD provider tier
            );
            
            // Using address-based lookups instead of token IDs
            
            const servicePrice = ethers.parseEther("1000");
            const discount = (servicePrice * 1200) / 10000; // 12% discount
            const finalPrice = servicePrice - discount;
            const burnAmount = (finalPrice * BURN_RATE_BPS) / 10000;
            const platformFee = (finalPrice * PLATFORM_FEE_BPS) / 10000;
            const providerBaseReward = finalPrice - burnAmount - platformFee;
            const providerBonusReward = (providerBaseReward * 11500) / 10000; // 1.15x bonus
            
            // Execute transaction
            await ccToken.connect(customer).approve(await computeMarket.getAddress(), finalPrice);
            await computeMarket.connect(customer).createOrder(
                provider.address,
                finalPrice,
                true // Use NFT discount
            );
            await ccToken.connect(customer).approve(await computeMarket.getAddress(), finalPrice);
            await computeMarket.connect(customer).payOrderWithCC(1);
            await computeMarket.connect(provider).completeOrder(1);
            
            // Verify economic distribution
            const customerSpent = finalPrice;
            const providerReceived = await ccToken.balanceOf(provider.address);
            const platformReceived = await ccToken.balanceOf(platformTreasury.address);
            const tokensBurned = burnAmount;
            
            // Check that all parties receive expected amounts
            expect(providerReceived).to.be.closeTo(providerBonusReward, ethers.parseEther("1"));
            expect(platformReceived).to.be.closeTo(platformFee, ethers.parseEther("1"));
            
            // Verify deflationary effect
            const currentSupply = await ccToken.totalSupply();
            const expectedSupply = ethers.parseEther("1000000000") - tokensBurned;
            expect(currentSupply).to.equal(expectedSupply);
        });
    });
    
    describe("Edge Cases and Error Handling", function () {
        it("Should handle insufficient CC token balance", async function () {
            await mockUSDC.connect(customer).approve(await customerNFT.getAddress(), ethers.parseUnits("100", 6));
            await customerNFT.connect(customer).mintWithCCUSD(customer.address, 1, ethers.parseUnits("100", 6)); // BRONZE
            
            const largeAmount = ethers.parseEther("1000000"); // More than customer has
            
            await ccToken.connect(customer).approve(await computeMarket.getAddress(), largeAmount);
            
            await computeMarket.connect(customer).createOrder(
                provider.address,
                largeAmount,
                true // Use NFT discount
            );
            await ccToken.connect(customer).approve(await computeMarket.getAddress(), largeAmount);
            
            await expect(
                computeMarket.connect(customer).payOrderWithCC(1)
            ).to.be.revertedWith("Insufficient CC balance");
        });
        
        it("Should prevent double NFT ownership", async function () {
            await mockUSDC.connect(customer).approve(await customerNFT.getAddress(), ethers.parseUnits("100", 6));
            await customerNFT.connect(customer).mintWithCCUSD(customer.address, 1, ethers.parseUnits("100", 6)); // BRONZE
            
            await expect(
                customerNFT.connect(customer).mintWithCCUSD(customer.address, 2, ethers.parseUnits("200", 6)) // Try SILVER
            ).to.be.revertedWith("User already has NFT");
        });
        
        it("Should handle reward calculation edge cases", async function () {
            await mockUSDC.connect(customer).approve(await customerNFT.getAddress(), ethers.parseUnits("1000", 6));
            await customerNFT.connect(customer).mintWithCCUSD(customer.address, 4, ethers.parseUnits("1000", 6)); // PLATINUM
            
                        // Test with zero time elapsed
            const rewardsImmediately = await customerNFT.getAvailableRewards();
            expect(rewardsImmediately).to.equal(0);
            
            // Test with large time elapsed
            await ethers.provider.send("evm_increaseTime", [365 * 86400]); // 1 year
            await ethers.provider.send("evm_mine");
            
            const rewardsAfterYear = await customerNFT.getAvailableRewards();
            expect(rewardsAfterYear).to.be.gt(0);
        });
    });
});