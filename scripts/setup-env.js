#!/usr/bin/env node

/**
 * Environment Setup Script
 * 
 * Creates .env file from .env.example if it doesn't exist,
 * and helps configure local development settings.
 */

import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = COLORS.reset) {
    console.log(`${color}${message}${COLORS.reset}`);
}

function success(message) {
    log(`✅ ${message}`, COLORS.green);
}

function warning(message) {
    log(`⚠️  ${message}`, COLORS.yellow);
}

function info(message) {
    log(`ℹ️  ${message}`, COLORS.cyan);
}

function header(message) {
    console.log();
    log('='.repeat(60), COLORS.blue);
    log(message, COLORS.blue);
    log('='.repeat(60), COLORS.blue);
}

function main() {
    const rootDir = process.cwd();
    const envPath = join(rootDir, '.env');
    const envExamplePath = join(rootDir, '.env.example');

    header('FoundersNet Environment Setup');
    console.log();

    // Check if .env exists
    if (existsSync(envPath)) {
        info('.env file already exists');

        // Read and validate
        const envContent = readFileSync(envPath, 'utf8');
        validateEnv(envContent);
        return;
    }

    // Check if .env.example exists
    if (!existsSync(envExamplePath)) {
        log('❌ .env.example not found. Please create it first.', COLORS.red);
        process.exit(1);
    }

    // Copy .env.example to .env
    info('Creating .env from .env.example...');
    copyFileSync(envExamplePath, envPath);
    success('.env file created');

    // Update for local development
    let envContent = readFileSync(envPath, 'utf8');

    // Set local development defaults
    envContent = envContent
        .replace(/^NETWORK=.*/m, 'NETWORK=localhost')
        .replace(/^NODE_ENV=.*/m, 'NODE_ENV=development')
        .replace(/^VITE_NETWORK=.*/m, 'VITE_NETWORK=localhost')
        .replace(/^VITE_CHAIN_ID=.*/m, 'VITE_CHAIN_ID=31337');

    writeFileSync(envPath, envContent);

    console.log();
    success('Environment configured for local development');
    console.log();

    info('Local development uses:');
    log('  - Hardhat local node (chainId: 31337)');
    log('  - MockUSDC (test tokens)');
    log('  - Pre-funded test accounts');
    console.log();

    info('Next steps:');
    log('  1. Start Hardhat node:   pnpm dev:contracts');
    log('  2. Deploy contracts:     pnpm deploy:local');
    log('  3. Start backend:        pnpm dev:backend');
    log('  4. Start frontend:       pnpm dev:frontend');
    console.log();

    info('Or run all together:');
    log('  pnpm dev:all');
    console.log();

    validateEnv(envContent);
}

function validateEnv(content) {
    const lines = content.split('\n');
    const warnings = [];

    // Check for required variables in production
    const network = getEnvValue(lines, 'NETWORK');

    if (network !== 'localhost' && network !== 'development') {
        if (!getEnvValue(lines, 'ADMIN_PRIVATE_KEY')) {
            warnings.push('ADMIN_PRIVATE_KEY is required for testnet/mainnet deployment');
        }
        if (!getEnvValue(lines, 'ALCHEMY_API_KEY')) {
            warnings.push('ALCHEMY_API_KEY is recommended for reliable RPC access');
        }
    }

    if (warnings.length > 0) {
        console.log();
        warning('Configuration warnings:');
        warnings.forEach(w => log(`  - ${w}`, COLORS.yellow));
        console.log();
    }
}

function getEnvValue(lines, key) {
    for (const line of lines) {
        const match = line.match(new RegExp(`^${key}=(.*)$`));
        if (match) {
            return match[1].trim();
        }
    }
    return null;
}

main();
