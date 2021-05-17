// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IUniswapV2Pair {
  function getReserves()
    external
    view
    returns (
      uint112 reserve0,
      uint112 reserve1,
      uint32 blockTimestampLast
    );

  function price0CumulativeLast() external view returns (uint256);

  function price1CumulativeLast() external view returns (uint256);

  function token0() external view returns (address);

  function token1() external view returns (address);
}

contract UniswapV2PairMock is IUniswapV2Pair {

  address internal _token0;
  address internal _token1;
  uint112 internal _reserve0;
  uint112 internal _reserve1;
  uint256 internal _price0;
  uint256 internal _price1;
  uint32 internal _blockTimestampLast;

  constructor(
    address __token0,
    address __token1,
    uint256 __price0,
    uint256 __price1
  ) {
    _token0 = __token0;
    _token1 = __token1;
    _price0 = __price0;
    _price1 = __price1;
    _blockTimestampLast = uint32(block.timestamp);
  }

  function getReserves()
    override 
    external
    view
    returns (
      uint112 reserve0,
      uint112 reserve1,
      uint32 blockTimestampLast
    ) {
      reserve0 = _reserve0;
      reserve1 = _reserve1;
      blockTimestampLast = _blockTimestampLast;
    }

  function setPrice0(uint256 __price0) external {
    _price0 = __price0;
  }

  function setPrice1(uint256 __price1) external {
    _price1 = __price1;
  }

  function increaseBlockTimestampLast(uint32 _amount) external {
    _blockTimestampLast = _blockTimestampLast + _amount;
  }

  function price0CumulativeLast() override external view returns (uint256) {
    return _price0;
  }

  function price1CumulativeLast() override external view returns (uint256) {
    return _price1;
  }

  function token0() override external view returns (address) {
    return _token0;
  }

  function token1() override external view returns (address) {
    return _token1;
  }

}