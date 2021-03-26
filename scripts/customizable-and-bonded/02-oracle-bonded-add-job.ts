import { ContractFactory } from '@ethersproject/contracts';
import { providers, utils } from 'ethers';
import { run, ethers } from 'hardhat';
import contracts from '../../utils/contracts';
const { Form, Confirm } = require('enquirer');

const deploymentInformationPrompt = new Form({
  name: 'deploy',
  message:
    'Please provide the following information for adding a job to oracle bonded keeper:',
  choices: [
    {
      name: 'oracleBondedKeeper',
      message: 'Oracle Bonded Keeper Address',
      initial: contracts.mainnet.owned.oracleBondedKeeper,
    },
    {
      name: 'keep3rV1OracleJob',
      message: 'Keep3r V1 Oracle Job Address',
      initial: contracts.mainnet.owned.keep3rV1OracleJob,
    },
  ],
});

async function main() {
  await run('compile');
  await promptAndSubmit();
}

function promptAndSubmit() {
  return new Promise<void>(async (resolve, reject) => {
    const [owner] = await ethers.getSigners();
    console.log('Deployer address:', owner.address);
    try {
      deploymentInformationPrompt.run().then(async (answer: any) => {
        if (answer) {
          const confirmPrompt = new Confirm({
            message: `Do you wish to continue the deployment of customizable keep3r v1 oracle job with the next parameters:
            Oracle bonded keeper address: ${answer.oracleBondedKeeper}
            Keeper V1 Oracle Job address: ${answer.keep3rV1OracleJob}`,
          });
          if (
            !utils.isAddress(answer.oracleBondedKeeper) ||
            !utils.isAddress(answer.keep3rV1OracleJob)
          )
            throw new Error('Not a valid address');
          const oracleBondedKeeperContract = await ethers.getContractAt(
            'contracts/OracleBondedKeeper.sol:OracleBondedKeeper',
            answer.oracleBondedKeeper
          );
          confirmPrompt.run().then(async (confirmAnswer: boolean) => {
            if (confirmAnswer) {
              console.time('Job added');
              const tx = await oracleBondedKeeperContract.addJob(
                answer.keep3rV1OracleJob
              );
              console.timeEnd('Job added');
              console.log('TX hash', tx.hash);
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
