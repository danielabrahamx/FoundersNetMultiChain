/**
 * FoundersNet Fastify Server
 * 
 * Main server entry point. Sets up:
 * - EJS templating with @fastify/view
 * - Static file serving
 * - CORS for local development
 * - Request logging
 * - Error handling
 * - Route registration
 */

import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import view from '@fastify/view';
import staticFiles from '@fastify/static';
import cors from '@fastify/cors';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';

import { config, logConfig } from './config.js';
import { registerPageRoutes, registerHtmxRoutes, registerApiRoutes, registerAdminRoutes } from './routes/index.js';

// ============ Path Setup ============

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ Server Instance ============

const server = Fastify({
    logger: {
        level: config.isDevelopment ? 'debug' : 'info',
        transport: config.isDevelopment
            ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            }
            : undefined,
    },
});

// ============ Plugin Registration ============

/**
 * Register CORS for local development
 * Allows frontend to call backend from different port
 */
await server.register(cors, {
    origin: config.isDevelopment
        ? ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000']
        : false, // Disable CORS in production (same-origin)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
});

/**
 * Register EJS view engine
 */
await server.register(view, {
    engine: {
        ejs,
    },
    root: path.join(__dirname, 'views'),
    viewExt: 'ejs',
    options: {
        filename: path.join(__dirname, 'views'),
    },
    defaultContext: {
        // Default template variables available in all templates
        appName: 'FoundersNet',
        year: new Date().getFullYear(),
    },
});

/**
 * Serve static files (CSS, JS, images)
 */
await server.register(staticFiles, {
    root: path.join(__dirname, '../public'),
    prefix: '/',
    decorateReply: false,
});

// ============ Request Hooks ============

/**
 * Add request timing and logging
 */
server.addHook('onRequest', async (request: FastifyRequest) => {
    request.log.info({
        method: request.method,
        url: request.url,
        ip: request.ip,
    }, 'incoming request');
});

/**
 * Add response headers for HTMX compatibility
 */
server.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload) => {
    // Add cache control for HTMX requests
    if (request.headers['hx-request']) {
        reply.header('Cache-Control', 'no-store');
    }
    return payload;
});

// ============ Error Handling ============

/**
 * Global error handler
 */
server.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error(error, 'Request error');

    // Handle validation errors
    if (error.validation) {
        return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.validation,
        });
    }

    // Handle 404
    if (error.statusCode === 404) {
        // Check if it's an API request
        if (request.url.startsWith('/api/')) {
            return reply.status(404).send({
                success: false,
                error: 'Not found',
            });
        }
        return reply.status(404).view('pages/error.ejs', {
            title: 'Not Found - FoundersNet',
            errorMessage: 'Page not found',
            network: config.network,
        });
    }

    // Handle other errors
    const statusCode = error.statusCode || 500;
    const errorMessage = config.isDevelopment ? error.message : 'An unexpected error occurred';

    // Check if it's an API request
    if (request.url.startsWith('/api/')) {
        return reply.status(statusCode).send({
            success: false,
            error: errorMessage,
            stack: config.isDevelopment ? error.stack : undefined,
        });
    }

    return reply.status(statusCode).view('pages/error.ejs', {
        title: 'Error - FoundersNet',
        errorMessage,
        network: config.network,
    });
});

/**
 * Not found handler
 */
server.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    if (request.url.startsWith('/api/')) {
        return reply.status(404).send({
            success: false,
            error: 'Endpoint not found',
        });
    }
    return reply.status(404).view('pages/error.ejs', {
        title: 'Not Found - FoundersNet',
        errorMessage: 'The page you are looking for does not exist.',
        network: config.network,
    });
});

// ============ Route Registration ============

// Register all routes
await registerPageRoutes(server);
await registerHtmxRoutes(server);
await registerApiRoutes(server);
await registerAdminRoutes(server);

// ============ Server Start ============

const start = async (): Promise<void> => {
    try {
        // Log configuration
        logConfig();

        // Start listening
        await server.listen({
            port: config.port,
            host: config.host,
        });

        console.log(`\n🚀 Server running at http://${config.host}:${config.port}`);
        console.log(`📊 Health check: http://${config.host}:${config.port}/health`);
        console.log(`🔗 API docs: http://${config.host}:${config.port}/api/config\n`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

// ============ Graceful Shutdown ============

const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    try {
        await server.close();
        console.log('Server closed');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server
start();
