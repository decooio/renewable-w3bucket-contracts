import { ethers, upgrades } from "hardhat";

async function main() {
  const RenewableW3Bucket = await ethers.getContractFactory("RenewableW3Bucket");
  const contract = await upgrades.deployProxy(RenewableW3Bucket, ["RenewableW3Bucket", "RW3BKT"]);
  console.log(`Deployed RenewableW3Bucket to ${contract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
