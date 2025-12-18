import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { FoundersNetMarket, MockUSDC } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Test Helpers for FoundersNetMarket
 * 
 * Utility functions to simplify test setup and common operations
 */

// ============ Constants ============

export const USDC_DECIMALS = 6;
export const MIN_BET = BigInt(10 ** USDC_DECIMALS); // 1 USDC
export const ONE_MINUTE = 60;
export const ONE_HOUR = 60 * 60;
export const ONE_DAY = 24 * ONE_HOUR;
export const ONE_WEEK = 7 * ONE_DAY;

// ============ Helper Functions ============

/**
 * Convert human-readable USDC amount to wei (6 decimals)
 * @param amount USDC amount (e.g., 100 for 100 USDC)
 * @returns BigInt in smallest unit
 */
export function toUSDC(amount: number | string): bigint {
    return BigInt(Math.floor(Number(amount) * 10 ** USDC_DECIMALS));
}

/**
 * Convert wei to human-readable USDC amount
 * @param wei Amount in smallest unit
 * @returns Number in USDC
 */
export function fromUSDC(wei: bigint): number {
    return Number(wei) / 10 ** USDC_DECIMALS;
}

/**
 * Get current timestamp plus offset
 * @param offsetSeconds Seconds to add to current time
 * @returns Unix timestamp
 */
export async function futureTime(offsetSeconds: number): Promise<number> {
    return (await time.latest()) + offsetSeconds;
}

/**
 * Create a market with default parameters
 */
export async function createMarket(
    market: FoundersNetMarket,
    admin: HardhatEthersSigner,
    options: {
        question?: string;
        closeTimeOffset?: number;
    } = {}
): Promise<{ marketId: bigint; closeTime: number; question: string }> {
    const question = options.question || `Test Market ${Date.now()}`;
    const closeTime = await futureTime(options.closeTimeOffset || ONE_DAY);

    await market.connect(admin).createMarket(question, closeTime);

    const marketId = (await market.getMarketCount()) - 1n;

    return { marketId, closeTime, question };
}

/**
 * Place a bet with simplified parameters
 */
export async function placeBet(
    market: FoundersNetMarket,
    user: HardhatEthersSigner,
    marketId: bigint | number,
    outcome: "yes" | "no" | boolean,
    amountUSDC: number
): Promise<void> {
    const isYes = outcome === "yes" || outcome === true;
    await market.connect(user).placeBet(marketId, isYes, toUSDC(amountUSDC));
}

/**
 * Setup users with USDC balance and approval
 */
export async function setupUsers(
    usdc: MockUSDC,
    market: FoundersNetMarket,
    users: HardhatEthersSigner[],
    balanceUSDC: number = 10000
): Promise<void> {
    const balance = toUSDC(balanceUSDC);
    const marketAddress = await market.getAddress();

    for (const user of users) {
        await usdc.mint(user.address, balance);
        await usdc.connect(user).approve(marketAddress, ethers.MaxUint256);
    }
}

/**
 * Advance to market close and resolve
 */
export async function closeAndResolve(
    market: FoundersNetMarket,
    admin: HardhatEthersSigner,
    marketId: bigint | number,
    outcome: "yes" | "no" | boolean
): Promise<void> {
    const [, closeTime] = await market.getMarket(marketId);
    const currentTime = await time.latest();

    if (currentTime < closeTime) {
        await time.increaseTo(closeTime + 1);
    }

    const isYes = outcome === "yes" || outcome === true;
    await market.connect(admin).resolveMarket(marketId, isYes);
}

/**
 * Calculate expected payout for a user
 * @param userBet User's bet on winning side
 * @param winningPool Total bets on winning side
 * @param totalPool Total bets (YES + NO)
 * @returns Expected payout
 */
export function calculatePayout(
    userBet: bigint,
    winningPool: bigint,
    totalPool: bigint
): bigint {
    if (winningPool === 0n) return 0n;
    if (winningPool === totalPool) return userBet;
    return (userBet * totalPool) / winningPool;
}

/**
 * Get market state as string
 */
export function marketStateToString(state: number): string {
    switch (state) {
        case 0: return "Open";
        case 1: return "Closed";
        case 2: return "Resolved";
        default: return "Unknown";
    }
}

/**
 * Assert market state
 */
export async function assertMarketState(
    market: FoundersNetMarket,
    marketId: bigint | number,
    expectedState: "Open" | "Closed" | "Resolved"
): Promise<void> {
    const [, , state] = await market.getMarket(marketId);
    const stateMap = { Open: 0, Closed: 1, Resolved: 2 };

    if (Number(state) !== stateMap[expectedState]) {
        throw new Error(
            `Expected market ${marketId} to be ${expectedState}, ` +
            `but was ${marketStateToString(Number(state))}`
        );
    }
}

/**
 * Get all bets on a market
 */
export async function getMarketDetails(
    market: FoundersNetMarket,
    marketId: bigint | number
): Promise<{
    question: string;
    closeTime: number;
    state: string;
    yesPool: bigint;
    noPool: bigint;
    totalPool: bigint;
    outcome: boolean;
    impliedOddsYes: number;
    impliedOddsNo: number;
}> {
    const [question, closeTime, state, yesPool, noPool, outcome] =
        await market.getMarket(marketId);

    const totalPool = yesPool + noPool;
    const impliedOddsYes = totalPool > 0n
        ? Number(yesPool * 100n / totalPool) / 100
        : 0.5;
    const impliedOddsNo = totalPool > 0n
        ? Number(noPool * 100n / totalPool) / 100
        : 0.5;

    return {
        question,
        closeTime: Number(closeTime),
        state: marketStateToString(Number(state)),
        yesPool,
        noPool,
        totalPool,
        outcome,
        impliedOddsYes,
        impliedOddsNo
    };
}

/**
 * Log market details for debugging
 */
export async function logMarketDetails(
    market: FoundersNetMarket,
    marketId: bigint | number
): Promise<void> {
    const details = await getMarketDetails(market, marketId);

    console.log(`\n=== Market ${marketId} ===`);
    console.log(`Question: ${details.question}`);
    console.log(`State: ${details.state}`);
    console.log(`Close Time: ${new Date(details.closeTime * 1000).toISOString()}`);
    console.log(`YES Pool: ${fromUSDC(details.yesPool)} USDC`);
    console.log(`NO Pool: ${fromUSDC(details.noPool)} USDC`);
    console.log(`Total Pool: ${fromUSDC(details.totalPool)} USDC`);
    console.log(`Implied Odds: YES ${(details.impliedOddsYes * 100).toFixed(1)}% / NO ${(details.impliedOddsNo * 100).toFixed(1)}%`);
    if (details.state === "Resolved") {
        console.log(`Outcome: ${details.outcome ? "YES" : "NO"}`);
    }
    console.log("");
}

/**
 * Scenario builder for complex test setups
 */
export class MarketScenarioBuilder {
    private market: FoundersNetMarket;
    private usdc: MockUSDC;
    private admin: HardhatEthersSigner;
    private marketId: bigint | null = null;
    private closeTime: number | null = null;

    constructor(
        market: FoundersNetMarket,
        usdc: MockUSDC,
        admin: HardhatEthersSigner
    ) {
        this.market = market;
        this.usdc = usdc;
        this.admin = admin;
    }

    async createMarket(question: string, closeTimeOffset: number = ONE_DAY): Promise<this> {
        const result = await createMarket(this.market, this.admin, {
            question,
            closeTimeOffset
        });
        this.marketId = result.marketId;
        this.closeTime = result.closeTime;
        return this;
    }

    async addBet(
        user: HardhatEthersSigner,
        outcome: "yes" | "no",
        amountUSDC: number
    ): Promise<this> {
        if (this.marketId === null) {
            throw new Error("Create market first");
        }

        // Ensure user has balance and approval
        const balance = await this.usdc.balanceOf(user.address);
        const required = toUSDC(amountUSDC);

        if (balance < required) {
            await this.usdc.mint(user.address, required - balance);
        }

        const allowance = await this.usdc.allowance(user.address, await this.market.getAddress());
        if (allowance < required) {
            await this.usdc.connect(user).approve(await this.market.getAddress(), ethers.MaxUint256);
        }

        await placeBet(this.market, user, this.marketId, outcome, amountUSDC);
        return this;
    }

    async resolve(outcome: "yes" | "no"): Promise<this> {
        if (this.marketId === null) {
            throw new Error("Create market first");
        }
        await closeAndResolve(this.market, this.admin, this.marketId, outcome);
        return this;
    }

    getMarketId(): bigint {
        if (this.marketId === null) {
            throw new Error("Create market first");
        }
        return this.marketId;
    }
}
