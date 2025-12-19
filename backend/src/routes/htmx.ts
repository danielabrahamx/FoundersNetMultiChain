/**
 * FoundersNet HTMX Partial Routes
 * 
 * Serves HTML fragments for HTMX dynamic updates.
 * These routes return partial HTML, not full pages.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';
import {
    getAllMarkets,
    getMarketDisplay,
    getAllUserPositions,
    getUserPositionDisplay,
} from '../services/contract.js';

interface AddressQuery {
    address?: string;
}

interface MarketParams {
    id: string;
}

/**
 * Register HTMX partial routes
 */
export async function registerHtmxRoutes(server: FastifyInstance): Promise<void> {
    /**
     * GET /markets - HTMX partial for markets list refresh
     */
    server.get('/markets', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const markets = await getAllMarkets();

            // Set HTMX-specific headers
            reply.header('HX-Trigger', 'marketsUpdated');

            return reply.view('partials/markets-list.ejs', {
                markets,
                network: config.network,
            });
        } catch (error) {
            request.log.error(error, 'Failed to load markets partial');
            return reply.view('partials/error.ejs', {
                message: 'Failed to load markets',
            });
        }
    });

    /**
     * GET /markets/:id/card - HTMX partial for single market card
     */
    server.get<{ Params: MarketParams }>(
        '/markets/:id/card',
        async (request: FastifyRequest<{ Params: MarketParams }>, reply: FastifyReply) => {
            try {
                const marketId = parseInt(request.params.id, 10);

                if (isNaN(marketId) || marketId < 0) {
                    return reply.status(400).view('partials/error.ejs', {
                        message: 'Invalid market ID',
                    });
                }

                const market = await getMarketDisplay(marketId);

                return reply.view('partials/market-card.ejs', {
                    market,
                    network: config.network,
                });
            } catch (error) {
                request.log.error(error, 'Failed to load market card');
                return reply.status(404).view('partials/error.ejs', {
                    message: 'Market not found',
                });
            }
        }
    );

    /**
     * GET /markets/:id/betting-form - HTMX partial for betting form
     */
    server.get<{ Params: MarketParams }>(
        '/markets/:id/betting-form',
        async (request: FastifyRequest<{ Params: MarketParams }>, reply: FastifyReply) => {
            try {
                const marketId = parseInt(request.params.id, 10);

                if (isNaN(marketId) || marketId < 0) {
                    return reply.status(400).view('partials/error.ejs', {
                        message: 'Invalid market ID',
                    });
                }

                const market = await getMarketDisplay(marketId);

                return reply.view('partials/betting-form.ejs', {
                    market,
                    network: config.network,
                    chainId: config.networkConfig.chainId,
                    contractAddress: config.networkConfig.contractAddress,
                    usdcAddress: config.networkConfig.usdcAddress,
                });
            } catch (error) {
                request.log.error(error, 'Failed to load betting form');
                return reply.status(404).view('partials/error.ejs', {
                    message: 'Market not found',
                });
            }
        }
    );

    /**
     * GET /my-bets - HTMX partial for user positions (requires wallet address param)
     */
    server.get<{ Querystring: AddressQuery }>(
        '/my-bets/list',
        async (request: FastifyRequest<{ Querystring: AddressQuery }>, reply: FastifyReply) => {
            try {
                const { address } = request.query;

                if (!address) {
                    return reply.view('partials/connect-wallet-prompt.ejs', {});
                }

                // Validate address format
                if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                    return reply.status(400).view('partials/error.ejs', {
                        message: 'Invalid wallet address',
                    });
                }

                const positions = await getAllUserPositions(address);

                // Transform positions to the format expected by the template
                const bets = positions.map(p => ({
                    ...p.position,
                    market: p.market,
                    yesBets: parseFloat(p.position.yesBetsFormatted),
                    noBets: parseFloat(p.position.noBetsFormatted),
                }));

                // Calculate stats
                let totalWagered = 0;
                let pendingCount = 0;
                let claimableTotal = 0;

                for (const bet of bets) {
                    totalWagered += parseFloat(bet.totalBets);
                    if (!bet.market.isResolved) {
                        pendingCount++;
                    }
                    claimableTotal += parseFloat(bet.claimableAmount);
                }

                return reply.view('partials/user-bets-list.ejs', {
                    bets,
                    totalWagered: totalWagered.toFixed(2),
                    pendingCount,
                    claimableAmount: claimableTotal.toFixed(2),
                    walletAddress: address,
                    network: config.network,
                    chainId: config.networkConfig.chainId,
                    contractAddress: config.networkConfig.contractAddress,
                });
            } catch (error) {
                request.log.error(error, 'Failed to load user positions');
                return reply.view('partials/error.ejs', {
                    message: 'Failed to load your bets',
                });
            }
        }
    );

    /**
     * GET /markets/:id/position - HTMX partial for user position in specific market
     */
    server.get<{ Params: MarketParams; Querystring: AddressQuery }>(
        '/markets/:id/position',
        async (
            request: FastifyRequest<{ Params: MarketParams; Querystring: AddressQuery }>,
            reply: FastifyReply
        ) => {
            try {
                const marketId = parseInt(request.params.id, 10);
                const { address } = request.query;

                if (isNaN(marketId) || marketId < 0) {
                    return reply.status(400).view('partials/error.ejs', {
                        message: 'Invalid market ID',
                    });
                }

                if (!address) {
                    return reply.view('partials/position-login-prompt.ejs', {
                        marketId,
                    });
                }

                if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                    return reply.status(400).view('partials/error.ejs', {
                        message: 'Invalid wallet address',
                    });
                }

                const [position, market] = await Promise.all([
                    getUserPositionDisplay(marketId, address),
                    getMarketDisplay(marketId),
                ]);

                return reply.view('partials/user-position.ejs', {
                    position,
                    market,
                    walletAddress: address,
                    network: config.network,
                    chainId: config.networkConfig.chainId,
                    contractAddress: config.networkConfig.contractAddress,
                });
            } catch (error) {
                request.log.error(error, 'Failed to load user position');
                return reply.view('partials/error.ejs', {
                    message: 'Failed to load position',
                });
            }
        }
    );

    /**
     * GET /pools/:id - HTMX partial for pool odds update
     */
    server.get<{ Params: MarketParams }>(
        '/pools/:id',
        async (request: FastifyRequest<{ Params: MarketParams }>, reply: FastifyReply) => {
            try {
                const marketId = parseInt(request.params.id, 10);

                if (isNaN(marketId) || marketId < 0) {
                    return reply.send({ error: 'Invalid market ID' });
                }

                const market = await getMarketDisplay(marketId);

                return reply.view('partials/pool-display.ejs', {
                    market,
                });
            } catch (error) {
                request.log.error(error, 'Failed to load pool data');
                return reply.view('partials/error.ejs', {
                    message: 'Failed to load pool data',
                });
            }
        }
    );
}
