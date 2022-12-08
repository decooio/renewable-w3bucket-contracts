import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat";
import { TestRenewableW3BucketV2__factory } from "../typechain";
import { BucketRenewalStruct, deployRenewableW3BucketFixture, deployRenewableW3BucketWithMinted, mapRenewal, mapUnitPrice } from "./utils";

describe("Upgradeable", () => {
  async function upgradeBucket(old: string) {
    const W3BucketV2Factory = await ethers.getContractFactory("TestRenewableW3BucketV2");
    const w3bV2Proxy = await upgrades.upgradeProxy(old, W3BucketV2Factory);
    const w3bV2 = TestRenewableW3BucketV2__factory.connect(w3bV2Proxy.address, ethers.provider);
    expect(await w3bV2.funcV2()).to.equal(true);
    return w3bV2;
  }

  it("upgrade bucket", async () => {
    const { w3Bucket } = await loadFixture(deployRenewableW3BucketFixture);
    await upgradeBucket(w3Bucket.address);
  });

  it("upgrade data", async () => {
    const { w3Bucket, prices, Alice } = await deployRenewableW3BucketWithMinted();
    const w3bV2 = await upgradeBucket(w3Bucket.address);
    // check prices
    expect((await w3bV2.getUnitPrices()).map(mapUnitPrice)).to.deep.equal(prices);
    // check token
    expect(await w3bV2.balanceOf(Alice.address)).to.equal(1);
    // check renewal
    const tokenId = await w3bV2.tokenOfOwnerByIndex(Alice.address, 0);
    expect(await w3bV2.bucketRenewalCount(tokenId)).to.equal(1);
    const r0: Partial<BucketRenewalStruct> = {
      tokenId,
      currency: prices[0].currency,
      unitPrice: prices[0].price,
      capacityUnits: BigNumber.from(1),
      periodUnits: BigNumber.from(1),
      renewedBy: Alice.address,
    };
    expect(await w3bV2.renewalOfBucketByIndex(tokenId, 0).then(mapRenewal)).to.deep.include(r0)
  });
});
