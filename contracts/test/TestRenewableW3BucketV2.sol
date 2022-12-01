// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "../RenewableW3Bucket.sol";

contract TestRenewableW3BucketV2 is RenewableW3Bucket {
  using StringsUpgradeable for uint256;

  function funcV2()
      public
      pure
      returns (bool)
  {
      return true;
  }
}