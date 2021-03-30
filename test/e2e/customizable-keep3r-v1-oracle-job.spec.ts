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
const sushiLPKP3RWETH = '0xaf988aff99d3d0cb870812c325c588d8d8cb7de8 ';

describe('CustomizableKeep3rV2OracleJob', function () {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let keep3r: Contract;
  let keep3rOracleFactory: Contract;
  let keep3rOracle: Contract;
  let keep3rOraclePair: Contract;
  let keeper: JsonRpcSigner;
  let keep3rGovernance: JsonRpcSigner;
  let keep3rWhale: JsonRpcSigner;
  let customizableKeep3rV2OracleJob: Contract;
  let customizableKeep3rV2OracleJobContract: ContractFactory;
  let oracleBondedKeeper: Contract;
  let oracleBondedKeeperContract: ContractFactory;

  before('Setup accounts and contracts', async () => {
    [owner, alice] = await ethers.getSigners();
    oracleBondedKeeperContract = await ethers.getContractFactory(
      'contracts/OracleBondedKeeper.sol:OracleBondedKeeper'
    );
    customizableKeep3rV2OracleJobContract = await ethers.getContractFactory(
      'contracts/CustomizableKeep3rV2OracleJob.sol:CustomizableKeep3rV2OracleJob'
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
    oracleBondedKeeper = await oracleBondedKeeperContract.deploy(
      contracts.mainnet.keep3r,
      contracts.mainnet.yfi.keeperV2OracleFactory
    );
    await oracleBondedKeeper.bond(keep3r.address, 0);
    await evm.advanceTimeAndBlock(moment.duration(3, 'days').as('seconds'));
    await oracleBondedKeeper.activate(keep3r.address);
    customizableKeep3rV2OracleJob = await customizableKeep3rV2OracleJobContract.deploy(
      contracts.mainnet.keep3r,
      contracts.mainnet.keep3r,
      0,
      0,
      0,
      false,
      oracleBondedKeeper.address
    );
    await oracleBondedKeeper.addJob(customizableKeep3rV2OracleJob.address);
    await customizableKeep3rV2OracleJob.addPairs([await keep3rOracle.pair()]);
    await keep3r
      .connect(keep3rGovernance)
      .addJob(customizableKeep3rV2OracleJob.address);
    await keep3r
      .connect(keep3rGovernance)
      .addKPRCredit(
        customizableKeep3rV2OracleJob.address,
        utils.parseEther('100')
      );
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
        expect(await customizableKeep3rV2OracleJob.workable()).to.be.false;
      });
    });
    when('does have pairs to work on', () => {
      given(async function () {
        await makePairWorkable();
      });
      then('returns true', async function () {
        expect(await customizableKeep3rV2OracleJob.workable()).to.be.true;
      });
    });
  });

  describe.only('work', () => {
    when('doesnt have pairs to work on', () => {
      given(async function () {
        this.workTx = customizableKeep3rV2OracleJob.connect(keeper).work();
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
      when('customizable job is not added to oracle bonded jobs', () => {
        then('tx is reverted with reason');
      });
      when('oracle bonded keeper not actually bonded', () => {
        then('tx is reverted with reason');
      });
      when('everything is set up', () => {
        given(async function () {
          await keep3r.bond(keep3r.address, 0);
          await evm.advanceTimeAndBlock(
            moment.duration(3, 'days').as('seconds')
          );
          await keep3r.activate(keep3r.address);
          this.workTx = customizableKeep3rV2OracleJob.work();
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
        then('emits event');
      });
    });
  });

  // it('Should deploy new PartialKeep3rV1OracleJob with keep3r', async function () {
  //   const OracleBondedKeeper = await ethers.getContractFactory(
  //     'OracleBondedKeeper'
  //   );
  //   const oracleBondedKeeper = await OracleBondedKeeper.deploy(
  //     config.contracts.mainnet.keep3r.address,
  //     config.contracts.mainnet.keep3rV1Oracle.address
  //   );
  //   const PartialKeep3rV1OracleJob = await ethers.getContractFactory(
  //     'PartialKeep3rV1OracleJob'
  //   );
  //   const partialKeep3rV1OracleJob = await PartialKeep3rV1OracleJob.deploy(
  //     config.contracts.mainnet.keep3r.address,
  //     constants.ZERO_ADDRESS,
  //     utils.parseEther('200'), // 200 KP3R required
  //     0,
  //     0,
  //     false,
  //     oracleBondedKeeper.address
  //   );
  //   const oracleBondedKeeperAddress = await partialKeep3rV1OracleJob.oracleBondedKeeper();
  //   expect(oracleBondedKeeperAddress).to.eq(oracleBondedKeeper.address);
  // });

  // it('Should deploy on mainnet fork', async function () {
  //   await network.provider.request({
  //     method: 'hardhat_impersonateAccount',
  //     params: [config.accounts.mainnet.publicKey],
  //   });
  //   const multisig = await ethers.provider.getSigner(
  //     config.accounts.mainnet.publicKey
  //   );

  //   await network.provider.request({
  //     method: 'hardhat_impersonateAccount',
  //     params: [config.accounts.mainnet.keeper],
  //   });
  //   const keeper = await ethers.provider.getSigner(
  //     config.accounts.mainnet.keeper
  //   );

  //   await network.provider.request({
  //     method: 'hardhat_impersonateAccount',
  //     params: [config.accounts.mainnet.keep3rGovernance],
  //   });
  //   const keep3rGovernance = await ethers.provider.getSigner(
  //     config.accounts.mainnet.keep3rGovernance
  //   );

  //   const OracleBondedKeeper = await ethers.getContractFactory(
  //     'OracleBondedKeeper'
  //   );
  //   const oracleBondedKeeper = (
  //     await OracleBondedKeeper.deploy(
  //       config.contracts.mainnet.keep3r.address,
  //       config.contracts.mainnet.keep3rV1Oracle.address
  //     )
  //   ).connect(owner);

  //   const PartialKeep3rV1OracleJob = await ethers.getContractFactory(
  //     'PartialKeep3rV1OracleJob'
  //   );
  //   const partialKeep3rV1OracleJob = (
  //     await PartialKeep3rV1OracleJob.deploy(
  //       config.contracts.mainnet.keep3r.address,
  //       constants.ZERO_ADDRESS,
  //       utils.parseEther('200'), // 200 KP3R required
  //       0,
  //       0,
  //       false,
  //       oracleBondedKeeper.address
  //     )
  //   ).connect(owner);

  //   const pairs: { [key: string]: { address: string; contract?: Contract } } = {
  //     KP3R_ETHPair: { address: '0x87fEbfb3AC5791034fD5EF1a615e9d9627C2665D' },
  //     YFI_ETHPair: { address: '0x2fDbAdf3C4D5A8666Bc06645B8358ab803996E28' },
  //     // _ETHPair: { address: '' },
  //     // _ETHPair: { address: '' },
  //   };

  //   // Setup pairs
  //   for (const pair in pairs) {
  //     pairs[pair].contract = await ethers.getContractAt(
  //       '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
  //       pairs[pair].address,
  //       owner
  //     );
  //   }

  //   // Add pairs to pair keep3r
  //   console.time('partialKeep3rV1OracleJob addPair');
  //   for (const pair in pairs) {
  //     console.log(
  //       `partialKeep3rV1OracleJob.addPair(${pair})`,
  //       pairs[pair].address
  //     );
  //     await partialKeep3rV1OracleJob.addPair(pairs[pair].address);
  //   }
  //   console.timeEnd('partialKeep3rV1OracleJob addPair');

  //   console.time('pairs');
  //   const addedPairs = await partialKeep3rV1OracleJob.pairs();
  //   expect(addedPairs).to.be.deep.eq(
  //     Object.values(pairs).map((pair) => pair.contract.address)
  //   );
  //   console.timeEnd('pairs');

  //   const KP3R_ETHPairContract = pairs['KP3R_ETHPair'].contract;
  //   const YFI_ETHPairContract = pairs['YFI_ETHPair'].contract;

  //   console.time('removePair');
  //   await partialKeep3rV1OracleJob.removePair(KP3R_ETHPairContract.address);
  //   await expect(
  //     partialKeep3rV1OracleJob.removePair(KP3R_ETHPairContract.address)
  //   ).to.be.revertedWith(
  //     'PartialKeep3rV1OracleJob::remove-pair:pair-not-found'
  //   );

  //   await expect(
  //     partialKeep3rV1OracleJob.callStatic.workable(KP3R_ETHPairContract.address)
  //   ).to.be.revertedWith('PartialKeep3rV1OracleJob::workable:pair-not-found');
  //   console.timeEnd('removePair');

  //   console.time('addPair');
  //   await partialKeep3rV1OracleJob.addPair(KP3R_ETHPairContract.address);
  //   await expect(
  //     partialKeep3rV1OracleJob.addPair(KP3R_ETHPairContract.address)
  //   ).to.be.revertedWith(
  //     'PartialKeep3rV1OracleJob::add-pair:pair-already-added'
  //   );
  //   console.timeEnd('addPair');

  //   // Advance time to make job workable
  //   await network.provider.request({
  //     method: 'evm_increaseTime',
  //     params: [2000],
  //   });
  //   await network.provider.request({ method: 'evm_mine', params: [] });

  //   console.time('workable');
  //   expect(
  //     await partialKeep3rV1OracleJob.callStatic.workable(
  //       KP3R_ETHPairContract.address
  //     )
  //   ).to.be.true;
  //   expect(
  //     await partialKeep3rV1OracleJob.callStatic.workable(
  //       YFI_ETHPairContract.address
  //     )
  //   ).to.be.true;
  //   console.timeEnd('workable');

  //   console.time('work should revert on KP3R_ETHPair');
  //   await expect(
  //     partialKeep3rV1OracleJob.work(KP3R_ETHPairContract.address)
  //   ).to.be.revertedWith('keep3r::isKeeper:keeper-not-min-requirements');
  //   console.timeEnd('work should revert on KP3R_ETHPair');

  //   console.time('add partialKeep3rV1OracleJob as a job on keep3r');
  //   const keep3r = await ethers.getContractAt(
  //     'IKeep3rV1',
  //     config.contracts.mainnet.keep3r.address,
  //     keep3rGovernance
  //   );
  //   await keep3r.addJob(partialKeep3rV1OracleJob.address);
  //   await keep3r.addKPRCredit(
  //     partialKeep3rV1OracleJob.address,
  //     utils.parseEther('100')
  //   );
  //   console.timeEnd('add partialKeep3rV1OracleJob as a job on keep3r');

  //   await expect(
  //     partialKeep3rV1OracleJob
  //       .connect(keeper)
  //       .work(KP3R_ETHPairContract.address)
  //   ).to.be.revertedWith(
  //     'OracleBondedKeeper::onlyValidJob:msg-sender-not-valid-job'
  //   );

  //   await oracleBondedKeeper.addJob(partialKeep3rV1OracleJob.address);

  //   await expect(
  //     partialKeep3rV1OracleJob
  //       .connect(keeper)
  //       .work(KP3R_ETHPairContract.address)
  //   ).to.be.revertedWith('::isKeeper: keeper is not registered');

  //   await keep3r.addVotes(oracleBondedKeeper.address, utils.parseEther('200'));

  //   // Updates oracle :)
  //   // console.log('forceWork update KP3R_ETH pair')
  //   // await partialKeep3rV1OracleJob.forceWork(KP3R_ETHPairContract.address);

  //   console.time('work YFI_ETHPair');
  //   console.log('work(YFI_ETHPair)');
  //   await partialKeep3rV1OracleJob
  //     .connect(keeper)
  //     .work(YFI_ETHPairContract.address);
  //   console.timeEnd('work YFI_ETHPair');

  //   console.time('forceWork KP3R_ETHPair makes workable false');
  //   await expect(
  //     partialKeep3rV1OracleJob.forceWork(YFI_ETHPairContract.address)
  //   ).to.be.revertedWith(
  //     'PartialKeep3rV1OracleJob::force-work:pair-not-updated'
  //   );

  //   expect(
  //     await partialKeep3rV1OracleJob.callStatic.workable(
  //       YFI_ETHPairContract.address
  //     )
  //   ).to.be.false;
  //   console.timeEnd('forceWork KP3R_ETHPair makes workable false');

  //   console.time('keeper work reverts with not-workable');
  //   await expect(
  //     partialKeep3rV1OracleJob.connect(keeper).work(YFI_ETHPairContract.address)
  //   ).to.be.revertedWith('PartialKeep3rV1OracleJob::work:not-workable');
  //   console.timeEnd('keeper work reverts with not-workable');
  // });
});
