/**
 * Admin Middleware
 * 
 * Provides access control for admin-only routes.
 * Checks if connected wallet matches the admin address.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

/**
 * Rate limiting state for admin endpoints
 * Simple in-memory store (replace with Redis in production)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

/**
 * Check if the wallet address matches the admin address.
 * This is a server-side check - the actual wallet ownership
 * is verified by the client (signature during transaction).
 */
export function isAdminAddress(address: string | undefined): boolean {
    if (!address) return false;
    return address.toLowerCase() === config.adminAddress.toLowerCase();
}

/**
 * Admin authentication middleware.
 * Expects 'x-wallet-address' header from frontend.
 * 
 * Security Note: This only verifies the claimed address matches admin.
 * True authentication happens when the wallet signs transactions.
 * This middleware prevents unauthorized access to admin UI/data.
 */
export async function requireAdmin(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const walletAddress = request.headers['x-wallet-address'] as string | undefined;

    if (!walletAddress) {
        request.log.warn('Admin access attempt without wallet address');
        reply.status(401).send({
            success: false,
            error: 'Authorization required',
            message: 'Please connect your wallet to access admin functions.',
        });
        return;
    }

    if (!isAdminAddress(walletAddress)) {
        request.log.warn({ walletAddress }, 'Non-admin wallet attempted admin access');
        reply.status(403).send({
            success: false,
            error: 'Access denied',
            message: 'Only the admin wallet can access this resource.',
        });
        return;
    }

    // Apply rate limiting for admin endpoints
    const now = Date.now();
    const rateLimitKey = `admin:${walletAddress.toLowerCase()}`;
    let rateLimit = rateLimitStore.get(rateLimitKey);

    if (!rateLimit || now > rateLimit.resetTime) {
        rateLimit = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
    }

    rateLimit.count++;
    rateLimitStore.set(rateLimitKey, rateLimit);

    if (rateLimit.count > RATE_LIMIT_MAX_REQUESTS) {
        request.log.warn({ walletAddress }, 'Admin rate limit exceeded');
        reply.status(429).send({
            success: false,
            error: 'Too many requests',
            message: 'Please wait before making more admin requests.',
            retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000),
        });
        return;
    }

    // Log admin action for audit trail
    request.log.info({
        walletAddress,
        method: request.method,
        url: request.url,
    }, 'Admin action');
}

/**
 * Validate market creation input
 */
export interface CreateMarketInput {
    question: string;
    closeTime: number;
}

export function validateCreateMarketInput(body: unknown): CreateMarketInput | { error: string } {
    if (!body || typeof body !== 'object') {
        return { error: 'Invalid request body' };
    }

    const { question, closeTime } = body as Record<string, unknown>;

    // Validate question
    if (typeof question !== 'string' || question.trim().length === 0) {
        return { error: 'Question is required' };
    }
    if (question.length > 500) {
        return { error: 'Question must be 500 characters or less' };
    }

    // Validate close time
    if (typeof closeTime !== 'number' || isNaN(closeTime)) {
        return { error: 'Close time is required and must be a valid timestamp' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (closeTime <= now) {
        return { error: 'Close time must be in the future' };
    }

    // Check close time is not too far in the future (max 2 years)
    const maxCloseTime = now + (2 * 365 * 24 * 60 * 60);
    if (closeTime > maxCloseTime) {
        return { error: 'Close time cannot be more than 2 years in the future' };
    }

    return {
        question: question.trim(),
        closeTime,
    };
}

/**
 * Validate market resolution input
 */
export interface ResolveMarketInput {
    marketId: number;
    outcome: boolean;
}

export function validateResolveMarketInput(body: unknown): ResolveMarketInput | { error: string } {
    if (!body || typeof body !== 'object') {
        return { error: 'Invalid request body' };
    }

    const { marketId, outcome } = body as Record<string, unknown>;

    // Validate market ID
    if (typeof marketId !== 'number' || isNaN(marketId) || marketId < 0) {
        return { error: 'Valid market ID is required' };
    }

    // Validate outcome
    if (typeof outcome !== 'boolean') {
        return { error: 'Outcome must be true (YES) or false (NO)' };
    }

    return { marketId, outcome };
}
