import 'dotenv/config';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import { removeConsoleLog } from 'hardhat-preprocessor';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

module.exports = {
  defaultNetwork: 'hardhat',
  networks: process.env.TEST
    ? {}
    : {
        hardhat: {
          forking: {
            enabled: process.env.FORK ? true : false,
            url: process.env.MAINNET_HTTPS_URL,
          },
        },
        localMainnet: {
          url: process.env.LOCAL_MAINNET_HTTPS_URL,
          accounts: [process.env.LOCAL_MAINNET_PRIVATE_KEY],
        },
        mainnet: {
          url: process.env.MAINNET_HTTPS_URL,
          accounts: [process.env.MAINNET_PRIVATE_KEY],
          gasPrice: 141000000000, // 141 gwei
        },
      },
  solidity: {
    compilers: [
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
    overrides: {
      'contracts/Keep3rV2Oracle.sol': {
        version: '0.8.2',
        settings: {
          optimizer: {
            enabled: true,
            runs: 99999,
          },
        },
      },
      'contracts/Keep3rV2OracleFactory.sol': {
        version: '0.8.2',
        settings: {
          optimizer: {
            enabled: true,
            runs: 99999,
          },
        },
      },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: process.env.COINMARKETCAP_DEFAULT_CURRENCY,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  preprocess: {
    eachLine: removeConsoleLog((hre) => hre.network.name !== 'hardhat'),
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
