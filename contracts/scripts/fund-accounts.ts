import hre from "hardhat";

/**
 * Fund Test Accounts with USDC ONLY
 * 
 * This script ONLY mints USDC to test accounts.
 * It does NOT create any markets.
 * 
 * Run: npx hardhat run scripts/fund-accounts.ts --network localhost
 */

async function main() {
    const { ethers, deployments } = hre;

    console.log("\n========================================");
    console.log("💰 Funding Test Accounts with USDC");
    console.log("========================================\n");

    // Get deployed MockUSDC contract
    const mockUSDCDeployment = await deployments.get("MockUSDC");
    const marketDeployment = await deployments.get("FoundersNetMarket");
    const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCDeployment.address);

    console.log(`MockUSDC Contract: ${mockUSDCDeployment.address}`);
    console.log(`Market Contract: ${marketDeployment.address}`);

    // Get signers
    const signers = await ethers.getSigners();

    // Fund accounts 1-4 (index 0 is admin/deployer)
    const usersToFund = signers.slice(1, 5);
    const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC each

    console.log("\n📋 Funding accounts:");

    for (const user of usersToFund) {
        // Check current balance
        const currentBalance = await mockUSDC.balanceOf(user.address);

        if (currentBalance >= mintAmount) {
            console.log(`  ${user.address}: Already has ${ethers.formatUnits(currentBalance, 6)} USDC`);
            continue;
        }

        // Mint USDC
        await mockUSDC.mint(user.address, mintAmount);

        // Approve market contract for unlimited spending
        await mockUSDC.connect(user).approve(marketDeployment.address, ethers.MaxUint256);

        const newBalance = await mockUSDC.balanceOf(user.address);
        console.log(`  ${user.address}: Minted 10,000 USDC, approved market contract`);
    }

    console.log("\n========================================");
    console.log("✅ Done! Accounts funded with USDC.");
    console.log("   NO markets were created.");
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
