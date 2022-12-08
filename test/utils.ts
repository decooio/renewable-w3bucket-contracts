import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber, utils } from "ethers";
import { ethers, upgrades } from "hardhat";
import { RenewableW3BucketBase } from "../typechain";
import { RenewableW3Bucket__factory } from "../typechain/factories/contracts";
import { TestERC20__factory } from "../typechain/factories/contracts/test/TestERC20__factory";
const { provider } = ethers;

export const nativeTokenAddress = "0x0000000000000000000000000000000000000000";
export const ADDRESS0 = "0x0000000000000000000000000000000000000000";

export type UnitPriceStruct = {
  currency: string;
  price: BigNumber;
};

export type BucketRenewalStruct = {
  renewalId: BigNumber;
  tokenId: BigNumber;
  currency: string;
  unitPrice: BigNumber;
  capacityUnits: BigNumber;
  periodUnits: BigNumber;
  renewedBy: string;
  renewedAt: BigNumber;
};

export async function deployRenewableW3BucketFixture() {
  const RenewableW3Bucket = await ethers.getContractFactory("RenewableW3Bucket");
  // console.info("deploy W3Bucket proxy");
  const w3BucketProxy = await upgrades.deployProxy(RenewableW3Bucket, ["RenewableW3Bucket", "RW3BKT"]);
  const w3Bucket = RenewableW3Bucket__factory.connect(w3BucketProxy.address, provider);

  const TestERC20 = await ethers.getContractFactory("TestERC20");
  const erc20 = await TestERC20.deploy();
  // console.info("deploy ERC20 proxy");
  // const testERC20Proxy = await upgrades.deployProxy(TestERC20, ['TestERC20', 'TRC']);
  const testERC20 = TestERC20__factory.connect(erc20.address, provider);

  const [Alice, Bob, Caro, Dave] = await ethers.getSigners();

  return { w3Bucket, testERC20, Alice, Bob, Caro, Dave };
}

export async function deployRenewableW3BucketWithERC20() {
  const { w3Bucket, testERC20, Alice, Bob, Caro, Dave } = await loadFixture(deployRenewableW3BucketFixture);
  const value = utils.parseUnits('1000', await testERC20.decimals());
  await testERC20.connect(Alice).mint(Alice.address, value);
  await testERC20.connect(Alice).mint(Bob.address, value);
  await testERC20.connect(Alice).mint(Caro.address, value);
  await testERC20.connect(Alice).mint(Dave.address, value);
  return { w3Bucket, testERC20, Alice, Bob, Caro, Dave };
}

export async function deployRenewableW3BucketWithUnitPrices() {
  const { w3Bucket, testERC20, Alice, Bob, Caro, Dave } = await deployRenewableW3BucketWithERC20()
  const testERC20Decimal = await testERC20.decimals();
  const prices: UnitPriceStruct[] = [
    { currency: nativeTokenAddress, price: ethers.utils.parseEther("0.1") },
    { currency: testERC20.address, price: ethers.utils.parseUnits("8.8", testERC20Decimal) },
  ];
  await w3Bucket.connect(Alice).setUnitPrices(prices);
  return { w3Bucket, prices, testERC20, Alice, Bob, Caro, Dave };
}

export async function deployRenewableW3BucketWithMinted() {
  const data = await deployRenewableW3BucketWithUnitPrices();
  const aliceW3 = data.w3Bucket.connect(data.Alice);
  const tx0 = await aliceW3.mint(data.Alice.address, "ipfs://alice", data.prices[0].currency, 1, 1, {
    value: data.prices[0].price,
  });
  const tx1 = await aliceW3.mint(data.Bob.address, "ipfs://bob", data.prices[0].currency, 1, 1, {
    value: data.prices[0].price,
  });
  const tx2 = await aliceW3.mint(data.Caro.address, "ipfs://caro", data.prices[0].currency, 1, 1, {
    value: data.prices[0].price,
  });
  const tx3 = await aliceW3.mint(data.Dave.address, "ipfs://dave", data.prices[0].currency, 1, 1, {
    value: data.prices[0].price,
  });
  const tokenIds = await Promise.all([
    data.w3Bucket.tokenOfOwnerByIndex(data.Alice.address, 0),
    data.w3Bucket.tokenOfOwnerByIndex(data.Bob.address, 0),
    data.w3Bucket.tokenOfOwnerByIndex(data.Caro.address, 0),
    data.w3Bucket.tokenOfOwnerByIndex(data.Dave.address, 0),
  ]);
  return { ...data, tokenIds, txs: [tx0, tx1, tx2, tx3] };
}

export function mapUnitPrice(item: RenewableW3BucketBase.UnitPriceStructOutput): UnitPriceStruct {
  return { currency: item.currency, price: item.price };
}

export function mapRenewal(item: RenewableW3BucketBase.BucketRenewalStructOutput): BucketRenewalStruct {
  return {
    renewalId: item.renewalId,
    tokenId: item.tokenId,
    currency: item.currency,
    unitPrice: item.unitPrice,
    capacityUnits: item.capacityUnits,
    periodUnits: item.periodUnits,
    renewedBy: item.renewedBy,
    renewedAt: item.renewedAt,
  };
}
