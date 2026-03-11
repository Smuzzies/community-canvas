import { ethers } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log("Deploying CommunityCanvas with account:", deployer.address)

  const factory = await ethers.getContractFactory("CommunityCanvas")
  const contract = await factory.deploy()
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  console.log("CommunityCanvas deployed to:", address)
  console.log("")
  console.log("Add to apps/frontend/.env.local:")
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
