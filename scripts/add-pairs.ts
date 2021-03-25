import _ from 'lodash';
import { Contract, utils } from 'ethers';
import { run, ethers } from 'hardhat';
import contracts from '../utils/contracts';
const { prompt, List, Confirm } = require('enquirer');

const pairsList = new List({
  name: 'keywords',
  message: 'Input all pairs to add comma-separated',
});

async function main() {
  await run('compile');
  const { address } = await prompt({
    type: 'input',
    name: 'address',
    message: 'What is your keep3r v1 oracle job address?',
  });
  if (!utils.isAddress(address)) throw new Error('Not a valid address');
  const keep3rV1OracleJob = await ethers.getContractAt(
    'contracts/PartialKeep3rV1OracleJob.sol:IPartialKeep3rV1OracleJob',
    address
  );
  await promptAndSubmit(keep3rV1OracleJob);
}

function promptAndSubmit(fixedPartialKeep3rV1OracleJobContract: Contract) {
  return new Promise<void>(async (resolve, reject) => {
    const [owner] = await ethers.getSigners();
    try {
      pairsList.run().then(async (pairs: string[]) => {
        _.forEach(pairs, (pair) => {
          if (!utils.isAddress(pair)) throw new Error('Not a valid address');
        });
        const confirmationPrompt = new Confirm({
          message: `Do you wish to add the pairs: ${pairs.join(', ')} ?`,
        });
        confirmationPrompt.run().then(async (answer: boolean) => {
          if (answer) {
            console.log('Deployer address:', owner.address);
            console.time('Pairs added');
            await fixedPartialKeep3rV1OracleJobContract.addPairs(pairs);
            console.timeEnd('Pairs added');
            resolve();
          } else {
            console.error('Aborted!');
            resolve();
          }
        });
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
