import { HardhatRuntimeEnvironment } from "hardhat/types";
import hre from "hardhat";

/**
 * Fund Test Accounts
 * 
 * This script funds test accounts with:
 * 1. ETH (MATIC equivalent on local) for gas
 * 2. MockUSDC for betting
 * 
 * Provides account details for easy MetaMask import.
 * 
 * Run: pnpm fund:accounts
 */

// Hardhat default accounts (same as ganache-cli mnemonic: "test test test test test test test test test test test junk")
const HARDHAT_ACCOUNTS = [
    {
        name: "Account #0 (Admin/Deployer)",
        address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    },
    {
        name: "Account #1 (Test User 1)",
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    },
    {
        name: "Account #2 (Test User 2)",
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
    },
    {
        name: "Account #3 (Test User 3)",
        address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
    },
    {
        name: "Account #4 (Test User 4)",
        address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
    },
    {
        name: "Account #5 (Test User 5)",
        address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
        privateKey: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
    }
];

async function main() {
    const { ethers, deployments, network } = hre;

    console.log("\n========================================");
    console.log("💰 Funding Test Accounts");
    console.log(`Network: ${network.name}`);
    console.log("========================================\n");

    // Only run on localhost
    if (network.name !== "localhost" && network.name !== "hardhat") {
        console.log("⚠️  This script is only for local development!");
        console.log("   Run: pnpm dev:contracts");
        console.log("   Then: pnpm fund:accounts");
        process.exit(1);
    }

    // Get MockUSDC deployment
    let mockUSDCAddress: string;
    try {
        const mockUSDCDeployment = await deployments.get("MockUSDC");
        mockUSDCAddress = mockUSDCDeployment.address;
        console.log(`MockUSDC Contract: ${mockUSDCAddress}`);
    } catch (e) {
        console.log("❌ MockUSDC not deployed yet.");
        console.log("   Run: pnpm deploy:local");
        process.exit(1);
    }

    const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
    const marketDeployment = await deployments.get("FoundersNetMarket");

    console.log(`Market Contract: ${marketDeployment.address}\n`);

    // Fund each account
    const mintAmount = ethers.parseUnits("100000", 6); // 100,000 USDC each
    const signers = await ethers.getSigners();

    console.log("📋 Test Accounts (for MetaMask import):\n");
    console.log("═".repeat(80));

    for (let i = 0; i < Math.min(6, signers.length); i++) {
        const account = HARDHAT_ACCOUNTS[i];
        const signer = signers[i];

        // Mint USDC
        await mockUSDC.mint(signer.address, mintAmount);

        // Approve market contract (except admin who might not need it)
        if (i > 0) {
            await mockUSDC.connect(signer).approve(marketDeployment.address, ethers.MaxUint256);
        }

        // Get balances
        const ethBalance = await ethers.provider.getBalance(signer.address);
        const usdcBalance = await mockUSDC.balanceOf(signer.address);

        console.log(`\n${account.name}`);
        console.log(`  Address:     ${account.address}`);
        console.log(`  Private Key: ${account.privateKey}`);
        console.log(`  ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
        console.log(`  USDC:        ${ethers.formatUnits(usdcBalance, 6)} USDC`);
        if (i > 0) {
            console.log(`  Approved:    ✅ Market contract can spend USDC`);
        }
    }

    console.log("\n" + "═".repeat(80));

    console.log("\n📝 MetaMask Configuration:");
    console.log("═".repeat(80));
    console.log("\n1. Add Network to MetaMask:");
    console.log("   Network Name:    Hardhat Local");
    console.log("   RPC URL:         http://127.0.0.1:8545");
    console.log("   Chain ID:        31337");
    console.log("   Currency Symbol: ETH");
    console.log("   Block Explorer:  (leave empty)");

    console.log("\n2. Import Account:");
    console.log("   • Click account icon → 'Import Account'");
    console.log("   • Select 'Private Key'");
    console.log("   • Paste any private key from above");

    console.log("\n3. Add MockUSDC Token:");
    console.log("   • Click 'Import tokens'");
    console.log(`   • Token Contract: ${mockUSDCAddress}`);
    console.log("   • Symbol: USDC");
    console.log("   • Decimals: 6");

    console.log("\n⚠️  Important Notes:");
    console.log("   • These are TEST accounts - never use on mainnet!");
    console.log("   • Hardhat node must be running: pnpm dev:contracts");
    console.log("   • Restarting the node resets all state");
    console.log("   • MetaMask may need 'Reset Account' after node restart");
    console.log("     (Settings → Advanced → Reset Account)");

    console.log("\n========================================");
    console.log("✅ All accounts funded!");
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
