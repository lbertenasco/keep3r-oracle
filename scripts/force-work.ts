import _ from 'lodash';
import { Contract, utils } from 'ethers';
import { run, ethers } from 'hardhat';
import contracts from '../utils/contracts';
const { prompt, Confirm } = require('enquirer');

async function main() {
  await run('compile');
  const { address } = await prompt({
    type: 'input',
    name: 'address',
    message: 'What is your keep3r v2 oracle job address?',
    initial: contracts.mainnet.keep3rV2OracleJob,
  });
  if (!utils.isAddress(address)) throw new Error('Not a valid address');
  const keep3rV2OracleJob = await ethers.getContractAt(
    'contracts/Keep3rV2OracleJob.sol:IKeep3rV2OracleJob',
    address
  );
  await promptAndSubmit(keep3rV2OracleJob);
}

function promptAndSubmit(keep3rV2OracleJob: Contract) {
  return new Promise<void>(async (resolve, reject) => {
    const [owner] = await ethers.getSigners();
    try {
      const { pair } = await prompt({
        type: 'input',
        name: 'pair',
        message: 'Input pair to force work on',
      });
      if (!utils.isAddress(pair)) throw new Error('Not a valid pair');

      const confirmationPrompt = new Confirm({
        message: `Do you wish to execute force work for pair ${pair}?`,
      });
      confirmationPrompt.run().then(async (answer: boolean) => {
        if (answer) {
          console.log('Deployer address:', owner.address);
          console.time(`Force worked pair ${pair}`);
          const tx = await keep3rV2OracleJob.forceWork(pair);
          console.timeEnd(`Force worked pair ${pair}`);
          console.log('Tx hash', tx.hash);
          resolve();
        } else {
          console.error('Aborted!');
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
