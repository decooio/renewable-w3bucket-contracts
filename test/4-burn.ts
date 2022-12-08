import { expect } from "chai";
import { ADDRESS0, deployRenewableW3BucketWithMinted } from "./utils";

describe("Burn work", () => {
  it("Burn token", async () => {
    const {
      Alice,
      w3Bucket,
      tokenIds: [tokenId],
    } = await deployRenewableW3BucketWithMinted();

    await expect(w3Bucket.connect(Alice).burn(tokenId))
      .to.emit(w3Bucket, "Transfer")
      .withArgs(Alice.address, ADDRESS0, tokenId);

    await expect(w3Bucket.tokenURI(tokenId)).to.rejectedWith("invalid token ID", "should be invalid tokenId");
  });
});
