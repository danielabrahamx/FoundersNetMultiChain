# FoundersNet Admin Panel Documentation

## Overview

The admin panel provides market management capabilities exclusively for the admin wallet. Access is controlled both client-side (UI visibility) and server-side (API authentication).

## Admin Address

The admin wallet address is configured in `.env`:

```
ADMIN_WALLET_ADDRESS=0x...
```

**Important:** Only this wallet can access admin features. There is no recovery mechanism if access to this wallet is lost.

---

## Admin Routes

### Pages

| Route | Description |
|-------|-------------|
| `GET /admin` | Admin dashboard with statistics and market list |
| `GET /admin/create` | Market creation form |
| `GET /admin/resolve/:id` | Market resolution page |

### API Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/tx/create-market` | POST | Build unsigned create market transaction |
| `/api/admin/tx/resolve-market` | POST | Build unsigned resolve market transaction |
| `/api/admin/stats` | GET | Get admin dashboard statistics |
| `/api/admin/pending` | GET | Get markets pending resolution |

---

## Workflows

### Creating a Market

1. Connect admin wallet
2. Navigate to `/admin` dashboard
3. Click "Create New Market"
4. Enter market question (max 500 characters)
5. Select betting close time (must be in future)
6. Preview the market
7. Click "Create Market"
8. Approve transaction in wallet
9. Wait for confirmation
10. Market appears in public list

**Best Practices:**
- Be specific about the company, event, and deadline
- Ensure the outcome can be objectively verified
- Set close time before the expected announcement
- Avoid ambiguous terms that could lead to disputes

### Resolving a Market

1. Connect admin wallet
2. Navigate to `/admin` dashboard
3. Find market in "Pending Resolutions" section (highlighted in yellow)
4. Click "Resolve Market"
5. Review market details:
   - Question
   - Pool distribution (YES vs NO)
   - Close time
6. Use verification links to confirm outcome:
   - Crunchbase
   - TechCrunch
   - SEC EDGAR
   - Google Search
7. Click "YES" or "NO" based on verified outcome
8. **Confirm in modal** (action is permanent!)
9. Approve transaction in wallet
10. Wait for confirmation
11. Winners can now claim payouts

**Important:**
- Resolution is **permanent and irreversible**
- Verify outcome using multiple reliable sources
- Consider reputation impact of incorrect resolution

---

## Security

### Access Control

All admin routes implement multi-layer security:

1. **Client-side visibility:** Admin link only appears when admin wallet is connected
2. **Server-side authentication:** `requireAdmin` middleware checks `x-wallet-address` header
3. **Transaction signing:** Only admin wallet can sign and broadcast admin transactions

### Rate Limiting

Admin API endpoints are rate-limited:
- **30 requests per minute** per wallet address
- Returns 429 status code when exceeded

### Input Validation

Server-side validation for all admin inputs:

**Create Market:**
- Question: Required, max 500 characters
- Close time: Must be in future, max 2 years ahead

**Resolve Market:**
- Market ID: Valid integer, must exist
- Outcome: Boolean only
- Market must be in "Closed" state (not Open or already Resolved)

---

## UI Features

### Admin Mode Indicator

When on admin pages, a yellow banner shows:
- "Admin Mode Active" label
- Current action description
- Link back to dashboard

### Dashboard Statistics

- Total Markets
- Open Markets
- Pending Resolutions (highlighted if > 0)
- Total Volume (USDC)

### Pending Resolutions

Markets past close time but not resolved are:
- Highlighted in yellow
- Shown in a separate section at top of dashboard
- Include "Resolve Market" button

### Transaction Status

All admin actions show real-time transaction status:
- **Pending:** Spinner with Polygonscan link
- **Success:** Green confirmation with dashboard link
- **Error:** Red error message

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Authorization required" | No wallet connected | Connect wallet first |
| "Access denied" | Wrong wallet address | Connect admin wallet |
| "Too many requests" | Rate limit exceeded | Wait 60 seconds |
| "Market is still open" | Close time not reached | Wait for close time |
| "Market already resolved" | Already resolved | Check market state |
| "Close time must be in future" | Past date selected | Select future date |

### Debugging

1. Check browser console for JavaScript errors
2. Check network tab for API response details
3. Verify wallet is connected and on correct network
4. View transaction on Polygonscan for on-chain errors

---

## Files Reference

### Backend

```
backend/src/
├── middleware/
│   ├── admin.ts          # Admin auth + validation middleware
│   └── index.ts          # Middleware exports
├── routes/
│   └── admin.ts          # Admin route handlers
└── services/
    └── contract.ts       # Admin transaction builders
```

### Views

```
backend/src/views/admin/
├── login.ejs             # Admin login prompt
├── dashboard.ejs         # Main admin dashboard
├── create-market.ejs     # Market creation form
└── resolve-market.ejs    # Market resolution page
```

---

## Development Notes

### Testing Locally

1. Start Hardhat node: `cd contracts && npx hardhat node`
2. Deploy contracts: `npx hardhat run scripts/deploy.ts --network localhost`
3. Set `ADMIN_WALLET_ADDRESS` in `.env` to match deployer
4. Start backend: `cd backend && pnpm run dev`
5. Connect with admin wallet in browser

### Admin Wallet Setup

For local development:
- Use Hardhat account #0 as admin
- Import private key into MetaMask: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- This is a known development key - **never use for real funds**

For production:
- Use a dedicated hardware wallet
- Store seed phrase securely offline
- Consider multi-sig for additional security
