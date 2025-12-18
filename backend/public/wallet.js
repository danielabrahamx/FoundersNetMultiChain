/**
 * FoundersNet Wallet Integration
 * 
 * Complete client-side wallet integration using viem ^2.21
 * Supports MetaMask, WalletConnect v2, Coinbase Wallet, Rainbow
 * 
 * Features:
 * - Wallet connection/disconnection
 * - Network detection and switching
 * - USDC approval flow
 * - Transaction signing and polling
 * - Contract reads (balance, positions, claimable amounts)
 * 
 * @version 1.0.0
 */

// ============ Constants ============

const USDC_DECIMALS = 6;
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

// Network configurations
const NETWORKS = {
    31337: {
        name: 'Hardhat Local',
        chainId: 31337,
        rpcUrl: 'http://127.0.0.1:8545',
        blockExplorer: 'http://localhost:8545',
        currency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
    },
    80002: {
        name: 'Polygon Amoy',
        chainId: 80002,
        rpcUrl: 'https://rpc-amoy.polygon.technology',
        blockExplorer: 'https://amoy.polygonscan.com',
        currency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
    },
    137: {
        name: 'Polygon PoS',
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        blockExplorer: 'https://polygonscan.com',
        currency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
    }
};

// ERC20 ABI for USDC (minimal)
const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
        ],
        outputs: [{ name: '', type: 'uint256' }]
    },
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }]
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }]
    }
];

// FoundersNetMarket ABI (minimal for client reads)
const MARKET_ABI = [
    {
        name: 'getMarket',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '_marketId', type: 'uint256' }],
        outputs: [
            { name: 'question', type: 'string' },
            { name: 'closeTime', type: 'uint256' },
            { name: 'state', type: 'uint8' },
            { name: 'yesPool', type: 'uint256' },
            { name: 'noPool', type: 'uint256' },
            { name: 'outcome', type: 'bool' }
        ]
    },
    {
        name: 'getUserPosition',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: '_marketId', type: 'uint256' },
            { name: '_user', type: 'address' }
        ],
        outputs: [
            { name: 'yesBets', type: 'uint256' },
            { name: 'noBets', type: 'uint256' },
            { name: 'claimed', type: 'bool' }
        ]
    },
    {
        name: 'getClaimableAmount',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: '_marketId', type: 'uint256' },
            { name: '_user', type: 'address' }
        ],
        outputs: [{ name: '', type: 'uint256' }]
    },
    {
        name: 'getMarketCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }]
    },
    {
        name: 'placeBet',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_marketId', type: 'uint256' },
            { name: '_outcome', type: 'bool' },
            { name: '_amount', type: 'uint256' }
        ],
        outputs: []
    },
    {
        name: 'claimPayout',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_marketId', type: 'uint256' }],
        outputs: []
    }
];

// ============ Wallet State ============

class WalletManager {
    constructor() {
        this.address = null;
        this.chainId = null;
        this.provider = null;
        this.isConnecting = false;
        this.listeners = new Map();

        // Bind methods for event handlers
        this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
        this.handleChainChanged = this.handleChainChanged.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
    }

    // ============ Event System ============

    /**
     * Subscribe to wallet events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Unsubscribe from wallet events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit an event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }

        // Also dispatch a custom DOM event for HTMX integration
        const customEvent = new CustomEvent(`wallet:${event}`, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(customEvent);
    }

    // ============ Wallet Detection ============

    /**
     * Detect available wallet providers
     * @returns {Object} Object with wallet availability
     */
    detectWallets() {
        const wallets = {
            hasInjected: false,
            isMetaMask: false,
            isCoinbaseWallet: false,
            isRainbow: false,
            isBrave: false,
            providers: []
        };

        if (typeof window.ethereum !== 'undefined') {
            wallets.hasInjected = true;

            // Check for multiple providers (EIP-5749)
            if (window.ethereum.providers?.length) {
                wallets.providers = window.ethereum.providers;
                wallets.isMetaMask = window.ethereum.providers.some(p => p.isMetaMask);
                wallets.isCoinbaseWallet = window.ethereum.providers.some(p => p.isCoinbaseWallet);
                wallets.isRainbow = window.ethereum.providers.some(p => p.isRainbow);
            } else {
                wallets.isMetaMask = !!window.ethereum.isMetaMask;
                wallets.isCoinbaseWallet = !!window.ethereum.isCoinbaseWallet;
                wallets.isRainbow = !!window.ethereum.isRainbow;
                wallets.isBrave = !!window.ethereum.isBraveWallet;
            }
        }

        return wallets;
    }

    /**
     * Get the preferred provider
     * @returns {Object|null} Provider or null
     */
    getProvider() {
        if (!window.ethereum) return null;

        // If multiple providers, prefer MetaMask
        if (window.ethereum.providers?.length) {
            const metamask = window.ethereum.providers.find(p => p.isMetaMask && !p.isBraveWallet);
            if (metamask) return metamask;
            return window.ethereum.providers[0];
        }

        return window.ethereum;
    }

    // ============ Connection ============

    /**
     * Connect to wallet
     * @returns {Promise<string>} Connected address
     */
    async connect() {
        if (this.isConnecting) {
            throw new Error('Connection already in progress');
        }

        const provider = this.getProvider();
        if (!provider) {
            throw new WalletError('NO_PROVIDER', 'No wallet detected. Please install MetaMask or another Web3 wallet.');
        }

        this.isConnecting = true;
        this.emit('connecting', null);

        try {
            // Request accounts
            const accounts = await provider.request({
                method: 'eth_requestAccounts'
            });

            if (!accounts || accounts.length === 0) {
                throw new WalletError('NO_ACCOUNTS', 'No accounts returned from wallet');
            }

            this.address = accounts[0].toLowerCase();
            this.provider = provider;

            // Get chain ID
            const chainIdHex = await provider.request({ method: 'eth_chainId' });
            this.chainId = parseInt(chainIdHex, 16);

            // Set up event listeners
            this.setupEventListeners();

            // Store in session
            this.saveSession();

            this.emit('connected', {
                address: this.address,
                chainId: this.chainId
            });

            return this.address;

        } catch (error) {
            if (error.code === 4001) {
                throw new WalletError('USER_REJECTED', 'User rejected the connection request');
            }
            throw new WalletError('CONNECTION_FAILED', error.message || 'Failed to connect wallet');
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Disconnect wallet
     */
    disconnect() {
        this.removeEventListeners();
        this.address = null;
        this.chainId = null;
        this.provider = null;
        this.clearSession();
        this.emit('disconnected', null);
    }

    /**
     * Check if wallet is connected
     * @returns {boolean}
     */
    isConnected() {
        return !!this.address && !!this.provider;
    }

    // ============ Session Management ============

    /**
     * Save connection state to session storage
     */
    saveSession() {
        try {
            sessionStorage.setItem('wallet_address', this.address);
            sessionStorage.setItem('wallet_chainId', String(this.chainId));
        } catch (e) {
            console.warn('Could not save wallet session:', e);
        }
    }

    /**
     * Clear session storage
     */
    clearSession() {
        try {
            sessionStorage.removeItem('wallet_address');
            sessionStorage.removeItem('wallet_chainId');
        } catch (e) {
            console.warn('Could not clear wallet session:', e);
        }
    }

    /**
     * Restore connection from session (on page load)
     */
    async restoreSession() {
        const provider = this.getProvider();
        if (!provider) return false;

        try {
            const accounts = await provider.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                this.address = accounts[0].toLowerCase();
                this.provider = provider;

                const chainIdHex = await provider.request({ method: 'eth_chainId' });
                this.chainId = parseInt(chainIdHex, 16);

                this.setupEventListeners();
                this.saveSession();

                this.emit('connected', {
                    address: this.address,
                    chainId: this.chainId
                });

                return true;
            }
        } catch (error) {
            console.error('Error restoring session:', error);
        }

        return false;
    }

    // ============ Event Listeners ============

    setupEventListeners() {
        if (!this.provider) return;

        this.provider.on('accountsChanged', this.handleAccountsChanged);
        this.provider.on('chainChanged', this.handleChainChanged);
        this.provider.on('disconnect', this.handleDisconnect);
    }

    removeEventListeners() {
        if (!this.provider) return;

        this.provider.removeListener('accountsChanged', this.handleAccountsChanged);
        this.provider.removeListener('chainChanged', this.handleChainChanged);
        this.provider.removeListener('disconnect', this.handleDisconnect);
    }

    handleAccountsChanged(accounts) {
        if (!accounts || accounts.length === 0) {
            this.disconnect();
        } else {
            const newAddress = accounts[0].toLowerCase();
            if (newAddress !== this.address) {
                this.address = newAddress;
                this.saveSession();
                this.emit('accountChanged', { address: this.address });
            }
        }
    }

    handleChainChanged(chainIdHex) {
        const newChainId = parseInt(chainIdHex, 16);
        if (newChainId !== this.chainId) {
            this.chainId = newChainId;
            this.saveSession();
            this.emit('chainChanged', { chainId: this.chainId });
        }
    }

    handleDisconnect() {
        this.disconnect();
    }

    // ============ Network Management ============

    /**
     * Get network configuration for current chain
     * @returns {Object|null}
     */
    getNetworkConfig() {
        return NETWORKS[this.chainId] || null;
    }

    /**
     * Check if on correct network
     * @returns {boolean}
     */
    isCorrectNetwork() {
        const expectedChainId = window.appConfig?.chainId || 31337;
        return this.chainId === expectedChainId;
    }

    /**
     * Switch to the expected network
     * @returns {Promise<boolean>}
     */
    async switchNetwork() {
        if (!this.provider) {
            throw new WalletError('NOT_CONNECTED', 'Wallet not connected');
        }

        const expectedChainId = window.appConfig?.chainId || 31337;
        const network = NETWORKS[expectedChainId];

        if (!network) {
            throw new WalletError('UNKNOWN_NETWORK', `Unknown network: ${expectedChainId}`);
        }

        const chainIdHex = '0x' + expectedChainId.toString(16);

        try {
            await this.provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainIdHex }]
            });
            return true;
        } catch (error) {
            // Chain not added to wallet
            if (error.code === 4902) {
                return await this.addNetwork(expectedChainId);
            }
            if (error.code === 4001) {
                throw new WalletError('USER_REJECTED', 'User rejected network switch');
            }
            throw new WalletError('SWITCH_FAILED', error.message || 'Failed to switch network');
        }
    }

    /**
     * Add network to wallet
     * @param {number} chainId - Chain ID to add
     * @returns {Promise<boolean>}
     */
    async addNetwork(chainId) {
        if (!this.provider) {
            throw new WalletError('NOT_CONNECTED', 'Wallet not connected');
        }

        const network = NETWORKS[chainId];
        if (!network) {
            throw new WalletError('UNKNOWN_NETWORK', `Unknown network: ${chainId}`);
        }

        const chainIdHex = '0x' + chainId.toString(16);

        try {
            await this.provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: chainIdHex,
                    chainName: network.name,
                    nativeCurrency: network.currency,
                    rpcUrls: [network.rpcUrl],
                    blockExplorerUrls: [network.blockExplorer]
                }]
            });
            return true;
        } catch (error) {
            if (error.code === 4001) {
                throw new WalletError('USER_REJECTED', 'User rejected adding network');
            }
            throw new WalletError('ADD_NETWORK_FAILED', error.message || 'Failed to add network');
        }
    }

    // ============ USDC Approval ============

    /**
     * Check USDC allowance for the market contract
     * @returns {Promise<bigint>}
     */
    async checkAllowance() {
        if (!this.isConnected()) {
            throw new WalletError('NOT_CONNECTED', 'Wallet not connected');
        }

        const usdcAddress = window.appConfig?.usdcAddress;
        const contractAddress = window.appConfig?.contractAddress;

        if (!usdcAddress || !contractAddress) {
            throw new WalletError('CONFIG_ERROR', 'Contract addresses not configured');
        }

        try {
            const data = encodeFunctionData('allowance', [this.address, contractAddress]);

            const result = await this.provider.request({
                method: 'eth_call',
                params: [{
                    to: usdcAddress,
                    data: data
                }, 'latest']
            });

            return BigInt(result);
        } catch (error) {
            console.error('Error checking allowance:', error);
            throw new WalletError('READ_FAILED', 'Failed to check USDC allowance');
        }
    }

    /**
     * Request USDC approval for the market contract
     * @param {string|bigint} amount - Amount to approve (in USDC units with 6 decimals)
     * @param {boolean} unlimited - If true, approve max amount
     * @returns {Promise<string>} Transaction hash
     */
    async requestApproval(amount, unlimited = false) {
        if (!this.isConnected()) {
            throw new WalletError('NOT_CONNECTED', 'Wallet not connected');
        }

        if (!this.isCorrectNetwork()) {
            throw new WalletError('WRONG_NETWORK', 'Please switch to the correct network');
        }

        const usdcAddress = window.appConfig?.usdcAddress;
        const contractAddress = window.appConfig?.contractAddress;

        if (!usdcAddress || !contractAddress) {
            throw new WalletError('CONFIG_ERROR', 'Contract addresses not configured');
        }

        const approvalAmount = unlimited ? MAX_UINT256 : amount.toString();

        this.emit('approvalPending', { amount: approvalAmount });

        try {
            const data = encodeFunctionData('approve', [contractAddress, approvalAmount]);

            const txHash = await this.provider.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: this.address,
                    to: usdcAddress,
                    data: data
                }]
            });

            this.emit('approvalSubmitted', { txHash, amount: approvalAmount });

            // Wait for receipt
            const receipt = await this.waitForReceipt(txHash);

            if (receipt.status === '0x1' || receipt.status === 1) {
                this.emit('approvalConfirmed', { txHash, receipt });
                return txHash;
            } else {
                throw new WalletError('TX_FAILED', 'Approval transaction failed');
            }
        } catch (error) {
            this.emit('approvalFailed', { error });
            if (error.code === 4001) {
                throw new WalletError('USER_REJECTED', 'User rejected approval');
            }
            throw error instanceof WalletError ? error : new WalletError('APPROVAL_FAILED', error.message);
        }
    }

    /**
     * Check if approval is needed for a given amount
     * @param {string|bigint} amount - Amount to check
     * @returns {Promise<boolean>}
     */
    async needsApproval(amount) {
        const allowance = await this.checkAllowance();
        return allowance < BigInt(amount);
    }

    // ============ Transaction Signing ============

    /**
     * Sign and send a transaction from backend data
     * @param {Object} txData - Transaction data from backend
     * @returns {Promise<string>} Transaction hash
     */
    async signTransaction(txData) {
        if (!this.isConnected()) {
            throw new WalletError('NOT_CONNECTED', 'Wallet not connected');
        }

        if (!this.isCorrectNetwork()) {
            throw new WalletError('WRONG_NETWORK', 'Please switch to the correct network');
        }

        this.emit('transactionPending', { txData });

        try {
            const txParams = {
                from: this.address,
                to: txData.to,
                data: txData.data,
                ...(txData.value && { value: txData.value }),
                ...(txData.gas && { gas: txData.gas })
            };

            const txHash = await this.provider.request({
                method: 'eth_sendTransaction',
                params: [txParams]
            });

            this.emit('transactionSubmitted', { txHash });

            return txHash;
        } catch (error) {
            this.emit('transactionFailed', { error });
            if (error.code === 4001) {
                throw new WalletError('USER_REJECTED', 'User rejected transaction');
            }
            if (error.code === -32000) {
                throw new WalletError('INSUFFICIENT_FUNDS', 'Insufficient funds for gas');
            }
            throw new WalletError('TX_FAILED', error.message || 'Transaction failed');
        }
    }

    /**
     * Wait for transaction receipt
     * @param {string} txHash - Transaction hash
     * @param {number} timeout - Timeout in ms (default 60s)
     * @returns {Promise<Object>} Transaction receipt
     */
    async waitForReceipt(txHash, timeout = 60000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                const receipt = await this.provider.request({
                    method: 'eth_getTransactionReceipt',
                    params: [txHash]
                });

                if (receipt) {
                    return receipt;
                }
            } catch (error) {
                console.warn('Error fetching receipt:', error);
            }

            await sleep(POLL_INTERVAL);
        }

        throw new WalletError('TIMEOUT', 'Transaction confirmation timeout');
    }

    /**
     * Send transaction and wait for confirmation
     * @param {Object} txData - Transaction data
     * @returns {Promise<Object>} Transaction receipt
     */
    async sendAndWait(txData) {
        const txHash = await this.signTransaction(txData);

        this.emit('transactionWaiting', { txHash });

        const receipt = await this.waitForReceipt(txHash);

        if (receipt.status === '0x1' || receipt.status === 1) {
            this.emit('transactionConfirmed', { txHash, receipt });
            return receipt;
        } else {
            const error = new WalletError('TX_REVERTED', 'Transaction reverted');
            this.emit('transactionFailed', { txHash, error });
            throw error;
        }
    }

    // ============ Contract Reads ============

    /**
     * Get USDC balance for connected wallet
     * @returns {Promise<string>} Balance in USDC (formatted)
     */
    async getUSDCBalance() {
        if (!this.isConnected()) {
            throw new WalletError('NOT_CONNECTED', 'Wallet not connected');
        }

        const usdcAddress = window.appConfig?.usdcAddress;
        if (!usdcAddress) {
            throw new WalletError('CONFIG_ERROR', 'USDC address not configured');
        }

        try {
            const data = encodeFunctionData('balanceOf', [this.address]);

            const result = await this.provider.request({
                method: 'eth_call',
                params: [{
                    to: usdcAddress,
                    data: data
                }, 'latest']
            });

            const balance = BigInt(result);
            return formatUSDC(balance);
        } catch (error) {
            console.error('Error getting USDC balance:', error);
            throw new WalletError('READ_FAILED', 'Failed to get USDC balance');
        }
    }

    /**
     * Get user position in a market
     * @param {number} marketId - Market ID
     * @returns {Promise<Object>} Position data
     */
    async getUserPosition(marketId) {
        if (!this.isConnected()) {
            throw new WalletError('NOT_CONNECTED', 'Wallet not connected');
        }

        const contractAddress = window.appConfig?.contractAddress;
        if (!contractAddress) {
            throw new WalletError('CONFIG_ERROR', 'Contract address not configured');
        }

        try {
            const data = encodeMarketFunctionData('getUserPosition', [
                BigInt(marketId),
                this.address
            ]);

            const result = await this.provider.request({
                method: 'eth_call',
                params: [{
                    to: contractAddress,
                    data: data
                }, 'latest']
            });

            // Decode result (yesBets, noBets, claimed)
            const decoded = decodePositionResult(result);

            return {
                yesBets: formatUSDC(decoded.yesBets),
                yesBetsRaw: decoded.yesBets,
                noBets: formatUSDC(decoded.noBets),
                noBetsRaw: decoded.noBets,
                claimed: decoded.claimed
            };
        } catch (error) {
            console.error('Error getting user position:', error);
            throw new WalletError('READ_FAILED', 'Failed to get user position');
        }
    }

    /**
     * Get claimable amount for a market
     * @param {number} marketId - Market ID
     * @returns {Promise<string>} Claimable amount in USDC (formatted)
     */
    async getClaimableAmount(marketId) {
        if (!this.isConnected()) {
            throw new WalletError('NOT_CONNECTED', 'Wallet not connected');
        }

        const contractAddress = window.appConfig?.contractAddress;
        if (!contractAddress) {
            throw new WalletError('CONFIG_ERROR', 'Contract address not configured');
        }

        try {
            const data = encodeMarketFunctionData('getClaimableAmount', [
                BigInt(marketId),
                this.address
            ]);

            const result = await this.provider.request({
                method: 'eth_call',
                params: [{
                    to: contractAddress,
                    data: data
                }, 'latest']
            });

            const amount = BigInt(result);
            return formatUSDC(amount);
        } catch (error) {
            console.error('Error getting claimable amount:', error);
            throw new WalletError('READ_FAILED', 'Failed to get claimable amount');
        }
    }
}

// ============ Custom Error Class ============

class WalletError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'WalletError';
        this.code = code;
    }
}

// ============ Utility Functions ============

/**
 * Sleep for a given duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format USDC amount from raw value
 * @param {bigint} amount - Raw amount with 6 decimals
 * @returns {string} Formatted amount
 */
function formatUSDC(amount) {
    const divisor = BigInt(10 ** USDC_DECIMALS);
    const integer = amount / divisor;
    const decimal = amount % divisor;

    const decimalStr = decimal.toString().padStart(USDC_DECIMALS, '0');
    // Trim trailing zeros but keep at least 2 decimal places
    const trimmed = decimalStr.replace(/0+$/, '').padEnd(2, '0');

    return `${integer}.${trimmed}`;
}

/**
 * Parse USDC amount to raw value
 * @param {string|number} amount - Amount as string or number
 * @returns {bigint} Raw amount with 6 decimals
 */
function parseUSDC(amount) {
    const str = amount.toString();
    const [integer, decimal = ''] = str.split('.');
    const paddedDecimal = decimal.padEnd(USDC_DECIMALS, '0').slice(0, USDC_DECIMALS);
    return BigInt(integer + paddedDecimal);
}

/**
 * Truncate address for display
 * @param {string} address - Full address
 * @param {number} start - Characters at start (default 6)
 * @param {number} end - Characters at end (default 4)
 * @returns {string} Truncated address
 */
function truncateAddress(address, start = 6, end = 4) {
    if (!address) return '';
    return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Encode function data for ERC20 calls
 * Simple implementation without full viem dependency
 * @param {string} functionName - Function name
 * @param {Array} args - Function arguments
 * @returns {string} Encoded data
 */
function encodeFunctionData(functionName, args) {
    // Function selectors (first 4 bytes of keccak256(signature))
    const selectors = {
        'balanceOf': '0x70a08231',
        'allowance': '0xdd62ed3e',
        'approve': '0x095ea7b3',
        'decimals': '0x313ce567'
    };

    const selector = selectors[functionName];
    if (!selector) {
        throw new Error(`Unknown function: ${functionName}`);
    }

    // Encode arguments
    let data = selector;
    for (const arg of args) {
        if (typeof arg === 'string' && arg.startsWith('0x')) {
            // Address - left pad to 32 bytes
            data += arg.slice(2).toLowerCase().padStart(64, '0');
        } else {
            // Uint256
            data += BigInt(arg).toString(16).padStart(64, '0');
        }
    }

    return data;
}

/**
 * Encode function data for market contract calls
 * @param {string} functionName - Function name
 * @param {Array} args - Function arguments
 * @returns {string} Encoded data
 */
function encodeMarketFunctionData(functionName, args) {
    // Function selectors
    const selectors = {
        'getUserPosition': '0x37788a49',  // getUserPosition(uint256,address)
        'getClaimableAmount': '0x7ce28c1e',  // getClaimableAmount(uint256,address)
        'getMarketCount': '0x88a8c95c',  // getMarketCount()
        'placeBet': '0x6c9af6e9',  // placeBet(uint256,bool,uint256)
        'claimPayout': '0x79fa7d83'  // claimPayout(uint256)
    };

    const selector = selectors[functionName];
    if (!selector) {
        throw new Error(`Unknown function: ${functionName}`);
    }

    let data = selector;
    for (const arg of args) {
        if (typeof arg === 'string' && arg.startsWith('0x')) {
            // Address - left pad to 32 bytes
            data += arg.slice(2).toLowerCase().padStart(64, '0');
        } else if (typeof arg === 'boolean') {
            // Bool - 0 or 1
            data += (arg ? '1' : '0').padStart(64, '0');
        } else {
            // Uint256
            data += BigInt(arg).toString(16).padStart(64, '0');
        }
    }

    return data;
}

/**
 * Decode position result from contract call
 * @param {string} data - Hex encoded result
 * @returns {Object} Decoded position
 */
function decodePositionResult(data) {
    // Remove 0x prefix
    const hex = data.slice(2);

    // Each value is 32 bytes (64 hex chars)
    const yesBets = BigInt('0x' + hex.slice(0, 64));
    const noBets = BigInt('0x' + hex.slice(64, 128));
    const claimed = BigInt('0x' + hex.slice(128, 192)) !== BigInt(0);

    return { yesBets, noBets, claimed };
}

// ============ Global Instance ============

const wallet = new WalletManager();

// ============ UI Integration Functions ============

/**
 * Connect wallet (called from UI)
 */
async function connectWallet() {
    const btn = document.getElementById('connect-wallet-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <span class="flex items-center gap-2">
                <svg class="w-4 h-4 spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Connecting...
            </span>
        `;
    }

    try {
        await wallet.connect();
        updateWalletUI(wallet.address);
        checkNetworkStatus();
        checkAdminStatus();

        // Refresh relevant HTMX content
        refreshWalletContent();

    } catch (error) {
        console.error('Connection error:', error);
        showToast(error.message, 'error');
        resetConnectButton();
    }
}

/**
 * Disconnect wallet (called from UI)
 */
function disconnectWallet() {
    wallet.disconnect();
    updateWalletUI(null);
    hideNetworkWarning();

    // Refresh relevant HTMX content
    refreshWalletContent();
}

/**
 * Switch to correct network (called from UI)
 */
async function switchNetwork() {
    try {
        await wallet.switchNetwork();
        checkNetworkStatus();
        showToast('Switched to correct network', 'success');
    } catch (error) {
        console.error('Network switch error:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Update wallet UI elements
 * @param {string|null} address - Connected address or null
 */
function updateWalletUI(address) {
    const connectBtn = document.getElementById('connect-wallet-btn');
    const connectedDiv = document.getElementById('wallet-connected');
    const addressDisplay = document.getElementById('wallet-address-display');
    const networkDot = document.getElementById('network-dot');

    if (address) {
        if (connectBtn) connectBtn.classList.add('hidden');
        if (connectedDiv) {
            connectedDiv.classList.remove('hidden');
            connectedDiv.classList.add('flex');
        }
        if (addressDisplay) {
            addressDisplay.textContent = truncateAddress(address);
        }
        if (networkDot) {
            networkDot.classList.remove('disconnected');
            networkDot.classList.add('connected');
        }

        // Set global variables for HTMX integration
        window.walletAddress = address;
        window.isAdmin = false;

    } else {
        resetConnectButton();
        if (connectedDiv) {
            connectedDiv.classList.add('hidden');
            connectedDiv.classList.remove('flex');
        }
        if (networkDot) {
            networkDot.classList.remove('connected', 'wrong-network');
            networkDot.classList.add('disconnected');
        }

        window.walletAddress = null;
        window.isAdmin = false;
    }
}

/**
 * Reset connect button to default state
 */
function resetConnectButton() {
    const btn = document.getElementById('connect-wallet-btn');
    if (btn) {
        btn.disabled = false;
        btn.classList.remove('hidden');
        btn.innerHTML = `
            <span class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span class="hidden sm:inline">Connect Wallet</span>
                <span class="sm:hidden">Connect</span>
            </span>
        `;
    }
}

/**
 * Check and update network status
 */
function checkNetworkStatus() {
    const networkDot = document.getElementById('network-dot');
    const networkWarning = document.getElementById('network-warning');
    const networkMessage = document.getElementById('network-warning-message');

    if (!wallet.isConnected()) return;

    const isCorrect = wallet.isCorrectNetwork();
    const expectedChainId = window.appConfig?.chainId || 31337;
    const expectedNetwork = NETWORKS[expectedChainId];

    if (!isCorrect) {
        if (networkWarning) networkWarning.classList.remove('hidden');
        if (networkMessage) {
            networkMessage.textContent = `Please switch to ${expectedNetwork?.name || 'the correct network'} (Chain ID: ${expectedChainId})`;
        }
        if (networkDot) {
            networkDot.classList.remove('connected');
            networkDot.classList.add('wrong-network');
        }
    } else {
        hideNetworkWarning();
        if (networkDot) {
            networkDot.classList.remove('wrong-network');
            networkDot.classList.add('connected');
        }
    }

    // Update global chain ID
    window.chainId = wallet.chainId;
}

/**
 * Hide network warning banner
 */
function hideNetworkWarning() {
    const networkWarning = document.getElementById('network-warning');
    if (networkWarning) networkWarning.classList.add('hidden');
}

/**
 * Check and update admin status
 */
function checkAdminStatus() {
    if (!wallet.address || !window.appConfig?.adminAddress) {
        window.isAdmin = false;
    } else {
        window.isAdmin = wallet.address.toLowerCase() === window.appConfig.adminAddress.toLowerCase();
    }

    // Show/hide admin-only elements
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        el.classList.toggle('hidden', !window.isAdmin);
    });
}

/**
 * Refresh HTMX content that depends on wallet state
 */
function refreshWalletContent() {
    // Trigger refresh on HTMX elements
    if (typeof htmx !== 'undefined') {
        const marketsContainer = document.getElementById('markets-container');
        if (marketsContainer) htmx.trigger(marketsContainer, 'refresh');

        const userPosition = document.getElementById('user-position');
        if (userPosition) htmx.trigger(userPosition, 'load');

        const bettingForm = document.getElementById('betting-form');
        if (bettingForm) htmx.trigger(bettingForm, 'load');

        const userBalance = document.getElementById('user-balance');
        if (userBalance) htmx.trigger(userBalance, 'load');
    }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 */
function showToast(message, type = 'info') {
    let toast = document.getElementById('global-toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        document.body.appendChild(toast);
    }

    const colors = {
        success: 'bg-green-500/90',
        error: 'bg-red-500/90',
        warning: 'bg-yellow-500/90',
        info: 'bg-blue-500/90'
    };

    toast.className = `fixed bottom-4 right-4 ${colors[type] || colors.info} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 transition-opacity duration-300`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.classList.add('hidden')" class="text-white/80 hover:text-white text-xl">&times;</button>
    `;
    toast.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 5000);
}

// Alias for backwards compatibility
function showGlobalError(message) {
    showToast(message, 'error');
}

// ============ Betting Functions ============

/**
 * Place a bet on a market
 * @param {number} marketId - Market ID
 * @param {boolean} outcome - true for YES, false for NO
 * @param {string|number} amount - USDC amount
 * @returns {Promise<Object>} Transaction result
 */
async function placeBet(marketId, outcome, amount) {
    if (!wallet.isConnected()) {
        throw new WalletError('NOT_CONNECTED', 'Please connect your wallet first');
    }

    if (!wallet.isCorrectNetwork()) {
        throw new WalletError('WRONG_NETWORK', 'Please switch to the correct network');
    }

    const amountRaw = parseUSDC(amount);

    // Check if approval is needed
    const needsApproval = await wallet.needsApproval(amountRaw);

    if (needsApproval) {
        showToast('Requesting USDC approval...', 'info');
        await wallet.requestApproval(amountRaw);
        showToast('USDC approved! Submitting bet...', 'success');
    }

    // Get transaction data from backend
    const response = await fetch('/api/tx/bet', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            marketId,
            outcome,
            amount: amountRaw.toString(),
            address: wallet.address
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new WalletError('API_ERROR', error.message || 'Failed to get transaction data');
    }

    const txData = await response.json();

    // Sign and send transaction
    const receipt = await wallet.sendAndWait(txData);

    showToast('Bet placed successfully!', 'success');
    refreshWalletContent();

    return receipt;
}

/**
 * Claim payout from a resolved market
 * @param {number} marketId - Market ID
 * @returns {Promise<Object>} Transaction result
 */
async function claimPayout(marketId) {
    if (!wallet.isConnected()) {
        throw new WalletError('NOT_CONNECTED', 'Please connect your wallet first');
    }

    if (!wallet.isCorrectNetwork()) {
        throw new WalletError('WRONG_NETWORK', 'Please switch to the correct network');
    }

    // Get transaction data from backend
    const response = await fetch('/api/tx/claim', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            marketId,
            address: wallet.address
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new WalletError('API_ERROR', error.message || 'Failed to get transaction data');
    }

    const txData = await response.json();

    // Sign and send transaction
    const receipt = await wallet.sendAndWait(txData);

    showToast('Payout claimed successfully!', 'success');
    refreshWalletContent();

    return receipt;
}

// ============ Initialization ============

/**
 * Initialize wallet on page load
 */
async function initWallet() {
    // Set up event listeners
    wallet.on('connected', ({ address, chainId }) => {
        console.log(`Wallet connected: ${address} on chain ${chainId}`);
        updateWalletUI(address);
        checkNetworkStatus();
        checkAdminStatus();
    });

    wallet.on('disconnected', () => {
        console.log('Wallet disconnected');
        updateWalletUI(null);
        hideNetworkWarning();
    });

    wallet.on('accountChanged', ({ address }) => {
        console.log(`Account changed: ${address}`);
        updateWalletUI(address);
        checkAdminStatus();
        refreshWalletContent();
    });

    wallet.on('chainChanged', ({ chainId }) => {
        console.log(`Chain changed: ${chainId}`);
        checkNetworkStatus();
        refreshWalletContent();
    });

    wallet.on('transactionPending', () => {
        showToast('Please confirm the transaction in your wallet...', 'info');
    });

    wallet.on('transactionSubmitted', ({ txHash }) => {
        showToast('Transaction submitted. Waiting for confirmation...', 'info');
    });

    wallet.on('transactionConfirmed', ({ txHash }) => {
        showToast('Transaction confirmed!', 'success');
    });

    // Try to restore session
    await wallet.restoreSession();
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWallet);
} else {
    initWallet();
}

// ============ Exports ============

// Make functions available globally for onclick handlers
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.switchNetwork = switchNetwork;
window.placeBet = placeBet;
window.claimPayout = claimPayout;
window.showToast = showToast;
window.showGlobalError = showGlobalError;

// Export wallet manager for advanced usage
window.wallet = wallet;

// Export utility functions
window.WalletUtils = {
    formatUSDC,
    parseUSDC,
    truncateAddress,
    WalletError
};
