require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-deploy");
require("solidity-coverage");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: {
        count: 20,
        accountsBalance: "100000000000000000000000" // 100k ETH per account
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    coverage: {
      url: "http://127.0.0.1:8555"
    }
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    customer: {
      default: 1,
    },
    provider: {
      default: 2,
    },
  },
  paths: {
    deploy: "deploy",
    deployments: "deployments"
  }
};