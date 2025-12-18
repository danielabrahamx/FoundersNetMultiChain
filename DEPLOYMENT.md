# FoundersNet Smart Contract Deployment Guide

This guide provides step-by-step instructions for deploying the FoundersNetMarket smart contract to Polygon networks.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Testnet Deployment (Polygon Amoy)](#testnet-deployment-polygon-amoy)
- [Mainnet Deployment (Polygon PoS)](#mainnet-deployment-polygon-pos)
- [Post-Deployment Steps](#post-deployment-steps)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Node.js**: v20.x LTS or higher
- **pnpm**: v9.x or higher
- **Git**: For version control
- **Ubuntu 22.04 WSL** (or any Linux environment)

### Required Accounts

1. **Alchemy Account** (for RPC access)
   - Sign up at: https://www.alchemy.com/
   - Free tier provides 300M compute units/month

2. **Polygonscan Account** (for contract verification)
   - Sign up at: https://polygonscan.com/register
   - Required for automatic contract verification

3. **Wallet with Private Key**
   - MetaMask or any EVM-compatible wallet
   - **CRITICAL**: This wallet will be the contract owner (admin)
   - Must have MATIC for gas fees:
     - Testnet: Get free MATIC from [Polygon Faucet](https://faucet.polygon.technology/)
     - Mainnet: Purchase MATIC on exchanges

---

## Environment Setup

### 1. Install Dependencies

```bash
cd contracts
pnpm install
```

### 2. Create Environment File

```bash
# Copy example environment file
cp ../.env.example ../.env
```

### 3. Configure Environment Variables

Edit `../.env` and fill in the following **required** variables:

#### A. Alchemy API Key

1. Go to https://dashboard.alchemy.com/
2. Click "Create App"
3. Select:
   - **Chain**: Polygon
   - **Network**: Polygon Amoy (for testnet) or Polygon PoS (for mainnet)
4. Copy your API key
5. Update `.env`:

```bash
ALCHEMY_API_KEY=your_alchemy_api_key_here
```

6. Update RPC URLs:

```bash
# For Amoy Testnet
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your_alchemy_api_key_here

# For Polygon Mainnet
POLYGON_MAINNET_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your_alchemy_api_key_here
```

#### B. Polygonscan API Key

1. Go to https://polygonscan.com/myapikey
2. Click "Add" to create a new API key
3. Copy the API key
4. Update `.env`:

```bash
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
```

**Note**: The same API key works for both Amoy testnet and Polygon mainnet.

#### C. Admin Private Key

**⚠️ SECURITY WARNING**: Never commit your private key to version control!

1. Export your private key from MetaMask:
   - Click account menu → Account Details → Export Private Key
   - Enter password and copy the key

2. Update `.env`:

```bash
ADMIN_PRIVATE_KEY=0xYourPrivateKeyHere
```

3. Verify `.env` is in `.gitignore`:

```bash
# Check that .env is ignored
git status
# Should NOT show .env as untracked
```

#### D. USDC Token Addresses

**CRITICAL**: Verify USDC addresses on Polygonscan before deployment!

##### Amoy Testnet USDC

Default address (Circle USDC on Amoy):
```bash
USDC_ADDRESS_AMOY=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582
```

**Verification Steps**:
1. Visit: https://amoy.polygonscan.com/address/0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582
2. Verify:
   - Contract is verified (green checkmark)
   - Token name is "USD Coin" or similar
   - Symbol is "USDC"
   - Decimals is 6

**Alternative**: Deploy MockUSDC for testing:
```bash
# Deploy MockUSDC first
npx hardhat run scripts/deploy-mock-usdc.ts --network amoy
# Update USDC_ADDRESS_AMOY with deployed address
```

##### Polygon Mainnet USDC

Default address (Native USDC on Polygon PoS):
```bash
USDC_ADDRESS_POLYGON=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
```

**Verification Steps**:
1. Visit: https://polygonscan.com/address/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
2. Verify:
   - Contract name: "USD Coin"
   - Symbol: "USDC"
   - Decimals: 6
   - **DO NOT use USDC.e** (bridged version at 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174)

---

## Pre-Deployment Checklist

Before deploying, verify:

- [ ] All environment variables are set in `.env`
- [ ] `.env` file is NOT committed to git
- [ ] Admin wallet has sufficient MATIC for gas:
  - Testnet: ~0.1 MATIC (free from faucet)
  - Mainnet: ~0.5 MATIC (purchase on exchange)
- [ ] USDC addresses are verified on Polygonscan
- [ ] Alchemy RPC URLs are correct
- [ ] Polygonscan API key is valid
- [ ] Admin private key is correct (matches intended admin address)

### Test Compilation

```bash
cd contracts
npx hardhat compile
```

Expected output:
```
Compiled 5 Solidity files successfully
```

### Run Tests (Optional but Recommended)

```bash
npx hardhat test
```

All tests should pass before deployment.

---

## Testnet Deployment (Polygon Amoy)

### Step 1: Verify Network Configuration

```bash
# Check that Amoy network is configured
npx hardhat run --network amoy scripts/check-network.ts
```

### Step 2: Check Admin Balance

```bash
# Verify admin wallet has MATIC for gas
npx hardhat run scripts/check-balance.ts --network amoy
```

If balance is 0, get testnet MATIC:
- Visit: https://faucet.polygon.technology/
- Select "Polygon Amoy"
- Enter your admin wallet address
- Request MATIC (usually 0.5 MATIC per request)

### Step 3: Deploy Contract

```bash
npx hardhat deploy --network amoy
```

**Expected Output**:
```
========================================
FoundersNet Market Deployment
========================================
Network: amoy
Chain ID: 80002
Deployer: 0xYourAdminAddress
USDC Address: 0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582
========================================

Deploying FoundersNetMarket...
✅ FoundersNetMarket deployed to: 0xDeployedContractAddress
   Transaction hash: 0x...
   Gas used: ~2,500,000

========================================
Verifying contract on Polygonscan...
========================================
Waiting 30 seconds for Polygonscan to index...
✅ Contract verified on Polygonscan

✅ Deployment addresses saved to: deployments/amoy.json

========================================
Deployment Summary
========================================
Network:           amoy
Chain ID:          80002
Market Contract:   0xDeployedContractAddress
USDC Token:        0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582
Deployer:          0xYourAdminAddress
========================================
```

### Step 4: Save Deployment Address

The deployment script automatically saves addresses to `deployments/amoy.json`.

**Manual Update** (if needed):
```bash
# Update .env
CONTRACT_ADDRESS_AMOY=0xDeployedContractAddress

# Update frontend .env
cd ../frontend
echo "VITE_CONTRACT_ADDRESS=0xDeployedContractAddress" >> .env
```

### Step 5: Verify on Polygonscan

1. Visit: `https://amoy.polygonscan.com/address/0xDeployedContractAddress`
2. Check:
   - Contract is verified (green checkmark)
   - "Read Contract" and "Write Contract" tabs are visible
   - Constructor arguments show correct USDC address

---

## Mainnet Deployment (Polygon PoS)

**⚠️ WARNING**: Mainnet deployment uses real funds. Double-check everything!

### Pre-Mainnet Checklist

- [ ] Contract tested thoroughly on Amoy testnet
- [ ] At least 5 test markets created and resolved successfully on testnet
- [ ] No critical bugs identified
- [ ] Admin wallet has at least 0.5 MATIC on Polygon mainnet
- [ ] USDC address verified: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`
- [ ] Security review completed (even if informal)
- [ ] Backup of admin private key stored securely

### Step 1: Final Environment Check

```bash
# Verify mainnet configuration
cat ../.env | grep POLYGON_MAINNET
cat ../.env | grep USDC_ADDRESS_POLYGON
```

Expected:
```
POLYGON_MAINNET_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
USDC_ADDRESS_POLYGON=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
```

### Step 2: Check Mainnet Balance

```bash
npx hardhat run scripts/check-balance.ts --network polygon
```

Ensure balance > 0.5 MATIC.

### Step 3: Deploy to Mainnet

```bash
npx hardhat deploy --network polygon
```

**Expected Output**: Similar to testnet deployment.

### Step 4: Verify Deployment

1. Visit: `https://polygonscan.com/address/0xDeployedContractAddress`
2. Verify contract is verified and functional
3. Test read functions (getMarketCount, etc.)

### Step 5: Update Production Environment

```bash
# Update .env
CONTRACT_ADDRESS_POLYGON=0xDeployedContractAddress

# Update frontend production .env
cd ../frontend
echo "VITE_CONTRACT_ADDRESS=0xDeployedContractAddress" >> .env.production
echo "VITE_NETWORK=polygon" >> .env.production
```

---

## Post-Deployment Steps

### 1. Test Contract Functions

#### Create Test Market (Admin Only)

```bash
npx hardhat run scripts/create-test-market.ts --network amoy
# or
npx hardhat run scripts/create-test-market.ts --network polygon
```

#### Verify Market Creation

Visit Polygonscan and check:
- "Events" tab shows `MarketCreated` event
- `getMarketCount()` returns 1
- `getMarket(0)` returns market details

### 2. Update Frontend Configuration

Edit `frontend/.env`:
```bash
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_USDC_ADDRESS=0xYourUSDCAddress
VITE_NETWORK=amoy  # or polygon
VITE_CHAIN_ID=80002  # or 137 for mainnet
```

### 3. Update Backend Configuration

Edit `backend/.env`:
```bash
CONTRACT_ADDRESS=0xYourDeployedContractAddress
USDC_ADDRESS=0xYourUSDCAddress
NETWORK=amoy  # or polygon
```

### 4. Commit Deployment Info

```bash
# Commit deployment addresses (NOT private keys!)
git add deployments/amoy.json
git add deployments/polygon.json
git commit -m "Add deployment addresses for [network]"
git push
```

---

## Verification

### Manual Verification (if automatic fails)

If automatic verification fails during deployment, verify manually:

```bash
npx hardhat verify --network amoy 0xYourContractAddress 0xUSDCAddress
# or
npx hardhat verify --network polygon 0xYourContractAddress 0xUSDCAddress
```

### Verify Contract on Polygonscan UI

1. Go to contract address on Polygonscan
2. Click "Contract" tab
3. Click "Verify and Publish"
4. Select:
   - Compiler: v0.8.20
   - Optimization: Yes (200 runs)
   - Constructor arguments: USDC address (ABI-encoded)
5. Paste contract source code
6. Submit

---

## Troubleshooting

### Error: "Insufficient funds for gas"

**Solution**: Add more MATIC to admin wallet
- Testnet: Use faucet
- Mainnet: Purchase MATIC on exchange and send to admin address

### Error: "Invalid USDC address"

**Solution**: Verify USDC address in `.env` matches Polygonscan
- Check `USDC_ADDRESS_AMOY` or `USDC_ADDRESS_POLYGON`
- Ensure address is checksummed (correct capitalization)

### Error: "Network not configured"

**Solution**: Check `hardhat.config.ts` and `.env`
- Verify RPC URL is correct
- Ensure Alchemy API key is valid
- Test RPC connection: `curl https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`

### Error: "Verification failed"

**Solution**: Wait and retry
- Polygonscan may take time to index contract
- Wait 1-2 minutes and run verification again
- If still fails, verify manually (see Verification section)

### Error: "Nonce too high"

**Solution**: Reset Hardhat cache
```bash
rm -rf cache artifacts
npx hardhat clean
npx hardhat compile
```

### Deployment succeeds but contract not visible on Polygonscan

**Solution**: Wait for block confirmation
- Testnet: ~5-10 seconds
- Mainnet: ~30-60 seconds
- Check transaction hash on Polygonscan to confirm inclusion

---

## Security Best Practices

### Private Key Management

- **NEVER** commit `.env` to git
- Store backup of private key in secure location (password manager, hardware wallet)
- Consider using hardware wallet for mainnet admin
- Rotate admin to multi-sig wallet after initial deployment

### Contract Ownership

The deployer address becomes the contract owner (admin). This address:
- Can create markets
- Can resolve markets
- **Cannot** steal user funds (by design)

To transfer ownership later:
```bash
npx hardhat run scripts/transfer-ownership.ts --network polygon
```

### Monitoring

After deployment, monitor:
- Contract balance (should match sum of all active market pools)
- Admin actions (market creation, resolution)
- User transactions (bets, claims)
- Gas costs (optimize if needed)

---

## Next Steps After Deployment

1. **Create First Market**: Use admin wallet to create a test market
2. **Test Betting Flow**: Place test bets from user wallets
3. **Test Resolution**: Resolve market and verify payouts
4. **Update Frontend**: Deploy frontend with new contract address
5. **Monitor**: Watch for any issues or unexpected behavior
6. **Document**: Record deployment addresses and admin wallet info

---

## Support

If you encounter issues not covered in this guide:

1. Check Hardhat documentation: https://hardhat.org/docs
2. Check Polygon documentation: https://docs.polygon.technology/
3. Review contract tests for expected behavior
4. Check deployment logs in `deployments/` directory

---

## Deployment Checklist Summary

### Testnet (Amoy)
- [ ] Environment variables configured
- [ ] Admin wallet has testnet MATIC
- [ ] USDC address verified
- [ ] Contract compiled successfully
- [ ] Tests pass
- [ ] Deployment successful
- [ ] Contract verified on Polygonscan
- [ ] Test market created
- [ ] Test bet placed and claimed

### Mainnet (Polygon PoS)
- [ ] Testnet deployment tested thoroughly
- [ ] Security review completed
- [ ] Admin wallet has mainnet MATIC
- [ ] USDC address verified (native USDC, not USDC.e)
- [ ] Backup of admin private key secured
- [ ] Deployment successful
- [ ] Contract verified on Polygonscan
- [ ] Frontend updated with mainnet address
- [ ] Monitoring in place

---

**Version**: 1.0  
**Last Updated**: 2025-12-16  
**Network Support**: Polygon Amoy (testnet), Polygon PoS (mainnet)
