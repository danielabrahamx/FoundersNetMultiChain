# FoundersNet Deployment Infrastructure - Quick Reference

## Overview

This deployment infrastructure provides everything needed to deploy the FoundersNetMarket smart contract to Polygon networks (Amoy testnet and PoS mainnet).

## Files Created

### Deployment Scripts
- **`deploy/001_deploy_market.ts`** - Main hardhat-deploy script
  - Deploys FoundersNetMarket contract
  - Passes USDC token address as constructor parameter
  - Automatically verifies on Polygonscan
  - Saves deployment addresses to JSON

### Configuration
- **`hardhat.config.ts`** - Updated with:
  - Named accounts for hardhat-deploy
  - Polygon Amoy (testnet) network config
  - Polygon PoS (mainnet) network config
  - Polygonscan verification settings

- **`.env.example`** - Enhanced with:
  - Detailed instructions for getting Alchemy API key
  - USDC address verification requirements
  - Polygonscan API key setup guide
  - Security warnings for private key handling

### Helper Scripts
- **`scripts/check-network.ts`** - Verify network configuration before deployment
- **`scripts/check-balance.ts`** - Check deployer wallet balance and estimate costs
- **`scripts/create-test-market.ts`** - Create a test market after deployment

### Documentation
- **`DEPLOYMENT.md`** - Comprehensive deployment guide with:
  - Step-by-step instructions for testnet and mainnet
  - Prerequisites and environment setup
  - Pre-deployment checklist
  - Troubleshooting guide
  - Security best practices

- **`DEPLOYMENT_CHECKLIST.md`** - Interactive checklist for deployment process
- **`deployments/README.md`** - Documentation for deployment addresses storage

### Package Scripts
Updated `package.json` with convenient npm scripts:
```bash
# Deployment
pnpm deploy:amoy          # Deploy to Amoy testnet
pnpm deploy:polygon       # Deploy to Polygon mainnet

# Pre-deployment checks
pnpm check:amoy           # Check Amoy network configuration
pnpm check:polygon        # Check Polygon network configuration
pnpm balance:amoy         # Check deployer balance on Amoy
pnpm balance:polygon      # Check deployer balance on Polygon

# Post-deployment
pnpm market:create:amoy   # Create test market on Amoy
pnpm market:create:polygon # Create test market on Polygon
```

## Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env and fill in:
# - ALCHEMY_API_KEY
# - POLYGONSCAN_API_KEY
# - ADMIN_PRIVATE_KEY
```

### 2. Pre-Deployment Check
```bash
cd contracts

# Check network configuration
pnpm check:amoy

# Check deployer balance
pnpm balance:amoy
```

### 3. Deploy to Testnet
```bash
# Deploy contract
pnpm deploy:amoy

# Create test market
pnpm market:create:amoy
```

### 4. Deploy to Mainnet (after thorough testnet testing)
```bash
# Final checks
pnpm check:polygon
pnpm balance:polygon

# Deploy
pnpm deploy:polygon

# Create first market
pnpm market:create:polygon
```

## Network Configuration

### Polygon Amoy (Testnet)
- **Chain ID**: 80002
- **RPC**: Alchemy (configured in .env)
- **USDC**: `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
- **Explorer**: https://amoy.polygonscan.com
- **Faucet**: https://faucet.polygon.technology/

### Polygon PoS (Mainnet)
- **Chain ID**: 137
- **RPC**: Alchemy (configured in .env)
- **USDC**: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` (Native USDC)
- **Explorer**: https://polygonscan.com

## Deployment Output

After successful deployment, you'll find:

1. **Console Output**: Deployment summary with addresses and transaction hashes
2. **Deployment File**: `deployments/{network}.json` with all deployment info
3. **Verified Contract**: Automatically verified on Polygonscan

Example `deployments/amoy.json`:
```json
{
  "network": "amoy",
  "chainId": 80002,
  "marketContract": "0x...",
  "usdcToken": "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
  "deployer": "0x...",
  "deployedAt": "2025-12-16T10:00:00.000Z",
  "transactionHash": "0x...",
  "lastUpdated": "2025-12-16T10:00:00.000Z"
}
```

## Environment Variables Required

### Required for Deployment
- `ALCHEMY_API_KEY` - Get from https://dashboard.alchemy.com/
- `POLYGONSCAN_API_KEY` - Get from https://polygonscan.com/myapikey
- `ADMIN_PRIVATE_KEY` - Export from MetaMask (NEVER commit!)

### Network-Specific
- `POLYGON_AMOY_RPC_URL` - Alchemy RPC for Amoy
- `POLYGON_MAINNET_RPC_URL` - Alchemy RPC for Polygon
- `USDC_ADDRESS_AMOY` - USDC contract on Amoy (default provided)
- `USDC_ADDRESS_POLYGON` - USDC contract on Polygon (default provided)

### Post-Deployment (update after deployment)
- `CONTRACT_ADDRESS_AMOY` - Deployed contract on Amoy
- `CONTRACT_ADDRESS_POLYGON` - Deployed contract on Polygon

## Security Notes

### ⚠️ CRITICAL
- **NEVER** commit `.env` file to git
- **ALWAYS** verify USDC addresses on Polygonscan before deployment
- **BACKUP** admin private key securely before mainnet deployment
- **TEST** thoroughly on testnet before mainnet

### Private Key Safety
- Use hardware wallet for mainnet admin (recommended)
- Store backup in secure password manager
- Consider multi-sig wallet for production
- Rotate to new admin wallet if compromised

## Troubleshooting

### Common Issues

**"Insufficient funds for gas"**
- Get testnet MATIC from faucet
- Purchase mainnet MATIC on exchange

**"Invalid USDC address"**
- Verify address on Polygonscan
- Check correct network (Amoy vs Polygon)
- Ensure checksummed address format

**"Verification failed"**
- Wait 1-2 minutes for Polygonscan indexing
- Retry verification manually
- Check Polygonscan API key is valid

**"Network not configured"**
- Verify RPC URL in .env
- Check Alchemy API key
- Test RPC connection with curl

## Next Steps After Deployment

1. **Update Environment Files**
   - Add contract address to `.env`
   - Update frontend `.env` with contract address
   - Update backend `.env` with contract address

2. **Test Contract**
   - Create test market
   - Place test bet
   - Resolve market
   - Claim payout

3. **Deploy Frontend**
   - Update contract address in frontend config
   - Deploy to production
   - Test end-to-end flow

4. **Monitor**
   - Set up contract monitoring
   - Watch for unusual activity
   - Track gas costs

## Support Resources

- **Hardhat Docs**: https://hardhat.org/docs
- **Polygon Docs**: https://docs.polygon.technology/
- **Alchemy Docs**: https://docs.alchemy.com/
- **Polygonscan**: https://polygonscan.com

## Deployment Checklist Summary

### Before Deployment
- [ ] Environment variables configured
- [ ] USDC addresses verified
- [ ] Admin wallet has MATIC
- [ ] Tests pass
- [ ] Network check passes

### After Deployment
- [ ] Contract verified on Polygonscan
- [ ] Test market created
- [ ] Deployment addresses saved
- [ ] Frontend/backend updated
- [ ] End-to-end testing complete

---

**For detailed instructions, see `DEPLOYMENT.md`**

**For step-by-step checklist, see `DEPLOYMENT_CHECKLIST.md`**
