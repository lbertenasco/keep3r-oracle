import { ContractFactory } from '@ethersproject/contracts';
import { providers } from 'ethers';
import { run, ethers } from 'hardhat';
import contracts from '../../utils/contracts';
const { Confirm } = require('enquirer');

const prompt = new Confirm({
  message: 'Do you wish to deploy oracle bonded keeper ?',
});

async function main() {
  await run('compile');
  const partialKeep3rV1OracleJobContract = await ethers.getContractFactory(
    'contracts/PartialKeep3rV1OracleJob.sol:PartialKeep3rV1OracleJob'
  );
  await promptAndSubmit(partialKeep3rV1OracleJobContract);
}

function promptAndSubmit(partialKeep3rV1OracleJobContract: ContractFactory) {
  return new Promise<void>(async (resolve, reject) => {
    const [owner] = await ethers.getSigners();
    console.log('Deployer address:', owner.address);
    try {
      prompt.run().then(async (answer: boolean) => {
        if (answer) {
          console.time('PartialKeep3rV1OracleJob deployed');
          const partialKeep3rV1OracleJob = await partialKeep3rV1OracleJobContract
            .deploy
            // TODO: Add args and defaults via enquirer
            ();
          console.timeEnd('PartialKeep3rV1OracleJob deployed');
          console.log(
            'Partial keep3r v1 oracle job deployed with address:',
            partialKeep3rV1OracleJob.address
          );
          console.log(
            'IMPORTANT: Please remember to add this address into /utils/contract.ts file under owned.partialKeep3rV1OracleJob'
          );
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
