# FoundersNet Deployment Checklist

Use this checklist to ensure a smooth deployment process.

## Pre-Deployment Setup

### Environment Configuration
- [ ] `.env` file created (copied from `.env.example`)
- [ ] `.env` is in `.gitignore` (verify with `git status`)
- [ ] All required environment variables set:
  - [ ] `ALCHEMY_API_KEY`
  - [ ] `POLYGONSCAN_API_KEY`
  - [ ] `ADMIN_PRIVATE_KEY`
  - [ ] `POLYGON_AMOY_RPC_URL` (for testnet)
  - [ ] `POLYGON_MAINNET_RPC_URL` (for mainnet)
  - [ ] `USDC_ADDRESS_AMOY` (for testnet)
  - [ ] `USDC_ADDRESS_POLYGON` (for mainnet)

### USDC Address Verification
- [ ] Amoy USDC verified on Polygonscan:
  - [ ] Visit: https://amoy.polygonscan.com/address/0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582
  - [ ] Contract is verified (green checkmark)
  - [ ] Symbol is "USDC"
  - [ ] Decimals is 6
- [ ] Polygon USDC verified on Polygonscan:
  - [ ] Visit: https://polygonscan.com/address/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
  - [ ] Contract name is "USD Coin"
  - [ ] Symbol is "USDC"
  - [ ] Decimals is 6
  - [ ] **NOT** using USDC.e (bridged version)

### Admin Wallet Setup
- [ ] Admin private key exported from MetaMask
- [ ] Admin address matches expected address: `0x3cab0d4baece087681585a2ccb8b09f7957c74abef25938f02046c8030ed83a1`
- [ ] Admin wallet has MATIC for gas:
  - [ ] Testnet: At least 0.1 MATIC (from faucet)
  - [ ] Mainnet: At least 0.5 MATIC (purchased)
- [ ] Backup of admin private key stored securely

### Code Preparation
- [ ] Dependencies installed: `cd contracts && pnpm install`
- [ ] Contract compiles: `npx hardhat compile`
- [ ] All tests pass: `npx hardhat test`
- [ ] No linting errors: `npx hardhat check`
- [ ] Gas reporter reviewed (if enabled)

---

## Testnet Deployment (Polygon Amoy)

### Pre-Deployment Checks
- [ ] Run network check: `npx hardhat run scripts/check-network.ts --network amoy`
- [ ] Run balance check: `npx hardhat run scripts/check-balance.ts --network amoy`
- [ ] All checks pass (green checkmarks)

### Deployment
- [ ] Deploy contract: `npx hardhat deploy --network amoy`
- [ ] Deployment successful (no errors)
- [ ] Contract address saved to `deployments/amoy.json`
- [ ] Transaction hash recorded

### Verification
- [ ] Contract verified on Polygonscan automatically
  - If failed, verify manually: `npx hardhat verify --network amoy <address> <usdc_address>`
- [ ] Visit contract on Polygonscan: https://amoy.polygonscan.com/address/<contract_address>
- [ ] "Read Contract" tab visible
- [ ] "Write Contract" tab visible
- [ ] Constructor arguments correct (USDC address)

### Post-Deployment Testing
- [ ] Create test market: `npx hardhat run scripts/create-test-market.ts --network amoy`
- [ ] Market created successfully
- [ ] Market visible on Polygonscan (check Events tab)
- [ ] `getMarketCount()` returns 1
- [ ] `getMarket(0)` returns correct data

### Integration Testing
- [ ] Update frontend `.env` with contract address
- [ ] Update backend `.env` with contract address
- [ ] Frontend can connect to contract
- [ ] Can read market data from frontend
- [ ] Can place test bet (requires USDC)
- [ ] Can claim test payout (after resolution)

### Documentation
- [ ] Update `.env` with `CONTRACT_ADDRESS_AMOY`
- [ ] Update `deployments/amoy.json` committed (if desired)
- [ ] Record deployment details in project notes
- [ ] Share contract address with team

---

## Mainnet Deployment (Polygon PoS)

### Pre-Mainnet Requirements
- [ ] Testnet deployment tested for at least 1 week
- [ ] At least 5 test markets created and resolved on testnet
- [ ] No critical bugs found
- [ ] Security review completed (even if informal)
- [ ] Admin wallet secured (hardware wallet recommended)
- [ ] Team approval for mainnet deployment

### Pre-Deployment Checks
- [ ] Run network check: `npx hardhat run scripts/check-network.ts --network polygon`
- [ ] Run balance check: `npx hardhat run scripts/check-balance.ts --network polygon`
- [ ] Admin has at least 0.5 MATIC on mainnet
- [ ] USDC address is native USDC (not USDC.e)
- [ ] All environment variables correct for mainnet

### Deployment
- [ ] **FINAL CHECK**: Review all settings one more time
- [ ] Deploy contract: `npx hardhat deploy --network polygon`
- [ ] Deployment successful (no errors)
- [ ] Contract address saved to `deployments/polygon.json`
- [ ] Transaction hash recorded

### Verification
- [ ] Contract verified on Polygonscan automatically
  - If failed, verify manually: `npx hardhat verify --network polygon <address> <usdc_address>`
- [ ] Visit contract on Polygonscan: https://polygonscan.com/address/<contract_address>
- [ ] "Read Contract" tab visible
- [ ] "Write Contract" tab visible
- [ ] Constructor arguments correct (USDC address)

### Post-Deployment Testing
- [ ] Create first mainnet market (carefully!)
- [ ] Market created successfully
- [ ] Market visible on Polygonscan
- [ ] Test with small bet from personal wallet
- [ ] Verify bet recorded correctly

### Production Configuration
- [ ] Update frontend production `.env`:
  - [ ] `VITE_CONTRACT_ADDRESS`
  - [ ] `VITE_USDC_ADDRESS`
  - [ ] `VITE_NETWORK=polygon`
  - [ ] `VITE_CHAIN_ID=137`
- [ ] Update backend production `.env`:
  - [ ] `CONTRACT_ADDRESS`
  - [ ] `USDC_ADDRESS`
  - [ ] `NETWORK=polygon`
- [ ] Deploy frontend to production
- [ ] Deploy backend to production
- [ ] Test production deployment end-to-end

### Monitoring Setup
- [ ] Set up contract monitoring (Tenderly, Defender, etc.)
- [ ] Set up admin wallet monitoring
- [ ] Set up alerts for:
  - [ ] Large transactions
  - [ ] Failed transactions
  - [ ] Unusual activity
- [ ] Document admin procedures
- [ ] Create runbook for common operations

### Documentation
- [ ] Update `.env` with `CONTRACT_ADDRESS_POLYGON`
- [ ] Update `deployments/polygon.json` committed (if desired)
- [ ] Update project README with mainnet address
- [ ] Announce deployment to users/community
- [ ] Document deployment date and details

---

## Post-Deployment Maintenance

### Regular Checks
- [ ] Monitor contract balance (should match active pools)
- [ ] Review admin actions (market creation, resolution)
- [ ] Check for any failed transactions
- [ ] Verify gas costs are reasonable
- [ ] Monitor user feedback

### Security
- [ ] Admin private key stored securely
- [ ] Consider migrating to multi-sig wallet
- [ ] Regular security reviews
- [ ] Monitor for unusual patterns
- [ ] Keep dependencies updated

### Upgrades (Future)
- [ ] Plan for contract upgrades (if needed)
- [ ] Consider proxy pattern for upgradeability
- [ ] Test upgrade process on testnet first
- [ ] Communicate changes to users

---

## Emergency Procedures

### If Deployment Fails
1. Check error message carefully
2. Verify all environment variables
3. Check admin wallet balance
4. Review USDC address
5. Try again after fixing issues
6. If persistent, seek help

### If Contract Has Issues After Deployment
1. **DO NOT PANIC** - funds are safe in escrow
2. Pause new market creation (admin action)
3. Investigate issue thoroughly
4. Test fix on testnet first
5. Consider contract upgrade if needed
6. Communicate with users transparently

### If Admin Wallet Compromised
1. **IMMEDIATE**: Transfer ownership to new wallet
2. Pause all contract operations if possible
3. Investigate breach
4. Notify users
5. Review security procedures
6. Implement multi-sig for future

---

## Checklist Summary

### Testnet Ready When:
- ✅ All environment variables set
- ✅ Admin wallet has testnet MATIC
- ✅ USDC address verified
- ✅ Contract compiles and tests pass
- ✅ Network and balance checks pass

### Mainnet Ready When:
- ✅ Testnet thoroughly tested
- ✅ Security review completed
- ✅ Admin wallet secured
- ✅ Team approval obtained
- ✅ Monitoring in place

---

**Remember**: Take your time, double-check everything, and test thoroughly on testnet before mainnet!

**Version**: 1.0  
**Last Updated**: 2025-12-16
