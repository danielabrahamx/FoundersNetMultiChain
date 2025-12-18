/**
 * FoundersNet API Routes
 * 
 * JSON API endpoints for:
 * - Unsigned transaction data (for wallet signing)
 * - Market data
 * - User balance/allowance
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';
import {
    getMarket,
    getMarketDisplay,
    getAllMarkets,
    getUserPositionDisplay,
    getClaimableAmount,
    getUsdcBalance,
    getUsdcAllowance,
    buildPlaceBetTx,
    buildClaimPayoutTx,
    buildApproveUsdcTx,
    buildUnlimitedApproveUsdcTx,
    formatUsdc,
    MarketState,
} from '../services/contract.js';

// ============ Request Schemas ============

interface MarketParams {
    id: string;
}

interface AddressParams {
    address: string;
}

interface PlaceBetBody {
    marketId: number;
    outcome: boolean; // true = YES, false = NO
    amount: string; // USDC amount as string (e.g., "10.50")
}

interface ClaimBody {
    marketId: number;
}

interface ApproveBody {
    amount?: string; // If not provided, approves unlimited
}

// ============ Route Registration ============

/**
 * Register API routes for JSON responses
 */
export async function registerApiRoutes(server: FastifyInstance): Promise<void> {
    // ============ Market Data Endpoints ============

    /**
     * GET /api/markets - Get all markets (JSON)
     */
    server.get('/api/markets', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const markets = await getAllMarkets();
            return reply.send({
                success: true,
                data: markets,
                count: markets.length,
                network: config.network,
                chainId: config.networkConfig.chainId,
            });
        } catch (error) {
            request.log.error(error, 'Failed to get markets');
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch markets',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    /**
     * GET /api/market/:id - Get single market data (JSON)
     */
    server.get<{ Params: MarketParams }>(
        '/api/market/:id',
        async (request: FastifyRequest<{ Params: MarketParams }>, reply: FastifyReply) => {
            try {
                const marketId = parseInt(request.params.id, 10);

                if (isNaN(marketId) || marketId < 0) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Invalid market ID',
                    });
                }

                const market = await getMarketDisplay(marketId);

                return reply.send({
                    success: true,
                    data: market,
                    network: config.network,
                    chainId: config.networkConfig.chainId,
                });
            } catch (error) {
                request.log.error(error, 'Failed to get market');
                return reply.status(404).send({
                    success: false,
                    error: 'Market not found',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    );

    // ============ User Data Endpoints ============

    /**
     * GET /api/balance/:address - Get USDC balance for address
     */
    server.get<{ Params: AddressParams }>(
        '/api/balance/:address',
        async (request: FastifyRequest<{ Params: AddressParams }>, reply: FastifyReply) => {
            try {
                const { address } = request.params;

                if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Invalid address format',
                    });
                }

                const balance = await getUsdcBalance(address);

                return reply.send({
                    success: true,
                    data: {
                        address,
                        balance,
                        token: 'USDC',
                    },
                });
            } catch (error) {
                request.log.error(error, 'Failed to get balance');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch balance',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    );

    /**
     * GET /api/allowance/:address - Get USDC allowance for address
     */
    server.get<{ Params: AddressParams }>(
        '/api/allowance/:address',
        async (request: FastifyRequest<{ Params: AddressParams }>, reply: FastifyReply) => {
            try {
                const { address } = request.params;

                if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Invalid address format',
                    });
                }

                const allowance = await getUsdcAllowance(address);

                return reply.send({
                    success: true,
                    data: {
                        address,
                        allowance,
                        spender: config.networkConfig.contractAddress,
                        token: 'USDC',
                    },
                });
            } catch (error) {
                request.log.error(error, 'Failed to get allowance');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch allowance',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    );

    /**
     * GET /api/position/:marketId/:address - Get user position in market
     */
    server.get<{ Params: { marketId: string; address: string } }>(
        '/api/position/:marketId/:address',
        async (
            request: FastifyRequest<{ Params: { marketId: string; address: string } }>,
            reply: FastifyReply
        ) => {
            try {
                const marketId = parseInt(request.params.marketId, 10);
                const { address } = request.params;

                if (isNaN(marketId) || marketId < 0) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Invalid market ID',
                    });
                }

                if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Invalid address format',
                    });
                }

                const position = await getUserPositionDisplay(marketId, address);

                return reply.send({
                    success: true,
                    data: position,
                });
            } catch (error) {
                request.log.error(error, 'Failed to get position');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch position',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    );

    // ============ Transaction Building Endpoints ============

    /**
     * POST /api/tx/bet - Build unsigned bet transaction
     * 
     * Returns transaction data for wallet signing.
     * Does NOT execute the transaction.
     */
    server.post<{ Body: PlaceBetBody }>(
        '/api/tx/bet',
        async (request: FastifyRequest<{ Body: PlaceBetBody }>, reply: FastifyReply) => {
            try {
                const { marketId, outcome, amount } = request.body;

                // Validate input
                if (typeof marketId !== 'number' || marketId < 0) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Invalid market ID',
                    });
                }

                if (typeof outcome !== 'boolean') {
                    return reply.status(400).send({
                        success: false,
                        error: 'Outcome must be true (YES) or false (NO)',
                    });
                }

                if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 1) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Amount must be at least 1 USDC',
                    });
                }

                // Verify market is open
                const market = await getMarket(marketId);
                if (market.state !== MarketState.Open) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Market is not open for betting',
                        marketState: market.state,
                    });
                }

                // Build transaction
                const tx = buildPlaceBetTx(marketId, outcome, amount);

                return reply.send({
                    success: true,
                    transaction: tx,
                    meta: {
                        marketId,
                        outcome: outcome ? 'YES' : 'NO',
                        amount,
                        action: 'placeBet',
                    },
                });
            } catch (error) {
                request.log.error(error, 'Failed to build bet transaction');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to build transaction',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    );

    /**
     * POST /api/tx/claim - Build unsigned claim payout transaction
     * 
     * Returns transaction data for wallet signing.
     * Does NOT execute the transaction.
     */
    server.post<{ Body: ClaimBody }>(
        '/api/tx/claim',
        async (request: FastifyRequest<{ Body: ClaimBody }>, reply: FastifyReply) => {
            try {
                const { marketId } = request.body;

                if (typeof marketId !== 'number' || marketId < 0) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Invalid market ID',
                    });
                }

                // Verify market is resolved
                const market = await getMarket(marketId);
                if (market.state !== MarketState.Resolved) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Market is not resolved yet',
                        marketState: market.state,
                    });
                }

                // Build transaction
                const tx = buildClaimPayoutTx(marketId);

                return reply.send({
                    success: true,
                    transaction: tx,
                    meta: {
                        marketId,
                        action: 'claimPayout',
                    },
                });
            } catch (error) {
                request.log.error(error, 'Failed to build claim transaction');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to build transaction',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    );

    /**
     * POST /api/tx/approve - Build unsigned USDC approval transaction
     * 
     * Returns transaction data for wallet signing.
     * Does NOT execute the transaction.
     */
    server.post<{ Body: ApproveBody }>(
        '/api/tx/approve',
        async (request: FastifyRequest<{ Body: ApproveBody }>, reply: FastifyReply) => {
            try {
                const { amount } = request.body;

                let tx;
                if (amount) {
                    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
                        return reply.status(400).send({
                            success: false,
                            error: 'Invalid amount',
                        });
                    }
                    tx = buildApproveUsdcTx(amount);
                } else {
                    // Unlimited approval
                    tx = buildUnlimitedApproveUsdcTx();
                }

                return reply.send({
                    success: true,
                    transaction: tx,
                    meta: {
                        spender: config.networkConfig.contractAddress,
                        amount: amount || 'unlimited',
                        action: 'approve',
                        token: 'USDC',
                    },
                });
            } catch (error) {
                request.log.error(error, 'Failed to build approve transaction');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to build transaction',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    );

    // ============ Config Endpoint ============

    /**
     * GET /api/config - Get public configuration for frontend
     */
    server.get('/api/config', async (request: FastifyRequest, reply: FastifyReply) => {
        return reply.send({
            success: true,
            data: {
                network: config.network,
                networkName: config.networkConfig.name,
                chainId: config.networkConfig.chainId,
                contractAddress: config.networkConfig.contractAddress,
                usdcAddress: config.networkConfig.usdcAddress,
                adminAddress: config.adminAddress,
                blockExplorer: config.networkConfig.blockExplorer,
            },
        });
    });
}
