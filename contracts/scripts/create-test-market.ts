import "@nomicfoundation/hardhat-toolbox";
import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

/**
 * Create a test market after deployment
 * 
 * Usage:
 *   npx hardhat run scripts/create-test-market.ts --network amoy
 *   npx hardhat run scripts/create-test-market.ts --network polygon
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log("\n========================================");
    console.log("Create Test Market");
    console.log("========================================");
    console.log(`Network:  ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Admin:    ${deployer.address}`);

    // Get contract address from environment
    const networkName = network.name === "unknown" ? "amoy" : network.name;
    const contractEnvKey = `CONTRACT_ADDRESS_${networkName.toUpperCase()}`;
    const contractAddress = process.env[contractEnvKey];

    if (!contractAddress) {
        throw new Error(
            `Contract address not found in environment.\n` +
            `Please set ${contractEnvKey} in .env file.`
        );
    }

    console.log(`Contract: ${contractAddress}`);
    console.log("========================================\n");

    // Get contract instance
    const FoundersNetMarket = await ethers.getContractFactory("FoundersNetMarket");
    const market = FoundersNetMarket.attach(contractAddress);

    // Verify admin
    const owner = await market.owner();
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error(
            `Deployer is not contract owner!\n` +
            `Owner: ${owner}\n` +
            `Deployer: ${deployer.address}`
        );
    }

    console.log("✅ Admin verified");

    // Create test market
    const question = "Will Acme Corp raise Series A by Q4 2024?";
    const closeTime = Math.floor(Date.now() / 1000) + 86400 * 7; // 7 days from now

    console.log("\nCreating market...");
    console.log(`Question:   ${question}`);
    console.log(`Close Time: ${new Date(closeTime * 1000).toISOString()}`);

    const tx = await market.createMarket(question, closeTime);
    console.log(`\nTransaction submitted: ${tx.hash}`);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    // Get market ID from event
    const event = receipt?.logs.find((log: any) => {
        try {
            const parsed = market.interface.parseLog(log);
            return parsed?.name === "MarketCreated";
        } catch {
            return false;
        }
    });

    if (event) {
        const parsed = market.interface.parseLog(event);
        const marketId = parsed?.args[0];

        console.log("\n========================================");
        console.log("Market Created Successfully!");
        console.log("========================================");
        console.log(`Market ID:  ${marketId}`);
        console.log(`Question:   ${question}`);
        console.log(`Close Time: ${new Date(closeTime * 1000).toISOString()}`);
        console.log("========================================");

        // Verify market details
        const marketData = await market.getMarket(marketId);
        console.log("\nMarket Details:");
        console.log(`State:     ${["Open", "Closed", "Resolved"][marketData[2]]}`);
        console.log(`YES Pool:  ${ethers.formatUnits(marketData[3], 6)} USDC`);
        console.log(`NO Pool:   ${ethers.formatUnits(marketData[4], 6)} USDC`);
        console.log("========================================");

        // Display explorer link
        const explorerUrl = getExplorerUrl(networkName);
        console.log(`\nView on Explorer: ${explorerUrl}/tx/${tx.hash}`);
    } else {
        console.log("\n⚠️  Market created but event not found in logs");
    }

    console.log("\n========================================");
    console.log("Next Steps:");
    console.log("========================================");
    console.log("1. View market on Polygonscan");
    console.log("2. Test placing a bet from a user wallet");
    console.log("3. Wait for close time to pass");
    console.log("4. Resolve the market");
    console.log("5. Test claiming payouts");
    console.log("========================================\n");
}

function getExplorerUrl(networkName: string): string {
    const explorers: { [key: string]: string } = {
        amoy: "https://amoy.polygonscan.com",
        polygon: "https://polygonscan.com",
        localhost: "http://localhost:8545",
        hardhat: "http://localhost:8545",
    };

    return explorers[networkName] || "https://polygonscan.com";
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
