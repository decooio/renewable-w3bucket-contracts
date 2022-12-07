import { ethers, upgrades } from 'hardhat';
import { RenewableW3Bucket__factory } from '../typechain/factories/contracts';
import { TestERC20__factory } from '../typechain/factories/contracts/test/TestERC20__factory';

const { provider } = ethers;

export const nativeTokenAddress = '0x0000000000000000000000000000000000000000';

export async function deployRenewableW3BucketFixture() {
  const RenewableW3Bucket = await ethers.getContractFactory('RenewableW3Bucket');
  const w3BucketProxy = await upgrades.deployProxy(RenewableW3Bucket, ['RenewableW3Bucket', 'RW3BKT']);
  const w3Bucket = RenewableW3Bucket__factory.connect(w3BucketProxy.address, provider);

  const TestERC20 = await ethers.getContractFactory('TestERC20');
  const testERC20Proxy = await upgrades.deployProxy(TestERC20, ['TestERC20', 'TRC']);
  const testERC20 = TestERC20__factory.connect(testERC20Proxy.address, provider);

  const  [Alice, Bob, Caro, Dave]  = await ethers.getSigners();

  return { w3Bucket, testERC20, Alice, Bob, Caro, Dave };
}

export async function deployRenewableW3BucketWithUnitPricesFixture() {
  const RenewableW3Bucket = await ethers.getContractFactory('RenewableW3Bucket');
  const w3BucketProxy = await upgrades.deployProxy(RenewableW3Bucket, ['RenewableW3Bucket', 'RW3BKT']);
  const w3Bucket = RenewableW3Bucket__factory.connect(w3BucketProxy.address, provider);

  const TestERC20 = await ethers.getContractFactory('TestERC20');
  const testERC20Proxy = await upgrades.deployProxy(TestERC20, ['TestERC20', 'TRC']);
  const testERC20 = TestERC20__factory.connect(testERC20Proxy.address, provider);

  const  [Alice, Bob, Caro, Dave]  = await ethers.getSigners();

  const testERC20Decimal = await testERC20.decimals();
  await w3Bucket.connect(Alice).setUnitPrices([
    { currency: nativeTokenAddress, price: ethers.utils.parseEther('0.8') },
    { currency: testERC20.address, price: ethers.utils.parseUnits('8.8', testERC20Decimal) },
  ]);

  const testData = {
    unitPrices: {
      nativeEther: {
        address: nativeTokenAddress,
        price: 0.8
      },
      erc20: {
        address: testERC20.address,
        decimals: testERC20Decimal,
        price: 8.8
      }
    }
  };

  return { w3Bucket, testData, Alice, Bob, Caro, Dave };
}