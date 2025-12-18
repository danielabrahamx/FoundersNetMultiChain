# FoundersNet Technology Stack

## 1. Blockchain & Smart Contracts

### Solidity & EVM
- **Solidity**: `^0.8.20` - Latest stable with built-in overflow checks and modern syntax
- **OpenZeppelin Contracts**: `^5.0.0` - Audited libraries for ERC-20 interactions, access control (Ownable), and reentrancy guards

### Contract Architecture
- **Primary Contract**: `FoundersNetMarket.sol`
  - Manages market creation, bet placement, resolution, and payouts
  - Uses `Ownable` for admin-only functions (create, resolve markets)
  - Integrates with USDC contract via IERC20 interface
- **USDC Integration**: Reference existing Polygon USDC token addresses
  - Testnet: Look up current USDC.e or bridged USDC on Polygon Amoy testnet
  - Mainnet: Native USDC on Polygon PoS (verify address at deployment time via Polygonscan)
  - Store USDC address as constructor parameter or environment variable
- **Escrow Model**: Contract holds USDC during active markets, releases on resolution
- **Deployment Addresses**: To be populated after contract deployment
  - Store in `.env` files per network
  - Update frontend/backend configuration post-deployment
- **Resolution**: Admin-callable `resolveMarket(uint256 marketId, bool outcome)` function
- **No Oracles**: Manual resolution sufficient for MVP

### Testing
- **Hardhat**: Primary framework for development, testing, and deployment
  - Local node for fast iteration
  - Mainnet forking capability for USDC integration testing
- **Hardhat-deploy**: Deterministic deployments and contract management
- **Chai + Hardhat-waffle**: Unit and integration testing
- **Solidity-coverage**: Code coverage metrics

### Deployment
- **Target Networks**:
  - Development: Hardhat local node (primary for initial development)
  - Testnet: Sepolia (Ethereum) or Polygon Amoy (when testnet funds available)
  - Mainnet: Polygon PoS
- **Development Workflow**:
  - Use Hardhat local network with MockUSDC for rapid iteration
  - MockUSDC contract provides unlimited test tokens
  - No faucet required for local development
  - Transition to public testnet once core features are stable
- **Deployment Scripts**: Hardhat deploy scripts with network-specific parameters
- **Verification**: Hardhat-etherscan plugin for contract verification on Polygonscan/Etherscan

---

## 2. Frontend

### Core Framework
- **HTMX**: `^2.0.3` - Server-driven interactivity without client-side JS framework overhead
  - `hx-get`, `hx-post` for partial HTML updates
  - `hx-trigger` for wallet event listeners
  - `hx-swap` for targeted DOM updates (markets list, bet forms, balance displays)
- **Hyperscript**: Optional companion for simple client-side logic (modals, UI state)

### Styling
- **Tailwind CSS**: `^3.4` - Utility-first CSS for rapid UI development
  - JIT mode for minimal bundle size
  - Custom color palette for prediction market UI (green/red for outcomes)
- **DaisyUI**: `^4.0` (optional) - Pre-built Tailwind components for modals, cards, buttons

### Wallet Integration
- **viem**: `^2.21` - Modern, TypeScript-first Ethereum library
  - Lighter than ethers.js, better tree-shaking
  - Type-safe contract interactions
  - Handles wallet connection, transaction signing, contract reads/writes
- **Wagmi**: `^2.12` (optional) - React hooks for wallet management if minimal client reactivity needed
  - Abstracts MetaMask/WalletConnect detection
  - Can be used without React framework (vanilla JS mode)

### Build Tooling
- **Vite**: `^5.0` - Fast dev server and build tool
  - Native ES modules support
  - Optimized for HTMX + Tailwind workflow
  - PostCSS integration for Tailwind processing

### Browser Requirements
- Modern browsers with Web3 wallet extension support
- No IE11 compatibility required

---

## 3. Backend

### Runtime & Framework
- **Node.js**: `20.x LTS` - Stable, long-term support
- **Fastify**: `^4.28` - High-performance, low-overhead HTTP server
  - Faster than Express for simple HTML serving
  - Built-in schema validation
  - Plugin ecosystem for view rendering

### Templating
- **EJS**: `^3.1` - Simple templating for server-rendered HTML
  - Familiar syntax for HTML generation
  - HTMX partial support (render fragments)
- **Fastify-view**: Plugin for EJS integration

### Blockchain Interaction
- **viem**: Same library as frontend for consistency
  - Public client for reading contract state (markets, odds, user positions)
  - No private keys stored on server
  - RPC calls only for read operations
- **Contract ABIs**: Imported from Hardhat artifacts

### State Management
- **No database required for MVP**
  - All state lives on-chain
  - Server reads blockchain as source of truth
- **(Optional) Redis**: `^7.0` - If caching RPC responses becomes necessary
  - Cache market data with short TTL (5-10s)
  - Invalidate on new blocks

### API Structure
- **Routes**:
  - `GET /` - Homepage with markets list
  - `GET /market/:id` - Individual market view
  - `GET /markets` - HTMX partial for markets list refresh
  - `GET /balance/:address` - User USDC balance (reads from contract)
  - `POST /api/tx/bet` - Returns unsigned transaction data for client signing
  - `POST /api/tx/claim` - Returns unsigned transaction data for client signing

### Environment Configuration
- **dotenv**: `^16.0` - Environment variable management
  - RPC URLs (testnet, mainnet)
  - Contract addresses (populated after deployment)
  - USDC token addresses per network
  - Admin wallet address (public only)

---

## 4. Tooling & Development Environment

### Operating System
- **Ubuntu 22.04 LTS (WSL2)** - Consistent Linux environment on Windows
  - WSL 2 for full system call compatibility
  - Windows Terminal for improved CLI experience

### Package Management
- **pnpm**: `^9.0` - Fast, disk-efficient package manager
  - Workspaces support if monorepo structure adopted
  - Strict dependency resolution

### Smart Contract Tooling
- **Hardhat**: `^2.22` - Primary Solidity development framework
  - `hardhat-toolbox`: Bundled plugins (ethers, chai, etherscan)
  - `hardhat-gas-reporter`: Gas optimization insights
  - `hardhat-contract-sizer`: Contract size monitoring
- **Foundry** (alternative): For advanced testing if Hardhat insufficient
  - Faster test execution
  - Fuzz testing capabilities

### Code Quality
- **TypeScript**: `^5.6` - Type safety for backend and frontend JS
- **ESLint**: `^9.0` - JavaScript/TypeScript linting
  - Airbnb or Standard config as baseline
- **Prettier**: `^3.0` - Code formatting
- **Solhint**: `^5.0` - Solidity linting
- **Husky**: `^9.0` - Git hooks for pre-commit checks

### Testing
- **Hardhat Tests**: Solidity unit and integration tests
- **Vitest**: `^2.0` - Fast unit testing for backend logic
  - ESM-native, Vite-compatible
- **(Optional) Playwright**: `^1.48` - E2E testing for HTMX flows
  - Headless browser testing for wallet interaction flows

### RPC Providers
- **Alchemy**: Primary RPC provider
  - Free tier: 300M compute units/month
  - WebSocket support for event listening
  - Polygon Amoy and PoS support
- **Infura** (backup): Failover RPC endpoint
- **Public RPC** (dev only): Polygon's public endpoints for non-critical testing

### Block Explorers
- **Polygonscan**: Amoy testnet and PoS mainnet
  - Contract verification
  - Transaction debugging
  - API for programmatic queries if needed

### Version Control
- **Git**: Standard version control
- **GitHub/GitLab**: Repository hosting with CI/CD integration

### CI/CD
- **GitHub Actions** (recommended):
  - Solidity compilation and testing
  - TypeScript type checking and linting
  - Automated testnet deployments on merge to `main`
- **Deployment**: Manual deployment to mainnet with admin approval

---

## 5. Wallet & Network Integration

### Wallet Support
- **MetaMask**: Primary wallet target
  - Browser extension (Chrome, Firefox, Brave)
  - Mobile app with WalletConnect
- **WalletConnect v2**: `^2.17` - Multi-wallet support
  - Fallback for non-MetaMask users
  - QR code connection for mobile wallets
- **Coinbase Wallet**: Supported via WalletConnect
- **Rainbow, Trust Wallet**: Supported via WalletConnect

### Wallet Connection Flow
1. User clicks "Connect Wallet" button
2. viem detects available providers (MetaMask injected, WalletConnect modal)
3. User selects wallet and approves connection
4. Frontend stores connected address in session (client-side only)
5. Backend never stores private keys or session data

### Network Configuration
- **Polygon Amoy (Testnet)**:
  - Chain ID: `80002`
  - RPC: `https://rpc-amoy.polygon.technology/` or Alchemy
  - Currency: MATIC (for gas)
  - Block Explorer: `https://amoy.polygonscan.com/`
  - Faucet: Polygon faucet for testnet MATIC

- **Polygon PoS (Mainnet)**:
  - Chain ID: `137`
  - RPC: `https://polygon-rpc.com/` or Alchemy
  - Currency: MATIC (for gas)
  - Block Explorer: `https://polygonscan.com/`

### Network Switching
- **Automatic Prompts**: viem detects wrong network and prompts user to switch
- **wallet_addEthereumChain**: RPC call to add Polygon if not in user's wallet
- **Graceful Degradation**: Show network mismatch warning if user declines switch

### Transaction Flow
1. User initiates action (place bet, claim payout)
2. Frontend calls backend endpoint to get unsigned transaction data
3. Backend returns transaction parameters (to, data, value, gas estimate)
4. Frontend uses viem to request signature from wallet
5. User approves transaction in wallet popup
6. Signed transaction broadcast to network via wallet's RPC
7. Frontend polls for transaction receipt, updates UI via HTMX

### Gas Management
- **Gas Estimation**: viem `estimateGas` before transaction submission
- **Gas Price Strategy**: Use network's suggested gas price (EIP-1559 on Polygon)
- **User Visibility**: Show estimated gas cost in MATIC before transaction approval

### USDC Approval Flow
- **Two-Step Process**:
  1. User approves FoundersNet contract to spend USDC (one-time or per-bet)
  2. User places bet (transfers USDC to contract)
- **Approval Check**: Frontend checks allowance before bet, prompts approval if insufficient
- **Unlimited Approval Option**: Allow users to approve max uint256 for convenience (with warning)

---

## Implementation Priority

1. **Smart Contracts**: Core market logic, USDC integration, admin controls
2. **Backend**: Fastify server, EJS templates, contract read functions
3. **Frontend**: HTMX integration, viem wallet connection, basic UI
4. **Testing**: Hardhat tests for contracts, manual testing for frontend
5. **Deployment**: Testnet deployment, frontend hosting (Vercel/Netlify)
6. **Mainnet**: After testnet validation and security review

---

## Dependencies Summary

### Smart Contracts
```json
{
  "@openzeppelin/contracts": "^5.0.0",
  "hardhat": "^2.22.0",
  "@nomicfoundation/hardhat-toolbox": "^5.0.0",
  "hardhat-deploy": "^0.12.0"
}
```

### Backend
```json
{
  "fastify": "^4.28.0",
  "@fastify/view": "^10.0.0",
  "ejs": "^3.1.0",
  "viem": "^2.21.0",
  "dotenv": "^16.0.0"
}
```

### Frontend
```json
{
  "htmx.org": "^2.0.3",
  "viem": "^2.21.0",
  "@walletconnect/web3-provider": "^1.8.0"
}
```

### DevDependencies
```json
{
  "typescript": "^5.6.0",
  "vite": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "prettier": "^3.0.0",
  "eslint": "^9.0.0",
  "vitest": "^2.0.0"
}
```