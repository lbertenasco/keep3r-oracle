import { Contract, ContractFactory } from '@ethersproject/contracts';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { utils } from 'ethers';
import { ethers } from 'hardhat';
import { bdd, constants, erc20, evm, uniswap } from '../utils';

describe('Keep3rV2Oracle', () => {
  let owner: SignerWithAddress;
  let keep3rV2OracleFactory: ContractFactory;
  let tokenA: Contract;
  let tokenB: Contract;

  before(async () => {
    [owner] = await ethers.getSigners();
    keep3rV2OracleFactory = await ethers.getContractFactory(
      'contracts/Keep3rV2Oracle.sol:Keep3rV2Oracle'
    );
  });

  beforeEach(async () => {
    await uniswap.deploy({ owner });
    tokenA = await erc20.deploy({
      name: 'Token A',
      symbol: 'TA',
      initialAccount: owner.address,
      initialAmount: constants.MAX_UINT_256,
    });
    tokenB = await erc20.deploy({
      name: 'Token B',
      symbol: 'TB',
      initialAccount: owner.address,
      initialAmount: constants.MAX_UINT_256,
    });
  });

  describe('overflow bug', () => {
    it('doesnt revert', async () => {
      const pairMockFactory = await ethers.getContractFactory(
        'contracts/mock/UniswapV2Pair.sol:UniswapV2PairMock'
      );
      const pair = await pairMockFactory.deploy(
        tokenA.address,
        tokenB.address,
        constants.MAX_UINT_256.div(utils.parseEther('1')).sub(1),
        constants.MAX_UINT_256.div(utils.parseEther('1')).sub(1)
      );
      const kv2o = await keep3rV2OracleFactory.deploy(pair.address);
      await kv2o.update();
      await pair.increaseBlockTimestampLast(1801);
      await kv2o.update();
      console.log(
        utils.formatEther(
          (
            await kv2o.current(
              tokenA.address,
              utils.parseEther('0.00001'),
              tokenB.address
            )
          ).amountOut
        )
      );
    });
    it('reverts', async () => {
      const pairMockFactory = await ethers.getContractFactory(
        'contracts/mock/UniswapV2Pair.sol:UniswapV2PairMock'
      );
      const pair = await pairMockFactory.deploy(
        tokenA.address,
        tokenB.address,
        constants.MAX_UINT_256.div(utils.parseEther('1').sub('1')),
        constants.MAX_UINT_256.div(utils.parseEther('1').sub('1'))
      );
      const kv2o = await keep3rV2OracleFactory.deploy(pair.address);
    });
    // it.skip('tests', async () => {
    //   const pair = await uniswap.createPair({
    //     token0: tokenA,
    //     token1: tokenB
    //   });
    //   await uniswap.addLiquidity({
    //     owner,
    //     token0: tokenA,
    //     amountA: constants.MAX_UINT_256.div(utils.parseEther('100000000000000000000000000')),
    //     token1: tokenB,
    //     amountB: utils.parseEther('1')
    //   });
    //   const kv2o = await keep3rV2OracleFactory.deploy(
    //     pair.address
    //   );
    //   await uniswap.addLiquidity({
    //     owner,
    //     token0: tokenA,
    //     amountA: constants.MAX_UINT_256.div(utils.parseEther('100000000000000000000000000')),
    //     token1: tokenB,
    //     amountB: utils.parseEther('1')
    //   });
    //   await uniswap.addLiquidity({
    //     owner,
    //     token0: tokenA,
    //     amountA: constants.MAX_UINT_256.div(utils.parseEther('100000000000000000000000000')),
    //     token1: tokenB,
    //     amountB: utils.parseEther('1')
    //   });
    //   await uniswap.addLiquidity({
    //     owner,
    //     token0: tokenA,
    //     amountA: constants.MAX_UINT_256.div(utils.parseEther('100000000000000000000000000')),
    //     token1: tokenB,
    //     amountB: utils.parseEther('1')
    //   });
    //   await uniswap.addLiquidity({
    //     owner,
    //     token0: tokenA,
    //     amountA: constants.MAX_UINT_256.div(utils.parseEther('100000000000000000000000000000')),
    //     token1: tokenB,
    //     amountB: utils.parseEther('1')
    //   });
    //   console.log('reference:', utils.formatEther(constants.MAX_UINT_256));
    //   while(true) {
    //     console.log('cum', utils.formatEther(await pair.price0CumulativeLast()));
    //     console.log('cum', utils.formatEther(await pair.price1CumulativeLast()));
    //     await uniswap.addLiquidity({
    //       owner,
    //       token0: tokenA,
    //       amountA: constants.MAX_UINT_256.div(utils.parseEther('100000000000000000000000000')),
    //       token1: tokenB,
    //       amountB: utils.parseEther('1')
    //     });
    //     await evm.advanceTimeAndBlock(1800);
    //     await pair.sync();
    //     await kv2o.update();
    //   }
    //   console.log(
    //     utils.formatEther((await kv2o.current(
    //       tokenA.address,
    //       utils.parseEther('0.00001'),
    //       tokenB.address
    //     )).amountOut)
    //   );
    // });
  });
});
