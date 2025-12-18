# FoundersNet Quick Reference

## 🚀 Quick Start Commands

### Initial Setup
```bash
# Install all dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### Development (All Services)
```bash
# Start everything in parallel
pnpm dev
```

## 📦 Package-Specific Commands

### Contracts
```bash
cd contracts

# Compile smart contracts
pnpm compile

# Run tests
pnpm test

# Run tests with gas reporting
pnpm test:gas

# Generate coverage report
pnpm test:coverage

# Check contract sizes
pnpm size

# Start local Hardhat node
pnpm node

# Deploy to local network
pnpm deploy:local

# Deploy to Amoy testnet
pnpm deploy:amoy

# Deploy to Polygon mainnet
pnpm deploy:polygon

# Verify on Polygonscan (Amoy)
pnpm verify:amoy <CONTRACT_ADDRESS>

# Verify on Polygonscan (Polygon)
pnpm verify:polygon <CONTRACT_ADDRESS>

# Lint Solidity files
pnpm lint

# Clean artifacts
pnpm clean
```

### Backend
```bash
cd backend

# Start dev server (auto-reload)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type check
pnpm typecheck

# Lint TypeScript
pnpm lint

# Clean build
pnpm clean
```

**Backend runs on:** `http://localhost:3000`

### Frontend
```bash
cd frontend

# Start Vite dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type check
pnpm typecheck

# Lint
pnpm lint

# Clean build
pnpm clean
```

**Frontend runs on:** `http://localhost:5173`

## 🎨 Code Quality

### From Root Directory
```bash
# Format all code (Prettier)
pnpm format

# Lint all packages
pnpm lint

# Build all packages
pnpm build

# Test all packages
pnpm test

# Clean all packages
pnpm clean
```

## 🔗 Important URLs

### Polygon Amoy Testnet
- **RPC:** `https://rpc-amoy.polygon.technology/`
- **Chain ID:** `80002`
- **Explorer:** https://amoy.polygonscan.com/
- **Faucet:** https://faucet.polygon.technology/
- **USDC:** `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`

### Polygon PoS Mainnet
- **RPC:** `https://polygon-rpc.com/`
- **Chain ID:** `137`
- **Explorer:** https://polygonscan.com/
- **USDC:** `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`

### API Providers
- **Alchemy:** https://www.alchemy.com/ (free tier: 300M compute units/month)
- **Infura:** https://www.infura.io/ (backup RPC)
- **Polygonscan API:** https://polygonscan.com/apis (for verification)

## 🛠️ Common Workflows

### Deploy New Contract to Testnet
```bash
# 1. Make sure you have testnet MATIC
# Visit: https://faucet.polygon.technology/

# 2. Deploy
cd contracts
pnpm deploy:amoy

# 3. Copy contract address from output
# Example: 0x1234567890abcdef...

# 4. Verify
pnpm verify:amoy 0x1234567890abcdef...

# 5. Update .env
echo "CONTRACT_ADDRESS_AMOY=0x1234567890abcdef..." >> ../.env
echo "VITE_CONTRACT_ADDRESS=0x1234567890abcdef..." >> ../.env
```

### Start Fresh Development
```bash
# From root directory

# 1. Clean everything
pnpm clean
rm -rf node_modules **/node_modules pnpm-lock.yaml

# 2. Reinstall
pnpm install

# 3. Compile contracts
cd contracts && pnpm compile && cd ..

# 4. Start all services
pnpm dev
```

### Run Full Test Suite
```bash
# From root directory

# Run all tests
pnpm test

# Or per package
cd contracts && pnpm test:coverage
cd backend && pnpm test:coverage
cd frontend && pnpm test
```

## 🐛 Troubleshooting Quick Fixes

### Port already in use
```bash
# Kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9

# Kill process on port 8545 (Hardhat node)
lsof -ti:8545 | xargs kill -9
```

### Module not found
```bash
# Clean install
rm -rf node_modules **/node_modules pnpm-lock.yaml
pnpm install
```

### Contract compilation errors
```bash
cd contracts
pnpm clean
pnpm compile
```

### Git issues in WSL
```bash
# Fix line endings
git config core.autocrlf input

# Refresh git index
git rm --cached -r .
git reset --hard
```

## 📊 Environment Variables Cheat Sheet

### Required for Development
```bash
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
ADMIN_PRIVATE_KEY=your_private_key_here
POLYGONSCAN_API_KEY=your_api_key_here
```

### After Contract Deployment
```bash
CONTRACT_ADDRESS_AMOY=0x...
VITE_CONTRACT_ADDRESS=0x...
```

### Optional
```bash
ALCHEMY_API_KEY=...
INFURA_API_KEY=...
REDIS_URL=redis://localhost:6379
```

## 🔐 Security Reminders

- ✅ `.env` is in `.gitignore`
- ❌ **NEVER** commit `.env` to git
- ❌ **NEVER** share your `ADMIN_PRIVATE_KEY`
- ✅ Use testnet for all testing
- ✅ Verify contracts on Polygonscan after deployment
- ✅ Keep backup of admin wallet seed phrase offline

## 📚 Documentation

- **Requirements:** `requirements.md`
- **Design Notes:** `design-notes.md`
- **Tech Stack:** `tech-stack.md`
- **Activity Log:** `docs/activity.md`
- **Tasks:** `tasks/todo.md`

---

**Need help?** Check the full README.md or consult the documentation files above.
