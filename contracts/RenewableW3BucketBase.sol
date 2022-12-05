// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/DoubleEndedQueueUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

import "./lib/CurrencyTransferLib.sol";

abstract contract RenewableW3BucketBase is Initializable, AccessControlEnumerableUpgradeable {
    using DoubleEndedQueueUpgradeable for DoubleEndedQueueUpgradeable.Bytes32Deque;
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /// @dev Only PRICE_ADMIN_ROLE holders can set bucket unit price
    bytes32 public constant PRICE_ADMIN_ROLE = keccak256("PRICE_ADMIN_ROLE");
    /// @dev Only WITHDRAWER_ROLE holders can withdraw ethers and erc20 tokens
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    uint256 public constant MAX_RENEWABLE_CAPACITY_UNITS = 1000;
    uint256 public constant MAX_RENEWABLE_PERIOD_UNITS = 100;

    EnumerableMapUpgradeable.AddressToUintMap internal _unitPrices;

    CountersUpgradeable.Counter internal _nextRenewalId;
    mapping(uint256 => DoubleEndedQueueUpgradeable.Bytes32Deque) internal _bucketRenewalHistory;
    mapping(uint256 => BucketRenewal) internal _allRenewals;
    
    /**
     * @notice                      A price information of a unit (10GB/year)
     * 
     * @param currency              The currency in which the `price` must be paid
     * 
     * @param price                 The basic unit price required to pay to renew a bucket
     */
    struct UnitPrice {
        address currency;
        uint256 price;
    }

    /**
     * @notice  Information of a bucket renewal
     */
    struct BucketRenewal {
        uint256 renewalId;
        uint256 tokenId;
        address currency;
        uint256 unitPrice;
        uint256 capacityUnits; // How many 10GBs
        uint256 periodUnits; // How many years
        address renewedBy;  // Renewed by whom
        uint256 renewedAt;  // Renewed when
    }

    /// @notice Emitted when a unit price is updated
    event UnitPriceUpdated(
        address indexed currency,
        uint256 price
    );

    /// @notice Emitted when a bucket token is minted
    event BucketMinted(
        address indexed to,
        uint256 indexed tokenId
    );

    /// @notice Emitted when a bucket is renewed
    event BucketRenewed(
        uint256 indexed tokenId,
        address indexed currency,
        uint256 uintPrice,
        uint256 capacityUnits,
        uint256 periodUnits,
        address renewedBy
    );

    /// @notice Indicate to OpenSea that an NFT's metadata is no longer changeable by anyone (in other words, it is "frozen")
    event PermanentURI(
        string _value,
        uint256 indexed _id
    );

    /// @notice Emitted when a currency is withdrawn
    event Withdraw(
        address indexed to,
        address indexed currency,
        uint256 amount
    );

    function __RenewableW3BucketBase_init() internal onlyInitializing {
    }

    function __RenewableW3BucketBase_init_unchained() internal onlyInitializing {
    }

    function _renewBucket(
        uint256 tokenId,
        address currency,
        uint256 capacityUnits, // How many 10GBs
        uint256 periodUnits // How many 1years
    ) internal virtual {
        require(_unitPrices.contains(currency), 'Invalid currency');
        require(capacityUnits > 0 && capacityUnits <= MAX_RENEWABLE_CAPACITY_UNITS, 'Invalid renewal capacity units');
        require(periodUnits > 0 && periodUnits <= MAX_RENEWABLE_PERIOD_UNITS, 'Invalid renewal period units');

        uint256 unitPrice = _unitPrices.get(currency);
        uint256 price = SafeMathUpgradeable.mul(SafeMathUpgradeable.mul(unitPrice, capacityUnits), periodUnits);
        if (currency == CurrencyTransferLib.NATIVE_TOKEN) {
            require(msg.value == price, "Must send required price");
        }
        else {
            CurrencyTransferLib.transferCurrency(currency, _msgSender(), address(this), price);
        }

        _nextRenewalId.increment();
        uint256 renewalId = _nextRenewalId.current();

        BucketRenewal memory bucketRenewal = BucketRenewal({
            renewalId: renewalId,
            tokenId: tokenId,
            currency: currency,
            unitPrice: unitPrice,
            capacityUnits: capacityUnits,
            periodUnits: periodUnits,
            renewedBy: _msgSender(),
            renewedAt: block.timestamp
        });
        _allRenewals[renewalId] = bucketRenewal;

        DoubleEndedQueueUpgradeable.Bytes32Deque storage renewalHistory = _bucketRenewalHistory[tokenId];
        renewalHistory.pushBack(bytes32(renewalId));

        emit BucketRenewed(tokenId, currency, unitPrice, capacityUnits, periodUnits, _msgSender());
    }

    function bucketRenewalCount(
        uint256 tokenId
    ) public virtual view returns (uint256) {
        return _bucketRenewalHistory[tokenId].length();
    }

    function renewalOfBucketByIndex(
        uint256 tokenId, uint256 index
    ) public view virtual returns (BucketRenewal memory) {
        require(index < bucketRenewalCount(tokenId), "Renewal index out of bounds");

        DoubleEndedQueueUpgradeable.Bytes32Deque storage renewalHistory = _bucketRenewalHistory[tokenId];
        uint256 renewalId = uint256(renewalHistory.at(index));
        return _allRenewals[renewalId];
    }

    function setUnitPrices(
        UnitPrice[] calldata prices
    ) external virtual onlyRole(PRICE_ADMIN_ROLE) {
        for (uint256 i = 0; i < _unitPrices.length(); ) {
            (address key, ) = _unitPrices.at(i);
            _unitPrices.remove(key);
        }

        for (uint256 i = 0; i < prices.length; i++) {
            _unitPrices.set(prices[i].currency, prices[i].price);
            emit UnitPriceUpdated(prices[i].currency, prices[i].price);
        }
    }

    function getUnitPrices() public virtual view returns (UnitPrice[] memory) {
        UnitPrice[] memory prices = new UnitPrice[](_unitPrices.length());
        for (uint256 i = 0; i < _unitPrices.length(); i++) {
            (address key, uint256 price) = _unitPrices.at(i);
            prices[i].currency = key;
            prices[i].price = price;
        }
        return prices;
    }

    /**
     * @dev Withdraw native token or erc20 tokens from the contract
     */
    function withdraw(
        address to, address currency
    ) external virtual onlyRole(WITHDRAWER_ROLE) {
        uint256 amount = 0;
        if (currency == CurrencyTransferLib.NATIVE_TOKEN) {
            amount = address(this).balance;
        }
        else {
            amount = IERC20Upgradeable(currency).balanceOf(address(this));
        }

        if (amount == 0) {
            return;
        }

        CurrencyTransferLib.transferCurrency(currency, address(this), to, amount);
        emit Withdraw(to, currency, amount);
    }


    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[46] private __gap;
}