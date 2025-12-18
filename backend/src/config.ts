/**
 * FoundersNet Backend Configuration
 * 
 * Loads environment variables and provides typed configuration for the server.
 * Supports development (Hardhat local), testnet (Amoy), and mainnet (Polygon) environments.
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ============ Types ============

export type NetworkType = 'development' | 'amoy' | 'polygon';

export interface NetworkConfig {
    chainId: number;
    name: string;
    rpcUrl: string;
    contractAddress: string;
    usdcAddress: string;
    blockExplorer: string;
}

export interface AppConfig {
    port: number;
    host: string;
    nodeEnv: string;
    isDevelopment: boolean;
    isProduction: boolean;
    network: NetworkType;
    adminAddress: string;
    alchemyApiKey: string;
    networkConfig: NetworkConfig;
}

// ============ Network Configurations ============

const NETWORK_CONFIGS: Record<NetworkType, Omit<NetworkConfig, 'rpcUrl' | 'contractAddress'>> = {
    development: {
        chainId: 31337,
        name: 'Hardhat Local',
        usdcAddress: '', // Will be set from env or deployment
        blockExplorer: 'http://localhost:8545',
    },
    amoy: {
        chainId: 80002,
        name: 'Polygon Amoy Testnet',
        usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
        blockExplorer: 'https://amoy.polygonscan.com',
    },
    polygon: {
        chainId: 137,
        name: 'Polygon PoS Mainnet',
        usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        blockExplorer: 'https://polygonscan.com',
    },
};

// ============ Helper Functions ============

function getEnvOrThrow(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}

function getNetwork(): NetworkType {
    const network = getEnvOrDefault('NETWORK', 'development');
    if (!['development', 'amoy', 'polygon'].includes(network)) {
        throw new Error(`Invalid NETWORK value: ${network}. Must be 'development', 'amoy', or 'polygon'`);
    }
    return network as NetworkType;
}

function getRpcUrl(network: NetworkType, alchemyApiKey: string): string {
    switch (network) {
        case 'development':
            return 'http://127.0.0.1:8545';
        case 'amoy':
            return alchemyApiKey
                ? `https://polygon-amoy.g.alchemy.com/v2/${alchemyApiKey}`
                : 'https://rpc-amoy.polygon.technology';
        case 'polygon':
            return alchemyApiKey
                ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
                : 'https://polygon-rpc.com';
    }
}

function getContractAddress(network: NetworkType): string {
    switch (network) {
        case 'development':
            // For local development, read from env or use placeholder
            return getEnvOrDefault('CONTRACT_ADDRESS', '0x0000000000000000000000000000000000000000');
        case 'amoy':
            return getEnvOrDefault('CONTRACT_ADDRESS_AMOY', '');
        case 'polygon':
            return getEnvOrDefault('CONTRACT_ADDRESS_POLYGON', '');
    }
}

function getUsdcAddress(network: NetworkType): string {
    switch (network) {
        case 'development':
            // For local development with MockUSDC
            return getEnvOrDefault('USDC_ADDRESS', '0x0000000000000000000000000000000000000000');
        case 'amoy':
            return getEnvOrDefault('USDC_ADDRESS_AMOY', NETWORK_CONFIGS.amoy.usdcAddress);
        case 'polygon':
            return getEnvOrDefault('USDC_ADDRESS_POLYGON', NETWORK_CONFIGS.polygon.usdcAddress);
    }
}

// ============ Build Configuration ============

function buildConfig(): AppConfig {
    const network = getNetwork();
    const nodeEnv = getEnvOrDefault('NODE_ENV', 'development');
    const alchemyApiKey = getEnvOrDefault('ALCHEMY_API_KEY', '');

    const networkBaseConfig = NETWORK_CONFIGS[network];
    const networkConfig: NetworkConfig = {
        ...networkBaseConfig,
        rpcUrl: getRpcUrl(network, alchemyApiKey),
        contractAddress: getContractAddress(network),
        usdcAddress: getUsdcAddress(network),
    };

    return {
        port: parseInt(getEnvOrDefault('BACKEND_PORT', '3000'), 10),
        host: getEnvOrDefault('BACKEND_HOST', '0.0.0.0'),
        nodeEnv,
        isDevelopment: nodeEnv === 'development',
        isProduction: nodeEnv === 'production',
        network,
        adminAddress: getEnvOrDefault(
            'ADMIN_WALLET_ADDRESS',
            '0x3cab0d4baece087681585a2ccb8b09f7957c74abef25938f02046c8030ed83a1'
        ),
        alchemyApiKey,
        networkConfig,
    };
}

// Export singleton config
export const config = buildConfig();

// Log configuration on startup (excluding sensitive data)
export function logConfig(): void {
    console.log('========================================');
    console.log('FoundersNet Backend Configuration');
    console.log('========================================');
    console.log(`Network: ${config.networkConfig.name} (${config.network})`);
    console.log(`Chain ID: ${config.networkConfig.chainId}`);
    console.log(`RPC URL: ${config.networkConfig.rpcUrl.replace(/\/v2\/.*$/, '/v2/***')}`);
    console.log(`Contract: ${config.networkConfig.contractAddress || 'Not deployed'}`);
    console.log(`USDC: ${config.networkConfig.usdcAddress || 'Not configured'}`);
    console.log(`Admin: ${config.adminAddress}`);
    console.log(`Server: ${config.host}:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log('========================================');
}
