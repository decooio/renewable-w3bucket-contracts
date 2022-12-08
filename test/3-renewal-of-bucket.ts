import { BigNumber } from "ethers";
import { expect } from "chai";
import { deployRenewableW3BucketWithMinted, mapRenewal, BucketRenewalStruct } from "./utils";

describe("Renewal of bucket", () => {
  
  it("renew is work", async () => {
    const {
      w3Bucket,
      Alice,
      tokenIds: [tokenId],
      prices,
    } = await deployRenewableW3BucketWithMinted();
    
    const price = prices[0].price.mul(2).mul(2);
    // emit BucketRenewed(tokenId, currency, unitPrice, capacityUnits, periodUnits, _msgSender())
    await expect(w3Bucket.connect(Alice).renewBucket(tokenId, prices[0].currency, 2, 2, { value: price }))
      .to.emit(w3Bucket, "BucketRenewed")
      .withArgs(tokenId, prices[0].currency, prices[0].price, 2, 2, Alice.address)
      .to.changeEtherBalances([w3Bucket.address, Alice.address], [price, price.mul(-1)]);
    expect(await w3Bucket.bucketRenewalCount(tokenId)).to.equal(2, "count is 2");
    const r0: Partial<BucketRenewalStruct> = {
      tokenId,
      currency: prices[0].currency,
      unitPrice: prices[0].price,
      capacityUnits: BigNumber.from(1),
      periodUnits: BigNumber.from(1),
      renewedBy: Alice.address,
    };
    expect(await w3Bucket.renewalOfBucketByIndex(tokenId, 0).then(mapRenewal)).to.deep.include(r0);
    const r1: Partial<BucketRenewalStruct> = {
      tokenId,
      currency: prices[0].currency,
      unitPrice: prices[0].price,
      capacityUnits: BigNumber.from(2),
      periodUnits: BigNumber.from(2),
      renewedBy: Alice.address,
    };
    expect(await w3Bucket.renewalOfBucketByIndex(tokenId, 1).then(mapRenewal)).to.deep.include(r1);
  });
});
