import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy FoundersNetMarket contract
 * 
 * This script:
 * 1. Deploys FoundersNetMarket with USDC token address
 * 2. Verifies contract on Polygonscan
 * 3. Saves deployment addresses to JSON file
 * 
 * Usage:
 *   npx hardhat deploy --network sepolia
 *   npx hardhat deploy --network amoy
 *   npx hardhat deploy --network polygon
 */
const deployMarket: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, network } = hre;
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    log("\n========================================");
    log("FoundersNet Market Deployment");
    log("========================================");
    log(`Network: ${network.name}`);
    log(`Chain ID: ${network.config.chainId}`);
    log(`Deployer: ${deployer}`);

    // Get USDC address for the current network
    // For Sepolia, try to get MockUSDC from previous deployment
    let usdcAddress = await getUSDCAddress(network.name, deployments);

    if (!usdcAddress) {
        throw new Error(
            `USDC address not configured for network: ${network.name}\n` +
            `For Sepolia: Deploy MockUSDC first with: npx hardhat deploy --network sepolia --tags MockUSDC\n` +
            `For Polygon: Set USDC_ADDRESS_${network.name.toUpperCase()} in .env file`
        );
    }

    log(`USDC Address: ${usdcAddress}`);
    log("========================================\n");

    // Deploy FoundersNetMarket
    log("Deploying FoundersNetMarket...");

    const marketDeployment = await deploy("FoundersNetMarket", {
        from: deployer,
        args: [usdcAddress],
        log: true,
        waitConfirmations: network.name === "hardhat" || network.name === "localhost" ? 1 : 6,
    });

    log(`\n✅ FoundersNetMarket deployed to: ${marketDeployment.address}`);
    log(`   Transaction hash: ${marketDeployment.transactionHash}`);
    log(`   Gas used: ${marketDeployment.receipt?.gasUsed.toString()}`);

    // Verify contract on block explorer (skip for local networks)
    if (network.name !== "hardhat" && network.name !== "localhost") {
        const explorerName = network.name === "sepolia" ? "Etherscan" : "Polygonscan";
        log("\n========================================");
        log(`Verifying contract on ${explorerName}...`);
        log("========================================");

        try {
            log(`Waiting 30 seconds for ${explorerName} to index...`);
            await new Promise(resolve => setTimeout(resolve, 30000));

            await hre.run("verify:verify", {
                address: marketDeployment.address,
                constructorArguments: [usdcAddress],
            });

            log(`✅ Contract verified on ${explorerName}`);
        } catch (error: any) {
            if (error.message.includes("Already Verified")) {
                log(`ℹ️  Contract already verified on ${explorerName}`);
            } else {
                log("❌ Verification failed:");
                log(error.message);
                log("\nYou can verify manually later with:");
                log(`npx hardhat verify --network ${network.name} ${marketDeployment.address} ${usdcAddress}`);
            }
        }
    }

    // Save deployment addresses to JSON file
    saveDeploymentAddresses(network.name, {
        network: network.name,
        chainId: network.config.chainId,
        marketContract: marketDeployment.address,
        usdcToken: usdcAddress,
        deployer: deployer,
        deployedAt: new Date().toISOString(),
        transactionHash: marketDeployment.transactionHash,
    });

    // Display summary
    log("\n========================================");
    log("Deployment Summary");
    log("========================================");
    log(`Network:           ${network.name}`);
    log(`Chain ID:          ${network.config.chainId}`);
    log(`Market Contract:   ${marketDeployment.address}`);
    log(`USDC Token:        ${usdcAddress}`);
    log(`Deployer:          ${deployer}`);
    log("========================================");

    // Display next steps
    log("\n📋 Next Steps:");
    log("1. Update .env file with deployed contract address:");
    log(`   CONTRACT_ADDRESS_${network.name.toUpperCase()}=${marketDeployment.address}`);
    log("2. Update frontend .env file:");
    log(`   VITE_CONTRACT_ADDRESS=${marketDeployment.address}`);
    log("3. Test the deployment:");
    log(`   - View on Polygonscan: ${getExplorerUrl(network.name)}/address/${marketDeployment.address}`);
    log("   - Create a test market using the admin wallet");
    log("   - Place a test bet");
    log("========================================\n");

    return true;
};

/**
 * Get USDC address for the given network
 */
async function getUSDCAddress(networkName: string, deployments: any): Promise<string | undefined> {
    const envKey = `USDC_ADDRESS_${networkName.toUpperCase()}`;
    const address = process.env[envKey];

    if (address) return address;

    // For Sepolia/testnets, try to get MockUSDC from previous deployment
    if (networkName === "sepolia" || networkName === "hardhat" || networkName === "localhost") {
        try {
            const mockUSDC = await deployments.get("MockUSDC");
            return mockUSDC.address;
        } catch {
            return undefined;
        }
    }

    // Fallback to known addresses for Polygon networks
    const knownAddresses: { [key: string]: string } = {
        amoy: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582", // Circle USDC on Amoy
        polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Native USDC on Polygon PoS
    };

    return knownAddresses[networkName];
}

/**
 * Get block explorer URL for the given network
 */
function getExplorerUrl(networkName: string): string {
    const explorers: { [key: string]: string } = {
        sepolia: "https://sepolia.etherscan.io",
        amoy: "https://amoy.polygonscan.com",
        polygon: "https://polygonscan.com",
        localhost: "http://localhost:8545",
        hardhat: "http://localhost:8545",
    };

    return explorers[networkName] || "https://etherscan.io";
}

/**
 * Save deployment addresses to JSON file
 */
function saveDeploymentAddresses(networkName: string, data: any): void {
    const deploymentsDir = path.join(__dirname, "..", "deployments");

    // Create deployments directory if it doesn't exist
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const filePath = path.join(deploymentsDir, `${networkName}.json`);

    // Read existing data if file exists
    let existingData: any = {};
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        existingData = JSON.parse(fileContent);
    }

    // Merge with new data
    const updatedData = {
        ...existingData,
        ...data,
        lastUpdated: new Date().toISOString(),
    };

    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));

    console.log(`\n✅ Deployment addresses saved to: ${filePath}`);
}

// Tags for selective deployment
deployMarket.tags = ["FoundersNetMarket", "market", "all"];

// On Sepolia, depend on MockUSDC deployment
deployMarket.dependencies = ["MockUSDC"];
deployMarket.id = "FoundersNetMarket";

export default deployMarket;
