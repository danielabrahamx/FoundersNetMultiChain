/**
 * FoundersNet Admin Routes
 * 
 * Admin-only routes for market management:
 * - Dashboard with statistics
 * - Market creation
 * - Market resolution
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';
import {
    requireAdmin,
    validateCreateMarketInput,
    validateResolveMarketInput,
} from '../middleware/admin.js';
import {
    getAllMarkets,
    getMarketDisplay,
    getAdminStats,
    getPendingResolutionMarkets,
    buildCreateMarketTx,
    buildResolveMarketTx,
    buildResolveMarketEarlyTx,
    MarketState,
} from '../services/contract.js';

// ============ Request Types ============

interface MarketParams {
    id: string;
}

interface CreateMarketBody {
    question: string;
    closeTime: number;
}

interface ResolveMarketBody {
    marketId: number;
    outcome: boolean;
}

interface AdminQuery {
    wallet?: string;
}

/**
 * Get wallet address from request (header, query param, or cookie)
 * This allows admin pages to work with normal link navigation
 */
function getWalletAddressFromRequest(request: FastifyRequest<{ Querystring: AdminQuery }>): string | undefined {
    // Priority: header > query param > cookie
    const fromHeader = request.headers['x-wallet-address'] as string | undefined;
    if (fromHeader) return fromHeader;

    const fromQuery = request.query.wallet as string | undefined;
    if (fromQuery) return fromQuery;

    return undefined;
}

// ============ Route Registration ============

/**
 * Register admin routes for admin panel
 */
export async function registerAdminRoutes(server: FastifyInstance): Promise<void> {
    // ============ Admin Page Routes ============

    /**
     * GET /admin - Admin dashboard
     */
    server.get<{ Querystring: AdminQuery }>('/admin', async (request: FastifyRequest<{ Querystring: AdminQuery }>, reply: FastifyReply) => {
        try {
            // Check if wallet address is provided (header or query param)
            const walletAddress = getWalletAddressFromRequest(request);

            // If no wallet or not admin, return login prompt page
            if (!walletAddress || walletAddress.toLowerCase() !== config.adminAddress.toLowerCase()) {
                return reply.view('admin/login.ejs', {
                    title: 'Admin Login - FoundersNet',
                    network: config.network,
                    networkName: config.networkConfig.name,
                    chainId: config.networkConfig.chainId,
                    adminAddress: config.adminAddress,
                    contractAddress: config.networkConfig.contractAddress,
                    usdcAddress: config.networkConfig.usdcAddress,
                    blockExplorer: config.networkConfig.blockExplorer,
                    rpcUrl: config.networkConfig.rpcUrl,
                });
            }

            // Get admin data
            const [stats, markets, pendingMarkets] = await Promise.all([
                getAdminStats(),
                getAllMarkets(),
                getPendingResolutionMarkets(),
            ]);

            return reply.view('admin/dashboard.ejs', {
                title: 'Admin Dashboard - FoundersNet',
                network: config.network,
                networkName: config.networkConfig.name,
                chainId: config.networkConfig.chainId,
                adminAddress: config.adminAddress,
                contractAddress: config.networkConfig.contractAddress,
                usdcAddress: config.networkConfig.usdcAddress,
                blockExplorer: config.networkConfig.blockExplorer,
                rpcUrl: config.networkConfig.rpcUrl,
                stats,
                markets,
                pendingMarkets,
            });
        } catch (error) {
            request.log.error(error, 'Admin dashboard error');
            return reply.view('pages/error.ejs', {
                title: 'Error - FoundersNet',
                errorMessage: 'Failed to load admin dashboard',
                network: config.network,
            });
        }
    });

    /**
     * GET /admin/create-market - Market creation form
     */
    server.get<{ Querystring: AdminQuery }>('/admin/create-market', async (request: FastifyRequest<{ Querystring: AdminQuery }>, reply: FastifyReply) => {
        try {
            const walletAddress = getWalletAddressFromRequest(request);

            // Check admin access
            if (!walletAddress || walletAddress.toLowerCase() !== config.adminAddress.toLowerCase()) {
                return reply.view('admin/login.ejs', {
                    title: 'Admin Login - FoundersNet',
                    network: config.network,
                    networkName: config.networkConfig.name,
                    chainId: config.networkConfig.chainId,
                    adminAddress: config.adminAddress,
                    contractAddress: config.networkConfig.contractAddress,
                    usdcAddress: config.networkConfig.usdcAddress,
                    blockExplorer: config.networkConfig.blockExplorer,
                    rpcUrl: config.networkConfig.rpcUrl,
                });
            }

            return reply.view('admin/create-market.ejs', {
                title: 'Create Market - FoundersNet Admin',
                network: config.network,
                networkName: config.networkConfig.name,
                chainId: config.networkConfig.chainId,
                adminAddress: config.adminAddress,
                contractAddress: config.networkConfig.contractAddress,
                usdcAddress: config.networkConfig.usdcAddress,
                blockExplorer: config.networkConfig.blockExplorer,
                rpcUrl: config.networkConfig.rpcUrl,
            });
        } catch (error) {
            request.log.error(error, 'Create market page error');
            return reply.view('pages/error.ejs', {
                title: 'Error - FoundersNet',
                errorMessage: 'Failed to load create market page',
                network: config.network,
            });
        }
    });

    /**
     * GET /admin/resolve/:id - Market resolution page
     */
    server.get<{ Params: MarketParams; Querystring: AdminQuery }>(
        '/admin/resolve/:id',
        async (request: FastifyRequest<{ Params: MarketParams; Querystring: AdminQuery }>, reply: FastifyReply) => {
            try {
                const walletAddress = getWalletAddressFromRequest(request);

                // Check admin access
                if (!walletAddress || walletAddress.toLowerCase() !== config.adminAddress.toLowerCase()) {
                    return reply.view('admin/login.ejs', {
                        title: 'Admin Login - FoundersNet',
                        network: config.network,
                        networkName: config.networkConfig.name,
                        chainId: config.networkConfig.chainId,
                        adminAddress: config.adminAddress,
                        contractAddress: config.networkConfig.contractAddress,
                        usdcAddress: config.networkConfig.usdcAddress,
                        blockExplorer: config.networkConfig.blockExplorer,
                        rpcUrl: config.networkConfig.rpcUrl,
                    });
                }

                const marketId = parseInt(request.params.id, 10);

                if (isNaN(marketId) || marketId < 0) {
                    return reply.status(400).view('pages/error.ejs', {
                        title: 'Invalid Market - FoundersNet',
                        errorMessage: 'Invalid market ID',
                        network: config.network,
                    });
                }

                const market = await getMarketDisplay(marketId);

                return reply.view('admin/resolve-market.ejs', {
                    title: `Resolve: ${market.question} - FoundersNet Admin`,
                    network: config.network,
                    networkName: config.networkConfig.name,
                    chainId: config.networkConfig.chainId,
                    adminAddress: config.adminAddress,
                    contractAddress: config.networkConfig.contractAddress,
                    usdcAddress: config.networkConfig.usdcAddress,
                    blockExplorer: config.networkConfig.blockExplorer,
                    rpcUrl: config.networkConfig.rpcUrl,
                    market,
                });
            } catch (error) {
                request.log.error(error, 'Resolve market page error');
                return reply.status(404).view('pages/error.ejs', {
                    title: 'Market Not Found - FoundersNet',
                    errorMessage: 'Market not found',
                    network: config.network,
                });
            }
        }
    );

    // ============ Admin API Routes ============

    /**
     * POST /api/admin/tx/create-market - Build unsigned create market transaction
     */
    server.post<{ Body: CreateMarketBody }>(
        '/api/admin/tx/create-market',
        { preHandler: requireAdmin },
        async (request: FastifyRequest<{ Body: CreateMarketBody }>, reply: FastifyReply) => {
            try {
                const validation = validateCreateMarketInput(request.body);

                if ('error' in validation) {
                    return reply.status(400).send({
                        success: false,
                        error: validation.error,
                    });
                }

                const { question, closeTime } = validation;

                // Build transaction
                const tx = buildCreateMarketTx(question, closeTime);

                return reply.send({
                    success: true,
                    transaction: tx,
                    meta: {
                        question,
                        closeTime,
                        closeTimeFormatted: new Date(closeTime * 1000).toLocaleString(),
                        action: 'createMarket',
                    },
                });
            } catch (error) {
                request.log.error(error, 'Failed to build create market transaction');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to build transaction',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    );

    /**
     * POST /api/admin/tx/resolve-market - Build unsigned resolve market transaction
     */
    server.post<{ Body: ResolveMarketBody }>(
        '/api/admin/tx/resolve-market',
        { preHandler: requireAdmin },
        async (request: FastifyRequest<{ Body: ResolveMarketBody }>, reply: FastifyReply) => {
            try {
                const validation = validateResolveMarketInput(request.body);

                if ('error' in validation) {
                    return reply.status(400).send({
                        success: false,
                        error: validation.error,
                    });
                }

                const { marketId, outcome } = validation;

                // Verify market exists and is in correct state
                const market = await getMarketDisplay(marketId);

                if (market.isOpen) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Cannot resolve: Market is still open for betting',
                        marketState: 'Open',
                    });
                }

                if (market.isResolved) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Cannot resolve: Market has already been resolved',
                        marketState: 'Resolved',
                        outcome: market.outcomeLabel,
                    });
                }

                // Build transaction
                const tx = buildResolveMarketTx(marketId, outcome);

                return reply.send({
                    success: true,
                    transaction: tx,
                    meta: {
                        marketId,
                        question: market.question,
                        outcome: outcome ? 'YES' : 'NO',
                        yesPool: market.yesPoolFormatted,
                        noPool: market.noPoolFormatted,
                        action: 'resolveMarket',
                    },
                });
            } catch (error) {
                request.log.error(error, 'Failed to build resolve market transaction');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to build transaction',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    );

    /**
     * POST /api/admin/tx/resolve-market-early - Build unsigned early resolve market transaction
     * Allows admin to close and resolve a market before close time
     */
    server.post<{ Body: ResolveMarketBody }>(
        '/api/admin/tx/resolve-market-early',
        { preHandler: requireAdmin },
        async (request: FastifyRequest<{ Body: ResolveMarketBody }>, reply: FastifyReply) => {
            try {
                const validation = validateResolveMarketInput(request.body);

                if ('error' in validation) {
                    return reply.status(400).send({
                        success: false,
                        error: validation.error,
                    });
                }

                const { marketId, outcome } = validation;

                // Verify market exists and is in correct state
                const market = await getMarketDisplay(marketId);

                if (!market.isOpen) {
                    if (market.isClosed) {
                        return reply.status(400).send({
                            success: false,
                            error: 'Market is already closed. Use regular resolution instead.',
                            marketState: 'Closed',
                        });
                    }
                    return reply.status(400).send({
                        success: false,
                        error: 'Cannot resolve: Market has already been resolved',
                        marketState: 'Resolved',
                        outcome: market.outcomeLabel,
                    });
                }

                // Build early resolution transaction
                const tx = buildResolveMarketEarlyTx(marketId, outcome);

                return reply.send({
                    success: true,
                    transaction: tx,
                    meta: {
                        marketId,
                        question: market.question,
                        outcome: outcome ? 'YES' : 'NO',
                        yesPool: market.yesPoolFormatted,
                        noPool: market.noPoolFormatted,
                        action: 'resolveMarketEarly',
                        warning: 'This will immediately close the market and prevent further betting.',
                    },
                });
            } catch (error) {
                request.log.error(error, 'Failed to build early resolve market transaction');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to build transaction',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    );

    /**
     * GET /api/admin/stats - Get admin statistics (for HTMX partial updates)
     */
    server.get(
        '/api/admin/stats',
        { preHandler: requireAdmin },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const stats = await getAdminStats();
                return reply.send({
                    success: true,
                    data: stats,
                });
            } catch (error) {
                request.log.error(error, 'Failed to get admin stats');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch admin statistics',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    );

    /**
     * GET /api/admin/pending - Get pending resolution markets
     */
    server.get(
        '/api/admin/pending',
        { preHandler: requireAdmin },
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const markets = await getPendingResolutionMarkets();
                return reply.send({
                    success: true,
                    data: markets,
                    count: markets.length,
                });
            } catch (error) {
                request.log.error(error, 'Failed to get pending markets');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to fetch pending markets',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    );
}
