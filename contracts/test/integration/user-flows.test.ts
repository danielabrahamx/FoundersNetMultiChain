import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { FoundersNetMarket, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Integration Tests - Full User Flows
 * 
 * These tests verify complete user journeys from start to finish.
 * They should be run against a local Hardhat node to simulate
 * real-world conditions.
 * 
 * Run: pnpm test:integration
 * 
 * Prerequisites:
 *   - Hardhat node running: pnpm dev:contracts
 *   - Contracts deployed: pnpm deploy:local
 */

describe("Integration: User Flows", function () {
    let market: FoundersNetMarket;
    let usdc: MockUSDC;
    let admin: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let user3: SignerWithAddress;

    const ONE_WEEK = 7 * 24 * 60 * 60;
    const INITIAL_USDC = ethers.parseUnits("10000", 6); // 10,000 USDC

    beforeEach(async function () {
        // Get signers
        [admin, user1, user2, user3] = await ethers.getSigners();

        // Deploy fresh contracts for each test
        await deployments.fixture(["MockUSDC", "FoundersNetMarket"]);

        const marketDeployment = await deployments.get("FoundersNetMarket");
        const usdcDeployment = await deployments.get("MockUSDC");

        market = await ethers.getContractAt("FoundersNetMarket", marketDeployment.address);
        usdc = await ethers.getContractAt("MockUSDC", usdcDeployment.address);

        // Fund users with USDC
        for (const user of [user1, user2, user3]) {
            await usdc.mint(user.address, INITIAL_USDC);
            await usdc.connect(user).approve(await market.getAddress(), ethers.MaxUint256);
        }
    });

    describe("Complete Betting Flow", function () {
        it("should allow user to connect, bet, and claim winnings", async function () {
            // Step 1: Admin creates a market
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp + ONE_WEEK;
            await market.createMarket("Will company X raise Series A?", closeTime);

            // Step 2: User1 places bet on YES
            const betAmount = ethers.parseUnits("100", 6);
            await market.connect(user1).placeBet(0, true, betAmount);

            // Verify position
            const position = await market.getUserPosition(0, user1.address);
            expect(position.yesBets).to.equal(betAmount);

            // Step 3: User2 places bet on NO (to create a pool)
            await market.connect(user2).placeBet(0, false, betAmount);

            // Step 4: Time passes, market closes
            await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
            await ethers.provider.send("evm_mine", []);

            // Step 5: Admin resolves market (YES wins)
            await market.resolveMarket(0, true);

            // Step 6: User1 claims winnings
            const balanceBefore = await usdc.balanceOf(user1.address);
            await market.connect(user1).claimPayout(0);
            const balanceAfter = await usdc.balanceOf(user1.address);

            // User1 should receive entire pool (their 100 + loser's 100 = 200)
            const expectedPayout = ethers.parseUnits("200", 6);
            expect(balanceAfter - balanceBefore).to.equal(expectedPayout);
        });

        it("should handle multiple users betting and claiming", async function () {
            // Create market
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp + ONE_WEEK;
            await market.createMarket("Multi-user test market", closeTime);

            // Multiple users bet
            await market.connect(user1).placeBet(0, true, ethers.parseUnits("300", 6));
            await market.connect(user2).placeBet(0, true, ethers.parseUnits("100", 6));
            await market.connect(user3).placeBet(0, false, ethers.parseUnits("200", 6));

            // Total pool: 600 USDC
            // YES pool: 400 USDC (user1: 300, user2: 100)
            // NO pool: 200 USDC

            // Close and resolve
            await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
            await ethers.provider.send("evm_mine", []);
            await market.resolveMarket(0, true);

            // Calculate expected payouts
            // user1 gets: (300/400) * 600 = 450 USDC
            // user2 gets: (100/400) * 600 = 150 USDC
            // user3 gets: 0 (lost)

            const user1BalanceBefore = await usdc.balanceOf(user1.address);
            await market.connect(user1).claimPayout(0);
            const user1BalanceAfter = await usdc.balanceOf(user1.address);
            expect(user1BalanceAfter - user1BalanceBefore).to.equal(ethers.parseUnits("450", 6));

            const user2BalanceBefore = await usdc.balanceOf(user2.address);
            await market.connect(user2).claimPayout(0);
            const user2BalanceAfter = await usdc.balanceOf(user2.address);
            expect(user2BalanceAfter - user2BalanceBefore).to.equal(ethers.parseUnits("150", 6));

            // User3 should not be able to claim (loser)
            const claimable = await market.getClaimableAmount(0, user3.address);
            expect(claimable).to.equal(0);
        });
    });

    describe("Edge Cases", function () {
        it("should handle one-sided betting (all YES)", async function () {
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp + ONE_WEEK;
            await market.createMarket("One-sided market", closeTime);

            // Only YES bets
            await market.connect(user1).placeBet(0, true, ethers.parseUnits("100", 6));
            await market.connect(user2).placeBet(0, true, ethers.parseUnits("100", 6));

            // Resolve as YES
            await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
            await ethers.provider.send("evm_mine", []);
            await market.resolveMarket(0, true);

            // Each user gets back their original stake (no profit)
            const user1BalanceBefore = await usdc.balanceOf(user1.address);
            await market.connect(user1).claimPayout(0);
            const user1BalanceAfter = await usdc.balanceOf(user1.address);

            // Should get exactly 100 USDC back
            expect(user1BalanceAfter - user1BalanceBefore).to.equal(ethers.parseUnits("100", 6));
        });

        it("should handle hedged positions (betting both sides)", async function () {
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp + ONE_WEEK;
            await market.createMarket("Hedge test", closeTime);

            // User1 bets on both sides
            await market.connect(user1).placeBet(0, true, ethers.parseUnits("100", 6));
            await market.connect(user1).placeBet(0, false, ethers.parseUnits("50", 6));

            // Verify both positions recorded
            const position = await market.getUserPosition(0, user1.address);
            expect(position.yesBets).to.equal(ethers.parseUnits("100", 6));
            expect(position.noBets).to.equal(ethers.parseUnits("50", 6));

            // Add another user to create actual odds
            await market.connect(user2).placeBet(0, false, ethers.parseUnits("50", 6));

            // Resolve as YES
            await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
            await ethers.provider.send("evm_mine", []);
            await market.resolveMarket(0, true);

            // User1 wins from YES bet but loses NO bet
            // Total pool: 200 USDC
            // YES pool: 100 USDC (user1 only)
            // NO pool: 100 USDC (user1: 50, user2: 50)
            // User1 payout from YES: (100/100) * 200 = 200 USDC
            // User1 lost 50 USDC from NO bet
            // Net: User1 spent 150, gets 200, profit = 50

            const user1BalanceBefore = await usdc.balanceOf(user1.address);
            await market.connect(user1).claimPayout(0);
            const user1BalanceAfter = await usdc.balanceOf(user1.address);

            expect(user1BalanceAfter - user1BalanceBefore).to.equal(ethers.parseUnits("200", 6));
        });
    });

    describe("Error Handling", function () {
        it("should reject bets on closed markets", async function () {
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp + 60;
            await market.createMarket("Short market", closeTime);

            // Time passes
            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine", []);

            // Try to bet (should fail)
            await expect(
                market.connect(user1).placeBet(0, true, ethers.parseUnits("100", 6))
            ).to.be.revertedWith("Market is not open for betting");
        });

        it("should reject double claims", async function () {
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp + ONE_WEEK;
            await market.createMarket("Double claim test", closeTime);

            // Place bets and resolve
            await market.connect(user1).placeBet(0, true, ethers.parseUnits("100", 6));
            await market.connect(user2).placeBet(0, false, ethers.parseUnits("100", 6));

            await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
            await ethers.provider.send("evm_mine", []);
            await market.resolveMarket(0, true);

            // First claim succeeds
            await market.connect(user1).claimPayout(0);

            // Second claim should fail
            await expect(
                market.connect(user1).claimPayout(0)
            ).to.be.revertedWith("Already claimed");
        });

        it("should reject claims from losers", async function () {
            const closeTime = (await ethers.provider.getBlock("latest"))!.timestamp + ONE_WEEK;
            await market.createMarket("Loser claim test", closeTime);

            // User1 bets YES, User2 bets NO
            await market.connect(user1).placeBet(0, true, ethers.parseUnits("100", 6));
            await market.connect(user2).placeBet(0, false, ethers.parseUnits("100", 6));

            await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
            await ethers.provider.send("evm_mine", []);
            await market.resolveMarket(0, true); // YES wins

            // User2 (loser) tries to claim
            await expect(
                market.connect(user2).claimPayout(0)
            ).to.be.revertedWith("No winnings to claim");
        });
    });
});
