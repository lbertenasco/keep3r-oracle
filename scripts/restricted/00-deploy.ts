import { ContractFactory } from '@ethersproject/contracts';
import { run, ethers } from 'hardhat';
const { Confirm } = require('enquirer');

const prompt = new Confirm({
  message: 'Do you wish to deploy fixed partial keep3r v1 oracle job?',
});

async function main() {
  await run('compile');
  const restrictedKeep3rV1OracleJobContract = await ethers.getContractFactory(
    'contracts/RestrictedKeep3rV1OracleJob.sol:RestrictedKeep3rV1OracleJob'
  );
  await promptAndSubmit(restrictedKeep3rV1OracleJobContract);
}

function promptAndSubmit(restrictedKeep3rV1OracleJobContract: ContractFactory) {
  return new Promise<void>(async (resolve, reject) => {
    const [owner] = await ethers.getSigners();
    console.log('Deployer address:', owner.address);
    try {
      prompt.run().then(async (answer: boolean) => {
        if (answer) {
          console.time('RestrictedKeep3rV1OracleJob deployed');
          const restrictedKeep3rV1OracleJob = await restrictedKeep3rV1OracleJobContract.deploy();
          console.timeEnd('RestrictedKeep3rV1OracleJob deployed');
          console.log(
            'Restricted keep3r v1 oracle job deployed with address:',
            restrictedKeep3rV1OracleJob.address
          );
          console.log(
            'IMPORTANT: Please remember to add this address into /utils/contract.ts file under owned.keep3rV1OracleJob'
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
