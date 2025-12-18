/**
 * FoundersNet Page Routes
 * 
 * Serves full HTML pages using EJS templates.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';
import { getAllMarkets, getMarketDisplay, healthCheck } from '../services/contract.js';

interface MarketParams {
    id: string;
}

/**
 * Register page routes for HTML rendering
 */
export async function registerPageRoutes(server: FastifyInstance): Promise<void> {
    /**
     * GET / - Homepage with markets list
     */
    server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // Check contract health
            const health = await healthCheck();

            let markets: Awaited<ReturnType<typeof getAllMarkets>> = [];
            let errorMessage: string | null = null;

            if (health.healthy) {
                try {
                    markets = await getAllMarkets();
                } catch (error) {
                    errorMessage = 'Failed to load markets. Please try again.';
                    request.log.error(error, 'Failed to load markets');
                }
            } else {
                errorMessage = health.error || 'Contract not available';
            }

            return reply.view('pages/home.ejs', {
                title: 'FoundersNet - Prediction Markets',
                network: config.network,
                networkName: config.networkConfig.name,
                chainId: config.networkConfig.chainId,
                adminAddress: config.adminAddress,
                markets,
                errorMessage,
                contractAddress: config.networkConfig.contractAddress,
                usdcAddress: config.networkConfig.usdcAddress,
                blockExplorer: config.networkConfig.blockExplorer,
                rpcUrl: config.networkConfig.rpcUrl,
            });
        } catch (error) {
            request.log.error(error, 'Homepage error');
            return reply.view('pages/error.ejs', {
                title: 'Error - FoundersNet',
                errorMessage: 'An unexpected error occurred',
                network: config.network,
            });
        }
    });

    /**
     * GET /market/:id - Individual market detail page
     */
    server.get<{ Params: MarketParams }>(
        '/market/:id',
        async (request: FastifyRequest<{ Params: MarketParams }>, reply: FastifyReply) => {
            try {
                const marketId = parseInt(request.params.id, 10);

                if (isNaN(marketId) || marketId < 0) {
                    return reply.status(400).view('pages/error.ejs', {
                        title: 'Invalid Market - FoundersNet',
                        errorMessage: 'Invalid market ID',
                        network: config.network,
                    });
                }

                const market = await getMarketDisplay(marketId);

                return reply.view('pages/market.ejs', {
                    title: `${market.question} - FoundersNet`,
                    network: config.network,
                    networkName: config.networkConfig.name,
                    chainId: config.networkConfig.chainId,
                    adminAddress: config.adminAddress,
                    market,
                    contractAddress: config.networkConfig.contractAddress,
                    usdcAddress: config.networkConfig.usdcAddress,
                    blockExplorer: config.networkConfig.blockExplorer,
                    rpcUrl: config.networkConfig.rpcUrl,
                });
            } catch (error) {
                request.log.error(error, 'Market page error');
                return reply.status(404).view('pages/error.ejs', {
                    title: 'Market Not Found - FoundersNet',
                    errorMessage: 'Market not found or contract not available',
                    network: config.network,
                });
            }
        }
    );

    /**
     * GET /my-bets - User bets page (requires wallet connection on frontend)
     */
    server.get('/my-bets', async (request: FastifyRequest, reply: FastifyReply) => {
        return reply.view('pages/my-bets.ejs', {
            title: 'My Bets - FoundersNet',
            network: config.network,
            networkName: config.networkConfig.name,
            chainId: config.networkConfig.chainId,
            adminAddress: config.adminAddress,
            contractAddress: config.networkConfig.contractAddress,
            usdcAddress: config.networkConfig.usdcAddress,
            blockExplorer: config.networkConfig.blockExplorer,
            rpcUrl: config.networkConfig.rpcUrl,
        });
    });

    /**
     * GET /health - Health check endpoint
     */
    server.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
        const health = await healthCheck();
        return reply.send({
            status: health.healthy ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            contract: health,
            network: config.network,
        });
    });
}
