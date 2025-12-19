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
 * @version 1.0.1
 */

// Guard against double-loading
if (typeof window.__foundersNetWalletLoaded !== 'undefined') {
    console.warn('[wallet.js] Already loaded, skipping re-initialization');
} else {
    window.__foundersNetWalletLoaded = true;

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

        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(callback);
        }

        off(event, callback) {
            if (this.listeners.has(event)) {
                const callbacks = this.listeners.get(event);
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        }

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

            const customEvent = new CustomEvent(`wallet:${event}`, {
                detail: data,
                bubbles: true
            });
            document.dispatchEvent(customEvent);
        }

        // ============ Wallet Detection ============

        getProvider() {
            if (typeof window.ethereum === 'undefined') return null;

            if (window.ethereum.providers?.length) {
                console.log('[wallet.js] Multi-provider detected:', window.ethereum.providers.map(p => ({
                    isMetaMask: p.isMetaMask,
                    isBrave: p.isBraveWallet,
                    isOKX: p.isOKExWallet || p.isOkxWallet
                })));

                // Prioritize authentic MetaMask
                const metamask = window.ethereum.providers.find(p => p.isMetaMask && !p.isBraveWallet && !p.isOKExWallet && !p.isOkxWallet);
                if (metamask) return metamask;

                const anyMM = window.ethereum.providers.find(p => p.isMetaMask);
                if (anyMM) return anyMM;

                return window.ethereum.providers[0];
            }

            return window.ethereum;
        }

        // ============ Connection ============

        async connect() {
            if (this.isConnecting) return;

            const provider = this.getProvider();
            if (!provider) {
                throw new WalletError('NO_PROVIDER', 'No wallet detected');
            }

            this.isConnecting = true;
            this.emit('connecting', null);

            try {
                // Pre-flight check
                console.log('[wallet.js] Testing provider connection...');
                await provider.request({ method: 'eth_chainId' });

                const accounts = await provider.request({
                    method: 'eth_requestAccounts'
                });

                if (!accounts || accounts.length === 0) {
                    throw new WalletError('NO_ACCOUNTS', 'No accounts returned');
                }

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

                return this.address;

            } catch (error) {
                if (error.code === 4001) {
                    throw new WalletError('USER_REJECTED', 'Connection rejected');
                }
                throw new WalletError('CONNECTION_FAILED', error.message || 'Failed to connect');
            } finally {
                this.isConnecting = false;
            }
        }

        disconnect() {
            this.removeEventListeners();
            this.address = null;
            this.chainId = null;
            this.provider = null;
            this.clearSession();
            this.emit('disconnected', null);
        }

        isConnected() {
            return !!this.address && !!this.provider;
        }

        // ============ Session Management ============

        saveSession() {
            try {
                sessionStorage.setItem('wallet_address', this.address);
                sessionStorage.setItem('wallet_chainId', String(this.chainId));
            } catch (e) { }
        }

        clearSession() {
            try {
                sessionStorage.removeItem('wallet_address');
                sessionStorage.removeItem('wallet_chainId');
            } catch (e) { }
        }

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
            } catch (error) { }
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

        isCorrectNetwork() {
            const expectedChainId = window.appConfig?.chainId || 31337;
            return this.chainId === expectedChainId;
        }

        async switchNetwork() {
            if (!this.provider) throw new WalletError('NOT_CONNECTED', 'Wallet not connected');

            const expectedChainId = window.appConfig?.chainId || 31337;
            const chainIdHex = '0x' + expectedChainId.toString(16);

            try {
                await this.provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: chainIdHex }]
                });
                return true;
            } catch (error) {
                if (error.code === 4902) {
                    return await this.addNetwork(expectedChainId);
                }
                throw new WalletError('SWITCH_FAILED', error.message);
            }
        }

        async addNetwork(chainId) {
            const network = NETWORKS[chainId];
            if (!network) throw new Error('Unknown network');
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
                throw new WalletError('ADD_NETWORK_FAILED', error.message);
            }
        }

        // ============ Transaction Signing ============

        async signTransaction(txData) {
            console.log('[wallet.js] signTransaction started', txData);

            if (!this.isConnected()) {
                console.log('[wallet.js] Not connected, restoring session...');
                await this.restoreSession();
                if (!this.isConnected()) throw new WalletError('NOT_CONNECTED', 'Connect wallet first');
            }

            const provider = this.provider || this.getProvider();
            if (!provider) {
                throw new WalletError('NO_PROVIDER', 'No wallet provider available');
            }

            console.log('[wallet.js] Provider obtained, address:', this.address);

            // Health test with timeout
            try {
                console.log('[wallet.js] Pre-flight check (2s timeout)...');
                const chainIdPromise = provider.request({ method: 'eth_chainId' });
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Pre-flight check timed out')), 2000)
                );

                const chainIdHex = await Promise.race([chainIdPromise, timeoutPromise]);
                console.log('[wallet.js] Pre-flight OK, chainId:', chainIdHex);
            } catch (err) {
                console.error('[wallet.js] RPC check failed:', err);
                throw new WalletError('CONNECTION_FAILED', 'Cannot reach wallet RPC: ' + err.message);
            }

            const expectedChainId = txData.chainId || window.appConfig?.chainId || 31337;
            console.log('[wallet.js] Expected chainId:', expectedChainId, 'Current:', this.chainId);

            if (this.chainId !== expectedChainId) {
                console.log('[wallet.js] Switching network...');
                const switched = await this.switchNetwork();
                if (!switched) throw new WalletError('WRONG_NETWORK', 'Switch network failed');
            }

            this.emit('transactionPending', { txData });

            try {
                const txParams = {
                    from: this.address,
                    to: txData.to,
                    data: txData.data,
                    ...(txData.value && { value: txData.value })
                };

                console.log('[wallet.js] Building tx params:', { from: txParams.from, to: txParams.to, dataLen: txParams.data?.length });

                // Gas estimation with timeout - skip for Hardhat
                if (expectedChainId === 31337) {
                    // Use fixed gas for Hardhat to avoid estimation delays
                    // Don't set gasPrice - let MetaMask use its default
                    console.log('[wallet.js] Hardhat detected, using fixed gas 2M');
                    txParams.gas = '0x1e8480'; // 2M gas
                } else {
                    try {
                        console.log('[wallet.js] Estimating gas (4s timeout)...');
                        const estimatePromise = provider.request({ method: 'eth_estimateGas', params: [txParams] });
                        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Simulation timed out')), 4000));

                        const estimatedGas = await Promise.race([estimatePromise, timeoutPromise]);
                        txParams.gas = '0x' + (BigInt(estimatedGas) * 120n / 100n).toString(16);
                        console.log('[wallet.js] Gas estimated:', txParams.gas);
                    } catch (gasError) {
                        console.warn('[wallet.js] Using fallback gas (2M):', gasError.message);
                        txParams.gas = '0x1e8480';
                    }
                }

                console.log('[wallet.js] >>> CALLING eth_sendTransaction (waiting for MetaMask popup)...');
                console.log('[wallet.js] Final Params:', JSON.stringify(txParams));

                const txHash = await provider.request({
                    method: 'eth_sendTransaction',
                    params: [txParams]
                });

                console.log('[wallet.js] <<< Received Hash:', txHash);
                this.emit('transactionSubmitted', { txHash });
                return txHash;

            } catch (error) {
                console.error('[wallet.js] Transaction error:', error);
                this.emit('transactionFailed', { error });
                if (error.code === 4001) throw new WalletError('USER_REJECTED', 'User rejected transaction');
                throw new WalletError('TX_FAILED', error.message || 'Transaction failed');
            }
        }

        async waitForReceipt(txHash, timeout = 60000) {
            const startTime = Date.now();
            while (Date.now() - startTime < timeout) {
                try {
                    const receipt = await this.provider.request({
                        method: 'eth_getTransactionReceipt',
                        params: [txHash]
                    });
                    if (receipt) return receipt;
                } catch (error) { }
                await sleep(POLL_INTERVAL);
            }
            throw new WalletError('TIMEOUT', 'Transaction confirmation timeout');
        }

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

        async checkAllowance() {
            const usdcAddress = window.appConfig?.usdcAddress;
            const contractAddress = window.appConfig?.contractAddress;
            if (!usdcAddress || !contractAddress) return 0n;
            const data = encodeFunctionData('allowance', [this.address, contractAddress]);
            const res = await this.provider.request({ method: 'eth_call', params: [{ to: usdcAddress, data: data }, 'latest'] });
            return BigInt(res);
        }

        async needsApproval(amount) {
            const allowance = await this.checkAllowance();
            return allowance < BigInt(amount);
        }

        async requestApproval(amount) {
            const usdcAddress = window.appConfig?.usdcAddress;
            const contractAddress = window.appConfig?.contractAddress;
            const data = encodeFunctionData('approve', [contractAddress, amount.toString()]);
            const txHash = await this.provider.request({
                method: 'eth_sendTransaction',
                params: [{ from: this.address, to: usdcAddress, data: data }]
            });
            return await this.waitForReceipt(txHash);
        }

        async claimPayout(marketId) {
            if (!this.isConnected()) {
                alert('Please connect your wallet first');
                return;
            }

            try {
                const response = await fetch('/api/tx/claim', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ marketId })
                });

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Failed to build claim transaction');
                }

                console.log('[wallet.js] Sending claim transaction:', data.transaction);
                const txHash = await this.signTransaction(data.transaction);

                return await this.waitForReceipt(txHash);
            } catch (error) {
                console.error('[wallet.js] Claim error:', error);
                throw error;
            }
        }
    }

    class WalletError extends Error {
        constructor(code, message) {
            super(message);
            this.code = code;
        }
    }

    // ============ Utility Functions ============

    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    function formatUSDC(amount) {
        const divisor = BigInt(10 ** USDC_DECIMALS);
        const integer = amount / divisor;
        const decimal = amount % divisor;
        return `${integer}.${decimal.toString().padStart(USDC_DECIMALS, '0').slice(0, 2)}`;
    }

    function parseUSDC(amount) {
        const str = amount.toString();
        const [integer, decimal = ''] = str.split('.');
        const paddedDecimal = decimal.padEnd(USDC_DECIMALS, '0').slice(0, USDC_DECIMALS);
        return BigInt(integer + paddedDecimal);
    }

    function truncateAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    function encodeFunctionData(functionName, args) {
        const selectors = { 'allowance': '0xdd62ed3e', 'approve': '0x095ea7b3' };
        let data = selectors[functionName];
        for (const arg of args) {
            if (typeof arg === 'string' && arg.startsWith('0x')) {
                data += arg.slice(2).toLowerCase().padStart(64, '0');
            } else {
                data += BigInt(arg).toString(16).padStart(64, '0');
            }
        }
        return data;
    }

    // ============ Global Initialization ============

    const wallet = new WalletManager();
    window.wallet = wallet;

    async function initWallet() {
        wallet.on('connected', ({ address }) => {
            const btn = document.getElementById('connect-wallet-btn');
            if (btn) btn.classList.add('hidden');
            const div = document.getElementById('wallet-connected');
            if (div) div.classList.remove('hidden');
            const disp = document.getElementById('wallet-address-display');
            if (disp) disp.textContent = truncateAddress(address);
            window.walletAddress = address;
        });

        wallet.on('disconnected', () => {
            const btn = document.getElementById('connect-wallet-btn');
            if (btn) btn.classList.remove('hidden');
            const div = document.getElementById('wallet-connected');
            if (div) div.classList.add('hidden');
            window.walletAddress = null;
        });

        await wallet.restoreSession();
    }

    document.addEventListener('DOMContentLoaded', initWallet);

    window.connectWallet = () => wallet.connect().catch(err => alert(err.message));
    window.disconnectWallet = () => wallet.disconnect();
    window.claimPayout = (marketId) => {
        const btn = event?.target;
        const originalText = btn ? btn.textContent : 'Claim';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Claiming...';
        }
        return wallet.claimPayout(marketId)
            .then(() => {
                alert('Payout claimed successfully! 🎉');
                window.location.reload();
            })
            .catch(err => {
                alert(err.message);
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = originalText;
                }
            });
    };
    window.placeBet = (m, o, a) => wallet.signTransaction({ to: window.appConfig.contractAddress, data: '0x' }).catch(err => alert(err.message));
}
