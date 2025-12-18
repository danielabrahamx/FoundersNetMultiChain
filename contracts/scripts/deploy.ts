import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

/**
 * Deployment script for FoundersNetMarket contract
 * Run: pnpm deploy:amoy or pnpm deploy:polygon
 */
async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

    // Get USDC address for current network
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    let usdcAddress: string;
    if (chainId === 80002n) {
        // Polygon Amoy testnet
        usdcAddress = process.env.USDC_ADDRESS_AMOY || "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
    } else if (chainId === 137n) {
        // Polygon mainnet
        usdcAddress = process.env.USDC_ADDRESS_POLYGON || "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
    } else {
        throw new Error(`Unsupported network: ${chainId}`);
    }

    console.log(`Using USDC address: ${usdcAddress} for chain ${chainId}`);

    // Deploy FoundersNetMarket
    const FoundersNetMarket = await ethers.getContractFactory("FoundersNetMarket");
    const market = await FoundersNetMarket.deploy();
    await market.waitForDeployment();

    const marketAddress = await market.getAddress();
    console.log(`FoundersNetMarket deployed to: ${marketAddress}`);

    // Save deployment info
    console.log("\n=== Deployment Complete ===");
    console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
    console.log(`Contract: ${marketAddress}`);
    console.log(`USDC: ${usdcAddress}`);
    console.log("\nUpdate your .env file with:");
    console.log(`CONTRACT_ADDRESS_${chainId === 80002n ? 'AMOY' : 'POLYGON'}=${marketAddress}`);
    console.log(`\nVerify with:`);
    console.log(`npx hardhat verify --network ${network.name} ${marketAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
