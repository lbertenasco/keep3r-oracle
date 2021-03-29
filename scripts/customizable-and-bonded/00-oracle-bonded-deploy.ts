import { ContractFactory } from '@ethersproject/contracts';
import { providers } from 'ethers';
import { run, ethers } from 'hardhat';
import contracts from '../../utils/contracts';
const { Form, Confirm } = require('enquirer');

const deploymentInformationPrompt = new Form({
  name: 'deploy',
  message:
    'Please provide the following information for oracle bonded deployment:',
  choices: [
    {
      name: 'keep3rV1',
      message: 'Keep3r V1 address',
      initial: contracts.mainnet.keep3r,
    },
    {
      name: 'keep3rV2OracleFactory',
      message: 'Keep3r V2 Oracle Factory address',
      initial: contracts.mainnet.yfi.keeperV2OracleFactory,
    },
  ],
});

async function main() {
  await run('compile');
  const oracleBondedKeeperContract = await ethers.getContractFactory(
    'contracts/OracleBondedKeeper.sol:OracleBondedKeeper'
  );
  await promptAndSubmit(oracleBondedKeeperContract);
}

function promptAndSubmit(oracleBondedKeeperContract: ContractFactory) {
  return new Promise<void>(async (resolve, reject) => {
    const [owner] = await ethers.getSigners();
    console.log('Deployer address:', owner.address);
    try {
      deploymentInformationPrompt.run().then(async (answer: any) => {
        const prompt = new Confirm({
          message: `Do you wish to deploy oracle bonded keeper with the following parameters:
          Keep3rV1 address: ${answer.keep3rV1}
          Keep3rV2 Oracle Factory address: ${answer.keep3rV2OracleFactory}`,
        });
        prompt.run().then(async (confirmAnswer: boolean) => {
          if (confirmAnswer) {
            console.time('OracleBondedKeeper deployed');
            const oracleBondedKeeper = await oracleBondedKeeperContract.deploy(
              answer.keep3rV1,
              answer.keep3rV2OracleFactory
            );
            console.timeEnd('OracleBondedKeeper deployed');
            console.log(
              'Oracle bonded keeper deployed with address:',
              oracleBondedKeeper.address
            );
            console.log(
              'IMPORTANT: Please remember to add this address into /utils/contract.ts file under owned.oracleBondedKeeper'
            );
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
