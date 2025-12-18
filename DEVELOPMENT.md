# FoundersNet Local Development Guide

This guide covers setting up and running the FoundersNet development environment on Ubuntu 22.04 WSL.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Development Workflow](#development-workflow)
4. [Test Accounts](#test-accounts)
5. [MetaMask Configuration](#metamask-configuration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Testnet Tokens](#testnet-tokens)

---

## Prerequisites

### Required Software

| Tool | Version | Check Command | Installation |
|------|---------|---------------|--------------|
| Node.js | ≥20.x | `node -v` | [nodejs.org](https://nodejs.org/) |
| pnpm | ≥9.x | `pnpm -v` | `npm install -g pnpm` |
| Git | any | `git --version` | `sudo apt install git` |

### System Requirements

- **OS:** Ubuntu 22.04 LTS (WSL2 on Windows recommended)
- **RAM:** 8GB minimum (16GB recommended)
- **Disk:** ~2GB free space for dependencies

### Check Prerequisites

Run the automated check:

```bash
pnpm setup:check
```

This verifies all required tools are installed with correct versions.

---

## Quick Start

### One-Command Setup

```bash
# Clone repository (if not already done)
git clone <repository-url>
cd FoundersNetMultiChain

# Install dependencies and configure environment
pnpm setup

# Start everything (3 terminal windows recommended)
pnpm dev:all
```

### Step-by-Step Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env if needed (defaults work for local development)
   ```

3. **Start Hardhat local node:**
   ```bash
   pnpm dev:contracts
   ```
   Keep this terminal running. It shows transaction logs.

4. **In a new terminal, deploy contracts:**
   ```bash
   pnpm deploy:local
   ```

5. **Fund test accounts:**
   ```bash
   cd contracts && pnpm fund:accounts
   ```
   This shows account details for MetaMask import.

6. **Seed sample data (optional):**
   ```bash
   cd contracts && pnpm seed:local
   ```
   Creates sample markets and bets for testing.

7. **Start backend server:**
   ```bash
   pnpm dev:backend
   ```
   Runs on http://localhost:3000

8. **Start frontend dev server:**
   ```bash
   pnpm dev:frontend
   ```
   Opens http://localhost:5173 in browser

---

## Development Workflow

### Available Scripts

#### Root Level (`pnpm ...`)

| Command | Description |
|---------|-------------|
| `dev:contracts` | Start Hardhat local blockchain |
| `dev:backend` | Start Fastify server with hot reload |
| `dev:frontend` | Start Vite dev server |
| `dev:all` | Run all three concurrently |
| `deploy:local` | Deploy contracts to local network |
| `test:contracts` | Run smart contract tests |
| `test:integration` | Run integration tests |
| `setup` | Initial project setup |

#### Contracts (`cd contracts && pnpm ...`)

| Command | Description |
|---------|-------------|
| `node` | Start Hardhat node |
| `compile` | Compile smart contracts |
| `test` | Run unit tests |
| `test:coverage` | Generate coverage report |
| `test:gas` | Run tests with gas reporting |
| `deploy:local` | Deploy to local Hardhat node |
| `seed:local` | Create sample markets and bets |
| `fund:accounts` | Fund test accounts with USDC |

### Development Cycle

1. **Make contract changes** → Run `pnpm test:contracts`
2. **Restart Hardhat node** → Re-deploy: `pnpm deploy:local`
3. **Make frontend changes** → Auto-reloads via Vite
4. **Make backend changes** → Auto-reloads via tsx

### Project Structure

```
FoundersNetMultiChain/
├── contracts/           # Solidity smart contracts
│   ├── contracts/       # Source files
│   ├── deploy/          # Deployment scripts
│   ├── scripts/         # Utility scripts
│   └── test/            # Contract tests
├── backend/             # Fastify server
│   ├── src/             # TypeScript source
│   └── views/           # EJS templates
├── frontend/            # Vite + HTMX frontend
│   ├── src/             # TypeScript source
│   └── public/          # Static assets
└── scripts/             # Project-level scripts
```

---

## Test Accounts

Hardhat provides 20 pre-funded accounts with 10,000 ETH each. The first account is the admin/deployer.

### Default Accounts

| Account | Address | Private Key |
|---------|---------|-------------|
| Admin (#0) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| User #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| User #2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| User #3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| User #4 | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` |

**⚠️ WARNING:** These are PUBLIC test keys. Never use them on mainnet!

### Get Account Details

```bash
cd contracts && pnpm fund:accounts
```

This shows all accounts with current balances and MetaMask import instructions.

---

## MetaMask Configuration

### Add Hardhat Local Network

1. Open MetaMask → Settings → Networks → Add Network
2. Enter these details:

| Field | Value |
|-------|-------|
| Network Name | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency Symbol | ETH |
| Block Explorer | (leave empty) |

### Import Test Account

1. Click account icon → "Import Account"
2. Select "Private Key"
3. Paste a private key from above
4. Click "Import"

### Add MockUSDC Token

1. Click "Import tokens" at bottom of MetaMask
2. Enter token contract address (shown after `pnpm deploy:local`)
3. Symbol: `USDC`
4. Decimals: `6`

### Reset Account After Node Restart

When you restart the Hardhat node, MetaMask nonce gets out of sync:

1. Settings → Advanced → Clear activity tab data
2. Or: Settings → Advanced → Reset Account

---

## Testing

### Smart Contract Tests

```bash
# Run all tests
pnpm test:contracts

# Run with coverage
cd contracts && pnpm test:coverage

# Run with gas reporting
cd contracts && pnpm test:gas
```

### Integration Tests

Integration tests run against the local Hardhat node:

```bash
# Start Hardhat node first
pnpm dev:contracts

# In another terminal
pnpm test:integration
```

### Test Checklist

Before submitting PRs, verify:

- [ ] All contract tests pass: `pnpm test:contracts`
- [ ] Coverage > 95%: `cd contracts && pnpm test:coverage`
- [ ] No gas regressions: `cd contracts && pnpm test:gas`
- [ ] Integration tests pass: `pnpm test:integration`
- [ ] Frontend loads without console errors
- [ ] Wallet connects and shows correct network
- [ ] Can place a bet end-to-end
- [ ] Can claim winnings after resolution
- [ ] Admin panel accessible from admin account only

---

## Troubleshooting

### Common Issues

#### "Cannot connect to network"

**Symptom:** MetaMask shows "Couldn't connect to network" error

**Solution:**
1. Verify Hardhat node is running: `pnpm dev:contracts`
2. Check RPC URL is `http://127.0.0.1:8545` (not `localhost`)
3. Restart MetaMask (lock/unlock)

#### "Nonce too high"

**Symptom:** Transaction fails with "nonce too high" error

**Solution:**
1. MetaMask → Settings → Advanced → Clear activity tab data
2. Or reset account: Settings → Advanced → Reset Account

#### "Contract not deployed"

**Symptom:** Contract calls fail, address is undefined

**Solution:**
1. Ensure contracts are deployed: `pnpm deploy:local`
2. Check deployment saved addresses in `contracts/deployments/localhost/`
3. Verify `.env` has correct `CONTRACT_ADDRESS` (for testnet)

#### "Insufficient funds"

**Symptom:** Can't place bets, shows insufficient USDC

**Solution:**
1. Fund accounts: `cd contracts && pnpm fund:accounts`
2. Import the MockUSDC token in MetaMask
3. Check you're using a funded test account

#### Backend won't start

**Symptom:** Backend fails with port in use error

**Solution:**
1. Check for existing process: `lsof -i :3000`
2. Kill existing process: `kill -9 <PID>`
3. Or change port in `.env`: `BACKEND_PORT=3001`

#### TypeScript errors in contracts

**Symptom:** Type errors when running scripts

**Solution:**
1. Regenerate types: `cd contracts && pnpm compile`
2. Check `typechain-types/` directory exists
3. Restart TypeScript server in your IDE

### Getting Help

1. Check this troubleshooting guide
2. Review error logs carefully
3. Search existing issues on GitHub
4. Create a new issue with:
   - Full error message
   - Steps to reproduce
   - Node/pnpm versions
   - Operating system

---

## Testnet Tokens

When ready to test on public testnets, you'll need testnet tokens.

### Polygon Amoy Testnet

#### Get MATIC (for gas)

1. Go to [Polygon Faucet](https://faucet.polygon.technology/)
2. Select "Amoy" network
3. Enter your wallet address
4. Complete captcha and request tokens

Alternative faucets:
- [Alchemy Faucet](https://www.alchemy.com/faucets/polygon-amoy)
- [QuickNode Faucet](https://faucet.quicknode.com/polygon/amoy)

#### Get Test USDC

Amoy testnet has limited USDC faucets. Options:

1. **Deploy MockUSDC:** We deploy our own MockUSDC on testnets that lack official USDC
2. **Bridge from Sepolia:** Some bridges support testnet USDC transfers
3. **Ask in Discord:** Community members may send test tokens

### Sepolia Testnet

#### Get ETH (for gas)

1. [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
2. [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
3. [QuickNode Sepolia Faucet](https://faucet.quicknode.com/ethereum/sepolia)

#### Get Test USDC

Our deployment script automatically deploys MockUSDC on Sepolia since there's no official USDC contract.

### Faucet Best Practices

- Use a dedicated testnet wallet (not your main wallet)
- Request tokens in advance (faucets may have rate limits)
- Keep testnet and mainnet accounts separate
- Never send real funds to testnet addresses

---

## Environment Variables

### Local Development Defaults

For local development, the defaults work out of the box:

```bash
NETWORK=localhost
NODE_ENV=development
VITE_NETWORK=localhost
VITE_CHAIN_ID=31337
```

### Switching to Testnet

To test on Polygon Amoy:

```bash
# .env
NETWORK=amoy
ALCHEMY_API_KEY=your_alchemy_key
ADMIN_PRIVATE_KEY=your_private_key
VITE_NETWORK=amoy
VITE_CHAIN_ID=80002
VITE_CONTRACT_ADDRESS=<deployed_address>
```

### Environment Variable Reference

See `.env.example` for complete documentation of all variables.

---

## Tips for Development

### Hot Reload

- **Frontend:** Vite hot-reloads TypeScript and CSS automatically
- **Backend:** tsx watches for changes and restarts automatically
- **Contracts:** Must manually redeploy after changes

### VSCode Extensions

Recommended extensions for this project:

- Solidity (Juan Blanco)
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- EJS Language Support

### Multiple Terminals

Using a terminal multiplexer like `tmux` helps manage multiple processes:

```bash
# Install tmux
sudo apt install tmux

# Create named session
tmux new -s foundersnet

# Split panes: Ctrl+B then %
# Switch panes: Ctrl+B then arrow keys
```

### Quick Reset

To completely reset local state:

```bash
# Stop all processes (Ctrl+C)
# Clean and reinstall
pnpm clean
pnpm install
cd contracts && pnpm clean && pnpm compile
# Restart node
pnpm dev:contracts
# Redeploy
pnpm deploy:local
```

---

## Next Steps

After setting up the development environment:

1. Read `requirements.md` to understand the product
2. Read `design-notes.md` for UX decisions
3. Read `tech-stack.md` for technical details
4. Check `tasks/todo.md` for current work items

Happy coding! 🚀
