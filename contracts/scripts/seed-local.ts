import { HardhatRuntimeEnvironment } from "hardhat/types";
import hre from "hardhat";

/**
 * Seed Local Environment
 * 
 * This script seeds the local Hardhat network with:
 * 1. Sample markets with different states
 * 2. Test bets from multiple accounts
 * 3. Some resolved markets for testing claims
 * 
 * Run: pnpm seed:local
 */

async function main() {
    const { ethers, deployments } = hre;

    console.log("\n========================================");
    console.log("🌱 Seeding Local Environment");
    console.log("========================================\n");

    // Get deployed contracts
    const marketDeployment = await deployments.get("FoundersNetMarket");
    const mockUSDCDeployment = await deployments.get("MockUSDC");

    const market = await ethers.getContractAt("FoundersNetMarket", marketDeployment.address);
    const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCDeployment.address);

    console.log(`Market Contract: ${marketDeployment.address}`);
    console.log(`MockUSDC Contract: ${mockUSDCDeployment.address}`);

    // Get signers (Hardhat provides 20 test accounts)
    const signers = await ethers.getSigners();
    const admin = signers[0];
    const user1 = signers[1];
    const user2 = signers[2];
    const user3 = signers[3];
    const user4 = signers[4];

    console.log("\n📋 Test Accounts:");
    console.log(`  Admin (deployer): ${admin.address}`);
    console.log(`  User 1: ${user1.address}`);
    console.log(`  User 2: ${user2.address}`);
    console.log(`  User 3: ${user3.address}`);
    console.log(`  User 4: ${user4.address}`);

    // Mint USDC to test users
    console.log("\n💰 Minting USDC to test users...");
    const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC each

    for (const user of [user1, user2, user3, user4]) {
        await mockUSDC.mint(user.address, mintAmount);
        console.log(`  Minted 10,000 USDC to ${user.address}`);
    }

    // Approve market contract for each user
    console.log("\n✅ Approving Market contract for USDC spending...");
    const approveAmount = ethers.MaxUint256;

    for (const user of [user1, user2, user3, user4]) {
        await mockUSDC.connect(user).approve(marketDeployment.address, approveAmount);
        console.log(`  Approved for ${user.address}`);
    }

    // Create sample markets
    console.log("\n📊 Creating sample markets...");

    const now = Math.floor(Date.now() / 1000);
    const ONE_DAY = 24 * 60 * 60;
    const ONE_WEEK = 7 * ONE_DAY;

    // Market 1: Open market with active betting
    const market1Question = "Will Stripe go public by Q2 2025?";
    const market1CloseTime = now + ONE_WEEK;

    let tx = await market.createMarket(market1Question, market1CloseTime);
    await tx.wait();
    console.log(`  Created Market 1: "${market1Question}" (closes in 1 week)`);

    // Market 2: Market with heavy YES bias
    const market2Question = "Will OpenAI raise Series D at $100B+ valuation?";
    const market2CloseTime = now + (2 * ONE_WEEK);

    tx = await market.createMarket(market2Question, market2CloseTime);
    await tx.wait();
    console.log(`  Created Market 2: "${market2Question}" (closes in 2 weeks)`);

    // Market 3: 50/50 market
    const market3Question = "Will Databricks IPO before Snowflake hits $200?";
    const market3CloseTime = now + (3 * ONE_WEEK);

    tx = await market.createMarket(market3Question, market3CloseTime);
    await tx.wait();
    console.log(`  Created Market 3: "${market3Question}" (closes in 3 weeks)`);

    // Market 4: Short-term market (for testing close)
    const market4Question = "Will SpaceX complete Starship orbital flight this week?";
    const market4CloseTime = now + (10 * 60); // Closes in 10 minutes

    tx = await market.createMarket(market4Question, market4CloseTime);
    await tx.wait();
    console.log(`  Created Market 4: "${market4Question}" (closes in 10 minutes)`);

    // Market 5: Already closed and resolved (for testing claims)
    const market5Question = "Will Anthropic raise Series C? (TEST - RESOLVED YES)";
    const market5CloseTime = now - ONE_DAY; // Already closed

    tx = await market.createMarket(market5Question, market5CloseTime);
    await tx.wait();
    console.log(`  Created Market 5: "${market5Question}" (already closed)`);

    // Place bets on markets
    console.log("\n🎲 Placing test bets...");

    // Market 1: Multiple bets on both sides
    await market.connect(user1).placeBet(0, true, ethers.parseUnits("100", 6)); // 100 USDC on YES
    console.log("  User1 bet 100 USDC YES on Market 1");

    await market.connect(user2).placeBet(0, false, ethers.parseUnits("50", 6)); // 50 USDC on NO
    console.log("  User2 bet 50 USDC NO on Market 1");

    await market.connect(user3).placeBet(0, true, ethers.parseUnits("200", 6)); // 200 USDC on YES
    console.log("  User3 bet 200 USDC YES on Market 1");

    // Market 2: Heavy YES bias
    await market.connect(user1).placeBet(1, true, ethers.parseUnits("500", 6));
    console.log("  User1 bet 500 USDC YES on Market 2");

    await market.connect(user2).placeBet(1, true, ethers.parseUnits("300", 6));
    console.log("  User2 bet 300 USDC YES on Market 2");

    await market.connect(user3).placeBet(1, true, ethers.parseUnits("150", 6));
    console.log("  User3 bet 150 USDC YES on Market 2");

    await market.connect(user4).placeBet(1, false, ethers.parseUnits("50", 6));
    console.log("  User4 bet 50 USDC NO on Market 2");

    // Market 3: 50/50
    await market.connect(user1).placeBet(2, true, ethers.parseUnits("100", 6));
    console.log("  User1 bet 100 USDC YES on Market 3");

    await market.connect(user2).placeBet(2, false, ethers.parseUnits("100", 6));
    console.log("  User2 bet 100 USDC NO on Market 3");

    // Market 5: Bets for resolved market (need to place before it was theoretically "closed")
    // Since we created it already closed, we can't place bets on it
    // Instead, let's just resolve it to show the flow

    console.log("\n⚖️ Resolving closed market...");
    // Note: Market 5 was created with past close time, so it's already closed
    // But we can't place bets on a closed market, so this will be an empty resolved market
    // For demonstration, we'll create the resolution anyway

    tx = await market.resolveMarket(4, true); // Market ID 4 = Market 5 (0-indexed)
    await tx.wait();
    console.log("  Resolved Market 5: YES wins");

    // Print summary
    console.log("\n========================================");
    console.log("🎉 Seed Complete!");
    console.log("========================================");
    console.log("\nMarkets created:");
    console.log("  0: Stripe IPO - Open (1 week)");
    console.log("  1: OpenAI Series D - Open (2 weeks), heavy YES");
    console.log("  2: Databricks IPO - Open (3 weeks), 50/50");
    console.log("  3: SpaceX Starship - Open (10 mins)");
    console.log("  4: Anthropic Series C - Resolved (YES)");

    console.log("\nTest accounts with USDC:");
    for (const user of [user1, user2, user3, user4]) {
        const balance = await mockUSDC.balanceOf(user.address);
        console.log(`  ${user.address}: ${ethers.formatUnits(balance, 6)} USDC`);
    }

    console.log("\n📝 To test in browser:");
    console.log("  1. Import a test account into MetaMask");
    console.log("  2. Network: http://127.0.0.1:8545 (chainId: 31337)");
    console.log("  3. Private keys are Hardhat defaults");
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
