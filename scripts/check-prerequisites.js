#!/usr/bin/env node

/**
 * Prerequisites Check Script
 * 
 * Verifies that all required tools and dependencies are installed
 * before attempting to set up the FoundersNet development environment.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

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

function error(message) {
    log(`❌ ${message}`, COLORS.red);
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

function checkCommand(command, versionFlag = '--version') {
    try {
        const output = execSync(`${command} ${versionFlag}`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
        return { installed: true, version: output.split('\n')[0] };
    } catch {
        return { installed: false, version: null };
    }
}

function checkNodeVersion() {
    const result = checkCommand('node', '-v');
    if (!result.installed) {
        return { pass: false, message: 'Node.js is not installed' };
    }

    const version = result.version.replace('v', '');
    const major = parseInt(version.split('.')[0], 10);

    if (major < 20) {
        return {
            pass: false,
            message: `Node.js version ${version} is too old. Requires >=20.x`
        };
    }

    return { pass: true, message: `Node.js ${result.version}` };
}

function checkPnpmVersion() {
    const result = checkCommand('pnpm', '-v');
    if (!result.installed) {
        return {
            pass: false,
            message: 'pnpm is not installed. Run: npm install -g pnpm'
        };
    }

    const version = result.version;
    const major = parseInt(version.split('.')[0], 10);

    if (major < 9) {
        return {
            pass: false,
            message: `pnpm version ${version} is too old. Requires >=9.x. Run: pnpm self-update`
        };
    }

    return { pass: true, message: `pnpm ${result.version}` };
}

function checkGit() {
    const result = checkCommand('git', '--version');
    if (!result.installed) {
        return { pass: false, message: 'Git is not installed' };
    }
    return { pass: true, message: result.version };
}

function checkEnvFile() {
    const envPath = join(process.cwd(), '.env');
    const envExamplePath = join(process.cwd(), '.env.example');

    if (!existsSync(envPath)) {
        if (existsSync(envExamplePath)) {
            return {
                pass: false,
                message: '.env file not found. Run: cp .env.example .env'
            };
        }
        return {
            pass: false,
            message: '.env file not found and no .env.example template available'
        };
    }

    return { pass: true, message: '.env file exists' };
}

function checkWSL() {
    try {
        const osRelease = execSync('cat /proc/version 2>/dev/null || echo ""', {
            encoding: 'utf8'
        }).toLowerCase();

        if (osRelease.includes('microsoft') || osRelease.includes('wsl')) {
            return { pass: true, message: 'Running on WSL' };
        }

        if (osRelease.includes('linux')) {
            return { pass: true, message: 'Running on native Linux' };
        }

        return { pass: true, message: 'Running on supported platform' };
    } catch {
        return { pass: true, message: 'Running on non-Linux platform (may need adjustments)' };
    }
}

function main() {
    header('FoundersNet Prerequisites Check');

    let allPassed = true;
    const checks = [
        { name: 'Operating System', check: checkWSL },
        { name: 'Node.js', check: checkNodeVersion },
        { name: 'pnpm', check: checkPnpmVersion },
        { name: 'Git', check: checkGit },
        { name: 'Environment', check: checkEnvFile },
    ];

    console.log();

    for (const { name, check } of checks) {
        const result = check();
        if (result.pass) {
            success(`${name}: ${result.message}`);
        } else {
            error(`${name}: ${result.message}`);
            allPassed = false;
        }
    }

    console.log();

    if (allPassed) {
        header('All Prerequisites Met! ✅');
        info('You can now run: pnpm install');
        console.log();
        process.exit(0);
    } else {
        header('Missing Prerequisites ❌');
        warning('Please install the missing dependencies before continuing.');
        console.log();

        log('Installation guides:', COLORS.cyan);
        log('  Node.js:  https://nodejs.org/en/download/', COLORS.reset);
        log('  pnpm:     https://pnpm.io/installation', COLORS.reset);
        log('  Git:      https://git-scm.com/downloads', COLORS.reset);
        console.log();

        process.exit(1);
    }
}

main();
