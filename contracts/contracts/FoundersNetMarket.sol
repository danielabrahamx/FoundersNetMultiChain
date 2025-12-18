// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FoundersNetMarket
 * @notice Parimutuel prediction market for startup fundraises on Polygon
 * @dev Binary markets (YES/NO) with USDC escrow and manual admin resolution
 * 
 * Parimutuel Model:
 * - All bets pooled together (YES pool + NO pool)
 * - No fixed odds at bet time
 * - Winners split the total pool proportionally
 * - Payout = (userBet / winningPool) × totalPool
 */
contract FoundersNetMarket is Ownable, ReentrancyGuard {
    
    // ============ State Variables ============
    
    /// @notice USDC token contract for all bets and payouts
    IERC20 public immutable usdc;
    
    /// @notice Minimum bet amount in USDC (with 6 decimals)
    uint256 public constant MIN_BET = 1_000000; // 1 USDC
    
    /// @notice Counter for market IDs (sequential)
    uint256 public marketCount;
    
    /// @notice Market states
    enum MarketState { Open, Closed, Resolved }
    
    /// @notice Market data structure
    struct Market {
        string question;           // Market question (max 500 chars enforced off-chain)
        uint256 closeTime;         // Unix timestamp when betting ends
        MarketState state;         // Current state
        uint256 yesPool;          // Total USDC bet on YES
        uint256 noPool;           // Total USDC bet on NO
        bool outcome;             // Winning outcome (true = YES, false = NO)
        uint256 createdAt;        // Creation timestamp
    }
    
    /// @notice User position in a market
    struct Position {
        uint256 yesBets;          // Total USDC bet on YES
        uint256 noBets;           // Total USDC bet on NO
        bool claimed;             // Whether user has claimed payout
    }
    
    /// @notice All markets (marketId => Market)
    mapping(uint256 => Market) public markets;
    
    /// @notice User positions (marketId => userAddress => Position)
    mapping(uint256 => mapping(address => Position)) public positions;
    
    /// @notice Total claimed per market (to prevent over-claiming)
    mapping(uint256 => uint256) public totalClaimed;
    
    // ============ Events ============
    
    /**
     * @notice Emitted when a new market is created
     * @param marketId Unique market identifier
     * @param question Market question text
     * @param closeTime Unix timestamp when betting closes
     * @param creator Admin address who created the market
     * @param createdAt Creation timestamp
     */
    event MarketCreated(
        uint256 indexed marketId,
        string question,
        uint256 closeTime,
        address indexed creator,
        uint256 createdAt
    );
    
    /**
     * @notice Emitted when a user places a bet
     * @param marketId Market ID
     * @param user User address
     * @param outcome Bet outcome (true = YES, false = NO)
     * @param amount USDC amount bet
     * @param timestamp Bet timestamp
     */
    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        bool outcome,
        uint256 amount,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when a market is resolved
     * @param marketId Market ID
     * @param outcome Winning outcome (true = YES, false = NO)
     * @param timestamp Resolution timestamp
     */
    event MarketResolved(
        uint256 indexed marketId,
        bool outcome,
        uint256 timestamp
    );
    
    /**
     * @notice Emitted when a user claims their payout
     * @param marketId Market ID
     * @param user User address
     * @param amount USDC payout amount
     * @param timestamp Claim timestamp
     */
    event PayoutClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    // ============ Errors ============
    
    error InvalidCloseTime();
    error MarketDoesNotExist();
    error MarketNotOpen();
    error MarketNotClosed();
    error MarketNotResolved();
    error BetTooSmall();
    error InsufficientAllowance();
    error TransferFailed();
    error NoWinningPosition();
    error AlreadyClaimed();
    error MarketAlreadyResolved();
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize the contract with USDC token address
     * @param _usdc Address of USDC token contract on Polygon
     * @dev Admin is set to deployer via Ownable constructor
     */
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Create a new prediction market (admin only)
     * @param _question Market question (e.g., "Will Acme Corp raise Series A by Q4 2024?")
     * @param _closeTime Unix timestamp when betting closes
     * @dev Requirements:
     * - Only callable by admin (owner)
     * - Close time must be in the future
     * - Emits MarketCreated event
     * - Market ID is auto-incremented
     */
    function createMarket(
        string calldata _question,
        uint256 _closeTime
    ) external onlyOwner {
        if (_closeTime <= block.timestamp) revert InvalidCloseTime();
        
        uint256 marketId = marketCount++;
        
        markets[marketId] = Market({
            question: _question,
            closeTime: _closeTime,
            state: MarketState.Open,
            yesPool: 0,
            noPool: 0,
            outcome: false,
            createdAt: block.timestamp
        });
        
        emit MarketCreated(marketId, _question, _closeTime, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Resolve a market by declaring the winning outcome (admin only)
     * @param _marketId Market ID to resolve
     * @param _outcome Winning outcome (true = YES, false = NO)
     * @dev Requirements:
     * - Only callable by admin (owner)
     * - Market must exist
     * - Market must be in Closed state (close time passed)
     * - Resolution is permanent and irreversible
     * - Emits MarketResolved event
     */
    function resolveMarket(
        uint256 _marketId,
        bool _outcome
    ) external onlyOwner {
        if (_marketId >= marketCount) revert MarketDoesNotExist();
        
        Market storage market = markets[_marketId];
        
        // Auto-transition to Closed if close time passed
        if (block.timestamp >= market.closeTime && market.state == MarketState.Open) {
            market.state = MarketState.Closed;
        }
        
        if (market.state != MarketState.Closed) revert MarketNotClosed();
        if (market.state == MarketState.Resolved) revert MarketAlreadyResolved();
        
        market.state = MarketState.Resolved;
        market.outcome = _outcome;
        
        emit MarketResolved(_marketId, _outcome, block.timestamp);
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Place a bet on a market
     * @param _marketId Market ID
     * @param _outcome Bet outcome (true = YES, false = NO)
     * @param _amount USDC amount to bet (minimum 1 USDC)
     * @dev Requirements:
     * - Market must exist and be Open
     * - Close time must not have passed
     * - Amount must be >= MIN_BET (1 USDC)
     * - User must have approved contract for USDC transfer
     * - User must have sufficient USDC balance
     * - Transfers USDC to contract escrow
     * - Updates user position and pool totals
     * - Emits BetPlaced event
     * - Protected against reentrancy
     */
    function placeBet(
        uint256 _marketId,
        bool _outcome,
        uint256 _amount
    ) external nonReentrant {
        if (_marketId >= marketCount) revert MarketDoesNotExist();
        if (_amount < MIN_BET) revert BetTooSmall();
        
        Market storage market = markets[_marketId];
        
        // Auto-transition to Closed if close time passed
        if (block.timestamp >= market.closeTime && market.state == MarketState.Open) {
            market.state = MarketState.Closed;
        }
        
        if (market.state != MarketState.Open) revert MarketNotOpen();
        if (block.timestamp >= market.closeTime) revert MarketNotOpen();
        
        // Check allowance
        if (usdc.allowance(msg.sender, address(this)) < _amount) {
            revert InsufficientAllowance();
        }
        
        // Transfer USDC to escrow
        bool success = usdc.transferFrom(msg.sender, address(this), _amount);
        if (!success) revert TransferFailed();
        
        // Update position
        Position storage position = positions[_marketId][msg.sender];
        if (_outcome) {
            position.yesBets += _amount;
            market.yesPool += _amount;
        } else {
            position.noBets += _amount;
            market.noPool += _amount;
        }
        
        emit BetPlaced(_marketId, msg.sender, _outcome, _amount, block.timestamp);
    }
    
    /**
     * @notice Claim payout after market resolution
     * @param _marketId Market ID
     * @dev Requirements:
     * - Market must be Resolved
     * - User must have winning position
     * - User must not have already claimed
     * - Calculates proportional payout: (userBet / winningPool) × totalPool
     * - Transfers USDC from escrow to user
     * - Marks position as claimed
     * - Emits PayoutClaimed event
     * - Protected against reentrancy
     * 
     * Payout Calculation:
     * - userWinningBet = user's bet on winning outcome
     * - winningPool = total bets on winning outcome
     * - totalPool = yesPool + noPool
     * - payout = (userWinningBet / winningPool) × totalPool
     * 
     * Edge Cases:
     * - If all bets on one side and that side wins: 1:1 payout (no profit)
     * - If all bets on one side and that side loses: no one can claim
     * - Rounding down to prevent over-claiming
     */
    function claimPayout(uint256 _marketId) external nonReentrant {
        if (_marketId >= marketCount) revert MarketDoesNotExist();
        
        Market storage market = markets[_marketId];
        if (market.state != MarketState.Resolved) revert MarketNotResolved();
        
        Position storage position = positions[_marketId][msg.sender];
        if (position.claimed) revert AlreadyClaimed();
        
        // Determine user's winning bet
        uint256 userWinningBet = market.outcome ? position.yesBets : position.noBets;
        if (userWinningBet == 0) revert NoWinningPosition();
        
        // Calculate payout
        uint256 winningPool = market.outcome ? market.yesPool : market.noPool;
        uint256 totalPool = market.yesPool + market.noPool;
        
        uint256 payout;
        if (winningPool == 0) {
            // Edge case: no bets on winning side (should not happen if user has winning bet)
            revert NoWinningPosition();
        } else if (winningPool == totalPool) {
            // Edge case: all bets on winning side, return original stake
            payout = userWinningBet;
        } else {
            // Normal case: proportional share of total pool
            payout = (userWinningBet * totalPool) / winningPool;
        }
        
        // Mark as claimed before transfer (CEI pattern)
        position.claimed = true;
        totalClaimed[_marketId] += payout;
        
        // Transfer payout
        bool success = usdc.transfer(msg.sender, payout);
        if (!success) revert TransferFailed();
        
        emit PayoutClaimed(_marketId, msg.sender, payout, block.timestamp);
    }
    
    // ============ Read Functions ============
    
    /**
     * @notice Get market details
     * @param _marketId Market ID
     * @return question Market question
     * @return closeTime Close timestamp
     * @return state Market state (0=Open, 1=Closed, 2=Resolved)
     * @return yesPool Total USDC in YES pool
     * @return noPool Total USDC in NO pool
     * @return outcome Winning outcome (only valid if Resolved)
     */
    function getMarket(uint256 _marketId) 
        external 
        view 
        returns (
            string memory question,
            uint256 closeTime,
            MarketState state,
            uint256 yesPool,
            uint256 noPool,
            bool outcome
        ) 
    {
        if (_marketId >= marketCount) revert MarketDoesNotExist();
        Market storage market = markets[_marketId];
        return (
            market.question,
            market.closeTime,
            market.state,
            market.yesPool,
            market.noPool,
            market.outcome
        );
    }
    
    /**
     * @notice Get market pool totals
     * @param _marketId Market ID
     * @return yesPool Total USDC in YES pool
     * @return noPool Total USDC in NO pool
     */
    function getMarketPools(uint256 _marketId) 
        external 
        view 
        returns (uint256 yesPool, uint256 noPool) 
    {
        if (_marketId >= marketCount) revert MarketDoesNotExist();
        Market storage market = markets[_marketId];
        return (market.yesPool, market.noPool);
    }
    
    /**
     * @notice Get user's position in a market
     * @param _marketId Market ID
     * @param _user User address
     * @return yesBets Total USDC bet on YES
     * @return noBets Total USDC bet on NO
     * @return claimed Whether user has claimed payout
     */
    function getUserPosition(uint256 _marketId, address _user)
        external
        view
        returns (uint256 yesBets, uint256 noBets, bool claimed)
    {
        if (_marketId >= marketCount) revert MarketDoesNotExist();
        Position storage position = positions[_marketId][_user];
        return (position.yesBets, position.noBets, position.claimed);
    }
    
    /**
     * @notice Get total number of markets
     * @return Total market count
     */
    function getMarketCount() external view returns (uint256) {
        return marketCount;
    }
    
    /**
     * @notice Get paginated list of market IDs
     * @param _startIndex Starting index (0-based)
     * @param _count Number of IDs to return
     * @return Array of market IDs
     * @dev Returns available IDs up to marketCount, may return fewer than _count if near end
     */
    function getMarketIds(uint256 _startIndex, uint256 _count)
        external
        view
        returns (uint256[] memory)
    {
        if (_startIndex >= marketCount) {
            return new uint256[](0);
        }
        
        uint256 endIndex = _startIndex + _count;
        if (endIndex > marketCount) {
            endIndex = marketCount;
        }
        
        uint256 resultCount = endIndex - _startIndex;
        uint256[] memory ids = new uint256[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            ids[i] = _startIndex + i;
        }
        
        return ids;
    }
    
    /**
     * @notice Calculate claimable amount for a user in a market
     * @param _marketId Market ID
     * @param _user User address
     * @return Claimable USDC amount (0 if not winner or already claimed)
     * @dev Does not modify state, safe to call repeatedly
     */
    function getClaimableAmount(uint256 _marketId, address _user)
        external
        view
        returns (uint256)
    {
        if (_marketId >= marketCount) return 0;
        
        Market storage market = markets[_marketId];
        if (market.state != MarketState.Resolved) return 0;
        
        Position storage position = positions[_marketId][_user];
        if (position.claimed) return 0;
        
        // Determine user's winning bet
        uint256 userWinningBet = market.outcome ? position.yesBets : position.noBets;
        if (userWinningBet == 0) return 0;
        
        // Calculate payout
        uint256 winningPool = market.outcome ? market.yesPool : market.noPool;
        uint256 totalPool = market.yesPool + market.noPool;
        
        if (winningPool == 0) return 0;
        if (winningPool == totalPool) return userWinningBet;
        
        return (userWinningBet * totalPool) / winningPool;
    }
}
