// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@lbertenasco/contract-utils/interfaces/keep3r/IKeep3rV1.sol";
import "./IKeep3rV2Oracle.sol";

interface IKeep3rV2OracleFactory {
    function governance() external view returns (address);

    function pendingGovernance() external view returns (address);

    function KP3R() external view returns (IKeep3rV1);

    function feeds(address _pair) external view returns (IKeep3rV2Oracle);

    function setGovernance(address _governance) external;

    function acceptGovernance() external;

    function pairs() external;

    function update(address pair) external;

    function byteCode(address pair) external;

    function deploy(address pair) external;

    function work() external;

    function work(address pair) external;

    function workForFree() external;

    function workForFree(address pair) external;

    function cache(uint256 size) external;

    function cache(address pair, uint256 size) external;

    function workable() external view returns (bool canWork);

    function workable(address pair) external view returns (bool);

    function sample(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 points,
        uint256 window,
        bool sushiswap
    ) external view returns (uint256[] memory prices, uint256 lastUpdatedAgo);

    function sample(
        address pair,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 points,
        uint256 window
    ) external view returns (uint256[] memory prices, uint256 lastUpdatedAgo);

    function quote(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 points,
        bool sushiswap
    ) external view returns (uint256 amountOut, uint256 lastUpdatedAgo);

    function quote(
        address pair,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 points
    ) external view returns (uint256 amountOut, uint256 lastUpdatedAgo);

    function current(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        bool sushiswap
    ) external view returns (uint256 amountOut, uint256 lastUpdatedAgo);

    function current(
        address pair,
        address tokenIn,
        uint256 amountIn,
        address tokenOut
    ) external view returns (uint256 amountOut, uint256 lastUpdatedAgo);
}
