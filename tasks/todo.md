# FoundersNet Implementation Tasks

## Current Sprint: Fix Admin Panel Navigation

### Problem
The admin pages rely on `x-wallet-address` HTTP header for authentication, but:
1. Normal `<a href>` links don't send custom headers
2. Using `document.write()` for navigation breaks wallet.js initialization
3. Wallet state gets lost between page navigations

### Fix Plan (Simple)
- [x] Change admin routes to accept wallet address from query params OR header
- [x] Update admin pages to use simple href links with query params
- [x] Update login page to use simple redirect
- [x] Ensure wallet.js properly restores session on page load
- [ ] Test full admin flow: login → dashboard → create market → resolve

---

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

## Admin Panel ✅

- [x] Create admin middleware for access control
- [x] Implement admin routes (admin.ts)
- [x] Create admin dashboard page (GET /admin)
- [x] Create market creation form (GET /admin/create-market)
- [x] Create market resolution page (GET /admin/resolve/:id)
- [x] Admin API endpoints (POST /api/admin/tx/create-market, POST /api/admin/tx/resolve-market)
- [x] Add admin link to navigation (visible only for admin wallet)
- [x] Document admin workflows

## Local Development & Testing Setup ✅

- [x] Update hardhat.config.ts for forking and local development
- [x] Create scripts for funding test accounts
- [x] Update deploy scripts for local environment
- [x] Add development scripts to root package.json
- [x] Create DEVELOPMENT.md with setup instructions

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

**Current Status:** 🔧 Fixing admin panel navigation issues
**Next Task:** Update admin routes to use sessionStorage for auth instead of headers
