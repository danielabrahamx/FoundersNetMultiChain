# FoundersNet Requirements

## Product Summary

FoundersNet is a permissionless, parimutuel prediction market for startup fundraises deployed on Polygon. Users place USDC-denominated bets on whether a startup will successfully complete a specified fundraise by a given deadline.

**Parimutuel Model:**
- All bets in a market are pooled together
- No fixed odds are set at bet placement time
- Payouts are determined after market resolution based on pool distribution
- Winners receive a proportional share of the total pool (their stake + share of losing side)

**Deployment:** Hardhat local node (development), then Sepolia/Polygon Amoy (testnet), then Polygon PoS (mainnet).

---

## Roles

### Admin
- **Identification:** Single wallet address `0x3cab0d4baece087681585a2ccb8b09f7957c74abef25938f02046c8030ed83a1`
- **Capabilities:**
  - Create new markets
  - Configure market parameters (question, close time, outcomes)
  - Resolve markets by declaring final outcome (YES or NO)
- **Restrictions:**
  - Cannot modify existing bets
  - Cannot withdraw escrowed funds except via legitimate resolution
  - Cannot revert or change market resolution once set

### Users
- **Identification:** Any EVM-compatible wallet address connecting to Polygon network
- **Capabilities:**
  - View all markets and their current state
  - Place USDC bets on any open market
  - Claim winnings after market resolution
  - View their positions across all markets
- **Restrictions:**
  - Cannot create markets
  - Cannot resolve markets
  - Cannot withdraw other users' funds

---

## 1. Functional Requirements

### 1.1 Market Creation

**FR-1.1.1:** Admin must be able to create a new market by specifying:
- Market question (string, max 500 characters)
- Market close time (Unix timestamp, must be in the future)
- Binary outcomes: YES and NO

**FR-1.1.2:** Market creation must emit an event containing:
- Market ID (unique identifier)
- Question text
- Close time
- Creator address (admin)
- Creation timestamp

**FR-1.1.3:** Newly created markets must default to "Open" state.

**FR-1.1.4:** Market IDs must be sequential and immutable.

**FR-1.1.5:** Once created, market parameters (question, close time) cannot be modified.

### 1.2 Market States

**FR-1.2.1:** Every market must exist in exactly one state at any given time:
- **Open:** Betting is allowed
- **Closed:** Betting has ended (close time passed), awaiting resolution
- **Resolved:** Outcome declared, payouts claimable

**FR-1.2.2:** State transitions must follow this order:
```
Open → Closed → Resolved
```

**FR-1.2.3:** State transitions must be irreversible (no going backwards).

**FR-1.2.4:** The "Closed" state must be triggered automatically when `block.timestamp >= closeTime`.

**FR-1.2.5:** The "Resolved" state must only be reached via admin action.

### 1.3 Parimutuel Betting

**FR-1.3.1:** Users must be able to place a bet by:
- Selecting a market (by ID)
- Choosing an outcome (YES or NO)
- Specifying a USDC amount (minimum 1 USDC, no maximum)

**FR-1.3.2:** Bet placement must:
- Transfer USDC from user to contract escrow
- Record user's position (market ID, outcome, amount)
- Update the market's pool totals (YES pool and NO pool)
- Emit an event with bet details (user, market, outcome, amount, timestamp)

**FR-1.3.3:** Bets must only be accepted when:
- Market is in "Open" state
- Current time < close time
- User has sufficient USDC balance
- User has approved contract for USDC transfer

**FR-1.3.4:** Bets must be rejected (transaction reverts) if:
- Market is Closed or Resolved
- Amount is less than minimum bet size
- USDC transfer fails

**FR-1.3.5:** Users may place multiple bets on the same outcome in the same market (positions accumulate).

**FR-1.3.6:** Users may place bets on both YES and NO in the same market (hedge positions allowed).

**FR-1.3.7:** Pool totals must be readable by anyone without requiring a transaction:
- `getMarketPools(marketId)` returns (yesPool, noPool)

**FR-1.3.8:** No odds are calculated or stored at bet time. Implied odds may be derived client-side from pool ratios.

### 1.4 Market Resolution

**FR-1.4.1:** Admin must be able to resolve a market by:
- Specifying market ID
- Declaring winning outcome (YES or NO)

**FR-1.4.2:** Resolution must only be possible when:
- Market is in "Closed" state
- Caller is the admin address

**FR-1.4.3:** Resolution must:
- Record the winning outcome
- Transition market to "Resolved" state
- Emit event with (market ID, outcome, timestamp)

**FR-1.4.4:** Resolution must be permanent and irreversible (no re-resolution).

**FR-1.4.5:** If a market is never resolved, funds remain escrowed indefinitely (admin responsibility to resolve).

### 1.5 Payout Logic

**FR-1.5.1:** After resolution, winning users must be able to claim their payout.

**FR-1.5.2:** Payout calculation for a winning user:
```
userPayout = (userBet / winningPool) × totalPool
```
Where:
- `userBet` = sum of user's bets on winning outcome
- `winningPool` = total USDC bet on winning outcome
- `totalPool` = yesPool + noPool

**FR-1.5.3:** Users who bet on the losing outcome receive zero payout.

**FR-1.5.4:** Payout must:
- Transfer USDC from contract to user's wallet
- Mark user's position as "claimed" to prevent double-claiming
- Emit event with (user, market, amount, timestamp)

**FR-1.5.5:** Payout must only be claimable when:
- Market is "Resolved"
- User has unclaimed winning position
- User calls the claim function

**FR-1.5.6:** Payout claim must revert if:
- Market not resolved
- User has no winning position
- User already claimed
- Contract has insufficient USDC (should never happen if logic is correct)

**FR-1.5.7:** Users may claim payouts at any time after resolution (no expiration for MVP).

**FR-1.5.8:** Contract must track total claimed amounts to prevent accounting errors.

### 1.6 Edge Cases

**FR-1.6.1:** If all bets are on one outcome and that outcome wins:
- Winners receive their original stake back (1:1 payout)
- No profit because there is no losing pool

**FR-1.6.2:** If all bets are on one outcome and that outcome loses:
- All bets are lost
- No one can claim (no winners)
- Funds remain in contract escrow indefinitely (admin should avoid this by resolving correctly)

**FR-1.6.3:** If zero bets are placed on a market:
- Market can still be resolved
- No payouts to claim
- No funds in escrow

**FR-1.6.4:** Rounding errors in payout calculations:
- Must not allow total claims to exceed total pool
- Dust amounts (wei-level) may remain in contract
- Last claimant should not cause transaction failure due to insufficient funds

### 1.7 Read Functions

The contract must provide read-only functions for:

**FR-1.7.1:** Market details:
- `getMarket(marketId)` → (question, closeTime, state, yesPool, noPool, outcome)

**FR-1.7.2:** User positions:
- `getUserPosition(marketId, userAddress)` → (yesBets, noBets, claimed)

**FR-1.7.3:** Market list:
- `getMarketCount()` → total number of markets
- `getMarketIds(startIndex, count)` → array of market IDs (pagination)

**FR-1.7.4:** Claimable amount:
- `getClaimableAmount(marketId, userAddress)` → USDC amount user can claim (0 if not winner or already claimed)

---

## 2. Non-Functional Requirements

### 2.1 Simplicity

**NFR-2.1.1:** Smart contract logic must be minimal and auditable.
- Target: <300 lines of Solidity (excluding comments and libraries)
- Single contract preferred over multi-contract architecture

**NFR-2.1.2:** UI must prioritize clarity over features.
- No account creation or authentication flows
- Wallet connection is the only "login"

**NFR-2.1.3:** No off-chain dependencies for core functionality.
- All state lives on-chain
- Backend may cache data for performance but is not source of truth

### 2.2 Transparency

**NFR-2.2.1:** All market data must be publicly readable without authentication.
- Anyone can query pools, bets, outcomes via contract calls

**NFR-2.2.2:** Bet placement and claims must emit events for indexing and transparency.

**NFR-2.2.3:** Contract source code must be verified on Polygonscan.

**NFR-2.2.4:** Admin address must be publicly known and constant.

### 2.3 Deterministic Outcomes

**NFR-2.3.1:** Payout calculations must be deterministic and verifiable.
- Given pool state and user position, anyone can compute expected payout

**NFR-2.3.2:** No randomness or oracle calls in payout logic.

**NFR-2.3.3:** Resolution outcome must be immutable once set.

### 2.4 Performance

**NFR-2.4.1:** Bet placement transaction must complete in <5 seconds on Polygon under normal conditions.

**NFR-2.4.2:** Gas costs must be reasonable:
- Bet placement: <100k gas
- Claim payout: <80k gas
- Market creation: <150k gas

**NFR-2.4.3:** Contract must support at least 1000 markets without performance degradation.

### 2.5 Usability

**NFR-2.5.1:** UI must work on desktop and mobile browsers with wallet extensions or WalletConnect.

**NFR-2.5.2:** Users must receive clear feedback for all actions (pending, success, failure).

**NFR-2.5.3:** Error messages must be actionable (e.g., "Insufficient USDC balance. You have 50 USDC, need 100 USDC").

---

## 3. Security & Trust Assumptions

### 3.1 Admin Trust Model

**SEC-3.1.1:** Admin is trusted to:
- Resolve markets correctly based on real-world outcomes
- Resolve markets in a timely manner after close time
- Not create intentionally ambiguous or manipulative markets

**SEC-3.1.2:** Admin cannot:
- Steal escrowed USDC
- Modify existing bets
- Change market outcomes after resolution
- Withdraw funds except via legitimate contract functions

**SEC-3.1.3:** Admin's power is limited to market lifecycle management, not fund custody.

### 3.2 Funds Safety

**SEC-3.2.1:** User USDC must be held in contract escrow, not admin wallet.

**SEC-3.2.2:** Only winners may withdraw USDC, and only after resolution.

**SEC-3.2.3:** Contract must not allow admin to drain escrow via administrative functions.

**SEC-3.2.4:** Reentrancy attacks must be prevented on all state-changing functions (bet, claim).

**SEC-3.2.5:** Integer overflow/underflow must be prevented (use Solidity ^0.8.0 or SafeMath).

### 3.3 Smart Contract Risks

**SEC-3.3.1:** Contract must be tested for:
- Reentrancy
- Integer overflow/underflow
- Unauthorized access (non-admin calling admin functions)
- Double-claiming payouts
- Incorrect payout calculations
- Edge cases (zero pools, all-one-side betting)

**SEC-3.3.2:** Contract should undergo informal security review before mainnet deployment.

**SEC-3.3.3:** Contract should be pausable in emergency (optional for MVP, but recommended).

### 3.4 Known Centralization Risks (Accepted for MVP)

**SEC-3.4.1:** Single admin address is a single point of failure.
- If admin loses private key, markets cannot be resolved
- If admin is malicious, can resolve markets incorrectly (but cannot steal funds)

**SEC-3.4.2:** No dispute resolution mechanism.
- If admin resolves incorrectly, users have no recourse
- Mitigation: Admin's reputation is at stake

**SEC-3.4.3:** No multi-sig or governance for admin actions.
- Future versions should consider multi-sig admin

**SEC-3.4.4:** Manual resolution is subjective.
- Different observers may interpret fundraise outcomes differently
- Mitigation: Admin should cite public sources for resolution decisions

---

## 4. Explicit Non-Goals

### 4.1 No Odds-Setting

**NG-4.1.1:** The contract does not set or enforce odds at bet placement time.

**NG-4.1.2:** Users do not "lock in" odds when placing a bet.

**NG-4.1.3:** Implied odds (pool ratios) may be displayed in the UI for informational purposes, but are not binding.

**Rationale:** Parimutuel model naturally derives payouts from final pool distribution. Fixed odds require market-making.

### 4.2 No Market-Making

**NG-4.2.1:** The contract does not provide liquidity or take positions.

**NG-4.2.2:** There is no "house" that bets against users.

**NG-4.2.3:** All funds come from users; all payouts go to users.

**Rationale:** Market-making adds complexity and capital requirements. Parimutuel is zero-sum among users.

### 4.3 No Automated Resolution

**NG-4.3.1:** No oracles (Chainlink, UMA, etc.) are used for resolution in MVP.

**NG-4.3.2:** Resolution is entirely manual (admin-triggered).

**Rationale:** 
- Fundraise data is not reliably available on-chain
- No standard oracle for startup fundraise outcomes
- Manual resolution is simpler and sufficient for MVP

### 4.4 No Complex Market Types

**NG-4.4.1:** Only binary (YES/NO) markets are supported.

**NG-4.4.2:** No multi-outcome markets (e.g., "Which series: A, B, C, or None?").

**NG-4.4.3:** No conditional markets ("Will X raise if Y happens?").

**NG-4.4.4:** No time-weighted betting or early-bird bonuses.

**Rationale:** Simplicity for MVP. Complex markets can be added later.

### 4.5 No Partial Claims or Cancellations

**NG-4.5.1:** Users cannot cancel or withdraw bets after placement.

**NG-4.5.2:** Users cannot partially claim winnings (all-or-nothing claim).

**Rationale:** Immutability reduces edge cases. Parimutuel pools must remain stable until resolution.

### 4.6 No Fees (Initially)

**NG-4.6.1:** No platform fee is charged on bets or payouts in MVP.

**NG-4.6.2:** Winners receive 100% of the pool (minus gas costs).

**Rationale:** Simplifies payout logic. Fees can be added later (e.g., 1-2% on winnings).

### 4.7 No Account System

**NG-4.7.1:** No email, username, or password-based accounts.

**NG-4.7.2:** No off-chain user profiles or settings.

**NG-4.7.3:** Wallet address is the only identity.

**Rationale:** Wallet-native design. Users own their identity via private keys.

### 4.8 No Cross-Chain Support (Initially)

**NG-4.8.1:** Deployment is Polygon-only in MVP.

**NG-4.8.2:** No bridging to Ethereum, Arbitrum, or other chains.

**Rationale:** Multi-chain adds complexity. Polygon is sufficient for low-cost betting.

---

## 5. Open Questions & Future Considerations

### 5.1 Market Resolution Disputes
**Question:** What happens if admin resolves incorrectly?

**Current Answer:** No recourse. Admin reputation is at stake.

**Future:** Consider appeal period or community vote mechanism.

### 5.2 Inactive Markets
**Question:** What if admin never resolves a market?

**Current Answer:** Funds locked indefinitely.

**Future:** Time-based auto-refund after X days without resolution.

### 5.3 Platform Fees
**Question:** How will the platform be monetized?

**Current Answer:** No fees in MVP.

**Future:** 1-2% fee on winning bets, or creation fee for markets.

### 5.4 Liquidity Incentives
**Question:** How to bootstrap liquidity in new markets?

**Current Answer:** None. Users provide all liquidity.

**Future:** Admin could seed markets with initial bets, or offer rewards for early bettors.

### 5.5 Multi-Sig Admin
**Question:** Should admin be a multi-sig wallet?

**Current Answer:** No, single wallet for MVP simplicity.

**Future:** Migrate to 2-of-3 or 3-of-5 multi-sig for security.

---

## 6. Acceptance Criteria

The system is considered complete when:

1. **Smart Contract:**
   - Deployed to Polygon testnet
   - All functional requirements (FR-1.x) pass unit tests
   - Source code verified on Polygonscan
   - Admin can create, close, and resolve markets
   - Users can bet and claim payouts

2. **Frontend:**
   - Users can connect any EVM wallet
   - Market list displays correctly
   - Bet placement works end-to-end (USDC approval + bet transaction)
   - Claim payout works for resolved markets
   - Network switching prompts appear when on wrong chain

3. **Testing:**
   - At least 5 test markets created and resolved successfully
   - Edge cases tested (zero bets, one-sided betting, multiple claims)
   - No critical bugs identified

4. **Documentation:**
   - Tech stack documented
   - Design notes explain UX decisions
   - Requirements are clear and testable

---

## Appendix: Terminology

- **Parimutuel:** Betting system where all wagers go into a pool, and payouts are calculated by sharing the pool among winners.
- **Escrow:** Funds held by the smart contract until conditions are met (resolution).
- **Resolution:** The act of declaring the final outcome of a market (admin action).
- **Pool:** Total USDC staked on a particular outcome (YES pool, NO pool).
- **Position:** A user's total bets in a market (may include bets on both outcomes).
- **Claim:** User-initiated withdrawal of winnings after market resolution.
- **Admin:** The single privileged wallet address that manages market lifecycle.
- **User:** Any other wallet address interacting with the platform.

---

**Version:** 1.0  
**Date:** 2025-12-16  
**Status:** Draft for MVP Development