import { ContractFactory } from '@ethersproject/contracts';
import { providers, utils } from 'ethers';
import { run, ethers } from 'hardhat';
import contracts from '../utils/contracts';
const { Confirm } = require('enquirer');

const deploymentInformationPrompt = new Confirm({
  message: 'do you want to deploy Keep3rV2OracleFactory',
});

async function main() {
  await run('compile');
  const keep3rV2OracleFactoryContract = await ethers.getContractFactory(
    'contracts/Keep3rV2OracleFactory.sol:Keep3rV2OracleFactory'
  );
  await promptAndSubmit(keep3rV2OracleFactoryContract);
}

function promptAndSubmit(keep3rV2OracleFactoryContract: ContractFactory) {
  return new Promise<void>(async (resolve, reject) => {
    const [owner] = await ethers.getSigners();
    console.log('Deployer address:', owner.address);
    try {
      deploymentInformationPrompt.run().then(async (answer: any) => {
        if (answer) {
          console.time('Keep3rV2OracleFactory deployed');
          const keep3rV2OracleFactory = await keep3rV2OracleFactoryContract.deploy();
          console.timeEnd('Keep3rV2OracleFactory deployed');
          console.log(
            'Keep3rV2OracleFactory deployed with address:',
            keep3rV2OracleFactory.address
          );
          console.log(
            'IMPORTANT: Please remember to add this address into /utils/contract.ts file under keep3rV2OracleFactory'
          );
          resolve();
        } else {
          console.error('Aborted');
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
