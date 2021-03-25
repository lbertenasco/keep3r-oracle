import { ContractFactory } from '@ethersproject/contracts';
import { providers } from 'ethers';
import { run, ethers } from 'hardhat';
import contracts from '../../utils/contracts';
const { Form, Confirm } = require('enquirer');

const deploymentInformationPrompt = new Form({
  name: 'deploy',
  message:
    'Please provide the following information for partial keep3rv1 oracle job deployment:',
  choices: [
    {
      name: 'keep3rV1',
      message: 'Keep3r V1 address',
      initial: '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44',
    },
    {
      name: 'bond',
      message: 'Bond',
      initial: '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44',
    },
    {
      name: 'minBond',
      message: 'Minimum KP3Rs bonded by worker',
      initial: '0',
    },
    { name: 'earned', message: 'Earned KP3Rs by worker', initial: '0' },
    { name: 'age', message: 'Age of worker', initial: '0' },
    { name: 'onlyEOA', message: 'Only EOA (true or false)', initial: 'false' },
    {
      name: 'oracleBondedKeeper',
      message: 'Oracle bonded keeper address',
      initial: contracts.mainnet.owned.oracleBondedKeeper,
    },
  ],
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
      deploymentInformationPrompt.run().then(async (answer: any) => {
        if (answer) {
          const confirmPrompt = new Confirm({
            message: `Do you wish to continue the deployment of partial keep3r v1 oracle job with the next parameters:
            Keep3rV1 address: ${answer.keep3rV1},
            Bond: ${answer.bond},
            Minimum KP3Rs bonded by worker: ${answer.minBond},
            Earned KP3Rs by worker: ${answer.earned},
            Age of worker: ${answer.age},
            Only EOA (true or false): ${Boolean(answer.onlyEOA === 'true')}, 
            Oracle bonded keeper address: ${answer.oracleBondedKeeper}`,
          });
          confirmPrompt.run().then(async (confirmAnswer: boolean) => {
            if (confirmAnswer) {
              console.time('PartialKeep3rV1OracleJob deployed');
              const partialKeep3rV1OracleJob = await partialKeep3rV1OracleJobContract.deploy(
                answer.keep3rV1,
                answer.bond,
                answer.minBond,
                answer.earned,
                answer.age,
                answer.onlyEOA === 'true',
                answer.oracleBondedKeeper
              );
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
              console.error('Aborted');
              resolve();
            }
          });
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
