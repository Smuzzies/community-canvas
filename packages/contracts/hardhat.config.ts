import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-ethers"
import "@nomicfoundation/hardhat-chai-matchers"
import "@typechain/hardhat"
import "@vechain/sdk-hardhat-plugin"

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    vechain_solo: {
      url: "http://localhost:8669",
      accounts: {
        mnemonic: "denial kitchen pet squirrel other broom bar gas better priority spoil cross",
        count: 10,
      },
    },
    vechain_testnet: {
      url: "https://testnet.vechain.org",
      accounts: {
        mnemonic: process.env.MNEMONIC ?? "",
        path: "m/44'/818'/0'/0",
        count: 3,
      },
    },
    vechain_mainnet: {
      url: "https://mainnet.vechain.org",
      accounts: {
        mnemonic: process.env.MNEMONIC ?? "",
        path: "m/44'/818'/0'/0",
        count: 3,
      },
    },
  },
}

export default config
