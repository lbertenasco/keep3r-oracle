import { JsonRpcSigner } from '@ethersproject/providers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json';
import moment from 'moment';
import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { BigNumber, Contract, ContractFactory, utils } from 'ethers';
import { bdd, constants, evm } from '../utils';
import contracts from '../../utils/contracts';
const { when, given, then } = bdd;

const forkBlockNumber = 12136012;
const mainnetKeeper = '0x2d407ddb06311396fe14d4b49da5f0471447d45c';
const keep3rV2Oracle = '0xe20B3f175F9f4e1EDDf333f96b72Bba138c9e83a'; // Keep3rV2Oracle for Sushi LP KP3R/WETH

describe('Keep3rV2OracleJob', function () {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let keep3r: Contract;
  let keep3rOracleFactory: Contract;
  let keep3rOracle: Contract;
  let keep3rOraclePair: Contract;
  let keeper: JsonRpcSigner;
  let keep3rGovernance: JsonRpcSigner;
  let keep3rWhale: JsonRpcSigner;
  let keep3rV2OracleJob: Contract;
  let keep3rV2OracleJobContract: ContractFactory;

  before('Setup accounts and contracts', async () => {
    [owner, alice] = await ethers.getSigners();
    keep3rV2OracleJobContract = await ethers.getContractFactory(
      'contracts/Keep3rV2OracleJob.sol:Keep3rV2OracleJob'
    );
  });

  beforeEach('Setup environment', async () => {
    await evm.reset({
      jsonRpcUrl: process.env.MAINNET_HTTPS_URL,
      blockNumber: forkBlockNumber,
    });
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [mainnetKeeper],
    });
    keeper = await ethers.provider.getSigner(mainnetKeeper);
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [contracts.mainnet.keep3rGovernance],
    });
    keep3rGovernance = await ethers.provider.getSigner(
      contracts.mainnet.keep3rGovernance
    );
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: ['0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be'],
    });
    keep3rWhale = await ethers.provider.getSigner(
      '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be'
    );
    keep3r = await ethers.getContractAt('IKeep3rV1', contracts.mainnet.keep3r);
    keep3rOracleFactory = await ethers.getContractAt(
      'contracts/interfaces/keep3r/IKeep3rV2OracleFactory.sol:IKeep3rV2OracleFactory',
      contracts.mainnet.yfi.keeperV2OracleFactory
    );
    keep3rOracle = await ethers.getContractAt(
      'contracts/interfaces/keep3r/IKeep3rV2Oracle.sol:IKeep3rV2Oracle',
      keep3rV2Oracle
    );
    keep3rOraclePair = await ethers.getContractAt(
      IUniswapV2Pair.abi,
      await keep3rOracle.pair()
    );
    keep3rV2OracleJob = await keep3rV2OracleJobContract.deploy(
      contracts.mainnet.keep3r,
      contracts.mainnet.keep3r,
      0,
      0,
      0,
      false,
      contracts.mainnet.yfi.keeperV2OracleFactory
    );
    await evm.advanceTimeAndBlock(moment.duration(3, 'days').as('seconds'));
    await keep3rV2OracleJob.keep3rActivate(keep3r.address);
    await keep3rV2OracleJob.addPairs([await keep3rOracle.pair()]);
    await keep3r.connect(keep3rGovernance).addJob(keep3rV2OracleJob.address);
    await keep3r
      .connect(keep3rGovernance)
      .addKPRCredit(keep3rV2OracleJob.address, utils.parseEther('100'));
  });

  const makePairWorkable = async () => {
    await keep3rOraclePair.sync();
    const currentObservaionsLength = await keep3rOracle.length();
    const lastObservation = await keep3rOracle.observations(
      currentObservaionsLength - 1
    );
    const periodSize = 1800;
    if (moment().unix() <= lastObservation.timestamp + periodSize) {
      await evm.advanceToTimeAndBlock(lastObservation.timestamp + periodSize);
    }
    return {
      lastObservation,
      periodSize,
    };
  };

  describe('workable', () => {
    when('doenst have pairs to work on', () => {
      then('returns false', async () => {
        expect(await keep3rV2OracleJob.workable()).to.be.false;
      });
    });
    when('does have pairs to work on', () => {
      given(async function () {
        await makePairWorkable();
      });
      then('returns true', async function () {
        expect(await keep3rV2OracleJob.workable()).to.be.true;
      });
    });
  });

  describe.only('work', () => {
    when('doesnt have pairs to work on', () => {
      given(async function () {
        this.workTx = keep3rV2OracleJob.connect(keeper).work();
      });
      then('reverts with reason', async function () {
        await expect(this.workTx).to.be.revertedWith(
          'Keep3rV2OracleJob::should-have-worked'
        );
      });
    });
    when('there was a pair to work', () => {
      given(async function () {
        const { lastObservation, periodSize } = await makePairWorkable();
        this.previousLastObservation = lastObservation;
        this.periodSize = periodSize;
      });
      when('worker is not a keeper', () => {
        given(async function () {
          this.workTx = keep3rV2OracleJob.work();
        });
        then('tx is reverted with reason', async function () {
          await expect(this.workTx).to.be.revertedWith(
            'keep3r::isKeeper:keeper-is-not-registered'
          );
        });
      });
      when('keep3r v2 oracle job is not a keeper', () => {
        given(async function () {
          await keep3r
            .connect(keep3rGovernance)
            .revoke(keep3rV2OracleJob.address);
          this.workTx = keep3rV2OracleJob.work();
        });
        then('tx is reverted with reason', async function () {
          await expect(this.workTx).to.be.revertedWith(
            'keep3r::isKeeper:keeper-is-not-registered'
          );
        });
      });
      when('everything is set up', () => {
        given(async function () {
          await keep3r.bond(keep3r.address, 0);
          await evm.advanceTimeAndBlock(
            moment.duration(3, 'days').as('seconds')
          );
          await keep3r.activate(keep3r.address);
          this.workTx = keep3rV2OracleJob.work();
          await keep3rOraclePair.sync();
          this.lastObservation = await keep3rOracle.observations(
            (await keep3rOracle.length()) - 1
          );
        });
        then('works', async function () {
          await expect(this.workTx).to.not.be.reverted;
        });
        then('updates pair', async function () {
          expect(this.previousLastObservation.timestamp).to.be.lt(
            this.lastObservation.timestamp
          );
        });
        then('emits event', async function () {
          await expect(this.workTx).to.emit(keep3rV2OracleJob, 'Worked');
        });
      });
    });
  });
});
