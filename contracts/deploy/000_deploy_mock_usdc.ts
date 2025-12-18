import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy MockUSDC contract (for testnets only)
 * 
 * This script:
 * 1. Deploys MockUSDC on testnets that don't have official USDC
 * 2. Mints initial supply to deployer
 * 3. Saves deployment address
 * 
 * Usage:
 *   npx hardhat deploy --network sepolia --tags MockUSDC
 */
const deployMockUSDC: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, network } = hre;
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    // Only deploy MockUSDC on testnets without official USDC
    const testnetsThatNeedMockUSDC = ["sepolia", "hardhat", "localhost"];

    if (!testnetsThatNeedMockUSDC.includes(network.name)) {
        log(`Skipping MockUSDC deployment on ${network.name} - use official USDC instead`);
        return;
    }

    log("\n========================================");
    log("MockUSDC Deployment");
    log("========================================");
    log(`Network: ${network.name}`);
    log(`Deployer: ${deployer}`);
    log("========================================\n");

    // Deploy MockUSDC
    log("Deploying MockUSDC...");

    const mockUSDCDeployment = await deploy("MockUSDC", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: network.name === "hardhat" || network.name === "localhost" ? 1 : 3,
    });

    log(`\n✅ MockUSDC deployed to: ${mockUSDCDeployment.address}`);

    // Mint initial supply to deployer (1,000,000 USDC)
    if (mockUSDCDeployment.newlyDeployed) {
        log("\nMinting initial supply to deployer...");
        const MockUSDC = await hre.ethers.getContractAt("MockUSDC", mockUSDCDeployment.address);

        const initialSupply = hre.ethers.parseUnits("1000000", 6); // 1M USDC
        const tx = await MockUSDC.mint(deployer, initialSupply);
        await tx.wait();

        log(`✅ Minted 1,000,000 USDC to ${deployer}`);
    }

    // Verify contract on Etherscan (skip for local networks)
    if (network.name === "sepolia") {
        log("\n========================================");
        log("Verifying MockUSDC on Etherscan...");
        log("========================================");

        try {
            log("Waiting 30 seconds for Etherscan to index...");
            await new Promise(resolve => setTimeout(resolve, 30000));

            await hre.run("verify:verify", {
                address: mockUSDCDeployment.address,
                constructorArguments: [],
            });

            log("✅ MockUSDC verified on Etherscan");
        } catch (error: any) {
            if (error.message.includes("Already Verified")) {
                log("ℹ️  MockUSDC already verified");
            } else {
                log("❌ Verification failed:", error.message);
            }
        }
    }

    // Save deployment address
    saveDeploymentAddress(network.name, "mockUSDC", mockUSDCDeployment.address);

    log("\n========================================");
    log("MockUSDC Deployment Summary");
    log("========================================");
    log(`Network:     ${network.name}`);
    log(`Address:     ${mockUSDCDeployment.address}`);
    log(`Deployer:    ${deployer}`);
    log(`Balance:     1,000,000 USDC`);
    log("========================================");
    log("\n📋 Add this to your .env file:");
    log(`USDC_ADDRESS_SEPOLIA=${mockUSDCDeployment.address}`);
    log("========================================\n");

    return true;
};

function saveDeploymentAddress(networkName: string, contractName: string, address: string): void {
    const deploymentsDir = path.join(__dirname, "..", "deployments");

    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const filePath = path.join(deploymentsDir, `${networkName}.json`);

    let existingData: any = {};
    if (fs.existsSync(filePath)) {
        existingData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }

    existingData[contractName] = address;
    existingData.lastUpdated = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
}

// Run before market deployment
deployMockUSDC.tags = ["MockUSDC", "testnet"];
deployMockUSDC.dependencies = [];
deployMockUSDC.id = "MockUSDC";

export default deployMockUSDC;
