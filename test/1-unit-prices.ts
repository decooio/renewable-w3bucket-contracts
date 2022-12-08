import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import _ from "lodash";
import {
  deployRenewableW3BucketFixture,
  deployRenewableW3BucketWithERC20,
  deployRenewableW3BucketWithUnitPrices,
  mapUnitPrice,
  nativeTokenAddress,
  UnitPriceStruct,
} from "./utils";

describe("Unit Prices", () => {
  it("Basic scenario works", async () => {
    const { w3Bucket, testERC20, Alice, Bob, Caro } = await deployRenewableW3BucketWithERC20();
    const testERC20Decimal = await testERC20.decimals();
    await expect(
      w3Bucket.connect(Alice).setUnitPrices([
        { currency: nativeTokenAddress, price: ethers.utils.parseEther("0.8") },
        { currency: testERC20.address, price: ethers.utils.parseUnits("8.8", testERC20Decimal) },
      ])
    )
      .to.emit(w3Bucket, "UnitPriceUpdated")
      .withArgs(nativeTokenAddress, ethers.utils.parseEther("0.8"))
      .to.emit(w3Bucket, "UnitPriceUpdated")
      .withArgs(testERC20.address, ethers.utils.parseUnits("8.8", testERC20Decimal));

    const capacityUnitCount = 3;
    const periodUnitCount = 5;

    const nativeTokenUnitPrice = 0.8;
    const nativeTokenPriceBN = ethers.utils
      .parseEther(_.toString(nativeTokenUnitPrice))
      .mul(ethers.utils.parseUnits(_.toString(capacityUnitCount), 0))
      .mul(ethers.utils.parseUnits(_.toString(periodUnitCount), 0));
    // console.log('nativeTokenPriceBN', nativeTokenPriceBN.toString());
    const nativeTokenPriceNegativeBN = ethers.utils
      .parseEther(_.toString(-nativeTokenUnitPrice))
      .mul(ethers.utils.parseUnits(_.toString(capacityUnitCount), 0))
      .mul(ethers.utils.parseUnits(_.toString(periodUnitCount), 0));

    const testERC20TokenUnitPrice = 8.8;
    const testERC20TokenPriceBN = ethers.utils
      .parseUnits(_.toString(testERC20TokenUnitPrice), testERC20Decimal)
      .mul(ethers.utils.parseUnits(_.toString(capacityUnitCount), 0))
      .mul(ethers.utils.parseUnits(_.toString(periodUnitCount), 0));
    const testERC20TokenNegativePriceBN = ethers.utils
      .parseUnits(_.toString(-testERC20TokenUnitPrice), testERC20Decimal)
      .mul(ethers.utils.parseUnits(_.toString(capacityUnitCount), 0))
      .mul(ethers.utils.parseUnits(_.toString(periodUnitCount), 0));

    // mint a Bucket with native token
    const prevBobBucketBalance = (await w3Bucket.balanceOf(Bob.address)).toNumber();
    const tokenURI1 = "ipfs://<METADATA_CID_1>";
    await expect(
      w3Bucket.connect(Bob).mint(Bob.address, tokenURI1, nativeTokenAddress, capacityUnitCount, periodUnitCount, {
        value: nativeTokenPriceBN,
      })
    )
      .to.emit(w3Bucket, "Transfer")
      .withArgs(anyValue, Bob.address, anyValue)
      .to.changeEtherBalances([Bob.address, w3Bucket.address], [nativeTokenPriceNegativeBN, nativeTokenPriceBN]);

    expect(await w3Bucket.balanceOf(Bob.address)).to.equal(prevBobBucketBalance + 1);

    const tokenId1 = (await w3Bucket.tokenOfOwnerByIndex(Bob.address, prevBobBucketBalance)).toNumber();
    expect(await w3Bucket.tokenURI(tokenId1)).to.equal(tokenURI1);

    // mint another Bucket with TestERC20
    const tokenURI2 = "ipfs://<METADATA_CID_2>";
    const balance = await testERC20.balanceOf(Bob.address);
    expect(balance.gt(testERC20TokenPriceBN)).to.be.true;
    await testERC20.connect(Bob).approve(w3Bucket.address, testERC20TokenPriceBN);
    await expect(
      w3Bucket.connect(Bob).mint(Bob.address, tokenURI2, testERC20.address, capacityUnitCount, periodUnitCount)
    )
      .to.emit(w3Bucket, "Transfer")
      .withArgs(anyValue, Bob.address, anyValue)
      .to.emit(w3Bucket, "BucketMinted")
      .withArgs(Bob.address, 2, anyValue, 10240, testERC20.address, testERC20TokenPriceBN)
      .to.emit(w3Bucket, "PermanentURI")
      .withArgs(tokenURI2, anyValue)
      .to.changeTokenBalances(
        testERC20,
        [Bob.address, w3Bucket.address],
        [testERC20TokenNegativePriceBN, testERC20TokenPriceBN]
      );
    expect(await w3Bucket.balanceOf(Bob.address)).to.equal(prevBobBucketBalance + 2);
    const tokenId2 = (await w3Bucket.tokenOfOwnerByIndex(Bob.address, prevBobBucketBalance + 1)).toNumber();
    expect(await w3Bucket.tokenURI(tokenId2)).to.equal(tokenURI2);

    // withdraw native token
    await expect(w3Bucket.connect(Alice).withdraw(Caro.address, nativeTokenAddress))
      .to.emit(w3Bucket, "Withdraw")
      .withArgs(Caro.address, nativeTokenAddress, nativeTokenPriceBN)
      .to.changeEtherBalances([w3Bucket.address, Caro.address], [nativeTokenPriceNegativeBN, nativeTokenPriceBN]);

    // withdraw TestERC20
    await expect(w3Bucket.connect(Alice).withdraw(Caro.address, testERC20.address))
      .to.emit(w3Bucket, "Withdraw")
      .withArgs(Caro.address, testERC20.address, testERC20TokenPriceBN)
      .to.changeTokenBalances(
        testERC20,
        [w3Bucket.address, Caro.address],
        [testERC20TokenNegativePriceBN, testERC20TokenPriceBN]
      );
  });

  it("Change prices work", async () => {
    const { w3Bucket, testERC20, Alice } = await loadFixture(deployRenewableW3BucketFixture);
    const testERC20Decimal = await testERC20.decimals();
    // set two price
    const prices: UnitPriceStruct[] = [
      { currency: nativeTokenAddress, price: ethers.utils.parseEther("0.5") },
      { currency: testERC20.address, price: ethers.utils.parseUnits("11.1", testERC20Decimal) },
    ];
    await expect(w3Bucket.connect(Alice).setUnitPrices(prices))
      .to.emit(w3Bucket, "UnitPriceUpdated")
      .withArgs(prices[0].currency, prices[0].price)
      .to.emit(w3Bucket, "UnitPriceUpdated")
      .withArgs(prices[1].currency, prices[1].price);
    expect(w3Bucket.getUnitPrices().then((items) => items.map(mapUnitPrice))).to.eventually.deep.equal(prices);

    // set one price
    const prices1: UnitPriceStruct[] = [{ currency: nativeTokenAddress, price: ethers.utils.parseEther("0.3") }];
    await expect(w3Bucket.connect(Alice).setUnitPrices(prices1))
      .to.emit(w3Bucket, "UnitPriceUpdated")
      .withArgs(prices1[0].currency, prices1[0].price);
    expect(w3Bucket.getUnitPrices().then((items) => items.map(mapUnitPrice))).to.eventually.deep.equal(prices1);
  });

  it("Other price should error", async () => {
    const {
      Alice,
      Bob,
      w3Bucket,
      testERC20,
      prices: [eth, erc20],
    } = await deployRenewableW3BucketWithUnitPrices();

    // eth
    await expect(
      w3Bucket.connect(Alice).mint(Alice.address, "ipfs://eth", eth.currency, 2, 2, { value: eth.price })
    ).to.rejectedWith("Must send required price", "should be error on price less than");
    await expect(
      w3Bucket.connect(Alice).mint(Alice.address, "ipfs://eth", eth.currency, 2, 2, { value: eth.price.mul(5) })
    ).to.rejectedWith("Must send required price", "should be error on price more than");

    // erc20
    await testERC20.connect(Bob).approve(w3Bucket.address, erc20.price);
    await expect(
      w3Bucket.connect(Bob).mint(Bob.address, "ipfs://erc20", erc20.currency, 2, 2)
    ).to.rejectedWith("error", "should be error on price less than");
  });
});
