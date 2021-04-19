import { ContractFactory } from '@ethersproject/contracts';
import { providers, utils } from 'ethers';
import { run, ethers } from 'hardhat';
import contracts from '../utils/contracts';
const { Form, Confirm } = require('enquirer');

const deploymentInformationPrompt = new Form({
  name: 'deploy',
  message:
    'Please provide the following information for keep3rv2 oracle job deployment:',
  choices: [
    {
      name: 'keep3rV1',
      message: 'Keep3r V1 address',
      initial: '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44',
    },
    {
      name: 'keep3rV2OracleFactory',
      message: 'Keep3r V2 Oracle Factory address',
      initial: contracts.mainnet.keeperV2OracleFactory,
    },
    {
      name: 'bond',
      message: 'Bond',
      initial: '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44',
    },
    {
      name: 'minBond',
      message: 'Minimum KP3Rs bonded by worker (in ethers)',
      initial: '0',
    },
    {
      name: 'earned',
      message: 'Earned KP3Rs by worker (in ethers)',
      initial: '0',
    },
    { name: 'age', message: 'Age of worker', initial: '0' },
    { name: 'onlyEOA', message: 'Only EOA (true or false)', initial: 'false' },
  ],
});

async function main() {
  await run('compile');
  const keep3rV2OracleJobContract = await ethers.getContractFactory(
    'contracts/Keep3rV2OracleJob.sol:Keep3rV2OracleJob'
  );
  await promptAndSubmit(keep3rV2OracleJobContract);
}

function promptAndSubmit(keep3rV2OracleJobContract: ContractFactory) {
  return new Promise<void>(async (resolve, reject) => {
    const [owner] = await ethers.getSigners();
    console.log('Deployer address:', owner.address);
    try {
      deploymentInformationPrompt.run().then(async (answer: any) => {
        if (answer) {
          const confirmPrompt = new Confirm({
            message: `Do you wish to continue the deployment of keep3r v2 oracle job with the next parameters:
            Keep3rV1 address: ${answer.keep3rV1},
            Bond: ${answer.bond},
            Minimum KP3Rs bonded by worker: ${answer.minBond},
            Earned KP3Rs by worker: ${answer.earned},
            Age of worker: ${answer.age},
            Only EOA (true or false): ${Boolean(answer.onlyEOA === 'true')}, 
            Keep3r V2 Oracle Factory address: ${answer.keep3rV2OracleFactory}`,
          });
          confirmPrompt.run().then(async (confirmAnswer: boolean) => {
            if (confirmAnswer) {
              console.time('Keep3rV2OracleJob deployed');
              const keep3rV2OracleJob = await keep3rV2OracleJobContract.deploy(
                answer.keep3rV1,
                answer.bond,
                utils.parseEther(answer.minBond),
                utils.parseEther(answer.earned),
                answer.age,
                answer.onlyEOA === 'true',
                answer.keep3rV2OracleFactory
              );
              console.timeEnd('Keep3rV2OracleJob deployed');
              console.log(
                'Keep3rV2Oracle Job deployed with address:',
                keep3rV2OracleJob.address
              );
              console.log(
                'IMPORTANT: Please remember to add this address into /utils/contract.ts file under keep3rV2OracleJob'
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
