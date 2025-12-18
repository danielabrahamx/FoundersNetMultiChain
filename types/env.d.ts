export interface Env {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly NETWORK: 'development' | 'amoy' | 'polygon';

    // RPC Configuration
    readonly POLYGON_AMOY_RPC_URL: string;
    readonly POLYGON_MAINNET_RPC_URL: string;
    readonly POLYGON_AMOY_CHAIN_ID: number;
    readonly POLYGON_MAINNET_CHAIN_ID: number;

    // Contract Addresses
    readonly CONTRACT_ADDRESS_AMOY?: string;
    readonly CONTRACT_ADDRESS_POLYGON?: string;
    readonly USDC_ADDRESS_AMOY: string;
    readonly USDC_ADDRESS_POLYGON: string;

    // Admin Configuration
    readonly ADMIN_WALLET_ADDRESS: string;
    readonly ADMIN_PRIVATE_KEY?: string;

    // API Keys
    readonly ALCHEMY_API_KEY?: string;
    readonly INFURA_API_KEY?: string;
    readonly POLYGONSCAN_API_KEY?: string;

    // Backend Configuration
    readonly BACKEND_PORT: number;
    readonly BACKEND_HOST: string;

    // Frontend Configuration
    readonly VITE_NETWORK: string;
    readonly VITE_CONTRACT_ADDRESS?: string;
    readonly VITE_USDC_ADDRESS: string;
    readonly VITE_RPC_URL: string;
    readonly VITE_CHAIN_ID: number;
    readonly VITE_ADMIN_ADDRESS: string;

    // Optional
    readonly REDIS_URL?: string;
    readonly REDIS_TTL?: number;
}
