# FoundersNet Implementation Tasks

## Project Setup ✅

- [x] Create root package.json with pnpm workspace configuration
- [x] Create pnpm-workspace.yaml
- [x] Create .env.example with all required variables
- [x] Create .gitignore
- [x] Create .prettierrc.json and .prettierignore
- [x] Create comprehensive README.md

## Contracts Package ✅

- [x] Create contracts/package.json with Hardhat dependencies
- [x] Create hardhat.config.ts for Polygon networks
- [x] Create contracts/tsconfig.json
- [x] Create .solhint.json for linting
- [x] Create placeholder FoundersNetMarket.sol
- [x] Create deployment script (scripts/deploy.ts)
- [x] Create placeholder test file

## Backend Package ✅

- [x] Create backend/package.json with Fastify
- [x] Create backend/tsconfig.json for ESM
- [x] Create server.ts with Fastify setup
- [x] Create EJS template (views/index.ejs)
- [x] Create static CSS file

## Frontend Package ✅

- [x] Create frontend/package.json with Vite, HTMX, Tailwind
- [x] Create vite.config.ts
- [x] Create frontend/tsconfig.json
- [x] Create tailwind.config.js with custom colors
- [x] Create postcss.config.js
- [x] Create index.html with HTMX
- [x] Create main.css with Tailwind
- [x] Create main.ts entry point

## Documentation ✅

- [x] Create activity.md (this file)
- [x] Create env.d.ts type definitions

## Next Phase: Smart Contract Development

### Core Contract Logic
- [ ] Implement market creation (admin only)
- [ ] Implement bet placement (USDC escrow)
- [ ] Implement market resolution (admin only)
- [ ] Implement payout claims
- [ ] Add proper events for all state changes
- [ ] Implement view functions (getMarket, getUserPosition, etc.)

### Contract Testing
- [ ] Write tests for market creation
- [ ] Write tests for bet placement
- [ ] Write tests for resolution
- [ ] Write tests for payouts
- [ ] Write edge case tests (zero bets, one-sided betting, etc.)
- [ ] Test reentrancy protection
- [ ] Test access control (admin functions)
- [ ] Generate coverage report

### Deployment
- [ ] Deploy to local Hardhat network
- [ ] Deploy to Polygon Amoy testnet
- [ ] Verify contract on Polygonscan
- [ ] Update .env with contract addresses

## Next Phase: Backend Development

### Blockchain Integration
- [ ] Create viem client for reading contracts
- [ ] Implement market list endpoint
- [ ] Implement market details endpoint
- [ ] Implement user position endpoint
- [ ] Add caching layer (optional Redis)

### API Routes
- [ ] GET / - Homepage with markets list
- [ ] GET /market/:id - Market details
- [ ] GET /markets - HTMX partial for market refresh
- [ ] GET /balance/:address - User USDC balance
- [ ] POST /api/tx/bet - Return unsigned transaction data
- [ ] POST /api/tx/claim - Return unsigned transaction data

### Testing
- [ ] Write API endpoint tests
- [ ] Test contract read functions
- [ ] Test error handling

## Next Phase: Frontend Development

### Wallet Integration
- [x] Implement wallet connection with viem (native browser APIs)
- [x] Add network detection and switching
- [x] Implement USDC approval flow
- [x] Add wallet disconnect functionality
- [x] Document wallet connection flow

### UI Components
- [ ] Markets list with HTMX partial updates
- [ ] Market detail page
- [ ] Bet placement form
- [ ] Claim payout button
- [ ] User positions dashboard
- [ ] Admin panel (market creation, resolution)

### HTMX Integration
- [ ] Implement partial rendering for market updates
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Add transaction status polling

### Styling
- [ ] Responsive design for mobile
- [ ] Improve button states (disabled, loading)
- [ ] Add animations and transitions
- [ ] Create market card components
- [x] Style admin panel

## Admin Panel ✅

- [x] Create admin middleware for access control
- [x] Implement admin routes (admin.ts)
- [x] Create admin dashboard page (GET /admin)
- [x] Create market creation form (GET /admin/create)
- [x] Create market resolution page (GET /admin/resolve/:id)
- [x] Admin API endpoints (POST /api/admin/tx/create-market, POST /api/admin/tx/resolve-market)
- [x] Add admin link to navigation (visible only for admin wallet)
- [x] Document admin workflows

## Local Development & Testing Setup ✅

### Hardhat Local Node Configuration
- [x] Update hardhat.config.ts for forking and local development
- [x] Create scripts for funding test accounts
- [x] Update deploy scripts for local environment

### Development Scripts (Root package.json)
- [x] Add pnpm dev:contracts (Start Hardhat node)
- [x] Add pnpm dev:backend (Start Fastify with nodemon)
- [x] Add pnpm dev:frontend (Start Vite dev server)
- [x] Add pnpm dev:all (Run all concurrently)
- [x] Add pnpm test:contracts (Run Hardhat tests)
- [x] Add pnpm test:integration (Run end-to-end tests)
- [x] Add pnpm deploy:local (Deploy to local node)

### Backend Development
- [x] Add nodemon configuration for auto-restart (using tsx --watch)
- [x] Configure development environment variables
- [x] Create seed script for test data

### Frontend Development  
- [x] Update Vite config for API proxy
- [x] Add mock wallet for testing
- [x] Configure hot reload for templates

### Integration Testing
- [x] Create test helpers for wallet mocking
- [x] Test user flows (connect, bet, claim)
- [x] Test admin flows (create, resolve)
- [x] Test with multiple user accounts

### Documentation
- [x] Create DEVELOPMENT.md with setup instructions
- [x] Add troubleshooting guide
- [x] Add testing checklist
- [x] Document how to get testnet tokens

---

## Future Enhancements (Post-MVP)

- [ ] Multi-sig admin
- [ ] Platform fees
- [ ] Market search and filters
- [ ] Email/push notifications
- [ ] Market comments
- [ ] Mainnet deployment
- [ ] Security audit
- [ ] Performance optimization

---

**Current Status:** ✅ Local development environment complete  
**Next Task:** Test full user flows with local development setup
