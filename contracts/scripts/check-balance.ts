import "@nomicfoundation/hardhat-toolbox";
import { ethers } from "hardhat";

/**
 * Check deployer wallet balance
 * 
 * Usage:
 *   npx hardhat run scripts/check-balance.ts --network amoy
 *   npx hardhat run scripts/check-balance.ts --network polygon
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    const network = await ethers.provider.getNetwork();

    console.log("\n========================================");
    console.log("Deployer Balance Check");
    console.log("========================================");
    console.log(`Network:  ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Address:  ${deployer.address}`);
    console.log(`Balance:  ${ethers.formatEther(balance)} MATIC`);
    console.log("========================================");

    // Estimate deployment cost
    const estimatedGas = 2_500_000n; // Approximate gas for deployment
    const gasPrice = (await ethers.provider.getFeeData()).gasPrice || 0n;
    const estimatedCost = estimatedGas * gasPrice;

    console.log("\nDeployment Cost Estimate:");
    console.log(`Gas Estimate:     ${estimatedGas.toString()} gas`);
    console.log(`Gas Price:        ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
    console.log(`Estimated Cost:   ${ethers.formatEther(estimatedCost)} MATIC`);
    console.log("========================================");

    // Check if balance is sufficient
    const hasEnough = balance > estimatedCost * 2n; // 2x buffer

    if (hasEnough) {
        console.log("\n✅ Sufficient balance for deployment");
    } else {
        console.log("\n❌ Insufficient balance for deployment");
        console.log(`Recommended: At least ${ethers.formatEther(estimatedCost * 2n)} MATIC`);

        if (network.chainId === 80002n) {
            console.log("\nGet testnet MATIC from:");
            console.log("https://faucet.polygon.technology/");
        } else {
            console.log("\nPurchase MATIC on an exchange and send to:");
            console.log(deployer.address);
        }
    }

    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
