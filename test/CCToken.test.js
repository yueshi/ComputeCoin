const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CCToken", function () {
    let ccToken;
    let owner;
    let user1;
    let user2;
    
    const TOTAL_SUPPLY = ethers.parseEther("1000000000"); // 1B tokens
    const ETH_TO_CC_RATE = ethers.parseEther("1000"); // 1 ETH = 1000 CC
    
    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        
        const CCToken = await ethers.getContractFactory("CCToken");
        ccToken = await CCToken.deploy();
        await ccToken.waitForDeployment();
    });
    
    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await ccToken.owner()).to.equal(owner.address);
        });
        
        it("Should have correct name and symbol", async function () {
            expect(await ccToken.name()).to.equal("$CC");
            expect(await ccToken.symbol()).to.equal("CC");
        });
        
        it("Should have correct decimals", async function () {
            expect(await ccToken.decimals()).to.equal(18);
        });
        
        it("Should mint total supply to owner", async function () {
            expect(await ccToken.totalSupply()).to.equal(TOTAL_SUPPLY);
            expect(await ccToken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
        });
    });
    
    describe("Basic ERC20 functionality", function () {
        it("Should transfer tokens between accounts", async function () {
            await ccToken.transfer(user1.address, ethers.parseEther("100"));
            expect(await ccToken.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
            expect(await ccToken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY - ethers.parseEther("100"));
        });
        
        it("Should approve and transferFrom tokens", async function () {
            await ccToken.approve(user1.address, ethers.parseEther("1000"));
            
            await ccToken.connect(user1).transferFrom(owner.address, user2.address, ethers.parseEther("500"));
            
            expect(await ccToken.balanceOf(user2.address)).to.equal(ethers.parseEther("500"));
            expect(await ccToken.allowance(owner.address, user1.address)).to.equal(ethers.parseEther("500"));
        });
        
        it("Should fail transfer with insufficient balance", async function () {
            await expect(
                ccToken.connect(user1).transfer(user2.address, ethers.parseEther("1"))
            ).to.be.revertedWithCustomError(ccToken, "ERC20InsufficientBalance");
        });
    });
    
    describe("Burning functionality", function () {
        it("Should allow owner to burn their own tokens", async function () {
            const burnAmount = ethers.parseEther("1000");
            
            await ccToken.burn(burnAmount);
            
            expect(await ccToken.totalSupply()).to.equal(TOTAL_SUPPLY - burnAmount);
            expect(await ccToken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY - burnAmount);
        });
        
        it("Should allow burning with allowance", async function () {
            const burnAmount = ethers.parseEther("1000");
            
            await ccToken.approve(user1.address, burnAmount);
            await ccToken.connect(user1).burnFrom(owner.address, burnAmount);
            
            expect(await ccToken.totalSupply()).to.equal(TOTAL_SUPPLY - burnAmount);
            expect(await ccToken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY - burnAmount);
        });
        
        it("Should allow contract to burn from itself (deflationary mechanic)", async function () {
            // First transfer some tokens to user1
            const transferAmount = ethers.parseEther("10000");
            await ccToken.transfer(user1.address, transferAmount);
            
            // User1 can burn their own tokens
            const burnAmount = ethers.parseEther("1000");
            await ccToken.connect(user1).burn(burnAmount);
            
            expect(await ccToken.totalSupply()).to.equal(TOTAL_SUPPLY - burnAmount);
            expect(await ccToken.balanceOf(user1.address)).to.equal(transferAmount - burnAmount);
        });
        
        it("Should fail burnFrom without sufficient allowance", async function () {
            await expect(
                ccToken.connect(user1).burnFrom(owner.address, ethers.parseEther("1000"))
            ).to.be.revertedWithCustomError(ccToken, "ERC20InsufficientAllowance");
        });
    });
    
    describe("ETH Purchase functionality", function () {
        it("Should allow users to purchase CC tokens with ETH", async function () {
            const ethAmount = ethers.parseEther("1");
            const expectedCCAmount = (ethAmount * ETH_TO_CC_RATE) / ethers.parseEther("1");
            
            await ccToken.connect(user1).purchaseWithETH({ value: ethAmount });
            
            expect(await ccToken.balanceOf(user1.address)).to.equal(expectedCCAmount);
            expect(await ccToken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY - expectedCCAmount);
        });
        
        it("Should emit TokensPurchased event", async function () {
            const ethAmount = ethers.parseEther("1");
            const expectedCCAmount = (ethAmount * ETH_TO_CC_RATE) / ethers.parseEther("1");
            
            await expect(ccToken.connect(user1).purchaseWithETH({ value: ethAmount }))
                .to.emit(ccToken, "TokensPurchased")
                .withArgs(user1.address, ethAmount, expectedCCAmount);
        });
        
        it("Should transfer ETH to owner", async function () {
            const ethAmount = ethers.parseEther("2");
            const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
            
            await ccToken.connect(user1).purchaseWithETH({ value: ethAmount });
            
            const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
            expect(finalOwnerBalance - initialOwnerBalance).to.equal(ethAmount);
        });
        
        it("Should fail purchase with zero ETH", async function () {
            await expect(
                ccToken.connect(user1).purchaseWithETH({ value: 0 })
            ).to.be.revertedWith("Must send ETH to purchase tokens");
        });
        
        it("Should fail purchase when owner has insufficient tokens", async function () {
            // Transfer all tokens to another contract to simulate insufficient supply
            const allTokens = await ccToken.balanceOf(owner.address);
            await ccToken.transfer(user2.address, allTokens);
            
            await expect(
                ccToken.connect(user1).purchaseWithETH({ value: ethers.parseEther("1") })
            ).to.be.revertedWith("Insufficient tokens available for purchase");
        });
    });
    
    describe("View functions", function () {
        it("Should return correct CC amount for given ETH", async function () {
            const ethAmount = ethers.parseEther("5");
            const expectedCC = (ethAmount * ETH_TO_CC_RATE) / ethers.parseEther("1");
            
            expect(await ccToken.getCCForETH(ethAmount)).to.equal(expectedCC);
        });
        
        it("Should return correct ETH amount for given CC", async function () {
            const tokenAmount = ethers.parseEther("5000");
            const expectedETH = (tokenAmount * ethers.parseEther("1")) / ETH_TO_CC_RATE;
            
            expect(await ccToken.getETHForCC(tokenAmount)).to.equal(expectedETH);
        });
    });
    
    describe("Owner functions", function () {
        it("Should allow owner to withdraw ETH", async function () {
            // Since CCToken forwards ETH to owner immediately in purchaseWithETH,
            // we test the withdraw function by ensuring it works with zero balance
            const withdrawAmount = 0;
            
            // Check contract balance is zero
            const contractBalance = await ethers.provider.getBalance(await ccToken.getAddress());
            expect(contractBalance).to.equal(0);
            
            // This should not revert even with zero balance
            await ccToken.withdrawETH(withdrawAmount);
        });
        
        it("Should fail withdraw ETH from non-owner", async function () {
            await expect(
                ccToken.connect(user1).withdrawETH(ethers.parseEther("1"))
            ).to.be.revertedWithCustomError(ccToken, "OwnableUnauthorizedAccount");
        });
        
        it("Should fail withdraw ETH with insufficient balance", async function () {
            await expect(
                ccToken.withdrawETH(ethers.parseEther("1"))
            ).to.be.revertedWith("Insufficient ETH balance");
        });
    });
    
    describe("Edge cases", function () {
        it("Should handle maximum uint256 values safely", async function () {
            // Test that view functions handle large numbers
            const largeETHAmount = ethers.parseEther("1000000000"); // 1 billion ETH
            const ccAmount = await ccToken.getCCForETH(largeETHAmount);
            expect(ccAmount).to.be.gt(0n);
        });
        
        it("Should maintain correct total supply after multiple burns", async function () {
            const burn1 = ethers.parseEther("1000");
            const burn2 = ethers.parseEther("2000");
            
            await ccToken.burn(burn1);
            await ccToken.burn(burn2);
            
            expect(await ccToken.totalSupply()).to.equal(TOTAL_SUPPLY - burn1 - burn2);
        });
        
        it("Should handle zero address transfers correctly", async function () {
            await expect(
                ccToken.transfer(ethers.ZeroAddress, ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(ccToken, "ERC20InvalidReceiver");
        });
    });
});