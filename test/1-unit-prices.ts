import _ from 'lodash';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { nativeTokenAddress, deployRenewableW3BucketFixture } from './utils';

describe('Unit Prices', () => {

  it('Basic scenario works', async () => {
    const { w3Bucket, testERC20, Alice, Bob, Caro } = await loadFixture(deployRenewableW3BucketFixture);

    const testERC20Decimal = await testERC20.decimals();
    await expect(w3Bucket.connect(Alice).setUnitPrices([
      { currency: nativeTokenAddress, price: ethers.utils.parseEther('0.8') },
      { currency: testERC20.address, price: ethers.utils.parseUnits('8.8', testERC20Decimal) },
    ]))
    .to.emit(w3Bucket, 'UnitPriceUpdated').withArgs(nativeTokenAddress, ethers.utils.parseEther('0.8'))
    .to.emit(w3Bucket, 'UnitPriceUpdated').withArgs(testERC20.address, ethers.utils.parseUnits('8.8', testERC20Decimal));

    const capacityUnitCount = 3;
    const periodUnitCount = 5;

    const nativeTokenUnitPrice = 0.8;
    const nativeTokenPriceBN =
      ethers.utils.parseEther(_.toString(nativeTokenUnitPrice))
      .mul(ethers.utils.parseUnits(_.toString(capacityUnitCount), 0))
      .mul(ethers.utils.parseUnits(_.toString(periodUnitCount), 0));
    // console.log('nativeTokenPriceBN', nativeTokenPriceBN.toString());
    const nativeTokenPriceNegativeBN = 
      ethers.utils.parseEther(_.toString(-nativeTokenUnitPrice))
      .mul(ethers.utils.parseUnits(_.toString(capacityUnitCount), 0))
      .mul(ethers.utils.parseUnits(_.toString(periodUnitCount), 0));

    const testERC20TokenUnitPrice = 8.8;
    const testERC20TokenPriceBN = 
      ethers.utils.parseUnits(_.toString(testERC20TokenUnitPrice), testERC20Decimal)
      .mul(ethers.utils.parseUnits(_.toString(capacityUnitCount), 0))
      .mul(ethers.utils.parseUnits(_.toString(periodUnitCount), 0));
    const testERC20TokenNegativePriceBN = 
      ethers.utils.parseUnits(_.toString(-testERC20TokenUnitPrice), testERC20Decimal)
      .mul(ethers.utils.parseUnits(_.toString(capacityUnitCount), 0))
      .mul(ethers.utils.parseUnits(_.toString(periodUnitCount), 0));

    // mint a Bucket with native token
    const prevBobBucketBalance = (await w3Bucket.balanceOf(Bob.address)).toNumber();
    const tokenURI1 = 'ipfs://<METADATA_CID_1>';
    await expect(w3Bucket.connect(Bob).mint(Bob.address, tokenURI1, nativeTokenAddress, capacityUnitCount, periodUnitCount, { value: nativeTokenPriceBN }))
      .to.emit(w3Bucket, 'Transfer').withArgs(anyValue, Bob.address, anyValue)
      .to.changeEtherBalances([Bob.address, w3Bucket.address], [nativeTokenPriceNegativeBN, nativeTokenPriceBN]);

    expect(await w3Bucket.balanceOf(Bob.address)).to.equal(prevBobBucketBalance + 1);

    const tokenId1 = (await w3Bucket.tokenOfOwnerByIndex(Bob.address, prevBobBucketBalance)).toNumber();
    expect(await w3Bucket.tokenURI(tokenId1)).to.equal(tokenURI1);

    // mint another Bucket with TestERC20
    const tokenURI2 = 'ipfs://<METADATA_CID_2>';
    await testERC20.connect(Alice).mint(Bob.address, testERC20TokenPriceBN);
    await testERC20.connect(Bob).approve(w3Bucket.address, testERC20TokenPriceBN);
    await expect(w3Bucket.connect(Bob).mint(Bob.address, tokenURI2, testERC20.address, capacityUnitCount, periodUnitCount))
      .to.emit(w3Bucket, 'Transfer').withArgs(anyValue, Bob.address, anyValue)
      .to.emit(w3Bucket, 'BucketMinted').withArgs(Bob.address, 2, anyValue, 10240, testERC20.address, testERC20TokenPriceBN)
      .to.emit(w3Bucket, 'PermanentURI').withArgs(tokenURI2, anyValue)
      .to.changeTokenBalances(testERC20, [Bob.address, w3Bucket.address], [testERC20TokenNegativePriceBN, testERC20TokenPriceBN]);
    expect(await w3Bucket.balanceOf(Bob.address)).to.equal(prevBobBucketBalance + 2);
    const tokenId2 = (await w3Bucket.tokenOfOwnerByIndex(Bob.address, prevBobBucketBalance + 1)).toNumber();
    expect(await w3Bucket.tokenURI(tokenId2)).to.equal(tokenURI2);

    // withdraw native token
    await expect(w3Bucket.connect(Alice).withdraw(Caro.address, nativeTokenAddress))
      .to.emit(w3Bucket, 'Withdraw').withArgs(Caro.address, nativeTokenAddress, nativeTokenPriceBN)
      .to.changeEtherBalances([w3Bucket.address, Caro.address], [nativeTokenPriceNegativeBN, nativeTokenPriceBN]);

    // withdraw TestERC20
    await expect(w3Bucket.connect(Alice).withdraw(Caro.address, testERC20.address))
      .to.emit(w3Bucket, 'Withdraw').withArgs(Caro.address, testERC20.address, testERC20TokenPriceBN)
      .to.changeTokenBalances(testERC20, [w3Bucket.address, Caro.address], [testERC20TokenNegativePriceBN, testERC20TokenPriceBN]);

  });

});