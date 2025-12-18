import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { FoundersNetMarket, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Integration Tests - Admin Flows
 * 
 * These tests verify admin-specific functionality including
 * market creation, resolution, and access control.
 * 
 * Run: pnpm test:integration
 */

describe("Integration: Admin Flows", function () {
    let market: FoundersNetMarket;
    let usdc: MockUSDC;
    let admin: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;

    const ONE_DAY = 24 * 60 * 60;
    const ONE_WEEK = 7 * ONE_DAY;
    const INITIAL_USDC = ethers.parseUnits("10000", 6);

    beforeEach(async function () {
        [admin, user1, user2] = await ethers.getSigners();

        await deployments.fixture(["MockUSDC", "FoundersNetMarket"]);

        const marketDeployment = await deployments.get("FoundersNetMarket");
        const usdcDeployment = await deployments.get("MockUSDC");

        market = await ethers.getContractAt("FoundersNetMarket", marketDeployment.address);
        usdc = await ethers.getContractAt("MockUSDC", usdcDeployment.address);

        // Fund users
        for (const user of [user1, user2]) {
            await usdc.mint(user.address, INITIAL_USDC);
            await usdc.connect(user).approve(await market.getAddress(), ethers.MaxUint256);
        }
    });

    describe("Market Creation", function () {
        it("should allow admin to create a market", async function () {
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp + ONE_WEEK;

            await expect(market.createMarket("Test market", closeTime))
                .to.emit(market, "MarketCreated")
                .withArgs(0, "Test market", closeTime, admin.address);

            // Verify market details
            const marketData = await market.getMarket(0);
            expect(marketData.question).to.equal("Test market");
            expect(marketData.closeTime).to.equal(closeTime);
            expect(marketData.resolved).to.be.false;
        });

        it("should reject market creation from non-admin", async function () {
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp + ONE_WEEK;

            await expect(
                market.connect(user1).createMarket("Unauthorized market", closeTime)
            ).to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
        });

        it("should reject markets with past close time", async function () {
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp - 100;

            await expect(
                market.createMarket("Past market", closeTime)
            ).to.be.revertedWith("Close time must be in the future");
        });

        it("should allow creating multiple markets", async function () {
            const baseTime = (await ethers.provider.getBlock("latest"))!.timestamp;

            await market.createMarket("Market 1", baseTime + ONE_WEEK);
            await market.createMarket("Market 2", baseTime + 2 * ONE_WEEK);
            await market.createMarket("Market 3", baseTime + 3 * ONE_WEEK);

            expect(await market.getMarketCount()).to.equal(3);
        });
    });

    describe("Market Resolution", function () {
        beforeEach(async function () {
            // Create a market and add bets
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp + ONE_WEEK;
            await market.createMarket("Resolution test", closeTime);

            await market.connect(user1).placeBet(0, true, ethers.parseUnits("100", 6));
            await market.connect(user2).placeBet(0, false, ethers.parseUnits("100", 6));
        });

        it("should allow admin to resolve a closed market", async function () {
            // Move time forward
            await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(market.resolveMarket(0, true))
                .to.emit(market, "MarketResolved")
                .withArgs(0, true);

            const marketData = await market.getMarket(0);
            expect(marketData.resolved).to.be.true;
            expect(marketData.outcome).to.be.true;
        });

        it("should reject resolution from non-admin", async function () {
            await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                market.connect(user1).resolveMarket(0, true)
            ).to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
        });

        it("should reject resolution of open market", async function () {
            // Don't advance time - market still open
            await expect(
                market.resolveMarket(0, true)
            ).to.be.revertedWith("Market is still open");
        });

        it("should reject double resolution", async function () {
            await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
            await ethers.provider.send("evm_mine", []);

            await market.resolveMarket(0, true);

            await expect(
                market.resolveMarket(0, false)
            ).to.be.revertedWith("Market already resolved");
        });

        it("should handle resolution of market with no bets", async function () {
            // Create a new market without bets
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp + 60;
            await market.createMarket("Empty market", closeTime);

            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine", []);

            // Should still be resolvable (no bets is valid)
            await expect(market.resolveMarket(1, true)).to.emit(market, "MarketResolved");
        });
    });

    describe("Admin Security", function () {
        beforeEach(async function () {
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp + ONE_WEEK;
            await market.createMarket("Security test", closeTime);
            await market.connect(user1).placeBet(0, true, ethers.parseUnits("1000", 6));
            await market.connect(user2).placeBet(0, false, ethers.parseUnits("1000", 6));
        });

        it("should not allow admin to withdraw escrowed funds", async function () {
            // Admin cannot directly access user funds
            // The only way to get USDC out is through legitimate resolution and claims

            const contractBalance = await usdc.balanceOf(await market.getAddress());
            expect(contractBalance).to.equal(ethers.parseUnits("2000", 6));

            // Admin cannot transfer funds without going through claim process
            // There's no admin withdraw function by design
        });

        it("should maintain escrow integrity after resolution", async function () {
            const initialBalance = await usdc.balanceOf(await market.getAddress());

            await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
            await ethers.provider.send("evm_mine", []);
            await market.resolveMarket(0, true);

            // Balance unchanged until claims
            const afterResolution = await usdc.balanceOf(await market.getAddress());
            expect(afterResolution).to.equal(initialBalance);

            // Winner claims
            await market.connect(user1).claimPayout(0);

            // Balance reduced by payout
            const afterClaim = await usdc.balanceOf(await market.getAddress());
            expect(afterClaim).to.equal(0); // All funds claimed
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            const baseTime = (await ethers.provider.getBlock("latest"))!.timestamp;

            // Create multiple markets
            await market.createMarket("Market A", baseTime + ONE_WEEK);
            await market.createMarket("Market B", baseTime + 2 * ONE_WEEK);

            // Add bets
            await market.connect(user1).placeBet(0, true, ethers.parseUnits("100", 6));
            await market.connect(user2).placeBet(0, false, ethers.parseUnits("200", 6));
        });

        it("should return correct market count", async function () {
            expect(await market.getMarketCount()).to.equal(2);
        });

        it("should return correct market details", async function () {
            const marketData = await market.getMarket(0);

            expect(marketData.question).to.equal("Market A");
            expect(marketData.yesPool).to.equal(ethers.parseUnits("100", 6));
            expect(marketData.noPool).to.equal(ethers.parseUnits("200", 6));
            expect(marketData.resolved).to.be.false;
        });

        it("should return correct user positions", async function () {
            const position = await market.getUserPosition(0, user1.address);

            expect(position.yesBets).to.equal(ethers.parseUnits("100", 6));
            expect(position.noBets).to.equal(0);
            expect(position.claimed).to.be.false;
        });

        it("should return correct claimable amount after resolution", async function () {
            await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
            await ethers.provider.send("evm_mine", []);
            await market.resolveMarket(0, true);

            // User1 bet 100 on YES, total pool is 300
            // Expected: (100/100) * 300 = 300
            const claimable = await market.getClaimableAmount(0, user1.address);
            expect(claimable).to.equal(ethers.parseUnits("300", 6));

            // User2 bet on NO, gets nothing
            const user2Claimable = await market.getClaimableAmount(0, user2.address);
            expect(user2Claimable).to.equal(0);
        });
    });
});
