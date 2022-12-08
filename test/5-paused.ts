import { expect } from "chai";
import { deployRenewableW3BucketWithMinted } from "./utils";

describe("Paused work", () => {
  it("after paused disable mint,renewBucket", async () => {
    const {
      Alice,
      w3Bucket,
      prices,
      tokenIds: [tokenId],
    } = await deployRenewableW3BucketWithMinted();
    await expect(w3Bucket.connect(Alice).pause()).to.emit(w3Bucket, "Paused").withArgs(Alice.address);
    await expect(w3Bucket.paused()).to.eventually.be.true;
    await expect(
      w3Bucket.connect(Alice).mint(Alice.address, "ipfs://alice", prices[0].currency, 1, 1, {
        value: prices[0].price,
      })
    ).to.rejectedWith("Pausable: paused", "should be mint error");
    await expect(
      w3Bucket.connect(Alice).renewBucket(tokenId, prices[0].currency, 2, 2, { value: prices[0].price.mul(2).mul(2) })
    ).to.rejectedWith("Pausable: paused", "should be renewBucket error");
  });
});
