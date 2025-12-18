# FoundersNet

A permissionless, parimutuel prediction market for startup fundraises built on Polygon.

## 📋 Overview

FoundersNet allows users to place USDC-denominated bets on whether startups will successfully complete specified fundraises by given deadlines. The platform uses a parimutuel model where all bets are pooled together and payouts are determined after market resolution based on pool distribution.

**Key Features:**
- Binary prediction markets (YES/NO)
- USDC escrow in smart contracts
- Parimutuel payout model
- Manual admin resolution
- Wallet-only authentication (no accounts)
- Deployed on Polygon for low gas costs

## 🏗️ Architecture

This is a **pnpm monorepo** with three main packages:

```
FoundersNetMultiChain/
├── contracts/          # Hardhat smart contracts (Solidity)
├── backend/            # Fastify server with EJS templates
├── frontend/           # Vite + HTMX + Tailwind CSS
└── package.json        # Root workspace configuration
```

## 🛠️ Tech Stack

### Smart Contracts
- **Solidity** `^0.8.20` - Smart contract language
- **Hardhat** `^2.22` - Development framework
- **OpenZeppelin** `^5.0` - Audited contract libraries
- **TypeChain** - TypeScript bindings for contracts

### Backend
- **Node.js** `20.x LTS` - Runtime
- **Fastify** `^4.28` - High-performance HTTP server
- **EJS** `^3.1` - Server-side templating
- **viem** `^2.21` - Ethereum library for reading blockchain state

### Frontend
- **Vite** `^5.0` - Build tool and dev server
- **HTMX** `^2.0` - Server-driven interactivity
- **Tailwind CSS** `^3.4` - Utility-first CSS
- **viem** `^2.21` - Wallet connection and Web3 interactions
- **TypeScript** `^5.6` - Type safety

### Blockchain
- **Polygon Amoy Testnet** (Chain ID: 80002) - Development and testing
- **Polygon PoS Mainnet** (Chain ID: 137) - Production deployment
- **USDC** - ERC-20 token for bets and payouts

## 📦 Prerequisites

### System Requirements
- **Operating System**: Ubuntu 22.04 LTS (WSL2 on Windows recommended)
- **Node.js**: Version 20.x LTS or higher
- **pnpm**: Version 9.x or higher

### Installation on Ubuntu 22.04 WSL

#### 1. Install Node.js 20.x LTS

```bash
# Update package list
sudo apt update

# Install curl if not already installed
sudo apt install -y curl

# Download and install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher
```

#### 2. Install pnpm

```bash
# Install pnpm globally via npm
npm install -g pnpm

# Verify installation
pnpm --version  # Should show 9.x.x or higher
```

#### 3. Install Git (if not already installed)

```bash
sudo apt install -y git

# Configure git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 🚀 Getting Started

### 1. Clone the Repository

```bash
# Navigate to your projects directory
cd ~

# Clone the repository (or use your existing directory)
# If already cloned, skip this step
git clone &lt;repository-url&gt; FoundersNetMultiChain
cd FoundersNetMultiChain
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies (contracts, backend, frontend)
pnpm install
```

This will install dependencies for all three packages in parallel.

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Required Variables:**
- `POLYGON_AMOY_RPC_URL` - Get from [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/)
- `ADMIN_PRIVATE_KEY` - **KEEP THIS SECRET!** For deploying contracts and resolving markets
- `POLYGONSCAN_API_KEY` - Get from [Polygonscan](https://polygonscan.com/apis) for contract verification

**Example `.env` Configuration:**

```bash
# Network
NETWORK=amoy

# Polygon Amoy Testnet RPC
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# Admin wallet (deploy contracts and resolve markets)
ADMIN_PRIVATE_KEY=your_private_key_here

# Polygonscan API key (for contract verification)
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here

# USDC addresses (testnet default is pre-filled)
USDC_ADDRESS_AMOY=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582

# Backend
BACKEND_PORT=3000
NODE_ENV=development

# Frontend
VITE_NETWORK=amoy
VITE_CHAIN_ID=80002
VITE_RPC_URL=https://rpc-amoy.polygon.technology/
VITE_USDC_ADDRESS=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582
```

### 4. Development Workflow

#### All Services (Parallel)

```bash
# Start all services in parallel (contracts compilation, backend server, frontend dev server)
pnpm dev
```

#### Individual Services

**Smart Contracts:**

```bash
cd contracts

# Compile contracts
pnpm compile

# Run tests
pnpm test

# Run coverage
pnpm test:coverage

# Start local Hardhat node
pnpm node

# Deploy to local network
pnpm deploy:local

# Deploy to Amoy testnet
pnpm deploy:amoy
```

**Backend:**

```bash
cd backend

# Start development server (auto-reload on changes)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Access backend at: `http://localhost:3000`

**Frontend:**

```bash
cd frontend

# Start Vite dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

Access frontend at: `http://localhost:5173`

## 🔧 Smart Contract Deployment

### Deploy to Polygon Amoy Testnet

1. **Get Testnet MATIC:**
   - Use [Polygon Faucet](https://faucet.polygon.technology/)
   - Select "Amoy Testnet" and enter your admin wallet address
   - Wait for MATIC to arrive

2. **Deploy Contract:**

```bash
cd contracts
pnpm deploy:amoy
```

3. **Verify Contract on Polygonscan:**

```bash
# Contract address will be shown in deployment output
pnpm verify:amoy &lt;CONTRACT_ADDRESS&gt;
```

4. **Update Environment Variables:**

After deployment, update `.env` with:
```bash
CONTRACT_ADDRESS_AMOY=0x...  # Your deployed contract address
VITE_CONTRACT_ADDRESS=0x...   # Same address for frontend
```

### Deploy to Polygon Mainnet

⚠️ **WARNING:** Only deploy to mainnet after thorough testing on Amoy testnet!

```bash
cd contracts
pnpm deploy:polygon
pnpm verify:polygon &lt;CONTRACT_ADDRESS&gt;
```

## 📁 Project Structure

```
FoundersNetMultiChain/
│
├── contracts/                      # Smart contracts workspace
│   ├── contracts/
│   │   └── FoundersNetMarket.sol  # Main market contract
│   ├── scripts/
│   │   └── deploy.ts              # Deployment script
│   ├── test/
│   │   └── FoundersNetMarket.test.ts
│   ├── hardhat.config.ts          # Hardhat configuration
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                        # Fastify backend workspace
│   ├── src/
│   │   ├── server.ts              # Main server file
│   │   └── views/
│   │       └── index.ejs          # EJS templates
│   ├── public/
│   │   └── styles.css             # Static assets
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/                       # Vite frontend workspace
│   ├── src/
│   │   ├── main.ts                # Entry point
│   │   └── styles/
│   │       └── main.css           # Tailwind CSS
│   ├── index.html                 # Main HTML template
│   ├── vite.config.ts             # Vite configuration
│   ├── tailwind.config.js         # Tailwind configuration
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── .env                           # Environment variables (DO NOT COMMIT)
├── .env.example                   # Environment template
├── .gitignore
├── .prettierrc.json               # Code formatting
├── package.json                   # Root workspace config
├── pnpm-workspace.yaml            # pnpm workspace definition
└── README.md                      # This file
```

## 🧪 Testing

### Smart Contracts

```bash
cd contracts

# Run all tests
pnpm test

# Run with gas reporting
pnpm test:gas

# Generate coverage report
pnpm test:coverage
```

### Backend

```bash
cd backend
pnpm test
```

### Linting and Formatting

```bash
# From root directory

# Format all code
pnpm format

# Lint all packages
pnpm lint
```

## 🔐 Security Considerations

### Private Keys
- **NEVER** commit `.env` files to version control
- **NEVER** share your `ADMIN_PRIVATE_KEY`
- Use a hardware wallet for mainnet admin operations
- Keep backup of admin wallet seed phrase in a secure location

### Smart Contract Safety
- All user funds are held in contract escrow (not admin wallet)
- Admin can only resolve markets, cannot withdraw arbitrary funds
- Reentrancy guards on all state-changing functions
- Solidity ^0.8.20 has built-in overflow/underflow protection

### Trusted Admin Model
- Admin is trusted to resolve markets correctly
- Admin cannot modify existing bets or steal funds
- For MVP, single admin wallet (future: multi-sig or DAO)

## 📚 Additional Resources

### Documentation
- [Requirements](./requirements.md) - Full functional requirements
- [Design Notes](./design-notes.md) - UX decisions and tradeoffs
- [Tech Stack](./tech-stack.md) - Detailed technology choices

### External Links
- [Hardhat Docs](https://hardhat.org/docs)
- [Vite Docs](https://vitejs.dev/)
- [HTMX Docs](https://htmx.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [viem Docs](https://viem.sh/)
- [Polygon Docs](https://docs.polygon.technology/)

## 🐛 Troubleshooting

### Common Issues

**1. `command not found: pnpm`**
```bash
# Reinstall pnpm globally
npm install -g pnpm
```

**2. `Error: No RPC URL provided`**
```bash
# Make sure .env file exists and contains POLYGON_AMOY_RPC_URL
cp .env.example .env
# Edit .env with your Alchemy/Infura API key
```

**3. `Error: Insufficient funds for gas`**
```bash
# Get testnet MATIC from Polygon faucet
# Visit: https://faucet.polygon.technology/
```

**4. Port already in use**
```bash
# Backend (port 3000)
lsof -ti:3000 | xargs kill -9

# Frontend (port 5173)
lsof -ti:5173 | xargs kill -9
```

**5. `Module not found` errors**
```bash
# Clean install
rm -rf node_modules **/node_modules pnpm-lock.yaml
pnpm install
```

## 🤝 Contributing

This is an MVP project. Contributions should prioritize simplicity over features.

### Code Style
- Use Prettier for formatting: `pnpm format`
- Follow existing patterns in each workspace
- Write tests for new smart contract functions
- Keep commits small and focused

## 📝 License

*License information to be added*

## 👥 Contact

*Contact information to be added*

---

**Built with ❤️ for the startup ecosystem**
