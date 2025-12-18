# Wallet Connection Flow Documentation

This document describes the client-side wallet integration for FoundersNet, including connection flows, error handling, and HTMX integration.

## Overview

FoundersNet uses a custom wallet integration (`wallet.js`) that provides:
- Native EVM wallet connections (MetaMask, Coinbase Wallet, Rainbow, Brave)
- WalletConnect v2 support (for mobile wallets)
- Network detection and automatic switching
- USDC approval flow for betting
- Transaction signing and receipt polling
- Custom event system for HTMX integration

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌───────────────┐    ┌───────────┐ │
│  │  wallet.js  │◄──►│ window.ethereum │◄──►│  MetaMask │ │
│  └─────────────┘    └───────────────┘    │  Coinbase │ │
│         │                                 │  Rainbow  │ │
│         ▼                                 └───────────┘ │
│  ┌─────────────┐                                        │
│  │ HTMX Events │                                        │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

## Connection Flow

### 1. User Initiates Connection

```javascript
// User clicks "Connect Wallet" button
async function connectWallet() {
    await wallet.connect();
}
```

### 2. Provider Detection

The `WalletManager.detectWallets()` method checks for:
- `window.ethereum` (injected provider)
- Multiple providers (EIP-5749)
- Specific wallet types (MetaMask, Coinbase, Rainbow, Brave)

### 3. Account Request

```javascript
const accounts = await provider.request({ 
    method: 'eth_requestAccounts' 
});
```

### 4. Session Storage

Connected address is stored in `sessionStorage` for page persistence:
- Key: `wallet_address`
- Key: `wallet_chainId`

### 5. Event Emission

```javascript
wallet.emit('connected', { address, chainId });
// Also dispatches: document.dispatchEvent(new CustomEvent('wallet:connected', ...))
```

## Network Handling

### Detection

```javascript
const chainId = await provider.request({ method: 'eth_chainId' });
```

### Wrong Network Flow

1. User connected on wrong network
2. Yellow warning banner appears
3. User clicks "Switch Network"
4. `wallet_switchEthereumChain` RPC call
5. If chain not in wallet: `wallet_addEthereumChain` fallback

### Supported Networks

| Network | Chain ID | Environment |
|---------|----------|-------------|
| Hardhat Local | 31337 | Development |
| Polygon Amoy | 80002 | Testnet |
| Polygon PoS | 137 | Mainnet |

## USDC Approval Flow

### Checking Allowance

```javascript
const needsApproval = await wallet.needsApproval(amountRaw);
```

### Requesting Approval

```javascript
if (needsApproval) {
    await wallet.requestApproval(amountRaw);
    // or for unlimited approval:
    await wallet.requestApproval(amountRaw, true);
}
```

### Approval Events

- `wallet:approvalPending` - Waiting for user
- `wallet:approvalSubmitted` - Transaction sent
- `wallet:approvalConfirmed` - Transaction mined
- `wallet:approvalFailed` - Error occurred

## Transaction Signing

### From Backend Data

```javascript
// 1. Get unsigned transaction from backend
const response = await fetch('/api/tx/bet', {
    method: 'POST',
    body: JSON.stringify({ marketId, outcome, amount, address })
});
const txData = await response.json();

// 2. Sign and send
const receipt = await wallet.sendAndWait(txData);
```

### Transaction Events

- `wallet:transactionPending` - Waiting for user signature
- `wallet:transactionSubmitted` - Transaction sent to network
- `wallet:transactionWaiting` - Polling for receipt
- `wallet:transactionConfirmed` - Transaction mined successfully
- `wallet:transactionFailed` - Error or revert

## Contract Reads

### Available Methods

```javascript
// Get USDC balance
const balance = await wallet.getUSDCBalance();

// Get user position in market
const position = await wallet.getUserPosition(marketId);

// Get claimable amount
const claimable = await wallet.getClaimableAmount(marketId);
```

### Position Object

```javascript
{
    yesBets: "10.00",       // Formatted USDC
    yesBetsRaw: 10000000n,  // Raw BigInt
    noBets: "5.00",
    noBetsRaw: 5000000n,
    claimed: false
}
```

## HTMX Integration

### Custom Events

Listen for wallet events in HTMX:

```javascript
document.addEventListener('wallet:connected', (e) => {
    htmx.trigger('#user-balance', 'load');
});

document.addEventListener('wallet:transactionConfirmed', (e) => {
    htmx.trigger('#markets-container', 'refresh');
});
```

### Request Augmentation

Wallet address is automatically added to HTMX requests:

```javascript
document.body.addEventListener('htmx:configRequest', (e) => {
    if (window.walletAddress) {
        e.detail.parameters['address'] = window.walletAddress;
    }
});
```

## Error Handling

### Error Types

| Code | Description |
|------|-------------|
| `NO_PROVIDER` | No wallet detected |
| `USER_REJECTED` | User rejected action |
| `CONNECTION_FAILED` | Connection error |
| `WRONG_NETWORK` | On incorrect network |
| `NOT_CONNECTED` | Wallet not connected |
| `CONFIG_ERROR` | Missing configuration |
| `INSUFFICIENT_FUNDS` | Not enough gas |
| `TX_FAILED` | Transaction failed |
| `TX_REVERTED` | Transaction reverted |
| `TIMEOUT` | Receipt polling timeout |

### Handling Errors

```javascript
try {
    await placeBet(marketId, true, "10");
} catch (error) {
    if (error.code === 'USER_REJECTED') {
        showToast('Transaction cancelled', 'warning');
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
        showToast('Not enough MATIC for gas', 'error');
    } else {
        showToast(error.message, 'error');
    }
}
```

## UI Components

### Connect Button States

1. **Default**: Shows "Connect Wallet"
2. **Connecting**: Shows spinner + "Connecting..."
3. **Connected**: Hidden, replaced by address display

### Network Status Indicator

- Green dot: Connected to correct network
- Yellow dot: Wrong network
- Red dot: Disconnected

### Toast Notifications

```javascript
showToast('Transaction confirmed!', 'success');
showToast('Please approve USDC', 'info');
showToast('Transaction failed', 'error');
showToast('Switch network required', 'warning');
```

## Global API

### Window Objects

```javascript
// Wallet manager instance
window.wallet

// UI functions (onclick handlers)
window.connectWallet()
window.disconnectWallet()
window.switchNetwork()
window.placeBet(marketId, outcome, amount)
window.claimPayout(marketId)
window.showToast(message, type)

// State
window.walletAddress  // Connected address or null
window.chainId        // Current chain ID
window.isAdmin        // Is admin wallet

// Utilities
window.WalletUtils.formatUSDC(amount)
window.WalletUtils.parseUSDC(amount)
window.WalletUtils.truncateAddress(address)
```

### Configuration

Set via server-rendered template:

```javascript
window.appConfig = {
    network: 'development',
    chainId: 31337,
    contractAddress: '0x...',
    usdcAddress: '0x...',
    adminAddress: '0x...',
    blockExplorer: 'http://localhost:8545',
    rpcUrl: 'http://127.0.0.1:8545'
};
```

## Mobile Support

### WalletConnect v2

For mobile wallets, users can:
1. Install MetaMask Mobile, Rainbow, or Trust Wallet
2. Use WalletConnect QR code scanning
3. Connect via deep links

### Testing on Mobile

1. Open the app in mobile browser
2. Click "Connect Wallet"
3. Select "WalletConnect" option (if implemented)
4. Scan QR code with wallet app
5. Approve connection in wallet

## Development Notes

### Function Selector Calculation

The function selectors are hardcoded to avoid importing keccak256:

```javascript
// To calculate: keccak256("functionName(type1,type2)")  first 4 bytes
const selectors = {
    'balanceOf': '0x70a08231',      // balanceOf(address)
    'allowance': '0xdd62ed3e',      // allowance(address,address)
    'approve': '0x095ea7b3',        // approve(address,uint256)
    // etc.
};
```

### Polling Configuration

```javascript
const POLL_INTERVAL = 2000;  // 2 seconds between receipt checks
const TIMEOUT = 60000;       // 60 seconds max wait
```

### Local Development

For Hardhat local development:
1. Ensure Hardhat node is running: `npx hardhat node`
2. Import test accounts to MetaMask
3. Add Hardhat network (Chain ID: 31337, RPC: http://127.0.0.1:8545)

## Security Considerations

1. **Private keys**: Never leave the browser; all signing happens in wallet
2. **Session storage**: Only stores public address
3. **Approval amounts**: Users choose between exact or unlimited approval
4. **Network validation**: Transactions blocked on wrong network
5. **Error messages**: User-friendly, don't expose internals

## Future Enhancements

- [ ] WalletConnect v2 modal integration
- [ ] Hardware wallet support (via MetaMask)
- [ ] ENS name resolution
- [ ] Transaction history tracking
- [ ] Gas estimation display
- [ ] Multiple wallet provider modal
