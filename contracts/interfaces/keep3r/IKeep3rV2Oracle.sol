// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
pragma experimental ABIEncoderV2;

interface IKeep3rV2Oracle {
    struct Observation {
        uint32 timestamp;
        uint112 price0Cumulative;
        uint112 price1Cumulative;
    }

    function observations(uint256) external view returns (Observation memory);

    function length() external view returns (uint16);

    function factory() external view returns (address);

    function pair() external view returns (address);

    function periodSize() external view returns (uint256);

    function Q112() external view returns (uint256);

    function e10() external view returns (uint256);

    function cache(uint256 size) external;

    function update() external returns (bool);

    function updateable() external view returns (bool);

    function current(
        address tokenIn,
        uint256 amountIn,
        address tokenOut
    ) external view returns (uint256 amountOut, uint256 lastUpdatedAgo);

    function quote(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 points
    ) external view returns (uint256 amountOut, uint256 lastUpdatedAgo);

    function sample(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 points,
        uint256 window
    ) external view returns (uint256[] memory prices, uint256 lastUpdatedAgo);
}
