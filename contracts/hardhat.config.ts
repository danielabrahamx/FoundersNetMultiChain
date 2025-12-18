import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "hardhat-deploy";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

// Build Alchemy RPC URLs from API key
const alchemyKey = process.env.ALCHEMY_API_KEY;
const amoyRpcUrl = alchemyKey
  ? `https://polygon-amoy.g.alchemy.com/v2/${alchemyKey}`
  : "https://rpc-amoy.polygon.technology/";
const polygonRpcUrl = alchemyKey
  ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : "https://polygon-rpc.com/";
const sepoliaRpcUrl = alchemyKey
  ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
  : "https://rpc.sepolia.org/";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: sepoliaRpcUrl,
      chainId: 11155111,
      accounts: process.env.ADMIN_PRIVATE_KEY ? [process.env.ADMIN_PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
    amoy: {
      url: amoyRpcUrl,
      chainId: 80002,
      accounts: process.env.ADMIN_PRIVATE_KEY ? [process.env.ADMIN_PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
    polygon: {
      url: polygonRpcUrl,
      chainId: 137,
      accounts: process.env.ADMIN_PRIVATE_KEY ? [process.env.ADMIN_PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || process.env.POLYGONSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  namedAccounts: {
    deployer: {
      default: 0,
      sepolia: 0,
      amoy: 0,
      polygon: 0,
    },
  },
};

export default config;

