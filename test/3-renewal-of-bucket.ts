import { BigNumber } from "ethers";
import { expect } from "chai";
import { deployRenewableW3BucketWithMinted, mapRenewal, BucketRenewalStruct } from "./utils";

describe("Renewal of bucket", () => {
  it("renew is work", async () => {
    const {
      w3Bucket,
      Alice,
      testERC20,
      tokenIds: [tokenId],
      prices: [eth, erc20],
    } = await deployRenewableW3BucketWithMinted();

    const price = eth.price.mul(2).mul(2);
    // emit BucketRenewed(tokenId, currency, unitPrice, capacityUnits, periodUnits, _msgSender())
    // eth
    await expect(w3Bucket.connect(Alice).renewBucket(tokenId, eth.currency, 2, 2, { value: price }))
      .to.emit(w3Bucket, "BucketRenewed")
      .withArgs(tokenId, eth.currency, eth.price, 2, 2, Alice.address)
      .to.changeEtherBalances([w3Bucket.address, Alice.address], [price, price.mul(-1)]);
    // erc20
    const erc20Price = erc20.price.mul(2).mul(2);
    await expect(testERC20.connect(Alice).approve(w3Bucket.address, erc20Price)).to.eventually.be.fulfilled
    await expect(w3Bucket.connect(Alice).renewBucket(tokenId, erc20.currency, 2, 2))
      .to.emit(w3Bucket, "BucketRenewed")
      .withArgs(tokenId, erc20.currency, erc20.price, 2, 2, Alice.address)
      .to.changeTokenBalances(testERC20, [w3Bucket.address, Alice.address], [erc20Price, erc20Price.mul(-1)]);
    // check count
    await expect(w3Bucket.bucketRenewalCount(tokenId)).to.eventually.equal(3, "count is 3");
    // check renewals
    const r0: Partial<BucketRenewalStruct> = {
      tokenId,
      currency: eth.currency,
      unitPrice: eth.price,
      capacityUnits: BigNumber.from(1),
      periodUnits: BigNumber.from(1),
      renewedBy: Alice.address,
    };
    await expect(w3Bucket.renewalOfBucketByIndex(tokenId, 0).then(mapRenewal)).to.eventually.deep.include(r0);
    const r1: Partial<BucketRenewalStruct> = {
      tokenId,
      currency: eth.currency,
      unitPrice: eth.price,
      capacityUnits: BigNumber.from(2),
      periodUnits: BigNumber.from(2),
      renewedBy: Alice.address,
    };
    await expect(w3Bucket.renewalOfBucketByIndex(tokenId, 1).then(mapRenewal)).to.eventually.deep.include(r1);
    const r2: Partial<BucketRenewalStruct> = {
      tokenId,
      currency: erc20.currency,
      unitPrice: erc20.price,
      capacityUnits: BigNumber.from(2),
      periodUnits: BigNumber.from(2),
      renewedBy: Alice.address,
    };
    await expect(w3Bucket.renewalOfBucketByIndex(tokenId, 2).then(mapRenewal)).to.eventually.deep.include(r2);
  });
});
