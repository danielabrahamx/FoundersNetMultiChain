import "@nomicfoundation/hardhat-toolbox";
import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

/**
 * Check network configuration and display current settings
 * 
 * Usage:
 *   npx hardhat run scripts/check-network.ts --network sepolia
 *   npx hardhat run scripts/check-network.ts --network amoy
 *   npx hardhat run scripts/check-network.ts --network polygon
 */
async function main() {
    const network = await ethers.provider.getNetwork();
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);

    // Determine network name from chain ID
    const chainIdToName: { [key: string]: string } = {
        "11155111": "sepolia",
        "80002": "amoy",
        "137": "polygon",
        "31337": "hardhat",
    };
    const networkName = chainIdToName[network.chainId.toString()] || network.name;
    const currency = networkName === "sepolia" ? "ETH" : "MATIC";
    const explorerApiKeyName = networkName === "sepolia" ? "Etherscan" : "Polygonscan";

    console.log("\n========================================");
    console.log("Network Configuration Check");
    console.log("========================================");
    console.log(`Network Name:     ${networkName}`);
    console.log(`Chain ID:         ${network.chainId}`);
    console.log(`Deployer Address: ${deployer.address}`);
    console.log(`Balance:          ${ethers.formatEther(balance)} ${currency}`);
    console.log("========================================");

    // Check USDC address
    const usdcEnvKey = `USDC_ADDRESS_${networkName.toUpperCase()}`;
    const usdcAddress = process.env[usdcEnvKey];

    console.log("\nUSDC Configuration:");
    console.log(`Environment Key:  ${usdcEnvKey}`);

    if (networkName === "sepolia") {
        console.log(`USDC Address:     ${usdcAddress || "Will deploy MockUSDC"}`);
        console.log("ℹ️  On Sepolia, MockUSDC will be deployed automatically");
    } else {
        console.log(`USDC Address:     ${usdcAddress || "NOT SET"}`);
        if (usdcAddress) {
            try {
                const code = await ethers.provider.getCode(usdcAddress);
                if (code === "0x") {
                    console.log("⚠️  WARNING: USDC address has no contract code!");
                } else {
                    console.log("✅ USDC contract exists at this address");
                }
            } catch (error) {
                console.log("❌ Error checking USDC contract:", error);
            }
        }
    }

    // Check API keys
    console.log("\nAPI Keys:");
    console.log(`Alchemy API Key:     ${process.env.ALCHEMY_API_KEY ? "✅ SET" : "❌ NOT SET"}`);
    console.log(`${explorerApiKeyName} API Key: ${process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY ? "✅ SET" : "❌ NOT SET"}`);

    // Warnings
    console.log("\n========================================");
    console.log("Pre-Deployment Checks:");
    console.log("========================================");

    const checks = [
        { name: `Deployer has ${currency}`, pass: balance > 0n },
        { name: "USDC address configured", pass: networkName === "sepolia" || !!usdcAddress },
        { name: "Alchemy API key set", pass: !!process.env.ALCHEMY_API_KEY },
        { name: `${explorerApiKeyName} API key set`, pass: !!(process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY) },
    ];

    checks.forEach(check => {
        console.log(`${check.pass ? "✅" : "❌"} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);

    console.log("\n========================================");
    if (allPassed) {
        console.log("✅ All checks passed! Ready to deploy.");
        console.log(`\nRun: npm run deploy:${networkName}`);
    } else {
        console.log("❌ Some checks failed. Please fix before deploying.");
        if (balance === 0n) {
            if (networkName === "sepolia") {
                console.log(`\nGet free ${currency} from: https://www.alchemy.com/faucets/ethereum-sepolia`);
            } else {
                console.log(`\nGet free ${currency} from: https://faucet.polygon.technology/`);
            }
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

