/**
 * FoundersNet Contract Service
 * 
 * Provides typed contract interactions using viem.
 * Reads contract state and prepares unsigned transaction data for wallet signing.
 */

import {
    createPublicClient,
    http,
    Address,
    encodeFunctionData,
    parseUnits,
    formatUnits,
    type PublicClient,
    type Chain,
} from 'viem';
import { config } from '../config.js';

// ============ Types ============

export enum MarketState {
    Open = 0,
    Closed = 1,
    Resolved = 2,
}

export interface Market {
    id: number;
    question: string;
    closeTime: number;
    state: MarketState;
    yesPool: bigint;
    noPool: bigint;
    outcome: boolean;
    createdAt?: number;
}

export interface MarketDisplay extends Omit<Market, 'yesPool' | 'noPool'> {
    yesPoolFormatted: string;
    noPoolFormatted: string;
    totalPool: string;
    yesPercentage: number;
    noPercentage: number;
    stateLabel: string;
    isOpen: boolean;
    isClosed: boolean;
    isResolved: boolean;
    closeTimeFormatted: string;
    outcomeLabel: string | null;
}

export interface UserPosition {
    yesBets: bigint;
    noBets: bigint;
    claimed: boolean;
}

export interface UserPositionDisplay extends Omit<UserPosition, 'yesBets' | 'noBets'> {
    marketId: number;
    yesBetsFormatted: string;
    noBetsFormatted: string;
    totalBets: string;
    claimableAmount: string;
    isWinner: boolean | null;
    hasBets: boolean;
}

export interface TransactionRequest {
    to: Address;
    data: `0x${string}`;
    chainId: number;
}

// ============ Contract ABI (minimal, for read/write operations) ============

const FOUNDERS_NET_MARKET_ABI = [
    // Read functions
    {
        name: 'marketCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
    },
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
            { name: 'outcome', type: 'bool' },
        ],
    },
    {
        name: 'getUserPosition',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: '_marketId', type: 'uint256' },
            { name: '_user', type: 'address' },
        ],
        outputs: [
            { name: 'yesBets', type: 'uint256' },
            { name: 'noBets', type: 'uint256' },
            { name: 'claimed', type: 'bool' },
        ],
    },
    {
        name: 'getClaimableAmount',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: '_marketId', type: 'uint256' },
            { name: '_user', type: 'address' },
        ],
        outputs: [{ type: 'uint256' }],
    },
    {
        name: 'getMarketPools',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '_marketId', type: 'uint256' }],
        outputs: [
            { name: 'yesPool', type: 'uint256' },
            { name: 'noPool', type: 'uint256' },
        ],
    },
    // Write functions
    {
        name: 'placeBet',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_marketId', type: 'uint256' },
            { name: '_outcome', type: 'bool' },
            { name: '_amount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'claimPayout',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_marketId', type: 'uint256' }],
        outputs: [],
    },
    // Admin functions
    {
        name: 'createMarket',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_question', type: 'string' },
            { name: '_closeTime', type: 'uint256' },
        ],
        outputs: [{ type: 'uint256' }],
    },
    {
        name: 'resolveMarket',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_marketId', type: 'uint256' },
            { name: '_outcome', type: 'bool' },
        ],
        outputs: [],
    },
] as const;

const ERC20_ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ type: 'uint256' }],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
    },
] as const;

// ============ Chain Configuration ============

function getChain(): Chain {
    const { networkConfig } = config;
    return {
        id: networkConfig.chainId,
        name: networkConfig.name,
        nativeCurrency: {
            name: networkConfig.chainId === 31337 ? 'ETH' : 'MATIC',
            symbol: networkConfig.chainId === 31337 ? 'ETH' : 'MATIC',
            decimals: 18,
        },
        rpcUrls: {
            default: { http: [networkConfig.rpcUrl] },
        },
    };
}

// ============ Client Initialization ============

let client: PublicClient | null = null;

function getClient(): PublicClient {
    if (!client) {
        client = createPublicClient({
            chain: getChain(),
            transport: http(config.networkConfig.rpcUrl),
        });
    }
    return client;
}

function getContractAddress(): Address {
    const address = config.networkConfig.contractAddress;
    if (!address || address === '0x0000000000000000000000000000000000000000') {
        throw new Error('Contract address not configured. Deploy the contract first.');
    }
    return address as Address;
}

function getUsdcAddress(): Address {
    const address = config.networkConfig.usdcAddress;
    if (!address || address === '0x0000000000000000000000000000000000000000') {
        throw new Error('USDC address not configured.');
    }
    return address as Address;
}

// ============ Formatting Helpers ============

const USDC_DECIMALS = 6;

export function formatUsdc(amount: bigint): string {
    return formatUnits(amount, USDC_DECIMALS);
}

export function parseUsdc(amount: string): bigint {
    return parseUnits(amount, USDC_DECIMALS);
}

function formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
}

function getStateLabel(state: MarketState): string {
    switch (state) {
        case MarketState.Open:
            return 'Open';
        case MarketState.Closed:
            return 'Closed';
        case MarketState.Resolved:
            return 'Resolved';
        default:
            return 'Unknown';
    }
}

function calculatePercentage(part: bigint, total: bigint): number {
    if (total === 0n) return 50; // Default to 50/50 if no bets
    return Number((part * 10000n) / total) / 100;
}

// ============ Market Functions ============

/**
 * Get the total number of markets
 */
export async function getMarketCount(): Promise<number> {
    const client = getClient();
    const count = await client.readContract({
        address: getContractAddress(),
        abi: FOUNDERS_NET_MARKET_ABI,
        functionName: 'marketCount',
    });
    return Number(count);
}

/**
 * Get raw market data from contract
 */
export async function getMarket(marketId: number): Promise<Market> {
    const client = getClient();
    const result = await client.readContract({
        address: getContractAddress(),
        abi: FOUNDERS_NET_MARKET_ABI,
        functionName: 'getMarket',
        args: [BigInt(marketId)],
    });

    // Handle the auto-close logic client-side
    let state = Number(result[2]) as MarketState;
    const closeTime = Number(result[1]);
    const now = Math.floor(Date.now() / 1000);

    if (state === MarketState.Open && now >= closeTime) {
        state = MarketState.Closed;
    }

    return {
        id: marketId,
        question: result[0],
        closeTime,
        state,
        yesPool: result[3],
        noPool: result[4],
        outcome: result[5],
    };
}

/**
 * Get formatted market data for display
 */
export async function getMarketDisplay(marketId: number): Promise<MarketDisplay> {
    const market = await getMarket(marketId);
    const totalPool = market.yesPool + market.noPool;

    return {
        id: market.id,
        question: market.question,
        closeTime: market.closeTime,
        state: market.state,
        outcome: market.outcome,
        yesPoolFormatted: formatUsdc(market.yesPool),
        noPoolFormatted: formatUsdc(market.noPool),
        totalPool: formatUsdc(totalPool),
        yesPercentage: calculatePercentage(market.yesPool, totalPool),
        noPercentage: calculatePercentage(market.noPool, totalPool),
        stateLabel: getStateLabel(market.state),
        isOpen: market.state === MarketState.Open,
        isClosed: market.state === MarketState.Closed,
        isResolved: market.state === MarketState.Resolved,
        closeTimeFormatted: formatTimestamp(market.closeTime),
        outcomeLabel: market.state === MarketState.Resolved
            ? (market.outcome ? 'YES' : 'NO')
            : null,
    };
}

/**
 * Get all markets (with display formatting)
 */
export async function getAllMarkets(): Promise<MarketDisplay[]> {
    const count = await getMarketCount();
    const markets: MarketDisplay[] = [];

    // Fetch markets in parallel (but limit concurrency)
    const batchSize = 10;
    for (let i = 0; i < count; i += batchSize) {
        const batchEnd = Math.min(i + batchSize, count);
        const batch = await Promise.all(
            Array.from({ length: batchEnd - i }, (_, idx) => getMarketDisplay(i + idx))
        );
        markets.push(...batch);
    }

    // Sort by newest first
    return markets.sort((a, b) => b.id - a.id);
}

// ============ User Position Functions ============

/**
 * Get user position in a market
 */
export async function getUserPosition(marketId: number, userAddress: string): Promise<UserPosition> {
    const client = getClient();
    const result = await client.readContract({
        address: getContractAddress(),
        abi: FOUNDERS_NET_MARKET_ABI,
        functionName: 'getUserPosition',
        args: [BigInt(marketId), userAddress as Address],
    });

    return {
        yesBets: result[0],
        noBets: result[1],
        claimed: result[2],
    };
}

/**
 * Get claimable amount for user in a market
 */
export async function getClaimableAmount(marketId: number, userAddress: string): Promise<bigint> {
    const client = getClient();
    const result = await client.readContract({
        address: getContractAddress(),
        abi: FOUNDERS_NET_MARKET_ABI,
        functionName: 'getClaimableAmount',
        args: [BigInt(marketId), userAddress as Address],
    });
    return result;
}

/**
 * Get formatted user position for display
 */
export async function getUserPositionDisplay(
    marketId: number,
    userAddress: string
): Promise<UserPositionDisplay> {
    const [position, claimable, market] = await Promise.all([
        getUserPosition(marketId, userAddress),
        getClaimableAmount(marketId, userAddress),
        getMarket(marketId),
    ]);

    const totalBets = position.yesBets + position.noBets;
    const hasBets = totalBets > 0n;

    // Determine if user is a winner (only after resolution)
    let isWinner: boolean | null = null;
    if (market.state === MarketState.Resolved && hasBets) {
        isWinner = market.outcome
            ? position.yesBets > 0n
            : position.noBets > 0n;
    }

    return {
        marketId,
        yesBetsFormatted: formatUsdc(position.yesBets),
        noBetsFormatted: formatUsdc(position.noBets),
        totalBets: formatUsdc(totalBets),
        claimed: position.claimed,
        claimableAmount: formatUsdc(claimable),
        isWinner,
        hasBets,
    };
}

/**
 * Get all user positions across all markets
 */
export async function getAllUserPositions(userAddress: string): Promise<{
    position: UserPositionDisplay;
    market: MarketDisplay;
}[]> {
    const count = await getMarketCount();
    const results: { position: UserPositionDisplay; market: MarketDisplay }[] = [];

    for (let i = 0; i < count; i++) {
        const [position, market] = await Promise.all([
            getUserPositionDisplay(i, userAddress),
            getMarketDisplay(i),
        ]);

        if (position.hasBets) {
            results.push({ position, market });
        }
    }

    // Sort by market ID (newest first)
    return results.sort((a, b) => b.market.id - a.market.id);
}

// ============ USDC Functions ============

/**
 * Get user USDC balance
 */
export async function getUsdcBalance(userAddress: string): Promise<string> {
    const client = getClient();
    const balance = await client.readContract({
        address: getUsdcAddress(),
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress as Address],
    });
    return formatUsdc(balance);
}

/**
 * Get user USDC allowance for contract
 */
export async function getUsdcAllowance(userAddress: string): Promise<string> {
    const client = getClient();
    const allowance = await client.readContract({
        address: getUsdcAddress(),
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress as Address, getContractAddress()],
    });
    return formatUsdc(allowance);
}

// ============ Transaction Building Functions ============

/**
 * Build unsigned transaction for placing a bet
 */
export function buildPlaceBetTx(
    marketId: number,
    outcome: boolean,
    amount: string
): TransactionRequest {
    const amountWei = parseUsdc(amount);

    const data = encodeFunctionData({
        abi: FOUNDERS_NET_MARKET_ABI,
        functionName: 'placeBet',
        args: [BigInt(marketId), outcome, amountWei],
    });

    return {
        to: getContractAddress(),
        data,
        chainId: config.networkConfig.chainId,
    };
}

/**
 * Build unsigned transaction for claiming payout
 */
export function buildClaimPayoutTx(marketId: number): TransactionRequest {
    const data = encodeFunctionData({
        abi: FOUNDERS_NET_MARKET_ABI,
        functionName: 'claimPayout',
        args: [BigInt(marketId)],
    });

    return {
        to: getContractAddress(),
        data,
        chainId: config.networkConfig.chainId,
    };
}

/**
 * Build unsigned transaction for USDC approval
 */
export function buildApproveUsdcTx(amount: string): TransactionRequest {
    const amountWei = parseUsdc(amount);

    const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [getContractAddress(), amountWei],
    });

    return {
        to: getUsdcAddress(),
        data,
        chainId: config.networkConfig.chainId,
    };
}

/**
 * Build unlimited USDC approval transaction
 */
export function buildUnlimitedApproveUsdcTx(): TransactionRequest {
    const maxAmount = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

    const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [getContractAddress(), maxAmount],
    });

    return {
        to: getUsdcAddress(),
        data,
        chainId: config.networkConfig.chainId,
    };
}

// ============ Health Check ============

/**
 * Check if contract connection is healthy
 */
export async function healthCheck(): Promise<{
    healthy: boolean;
    contractAddress: string;
    marketCount: number;
    chainId: number;
    error?: string;
}> {
    try {
        const contractAddress = getContractAddress();
        const count = await getMarketCount();

        return {
            healthy: true,
            contractAddress,
            marketCount: count,
            chainId: config.networkConfig.chainId,
        };
    } catch (error) {
        return {
            healthy: false,
            contractAddress: config.networkConfig.contractAddress || 'Not configured',
            marketCount: 0,
            chainId: config.networkConfig.chainId,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ============ Admin Transaction Building Functions ============

/**
 * Build unsigned transaction for creating a market (admin only)
 */
export function buildCreateMarketTx(
    question: string,
    closeTime: number
): TransactionRequest {
    const data = encodeFunctionData({
        abi: FOUNDERS_NET_MARKET_ABI,
        functionName: 'createMarket',
        args: [question, BigInt(closeTime)],
    });

    return {
        to: getContractAddress(),
        data,
        chainId: config.networkConfig.chainId,
    };
}

/**
 * Build unsigned transaction for resolving a market (admin only)
 */
export function buildResolveMarketTx(
    marketId: number,
    outcome: boolean
): TransactionRequest {
    const data = encodeFunctionData({
        abi: FOUNDERS_NET_MARKET_ABI,
        functionName: 'resolveMarket',
        args: [BigInt(marketId), outcome],
    });

    return {
        to: getContractAddress(),
        data,
        chainId: config.networkConfig.chainId,
    };
}

// ============ Admin Statistics Functions ============

export interface AdminStats {
    totalMarkets: number;
    openMarkets: number;
    closedMarkets: number;
    resolvedMarkets: number;
    pendingResolutions: number;
    totalVolume: string;
    activeBets: bigint;
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
    const markets = await getAllMarkets();
    
    let totalVolume = 0n;
    let activeBets = 0n;
    let openCount = 0;
    let closedCount = 0;
    let resolvedCount = 0;

    for (const market of markets) {
        const yesPool = parseUsdc(market.yesPoolFormatted);
        const noPool = parseUsdc(market.noPoolFormatted);
        const marketVolume = yesPool + noPool;
        totalVolume += marketVolume;

        if (market.isOpen) {
            openCount++;
            activeBets += marketVolume;
        } else if (market.isClosed) {
            closedCount++;
        } else if (market.isResolved) {
            resolvedCount++;
        }
    }

    return {
        totalMarkets: markets.length,
        openMarkets: openCount,
        closedMarkets: closedCount,
        resolvedMarkets: resolvedCount,
        pendingResolutions: closedCount, // Closed but not resolved = pending
        totalVolume: formatUsdc(totalVolume),
        activeBets,
    };
}

/**
 * Get markets pending resolution (closed but not resolved)
 */
export async function getPendingResolutionMarkets(): Promise<MarketDisplay[]> {
    const markets = await getAllMarkets();
    return markets.filter(m => m.isClosed);
}
