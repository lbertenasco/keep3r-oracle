import { ContractFactory } from '@ethersproject/contracts';
import { run, ethers } from 'hardhat';
const { Confirm } = require('enquirer');

const prompt = new Confirm({
  message: 'Do you wish to deploy fixed partial keep3r v1 oracle job?',
});

async function main() {
  await run('compile');
  const fixedPartialKeep3rV1OracleJobContract = await ethers.getContractFactory(
    'contracts/FixedPartialKeep3rV1OracleJob.sol:FixedPartialKeep3rV1OracleJob'
  );
  await promptAndSubmit(fixedPartialKeep3rV1OracleJobContract);
}

function promptAndSubmit(
  fixedPartialKeep3rV1OracleJobContract: ContractFactory
) {
  return new Promise<void>(async (resolve, reject) => {
    const [owner] = await ethers.getSigners();
    console.log('Deployer address:', owner.address);
    try {
      prompt.run().then(async (answer: boolean) => {
        if (answer) {
          console.time('FixedPartialKeep3rV1OracleJob deployed');
          const fixedPartialKeep3rV1OracleJob = await fixedPartialKeep3rV1OracleJobContract.deploy();
          console.timeEnd('FixedPartialKeep3rV1OracleJob deployed');
          console.log(
            'Fixed partial keep3r v1 oracle job deployed with address:',
            fixedPartialKeep3rV1OracleJob.address
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
