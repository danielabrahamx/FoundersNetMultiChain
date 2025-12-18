# FoundersNet Project Structure

```
FoundersNetMultiChain/
│
├── 📋 Root Configuration
│   ├── package.json                    # Root workspace config with parallel scripts
│   ├── pnpm-workspace.yaml            # Defines contracts, backend, frontend workspaces
│   ├── .env.example                   # Environment variable template
│   ├── .env                           # Local env vars (gitignored, create from example)
│   ├── .gitignore                     # Ignore node_modules, build, secrets
│   ├── .prettierrc.json               # Code formatting rules
│   ├── .prettierignore                # Files to skip formatting
│   ├── README.md                      # Complete setup and usage guide
│   └── QUICK_REFERENCE.md             # Quick commands cheat sheet
│
├── 📜 contracts/ (Smart Contracts)
│   ├── contracts/
│   │   └── FoundersNetMarket.sol      # Main prediction market contract
│   │
│   ├── scripts/
│   │   └── deploy.ts                  # Deployment script (local, Amoy, Polygon)
│   │
│   ├── test/
│   │   └── FoundersNetMarket.test.ts  # Contract unit tests
│   │
│   ├── hardhat.config.ts              # Hardhat config (networks, verification)
│   ├── tsconfig.json                  # TypeScript config for scripts/tests
│   ├── .solhint.json                  # Solidity linting rules
│   └── package.json                   # Hardhat, OpenZeppelin, testing deps
│
├── 🖥️  backend/ (Fastify Server)
│   ├── src/
│   │   ├── server.ts                  # Main Fastify server
│   │   └── views/
│   │       └── index.ejs              # EJS template for health check
│   │
│   ├── public/
│   │   └── styles.css                 # Static CSS
│   │
│   ├── tsconfig.json                  # TypeScript config (ESM)
│   └── package.json                   # Fastify, EJS, viem deps
│
├── 🎨 frontend/ (Vite + HTMX + Tailwind)
│   ├── src/
│   │   ├── main.ts                    # Entry point (wallet integration)
│   │   └── styles/
│   │       └── main.css               # Tailwind CSS with custom components
│   │
│   ├── index.html                     # Main HTML with HTMX
│   ├── vite.config.ts                 # Vite dev server and build config
│   ├── tailwind.config.js             # Tailwind custom colors (primary, success, danger)
│   ├── postcss.config.js              # PostCSS for Tailwind
│   ├── tsconfig.json                  # TypeScript config (DOM types)
│   └── package.json                   # Vite, HTMX, Tailwind, viem deps
│
├── 📝 docs/
│   └── activity.md                    # Activity log (architecture decisions, changes)
│
├── ✅ tasks/
│   └── todo.md                        # Implementation task checklist
│
└── 🔧 types/
    └── env.d.ts                       # TypeScript env variable types

```

## Package Breakdown

### Contracts Package
**Purpose:** Smart contract development, testing, and deployment  
**Tech:** Solidity 0.8.20, Hardhat, OpenZeppelin  
**Scripts:**
- `pnpm compile` - Compile contracts
- `pnpm test` - Run tests
- `pnpm deploy:amoy` - Deploy to testnet
- `pnpm verify:amoy <address>` - Verify on Polygonscan

**Key Files:**
- `FoundersNetMarket.sol` - Main contract (placeholder for now)
- `deploy.ts` - Deployment script with network detection
- `hardhat.config.ts` - Polygon Amoy + PoS mainnet configs

---

### Backend Package
**Purpose:** API server for serving HTML and reading blockchain state  
**Tech:** Fastify, EJS, viem  
**Scripts:**
- `pnpm dev` - Start dev server (http://localhost:3000)
- `pnpm build` - Build for production
- `pnpm start` - Run production build

**Key Files:**
- `server.ts` - Fastify server with EJS view engine
- `views/index.ejs` - EJS template (will use HTMX partials)

**Future:**
- Routes for markets list, market details, user positions
- Blockchain reading with viem public client
- Optional Redis caching

---

### Frontend Package
**Purpose:** UI with HTMX for interactivity and viem for Web3  
**Tech:** Vite, HTMX, Tailwind CSS, viem  
**Scripts:**
- `pnpm dev` - Start dev server (http://localhost:5173)
- `pnpm build` - Build for production

**Key Files:**
- `index.html` - Main page with HTMX attributes
- `main.ts` - Wallet connection logic (placeholder)
- `main.css` - Tailwind CSS + custom components
- `tailwind.config.js` - Custom color palette for markets

**Future:**
- Wallet connection (viem)
- USDC approval flow
- Market cards with HTMX updates
- Bet placement and claiming

---

## Dependency Tree

```
FoundersNetMultiChain (root)
│
├─── @foundersnet/contracts
│    ├── hardhat
│    ├── @openzeppelin/contracts
│    └── typechain
│
├─── @foundersnet/backend
│    ├── fastify
│    ├── ejs
│    └── viem
│
└─── @foundersnet/frontend
     ├── vite
     ├── htmx.org
     ├── tailwindcss
     └── viem
```

## Data Flow

```
User Browser
    ↓ (Connect Wallet)
Frontend (Vite + HTMX + viem)
    ↓ (GET /markets, POST /api/tx/bet)
Backend (Fastify + viem read client)
    ↓ (Read contract state)
Polygon RPC (Alchemy/Infura)
    ↓ (Query blockchain)
FoundersNetMarket Smart Contract
    ↑ (State: markets, bets, outcomes)
USDC Token Contract
    ↑ (User balances, allowances)
```

## Development Flow

1. **Smart Contracts First:**
   - Implement market logic in `FoundersNetMarket.sol`
   - Write tests
   - Deploy to local Hardhat network
   - Deploy to Amoy testnet
   - Verify on Polygonscan

2. **Backend Second:**
   - Implement contract reading with viem
   - Create API routes for markets, positions, balances
   - Return unsigned transaction data for client signing

3. **Frontend Third:**
   - Implement wallet connection
   - Build market list and detail views
   - Add bet placement forms
   - Integrate HTMX for partial updates
   - Style with Tailwind CSS

4. **Integration:**
   - Connect frontend to backend API
   - Test end-to-end flows (bet, claim, resolve)
   - Deploy frontend to Vercel/Netlify
   - Deploy backend to VPS or serverless

---

**Current Status:** ✅ Project scaffolding complete  
**Next Step:** Implement smart contract business logic per `requirements.md`
