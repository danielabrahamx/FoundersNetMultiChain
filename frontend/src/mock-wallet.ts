/**
 * Mock Wallet for Development
 * 
 * Provides a simulated wallet interface for testing the frontend
 * without requiring MetaMask or other browser extensions.
 * 
 * Features:
 * - Simulates wallet connection
 * - Handles transaction signing (auto-approves or prompts)
 * - Works with Hardhat local network
 * - Switchable between test accounts
 * 
 * Usage:
 *   import { mockWallet } from './mock-wallet';
 *   
 *   // Enable mock wallet mode
 *   mockWallet.enable();
 *   
 *   // Connect as specific test account
 *   mockWallet.connect(1); // Account #1
 *   
 *   // Disable to use real wallet
 *   mockWallet.disable();
 */

import {
    createWalletClient,
    createPublicClient,
    http,
    parseEther,
    type WalletClient,
    type PublicClient,
    type Account,
    type Chain,
    type Hex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Hardhat local chain definition
const hardhatLocal: Chain = {
    id: 31337,
    name: 'Hardhat Local',
    nativeCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: { http: ['http://127.0.0.1:8545'] },
        public: { http: ['http://127.0.0.1:8545'] },
    },
};

// Test accounts (same as Hardhat defaults)
const TEST_ACCOUNTS = [
    {
        name: 'Admin (#0)',
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Hex,
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex,
    },
    {
        name: 'User #1',
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Hex,
        privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as Hex,
    },
    {
        name: 'User #2',
        address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Hex,
        privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as Hex,
    },
    {
        name: 'User #3',
        address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' as Hex,
        privateKey: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' as Hex,
    },
    {
        name: 'User #4',
        address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65' as Hex,
        privateKey: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' as Hex,
    },
];

interface MockWalletState {
    enabled: boolean;
    connected: boolean;
    accountIndex: number;
    autoApprove: boolean;
    account: Account | null;
    walletClient: WalletClient | null;
    publicClient: PublicClient | null;
}

interface MockWalletEvent {
    type: 'connect' | 'disconnect' | 'accountsChanged' | 'chainChanged';
    data?: any;
}

type EventCallback = (event: MockWalletEvent) => void;

class MockWallet {
    private state: MockWalletState = {
        enabled: false,
        connected: false,
        accountIndex: 0,
        autoApprove: true,
        account: null,
        walletClient: null,
        publicClient: null,
    };

    private listeners: EventCallback[] = [];

    /**
     * Enable mock wallet mode
     * Call this to use mock wallet instead of MetaMask
     */
    enable(): void {
        this.state.enabled = true;
        console.log('🔧 Mock wallet enabled. Real wallet extensions will be ignored.');
        console.log('   Use mockWallet.connect(accountIndex) to simulate connection.');
        this.showAccountPicker();
    }

    /**
     * Disable mock wallet mode
     * Returns to using real wallet extensions
     */
    disable(): void {
        this.state.enabled = false;
        this.disconnect();
        console.log('🔧 Mock wallet disabled. Using real wallet extensions.');
    }

    /**
     * Check if mock wallet is enabled
     */
    isEnabled(): boolean {
        return this.state.enabled;
    }

    /**
     * Check if wallet is connected
     */
    isConnected(): boolean {
        return this.state.connected;
    }

    /**
     * Connect to mock wallet with a specific test account
     * @param accountIndex - Index of test account (0-4)
     */
    async connect(accountIndex: number = 1): Promise<string> {
        if (!this.state.enabled) {
            throw new Error('Mock wallet is not enabled. Call mockWallet.enable() first.');
        }

        if (accountIndex < 0 || accountIndex >= TEST_ACCOUNTS.length) {
            throw new Error(`Invalid account index. Use 0-${TEST_ACCOUNTS.length - 1}`);
        }

        const testAccount = TEST_ACCOUNTS[accountIndex];
        this.state.accountIndex = accountIndex;
        this.state.account = privateKeyToAccount(testAccount.privateKey);

        // Create viem clients
        this.state.publicClient = createPublicClient({
            chain: hardhatLocal,
            transport: http(),
        });

        this.state.walletClient = createWalletClient({
            account: this.state.account,
            chain: hardhatLocal,
            transport: http(),
        });

        this.state.connected = true;

        console.log(`✅ Mock wallet connected as ${testAccount.name}`);
        console.log(`   Address: ${testAccount.address}`);

        this.emit({ type: 'connect', data: { address: testAccount.address } });
        this.emit({ type: 'accountsChanged', data: [testAccount.address] });

        return testAccount.address;
    }

    /**
     * Disconnect mock wallet
     */
    disconnect(): void {
        this.state.connected = false;
        this.state.account = null;
        this.state.walletClient = null;

        console.log('🔌 Mock wallet disconnected');
        this.emit({ type: 'disconnect' });
    }

    /**
     * Get current account address
     */
    getAddress(): string | null {
        return this.state.account?.address ?? null;
    }

    /**
     * Get account info
     */
    getAccountInfo() {
        if (!this.state.connected) return null;
        return TEST_ACCOUNTS[this.state.accountIndex];
    }

    /**
     * Get viem wallet client for transactions
     */
    getWalletClient(): WalletClient | null {
        return this.state.walletClient;
    }

    /**
     * Get viem public client for reads
     */
    getPublicClient(): PublicClient | null {
        return this.state.publicClient;
    }

    /**
     * Set auto-approve mode for transactions
     * When true, transactions are automatically signed (faster testing)
     * When false, shows a confirmation dialog
     */
    setAutoApprove(enabled: boolean): void {
        this.state.autoApprove = enabled;
        console.log(`🔧 Auto-approve ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Switch to a different test account
     */
    async switchAccount(accountIndex: number): Promise<string> {
        if (!this.state.connected) {
            throw new Error('Not connected');
        }
        return this.connect(accountIndex);
    }

    /**
     * Get all available test accounts
     */
    getAccounts() {
        return TEST_ACCOUNTS.map((acc, i) => ({
            index: i,
            name: acc.name,
            address: acc.address,
        }));
    }

    /**
     * Show account picker UI in console
     */
    showAccountPicker(): void {
        console.log('\n📋 Available Test Accounts:');
        console.log('─'.repeat(60));
        TEST_ACCOUNTS.forEach((acc, i) => {
            console.log(`  ${i}: ${acc.name.padEnd(15)} - ${acc.address.slice(0, 10)}...${acc.address.slice(-8)}`);
        });
        console.log('─'.repeat(60));
        console.log('Use: mockWallet.connect(accountIndex)');
        console.log('Example: mockWallet.connect(1) for User #1\n');
    }

    /**
     * Add event listener
     */
    on(callback: EventCallback): () => void {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    private emit(event: MockWalletEvent): void {
        this.listeners.forEach(cb => cb(event));
    }

    /**
     * Simulate sending a transaction
     * Used internally by the wallet integration code
     */
    async sendTransaction(txParams: {
        to: Hex;
        data?: Hex;
        value?: bigint;
    }): Promise<Hex> {
        if (!this.state.walletClient || !this.state.account) {
            throw new Error('Wallet not connected');
        }

        // Auto-approve or show dialog
        if (!this.state.autoApprove) {
            const confirmed = confirm(
                `Mock Wallet Transaction:\n` +
                `To: ${txParams.to}\n` +
                `Value: ${txParams.value ?? 0n}\n\n` +
                `Approve transaction?`
            );
            if (!confirmed) {
                throw new Error('User rejected transaction');
            }
        }

        console.log('📤 Mock wallet sending transaction...');

        const hash = await this.state.walletClient.sendTransaction({
            account: this.state.account,
            to: txParams.to,
            data: txParams.data,
            value: txParams.value,
            chain: hardhatLocal,
        });

        console.log(`✅ Transaction sent: ${hash}`);
        return hash;
    }
}

// Global singleton
export const mockWallet = new MockWallet();

// Expose to window for console access in development
if (typeof window !== 'undefined') {
    (window as any).mockWallet = mockWallet;
}

// Auto-enable in development mode on localhost
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // Check URL param to enable mock wallet: ?mockwallet=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('mockwallet') === '1' || params.get('mock') === '1') {
        mockWallet.enable();
        const accountParam = params.get('account');
        if (accountParam) {
            mockWallet.connect(parseInt(accountParam, 10)).catch(console.error);
        }
    }
}
