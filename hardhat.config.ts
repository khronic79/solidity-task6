import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    bnbTestnet: {
      url: process.env.TEST_BNB_RPC_ADDRESS,
      chainId: 97, 
      accounts: [process.env.CONTRACT_OWNER_PRIVATE_KEY as string],
      timeout: 120000
    },
    polygonAmoy: {
      url: process.env.AMOY_POLYGON_RPC_ADDRESS,
      chainId: 80002,
      accounts: [process.env.CONTRACT_OWNER_PRIVATE_KEY as string],
      timeout: 120000
    },
    hardhat: {
      chainId: 31337,
    },
  },
  gasReporter: {
    enabled: true,
  },
  etherscan: {
    apiKey: {
      bnbTestnet: process.env.TEST_BNB_APIKEY as string,
      polygonAmoy: process.env.AMOY_POLYGON_APIKEY as string
    },
    customChains: [
      {
        network: "bnbTestnet",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com",
        },
      },
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com/",
        },
      }
    ]
  },
};

export default config;
