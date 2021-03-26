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
      const { pair } = await prompt({
        type: 'input',
        name: 'pair',
        message: 'Input pair to remove',
      });
      if (!utils.isAddress(pair)) throw new Error('Not a valid pair');

      const confirmationPrompt = new Confirm({
        message: `Do you wish to execute remove pair for pair ${pair}?`,
      });
      confirmationPrompt.run().then(async (answer: boolean) => {
        if (answer) {
          console.log('Deployer address:', owner.address);
          console.time(`Removed pair pair ${pair}`);
          const tx = await fixedPartialKeep3rV1OracleJobContract.removePair(
            pair
          );
          console.timeEnd(`Removed pair pair ${pair}`);
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
