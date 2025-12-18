// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing purposes
 * @dev Implements standard ERC20 with 6 decimals like real USDC
 *      Includes mint function for easy test setup
 */
contract MockUSDC is ERC20 {
    uint8 private constant _decimals = 6;

    constructor() ERC20("USD Coin", "USDC") {}

    /**
     * @notice Returns the number of decimals (6 for USDC)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Mint tokens to an address (for testing only)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in smallest unit with 6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from caller (for testing edge cases)
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
