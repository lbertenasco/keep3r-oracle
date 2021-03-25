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
      prompt.run().then(async (answer: boolean) => {
        if (answer) {
          console.time('OracleBondedKeeper deployed');
          const oracleBondedKeeper = await oracleBondedKeeperContract.deploy(
            contracts.mainnet.keep3r,
            contracts.mainnet.yfi.oracleBondedKeeper
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
