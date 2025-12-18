# FoundersNet Design Notes

## Philosophy

FoundersNet is a permissionless prediction market for startup fundraises. The core design principle is **radical simplicity**: no accounts, no profiles, no email verification, no custody. Your wallet is your identity. The blockchain is the database.

This document explains the "why" behind UX decisions, failure modes, and tradeoffs. It's written for whoever maintains this thing in 6 months when the original context has evaporated.

---

## Identity Model

**Wallets are people.** That's it.

- Your wallet address is your username, login, and authentication method
- Any EVM-compatible wallet works (MetaMask, Rainbow, Coinbase Wallet, hardware wallets, etc.)
- Only requirement: wallet must support target network (Hardhat localhost for development, Polygon for production)
- We never ask for an email, name, or any off-chain identity
- There's no "sign up" flow—connecting your wallet is signing up
- Users can switch wallets freely; each wallet has independent state

**Why this works:**
- Eliminates account management, password resets, email verification
- Natural fit for crypto-native users
- Privacy-preserving by default
- One less database to secure

**Why this hurts:**
- Users who lose their wallet lose their position history
- No way to "link" multiple wallets to one identity
- Can't send email notifications for resolved markets
- Wallet addresses aren't human-readable

**Tradeoff:** We accept the wallet UX pain because the alternative (account system) adds complexity that's antithetical to permissionless design. If users want continuity across wallets, they can use a single wallet.

---

## Roles

### Admin Wallet
One hardcoded wallet address with special powers:
- Create new markets
- Resolve markets (declare outcomes)
- Cannot modify existing bets or steal funds

**Why single admin for MVP:**
- Market resolution requires human judgment ("Did company X raise Series A?")
- Multi-sig or DAO governance is overkill for testing market fit
- Clearly communicates this is a curated, not fully decentralized, product
- Easy to upgrade to multi-admin later

**Admin responsibilities:**
- Monitor fundraise news for market resolution
- Resolve markets promptly after outcome is known
- Maintain neutrality (reputation risk if admin resolves unfairly)

**What admin cannot do:**
- Steal USDC from escrow (contract logic prevents it)
- Retroactively change market parameters
- Cancel bets after placement

### User Wallets
Everyone else. Can:
- View all markets (no auth required)
- Place bets on any open market
- Claim winnings after resolution
- Check their position in any market

**No distinction between "registered" and "guest" users.** If you have a wallet and USDC, you're a user.

---

## Market Lifecycle

A market moves through states. The contract enforces these transitions; the UI reflects them.

### 1. Created (Admin Only)
Admin creates a market by calling `createMarket()` with:
- Question (e.g., "Will Acme Corp raise Series A by Q4 2024?")
- Close time (timestamp when betting stops)
- Binary outcomes: YES or NO

**State:** `Open`

**Why binary markets only:**
- Simplifies odds calculation (no multi-way splits)
- Easier for users to understand
- Can always create multiple markets for multi-outcome scenarios
- Reduces smart contract complexity

### 2. Open (Betting Phase)
Users can place bets:
- Choose YES or NO
- Specify USDC amount
- Approve USDC spend (if first time)
- Submit bet transaction

**What happens on bet:**
- User's USDC transfers to contract escrow
- User's position recorded on-chain
- Odds update based on new pool sizes
- User sees confirmation (transaction receipt)

**Why escrow model:**
- Trustless: smart contract holds funds, not admin or server
- Transparent: anyone can verify escrow balance on-chain
- Atomic: bet placement and fund transfer happen in one transaction

**State remains:** `Open` until close time

### 3. Closed (Awaiting Resolution)
Close time passes. No more bets accepted.

**State:** `Closed`

**What users see:**
- "Betting closed" message
- Final odds displayed
- Market outcome TBD
- Positions still visible

**Why manual resolution:**
- Off-chain events (fundraises) have no trustless oracle
- Admin must verify outcome via news, company announcements, etc.
- Alternative (prediction market as oracle) creates circular dependency
- Accepted tradeoff for MVP: centralized resolution, decentralized escrow

### 4. Resolved (Payout Phase)
Admin calls `resolveMarket(marketId, outcome)` after verifying the real-world result.

**State:** `Resolved`

**Outcome recorded:** YES or NO

**What happens:**
- Winning side's bets become claimable
- Losing side's bets go to winners' pool
- Odds finalized (no longer change)

**Why admin resolves:**
- Someone has to be the source of truth
- Oracles for private fundraise data don't exist
- Users trust admin reputation (or they don't use the market)
- Future: could migrate to multi-sig or DAO vote

**What if admin resolves incorrectly?**
- Reputational damage (users leave)
- Potential legal risk if fraud is proven
- No technical recourse in MVP (by design—keep it simple)
- Future: appeal mechanism or dispute resolution

### 5. Claimed (User Action)
Winners call `claimPayout(marketId)` to receive their share.

**Payout calculation:**
- Winner's share = (their bet / total winning bets) × total pool
- Includes their original bet + proportional winnings from losing side
- Minus any fees (0% for MVP, but parameter exists)

**Why manual claim:**
- Push payments to all winners is gas-prohibitive
- Pull pattern is standard for Ethereum payouts
- Users claim when they want (no expiration for MVP)

**State:** Market remains `Resolved`; individual users track if they've claimed

---

## User Flows

### First-Time User
1. Lands on FoundersNet homepage
2. Sees list of active markets (no wallet required)
3. Clicks "Connect Wallet" to place bet
4. Selects from available EVM-compatible wallets (MetaMask, WalletConnect, Coinbase Wallet, Rainbow, Frame, hardware wallets via MetaMask, etc.)
5. Approves connection in their chosen wallet
6. Wallet address appears in UI (no further "setup")
7. User is now authenticated

**No tutorial, no email capture, no profile creation.** If you can connect a wallet, you know enough to use the app.

### Placing a Bet
1. User browses markets (can view odds without wallet)
2. Clicks on market to see details
3. Selects YES or NO
4. Enters USDC amount
5. UI checks:
   - Is wallet connected? (If no: prompt connection)
   - Is this Polygon network? (If no: prompt network switch)
   - Does user have enough USDC? (If no: show error, suggest bridge/swap)
   - Has user approved contract for USDC? (If no: prompt approval transaction)
6. User clicks "Place Bet"
7. Wallet prompts for transaction signature
8. User approves, transaction submits
9. UI shows pending state (spinner)
10. Transaction confirms (receipt arrives)
11. UI updates: bet recorded, odds refresh, user position visible

**Failure cases:**
- User rejects transaction → show "Transaction cancelled" message, no state change
- Insufficient USDC → catch before transaction, show balance vs. required
- Network congestion → transaction pending for minutes, show warning + Polygonscan link
- Transaction fails on-chain → show error message, link to explorer for debugging

**Why show odds before wallet connection:**
- Reduces friction for browsing
- Odds are public data (anyone can read contract)
- Only lock users into wallet when they commit to betting

### Claiming Winnings
1. Market resolves (admin action, user notified on next visit)
2. User navigates to "My Bets" or clicks market
3. UI shows "You won! Claim your payout"
4. User clicks "Claim"
5. Wallet prompts for transaction (gas cost only, no USDC approval needed)
6. Transaction confirms
7. USDC appears in user's wallet
8. UI updates: payout claimed, no longer claimable

**Why separate claim step:**
- Gas-efficient (one transaction per winner, not broadcast to all)
- Users control timing (claim immediately or later)
- Standard pattern in Ethereum dApps

**Failure case:**
- User tries to claim twice → contract reverts, UI should prevent this
- User closes wallet before confirming → no claim, no state change

### Admin Flow: Create Market
1. Admin connects wallet (same flow as users)
2. UI detects admin address, shows "Admin Panel" link
3. Admin clicks "Create Market"
4. Form appears:
   - Question text (e.g., "Will X raise Series A by Dec 2024?")
   - Close timestamp (date picker)
   - Optional: initial odds (defaults to 50/50)
5. Admin submits
6. Wallet prompts for transaction
7. Transaction confirms
8. New market appears in public list

**Why admin-only market creation:**
- Prevents spam markets
- Quality control (well-defined questions)
- Admin curates fundable, interesting markets
- Future: could open to token-gated users or via governance vote

### Admin Flow: Resolve Market
1. Close time passes (automatic, no admin action)
2. Admin monitors real-world outcome (external to app)
3. Admin navigates to "Admin Panel" → "Pending Resolutions"
4. Selects market, clicks "Resolve"
5. Chooses YES or NO outcome
6. Confirms decision (modal: "Are you sure? This is permanent")
7. Wallet prompts for transaction
8. Transaction confirms
9. Market state → Resolved
10. Winners can now claim

**Why resolution is permanent:**
- Simplifies contract logic (no undo mechanism)
- Forces admin to be certain before resolving
- Users expect finality

**Failure case:**
- Admin resolves incorrectly → reputational damage, users complain, potential legal risk
- Mitigation: admin UI shows source links, confirmation step, public audit log of resolutions

---

## Wallet Interaction Patterns

### Connection
- User clicks "Connect Wallet"
- App detects available EVM-compatible wallets (MetaMask, WalletConnect, Coinbase Wallet, etc.)
- User selects wallet, approves connection
- Key requirement: wallet must support Polygon network (most modern EVM wallets do)
- Wallet address stored in client-side session (not server)
- No cookies, no server-side session

**On page refresh:**
- Wallet connection persists (browser extension maintains state)
- User doesn't re-connect unless they disconnect or clear browser data

### Network Switching
- App detects user's current network
- If not Polygon (testnet or mainnet as configured), show banner:
  - "Wrong network. Switch to Polygon Amoy?"
  - Button triggers wallet's `wallet_switchEthereumChain` RPC call
- User approves or declines
- If declines: app still usable for viewing, but transactions disabled

**Why auto-prompt network switch:**
- Users often don't realize they're on wrong network
- Prevents failed transactions due to network mismatch
- Standard pattern in multi-chain dApps

### Transaction Signing
Every state-changing action (bet, claim, create market, resolve) requires a transaction:
1. App constructs unsigned transaction data
2. Calls wallet's `eth_sendTransaction` method
3. Wallet shows popup with gas estimate, from/to addresses, data
4. User approves or rejects
5. If approved: transaction broadcast, app receives transaction hash
6. App polls for receipt (transaction confirmed on-chain)

**Why no gasless transactions (meta-transactions) for MVP:**
- Adds complexity (relayer, signatures, nonce management)
- Users with USDC likely have MATIC for gas
- Polygon gas is cheap (~$0.01 per transaction)
- Can add later if gas becomes a UX barrier

### USDC Approval
USDC is an ERC-20 token. Users must approve the FoundersNet contract to spend their USDC.

**First-time flow:**
1. User places bet
2. App checks current allowance: `USDC.allowance(user, contract)`
3. If allowance < bet amount:
   - Show modal: "Approve FoundersNet to use your USDC"
   - Explain: "One-time approval. You'll confirm two transactions: approval, then bet."
4. User clicks "Approve"
5. Wallet prompts for approval transaction: `USDC.approve(contract, amount)`
6. User approves, waits for confirmation
7. App re-checks allowance
8. Proceeds to bet transaction

**Approval strategies:**
- **Exact amount:** Approve only the bet amount (more secure, requires approval per bet)
- **Infinite approval:** Approve max uint256 (convenient, slightly riskier)
- Let user choose in settings

**Why this friction exists:**
- ERC-20 security model (prevent unauthorized transfers)
- All dApps using tokens have this flow
- Users familiar with DeFi expect it

---

## Failure Cases

### Expired Markets (Unresolved)
**Scenario:** Admin creates market, close time passes, admin forgets to resolve.

**What happens:**
- Market stays in `Closed` state indefinitely
- Users' USDC locked in escrow
- No bets can be placed (closed)
- No payouts can be claimed (not resolved)

**Mitigation:**
- Admin monitoring dashboard highlights pending resolutions
- Consider auto-email reminder (requires off-chain infra)
- Community can ping admin on social media

**Future enhancement:**
- Timeout mechanism: if not resolved within X days, allow emergency resolution or refund
- Currently not implemented (adds complexity)

### Failed Bets (Transaction Reverts)
**Scenario:** User tries to place bet, transaction fails on-chain.

**Common causes:**
- Insufficient USDC balance
- Insufficient MATIC for gas
- Market closed between UI load and transaction submission
- Contract bug (unlikely, but possible)

**UX handling:**
- Show error message: "Transaction failed. Check your balance and try again."
- Link to Polygonscan transaction for debugging
- No USDC lost (revert means no state change)

**Prevention:**
- Pre-flight checks in UI (balance, market state)
- Estimate gas before submission
- Warn user if close time is imminent

### User Loses Wallet
**Scenario:** User places bets, loses private key or seed phrase.

**What happens:**
- User cannot claim winnings (requires transaction from their address)
- USDC locked in contract, unclaimable forever
- No recovery mechanism

**Why no recovery:**
- Self-custodial wallets = user responsibility
- No "forgot password" in blockchain
- Consistent with crypto ethos (not your keys, not your coins)

**Mitigation:**
- Warn users during first connection: "Secure your wallet. No recovery if lost."
- Link to wallet security best practices

### Admin Disappears
**Scenario:** Admin loses access to wallet, stops resolving markets.

**What happens:**
- All closed markets stuck in limbo
- Users' funds locked indefinitely
- Platform becomes unusable

**Mitigation for MVP:**
- Admin uses hardware wallet (secure, backed up)
- Admin shares backup access with trusted party (off-chain arrangement)

**Future enhancement:**
- Multi-sig admin (requires N of M signatures to resolve)
- Time-locked emergency resolution (users vote if admin absent for 30 days)
- Transition to DAO governance

### Network Congestion
**Scenario:** Polygon network experiences high traffic, transactions slow or expensive.

**What happens:**
- Transactions pending for minutes instead of seconds
- Gas prices spike (though still low on Polygon)
- Users frustrated by slow confirmations

**UX handling:**
- Show transaction status: "Pending... This may take a few minutes."
- Link to Polygonscan so user can track transaction
- Don't block UI (allow browsing while transaction pending)
- Consider: allow gas price adjustment in wallet

**Why Polygon:**
- Much cheaper and faster than Ethereum mainnet
- Congestion rare compared to Ethereum
- Acceptable tradeoff for MVP

### Double Claim Attempt
**Scenario:** User clicks "Claim" twice (or refreshes page and clicks again).

**What happens:**
- First transaction succeeds, payout transferred
- Second transaction reverts (contract checks if already claimed)
- User pays gas for failed transaction (small amount)

**Prevention:**
- Disable "Claim" button after click (UI state)
- Check claim status before submitting transaction
- Show "Already claimed" message if applicable

---

## Simplicity-First UX Decisions

### No Market Search or Filters (Initially)
**Decision:** Display all markets in a simple list, newest first.

**Why:**
- MVP likely has <20 markets total
- Search and filters add complexity (backend indexing, UI components)
- Users can scroll through all markets in seconds

**When to add:**
- If market count exceeds ~50, add basic search
- If users request category filters (by industry, close date, etc.)

### No Email Notifications
**Decision:** No email alerts when markets resolve or bets win.

**Why:**
- Requires collecting emails (anti-pattern for wallet-only identity)
- Requires email infra (SendGrid, spam management, unsubscribes)
- Users who care will check the app
- Push notifications via wallet (e.g., WalletConnect) not worth MVP complexity

**Tradeoff:**
- Users miss out on timely claim opportunities
- May reduce engagement

**Alternative:**
- Browser push notifications (requires user opt-in, simpler than email)
- Add later if user feedback demands it

### No Market Comments or Social Features
**Decision:** No comment threads, no user profiles, no follows.

**Why:**
- FoundersNet is a betting platform, not a social network
- Comments require moderation (spam, abuse)
- Profile pages require database and identity system
- Focus on core value: make bet, get paid

**When to add:**
- If users actively request discussion (rare for prediction markets)
- Consider linking to external forum (Reddit, Discord) instead

### No Market Editing
**Decision:** Once created, markets cannot be edited (question, close time, etc.).

**Why:**
- Editing after bets are placed is ethically murky
- Simplifies contract (no edit logic, no history tracking)
- Admin should be careful during creation

**Mitigation:**
- Confirmation step in admin UI before creating market
- If mistake, admin can create new market and mark old one as "cancelled" (manual process)

### No Automated Market Maker (AMM)
**Decision:** Odds are calculated from pool ratios, not dynamic pricing curves.

**Why:**
- AMM (like Uniswap's x*y=k) is complex to implement correctly
- Simple ratio odds (YES pool / total pool) are transparent and predictable
- Users understand "60% of bets are on YES" intuitively
- Can add AMM later if liquidity depth becomes an issue

**Tradeoff:**
- Large bets heavily skew odds
- No "slippage" protection (odds change after your bet)

**Mitigation:**
- Show updated odds before transaction confirmation
- Warn users if their bet will significantly move the odds

### No Mobile App (Web-Only)
**Decision:** Web app only, accessed via mobile browser + wallet app.

**Why:**
- Native mobile app requires separate iOS/Android development
- Mobile browsers support wallet connections (WalletConnect, MetaMask mobile)
- Faster to iterate on web
- App store approval friction

**Tradeoff:**
- Mobile web UX slightly worse than native
- QR code scanning for WalletConnect adds step

**When to add:**
- If mobile traffic exceeds 70% and user feedback demands it

---

## Testnet-First Mindset

### Why Start on Testnet
- Free to use (testnet MATIC, faucet USDC)
- Mistakes are cheap (failed transactions cost $0)
- Iterate quickly without financial risk
- Test edge cases without real user funds

### Testnet UX Considerations
- Prominently display "TESTNET" banner (avoid confusion)
- Link to MATIC faucet for gas
- Link to USDC faucet (if available) or instructions to bridge testnet USDC
- Expect users to experiment freely (create markets, place silly bets)

### When to Mainnet
- After 2-3 weeks of testnet use
- No critical bugs in contract or UI
- Admin comfortable resolving markets
- At least 10 test markets created and resolved successfully
- Security review of smart contract (even if informal)

### Mainnet Changes
- Remove testnet banners
- Update RPC endpoints and contract addresses
- Add "real money" warnings in UI
- Consider starting with betting caps (e.g., max $100 per bet) to limit risk

---

## Tradeoffs Summary

| Decision | Benefit | Cost | Future Alternative |
|----------|---------|------|-------------------|
| Wallet-only identity | No account system, privacy | Users can't link wallets, no email notifications | Optional ENS integration for readable names |
| Single admin resolution | Simple, fast to build | Centralized trust, single point of failure | Multi-sig or DAO vote |
| Manual claim payouts | Gas-efficient | Extra user step | Auto-claim option (user pays gas upfront) |
| No AMM | Simple odds calculation | Large bets skew odds heavily | Implement constant product AMM |
| Binary markets only | Easy to understand | Can't model complex outcomes | Add multi-outcome markets |
| No market editing | Clean contract logic | Admin must be careful | Emergency admin edit with user approval |
| Web-only (no native app) | Faster iteration | Slightly worse mobile UX | Native iOS/Android apps |

---

## Open Questions (for Future Versions)

1. **Fees:** Currently 0% platform fee. Should we charge 1-2% on winning bets?
   - Pros: Revenue, sustainability
   - Cons: Reduces user returns, requires fee distribution logic

2. **Market creation:** Should we open market creation to all users (token-gated)?
   - Pros: More markets, community-driven
   - Cons: Spam risk, quality control

3. **Liquidity incentives:** Should we reward early bettors or market creators?
   - Pros: Bootstrap liquidity
   - Cons: Complexity, token economics

4. **Cross-chain:** Should we deploy on other chains (Ethereum, Arbitrum, Base)?
   - Pros: Wider user base
   - Cons: Multi-chain state management, bridge complexity

5. **Oracle integration:** Could we use Chainlink or UMA for automated resolution?
   - Pros: Decentralized resolution
   - Cons: Expensive, not all markets have oracle-compatible outcomes

---

## Final Note

This is an MVP. Every decision prioritizes shipping quickly over building the "perfect" system. Many features are deliberately deferred. The goal is to validate product-market fit: do people want to bet on startup fundraises?

If yes, we iterate. If no, we learn and pivot. The blockchain ensures funds are always safe and transparent, even if the product doesn't work out.

**Keep it simple. Ship fast. Learn quickly.