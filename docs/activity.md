# FoundersNet Activity Log

## 2025-12-16 - Initial Project Setup

### User Request
User requested setup of initial project structure for FoundersNet based on requirements, design notes, and tech stack documents.

### Requirements Summary
- **Product**: Permissionless parimutuel prediction market for startup fundraises
- **Blockchain**: Polygon (Amoy testnet → mainnet)
- **Model**: Binary markets (YES/NO) with USDC escrow
- **Resolution**: Manual admin resolution
- **Identity**: Wallet-only (no accounts)

### Actions Taken

#### 1. Root Configuration
- Created `package.json` with pnpm workspace configuration
- Created `pnpm-workspace.yaml` defining three packages: contracts, backend, frontend
- Created `.env.example` with comprehensive environment variable templates
- Created `.gitignore` for node_modules, build artifacts, and secrets
- Created `.prettierrc.json` and `.prettierignore` for code formatting

#### 2. Contracts Workspace (`contracts/`)
- Created `package.json` with Hardhat and OpenZeppelin dependencies
- Created `hardhat.config.ts` for Polygon networks (local, Amoy, mainnet)
- Created `tsconfig.json` for TypeScript support
- Created `.solhint.json` for Solidity linting
- Created placeholder `FoundersNetMarket.sol` contract
- Created `deploy.ts` deployment script with network detection
- Created placeholder test file

**Dependencies Added:**
- `@nomicfoundation/hardhat-toolbox` ^5.0.0
- `@openzeppelin/contracts` ^5.0.2
- `hardhat` ^2.22.15
- `hardhat-deploy` ^0.12.4
- `solhint` ^5.0.3

#### 3. Backend Workspace (`backend/`)
- Created `package.json` with Fastify and EJS
- Created `tsconfig.json` for ES2022/ESNext
- Created `server.ts` with Fastify setup, EJS views, and static file serving
- Created `index.ejs` template for health check
- Created basic CSS for health check page

**Dependencies Added:**
- `fastify` ^4.28.1
- `@fastify/view` ^10.0.1
- `ejs` ^3.1.10
- `viem` ^2.21.45
- `tsx` (for dev mode with hot reload)

#### 4. Frontend Workspace (`frontend/`)
- Created `package.json` with Vite, HTMX, and Tailwind
- Created `vite.config.ts` with dev server configuration
- Created `tsconfig.json` for DOM support
- Created `tailwind.config.js` with custom color palette (primary, success, danger)
- Created `postcss.config.js` for Tailwind processing
- Created `index.html` with HTMX integration and placeholder UI
- Created `main.css` with Tailwind directives and custom components
- Created `main.ts` entry point with placeholder wallet handler

**Dependencies Added:**
- `vite` ^5.4.11
- `htmx.org` ^2.0.3
- `tailwindcss` ^3.4.15
- `viem` ^2.21.45

#### 5. Documentation
- Created comprehensive `README.md` with:
  - Project overview and architecture
  - Tech stack details
  - Ubuntu 22.04 WSL setup instructions
  - Step-by-step getting started guide
  - Development workflow for all packages
  - Smart contract deployment guide
  - Project structure overview
  - Testing instructions
  - Security considerations
  - Troubleshooting section

#### 6. Type Definitions
- Created `types/env.d.ts` with TypeScript interfaces for environment variables

### Architecture Decisions

#### Monorepo Structure
- Chose **pnpm workspaces** for efficient dependency management
- Separated concerns into three independent but related packages
- Each package has its own `package.json` and can be developed independently
- Root `package.json` provides scripts to run all workspaces in parallel

#### Smart Contracts
- **Hardhat** chosen over Foundry for better TypeScript integration
- **OpenZeppelin** for audited library contracts (Ownable, ReentrancyGuard, IERC20)
- **Solidity ^0.8.20** for built-in overflow protection
- Configured for both Amoy testnet and Polygon mainnet

#### Backend
- **Fastify** chosen over Express for better performance
- **EJS** for simple server-side templating (HTMX partial support)
- **viem** for blockchain reads (no private keys on server)
- **ESM** (ES modules) for modern Node.js patterns

#### Frontend
- **Vite** for fast dev server and optimized builds
- **HTMX** for server-driven interactivity (no heavy JS framework)
- **Tailwind CSS** for rapid UI development with utility classes
- **viem** for wallet connection and Web3 interactions
- **No client-side framework** (React, Vue, etc.) - keeping it simple

### Network Configuration

#### Polygon Amoy Testnet
- Chain ID: 80002
- RPC: `https://rpc-amoy.polygon.technology/`
- USDC: `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
- Block Explorer: `https://amoy.polygonscan.com/`

#### Polygon PoS Mainnet
- Chain ID: 137
- USDC (Native): `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`
- Block Explorer: `https://polygonscan.com/`

### Deferred to Development Phase

**NOT implemented (as per user request to only create scaffolding):**
- Smart contract business logic (markets, bets, resolution, payouts)
- Backend blockchain reading logic
- Frontend wallet connection with viem
- HTMX partial rendering
- Admin panel
- Market creation/resolution flows
- Bet placement and claiming flows
- Tests (beyond placeholder)

### Next Steps

User should:
1. Run `pnpm install` to install all dependencies
2. Copy `.env.example` to `.env` and fill in API keys
3. Get testnet MATIC from Polygon faucet
4. Begin implementing smart contract logic per `requirements.md`

### Files Created (Total: 28)

**Root:**
- package.json
- pnpm-workspace.yaml
- .env.example
- .gitignore
- .prettierrc.json
- .prettierignore
- README.md

**Contracts (7 files):**
- package.json
- hardhat.config.ts
- tsconfig.json
- .solhint.json
- contracts/FoundersNetMarket.sol
- scripts/deploy.ts
- test/FoundersNetMarket.test.ts

**Backend (5 files):**
- package.json
- tsconfig.json
- src/server.ts
- src/views/index.ejs
- public/styles.css

**Frontend (8 files):**
- package.json
- vite.config.ts
- tsconfig.json
- tailwind.config.js
- postcss.config.js
- index.html
- src/styles/main.css
- src/main.ts

**Types (1 file):**
- types/env.d.ts

### Notes

- All placeholder code includes comments indicating it's scaffolding only
- Configuration files are production-ready
- Environment variables cover all deployment scenarios (local, testnet, mainnet)
- README provides complete setup instructions for Ubuntu 22.04 WSL
- Project follows principles from `claude.md`: simplicity, incremental execution, minimal dependencies

---

## 2025-12-16 - HTML Templates and HTMX Interactions

### User Request
Create EJS templates with HTMX for FoundersNet based on design-notes.md user flows and tech-stack.md Section 2 (Frontend).

### Actions Taken

#### 1. Layout Template (`views/layouts/main.ejs`)
Enhanced base layout with:
- **HTMX 2.0.3** CDN with integrity hash
- **Tailwind CSS 3.4** CDN with custom color configuration
- **viem CDN** for wallet interactions
- **Wallet Connection UI** with connect/disconnect states
- **Network Status Indicator** with visual dot (connected/disconnected/wrong-network)
- **Wrong Network Warning Banner** with switch network button
- **Accessibility improvements**: skip links, ARIA labels, semantic HTML
- **Custom CSS**: glassmorphism cards, gradient backgrounds, loading animations
- **Global wallet state management**: connect, disconnect, network switching
- **HTMX configuration**: auto-attach wallet address to requests

#### 2. Homepage (`views/pages/home.ejs`)
- Hero section with gradient text and clear CTAs
- **"Connect Wallet to Start Betting"** button (hidden when connected)
- **"Create Market"** button (admin-only, shown only for admin wallet)
- Markets section with **auto-refresh every 10 seconds** via HTMX
- Manual refresh button with loading indicator
- "How It Works" section explaining the prediction market flow
- Features grid showcasing platform benefits

#### 3. Market Detail Page (`views/pages/market.ejs`)
- Back navigation with breadcrumb
- Market header with status badge (Open/Closed/Resolved)
- Full market info: question, close time, market ID
- Pool display with **auto-refresh every 10 seconds**
- **Two-column layout**: Betting Form + User Position
- Betting section with HTMX-loaded form
- Position section with HTMX-loaded user data
- Market details grid (ID, close time, status, volume)
- Admin resolution section (admin-only, shown for closed markets)

#### 4. Market Card Partial (`views/partials/market-card.ejs`)
- Status badges: Open (green, animated pulse), Closed (yellow), Resolved (blue)
- Question with hover effects
- **Visual odds bar** showing YES/NO percentages
- Pool total and timing info
- Hover indicator with arrow animation
- ARIA labels for accessibility

#### 5. Betting Form Partial (`views/partials/betting-form.ejs`)
- **Closed market states**: Resolved with outcome display, Awaiting resolution
- **Open market form** with:
  - YES/NO outcome selection with visual feedback
  - Amount input with validation
  - Quick amount buttons ($5, $10, $25, $50, $100)
  - Dynamic submit button (changes to "Place YES Bet" or "Place NO Bet")
  - Loading states during transaction building
  - Inline error messages
  - Client-side validation (minimum 1 USDC)
- HTMX submit to `/api/tx/bet` endpoint

#### 6. Pool Display Partial (`views/partials/pool-display.ejs`)
- YES/NO pools with percentage and USDC amount
- Visual bar showing pool distribution
- Total pool display with styling

#### 7. User Position Partial (`views/partials/user-position.ejs`)
- No bets state with helpful message
- YES/NO bet summaries with color coding
- Total position display
- **Winner states**:
  - Claimable winnings with Claim Payout button
  - Already claimed confirmation
  - Lost bet message
- Awaiting resolution state
- Claim payout functionality with loading states

#### 8. Markets List Partial (`views/partials/markets-list.ejs`)
- Responsive grid layout (1/2/3 columns)
- Markets count display
- Empty state with CTA to browse markets
- Admin-only "Create First Market" button in empty state

#### 9. Other Partials
- **error.ejs**: Inline error message with icon
- **connect-wallet-prompt.ejs**: Reusable wallet connection CTA
- **position-login-prompt.ejs**: Compact connect wallet for position section
- **user-bets-list.ejs**: My Bets page content with stats and bet cards

#### 10. My Bets Page (`views/pages/my-bets.ejs`)
- Wallet connection check
- HTMX loading of user bets
- Stats summary (total bets, wagered, pending, claimable)
- Bet cards with market info and actions

#### 11. Error Page (`views/pages/error.ejs`)
- Enhanced error display with icon
- Go Home and Go Back buttons

### Design Decisions

#### Mobile-First Responsive Design
- All templates use responsive Tailwind classes (sm:, md:, lg:)
- Navigation collapses appropriately on mobile
- Grid layouts adjust from 1 column (mobile) to 3 columns (desktop)

#### Accessibility
- Semantic HTML5 elements (nav, main, article, section)
- ARIA labels on all interactive elements
- Skip to main content link
- Keyboard navigation support
- Role attributes for dynamic content

#### Color Coding
- **YES**: Green (#22c55e) for positive outcomes
- **NO**: Red (#ef4444) for negative outcomes
- **Primary**: Indigo (#6366f1) for actions
- **Secondary**: Purple (#8b5cf6) for secondary actions

#### HTMX Patterns
- `hx-trigger="every 10s"` for auto-refresh
- `hx-trigger="load"` for initial data loading
- `hx-swap="innerHTML"` for content replacement
- Loading indicators with `.htmx-indicator` class
- Global request configuration via event listeners

#### Wallet Integration (Placeholder)
- Uses injected `window.ethereum` provider
- Account and chain change listeners
- Network switching via `wallet_switchEthereumChain`
- Admin detection by comparing wallet to configured admin address

### Files Modified/Created

**Layouts (1 file):**
- `backend/src/views/layouts/main.ejs` - Enhanced

**Pages (4 files):**
- `backend/src/views/pages/home.ejs` - Enhanced
- `backend/src/views/pages/market.ejs` - Enhanced
- `backend/src/views/pages/my-bets.ejs` - Enhanced
- `backend/src/views/pages/error.ejs` - Enhanced

**Partials (9 files):**
- `backend/src/views/partials/market-card.ejs` - Enhanced
- `backend/src/views/partials/betting-form.ejs` - Enhanced
- `backend/src/views/partials/pool-display.ejs` - Enhanced
- `backend/src/views/partials/user-position.ejs` - Enhanced
- `backend/src/views/partials/markets-list.ejs` - Enhanced
- `backend/src/views/partials/user-bets-list.ejs` - Enhanced
- `backend/src/views/partials/error.ejs` - Enhanced
- `backend/src/views/partials/connect-wallet-prompt.ejs` - Enhanced
- `backend/src/views/partials/position-login-prompt.ejs` - Enhanced

### Notes

- All templates follow the simplicity principle from `claude.md`
- Tailwind utility classes used exclusively (no custom CSS except for animations)
- HTMX provides reactivity without JavaScript framework overhead
- Loading states and error handling throughout
- Admin-only features hidden by default, revealed via JavaScript
- Wallet integration is placeholder - requires viem implementation for full functionality

---

## 2025-12-16 - Wallet Integration

### User Request
Implement client-side wallet integration for FoundersNet using viem, based on tech-stack.md section 5 (Wallet & Network Integration) and design-notes.md wallet interaction patterns.

### Actions Taken

#### 1. Created `backend/public/wallet.js`
Comprehensive wallet integration module with:

**Wallet Connection:**
- Provider detection (MetaMask, Coinbase Wallet, Rainbow, Brave)
- EIP-5749 multi-provider support
- Session storage for connection persistence
- Connect/disconnect functionality
- Account and chain change listeners

**Network Handling:**
- Network detection and validation
- Switch network functionality (`wallet_switchEthereumChain`)
- Add network functionality (`wallet_addEthereumChain`)
- Visual network status indicator
- Support for Hardhat local (31337), Polygon Amoy (80002), Polygon PoS (137)

**USDC Approval:**
- Allowance checking
- Approval request (exact or unlimited amount)
- Approval transaction tracking
- Progress events

**Transaction Signing:**
- Accept unsigned transaction data from backend
- Request signature from wallet
- Transaction pending states
- Receipt polling with timeout
- Confirmation/failure handling

**Contract Reads:**
- Get USDC balance
- Get user position in markets
- Get claimable amounts
- Function selector encoding

**Error Handling:**
- Custom WalletError class with error codes
- User rejection handling
- Insufficient funds detection
- Network congestion handling
- Transaction failure/revert handling

**HTMX Integration:**
- Custom DOM events for wallet state changes
- Event listeners on document level
- Automatic content refresh triggers

#### 2. Updated `backend/src/views/layouts/main.ejs`
- Replaced viem CDN with local `wallet.js`
- Split inline script into configuration and HTMX sections
- Added `rpcUrl` to appConfig
- Added wallet event listeners for HTMX integration
- Removed duplicate wallet functions (now in wallet.js)

#### 3. Updated `backend/src/server.ts`
- Changed static file prefix from `/public/` to `/` for cleaner URLs

#### 4. Updated `backend/src/routes/pages.ts`
- Added `blockExplorer` and `rpcUrl` to all page template contexts

#### 5. Created `docs/WALLET_INTEGRATION.md`
Comprehensive documentation covering:
- Architecture overview
- Connection flow
- Network handling
- USDC approval flow
- Transaction signing
- Contract reads
- HTMX integration
- Error handling
- UI components
- Global API reference
- Mobile support
- Development notes
- Security considerations
- Future enhancements

### Design Decisions

#### Native Browser APIs
- Used raw `window.ethereum` provider instead of full viem bundling
- Reduces bundle size and dependency complexity
- Function selectors hardcoded to avoid keccak256 import

#### Event-Driven Architecture
- WalletManager emits internal events
- Also dispatches DOM CustomEvents with `wallet:` prefix
- Enables loose coupling with HTMX

#### Session Persistence
- Uses `sessionStorage` (not `localStorage`)
- Clears on tab close (security)
- Stores only public address

#### Error Codes
- Consistent error code system
- Actionable error messages
- Graceful degradation

### Files Created/Modified

**Created:**
- `backend/public/wallet.js` - Complete wallet integration (1100+ lines)
- `docs/WALLET_INTEGRATION.md` - Wallet flow documentation

**Modified:**
- `backend/src/views/layouts/main.ejs` - Updated script includes
- `backend/src/server.ts` - Static file prefix change
- `backend/src/routes/pages.ts` - Added template variables
- `tasks/todo.md` - Marked wallet tasks complete

### Notes

- The wallet.js module is standalone and doesn't require viem npm package
- Function selectors are pre-calculated for common ERC20 and market contract functions
- Mobile wallet support via WalletConnect requires additional modal implementation
- All wallet signing happens client-side; backend only provides unsigned transactions
- Error toast notifications provide user feedback
- Network status indicator shows connection state visually

