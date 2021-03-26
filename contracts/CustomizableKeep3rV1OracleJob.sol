// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@lbertenasco/contract-utils/contracts/abstract/UtilsReady.sol";
import "@lbertenasco/contract-utils/contracts/keep3r/Keep3rAbstract.sol";
import "./utils/GasPriceLimited.sol";

import "./interfaces/jobs/IKeep3rJob.sol";
import "./OracleBondedKeeper.sol";

interface ICustomizableKeep3rV1OracleJob is IKeep3rJob {
    event PairAdded(address _pair);
    event PairRemoved(address _pair);

    // Actions by Keeper
    event Worked(address[] _pair, address _keeper, uint256 _credits);

    // Actions forced by Governor
    event ForceWorked(address _pair);

    // Setters
    function addPairs(address[] calldata _pairs) external;

    function addPair(address _pair) external;

    function removePair(address _pair) external;

    // Getters
    function oracleBondedKeeper() external view returns (address _oracleBondedKeeper);

    function workable() external view returns (bool);

    function pairs() external view returns (address[] memory _pairs);

    // Keeper actions
    function work() external returns (uint256 _credits);

    // Bypass
    function forceWork(address _pair) external;
}

contract CustomizableKeep3rV1OracleJob is UtilsReady, Keep3r, ICustomizableKeep3rV1OracleJob {
    using SafeMath for uint256;

    uint256 public constant PRECISION = 1_000;
    uint256 public constant MAX_REWARD_MULTIPLIER = 1 * PRECISION; // 1x max reward multiplier
    uint256 public override rewardMultiplier = MAX_REWARD_MULTIPLIER;

    EnumerableSet.AddressSet internal _availablePairs;

    address public immutable override oracleBondedKeeper;

    constructor(
        address _keep3r,
        address _bond,
        uint256 _minBond,
        uint256 _earned,
        uint256 _age,
        bool _onlyEOA,
        address _oracleBondedKeeper
    ) public UtilsReady() Keep3r(_keep3r) {
        _setKeep3rRequirements(_bond, _minBond, _earned, _age, _onlyEOA);
        oracleBondedKeeper = _oracleBondedKeeper;
    }

    // Keep3r Setters
    function setKeep3r(address _keep3r) external override onlyGovernor {
        _setKeep3r(_keep3r);
    }

    function setKeep3rRequirements(
        address _bond,
        uint256 _minBond,
        uint256 _earned,
        uint256 _age,
        bool _onlyEOA
    ) external virtual override onlyGovernor {
        _setKeep3rRequirements(_bond, _minBond, _earned, _age, _onlyEOA);
    }

    function setRewardMultiplier(uint256 _rewardMultiplier) external override onlyGovernor {
        _setRewardMultiplier(_rewardMultiplier);
        emit SetRewardMultiplier(_rewardMultiplier);
    }

    function _setRewardMultiplier(uint256 _rewardMultiplier) internal {
        require(_rewardMultiplier <= MAX_REWARD_MULTIPLIER, "Keep3rV1OracleJob::set-reward-multiplier:multiplier-exceeds-max");
        rewardMultiplier = _rewardMultiplier;
    }

    // Setters
    function addPairs(address[] calldata _pairs) external override onlyGovernor {
        for (uint256 i; i < _pairs.length; i++) {
            _addPair(_pairs[i]);
        }
    }

    function addPair(address _pair) external override onlyGovernor {
        _addPair(_pair);
    }

    function _addPair(address _pair) internal {
        require(!_availablePairs.contains(_pair), "Keep3rV1OracleJob::add-pair:pair-already-added");
        _availablePairs.add(_pair);
        emit PairAdded(_pair);
    }

    function removePair(address _pair) external override onlyGovernor {
        require(_availablePairs.contains(_pair), "Keep3rV1OracleJob::remove-pair:pair-not-found");
        _availablePairs.remove(_pair);
        emit PairRemoved(_pair);
    }

    // Getters
    function pairs() public view override returns (address[] memory _pairs) {
        _pairs = new address[](_availablePairs.length());
        for (uint256 i; i < _availablePairs.length(); i++) {
            _pairs[i] = _availablePairs.at(i);
        }
    }

    // Keeper view actions
    function workable() external view override notPaused returns (bool) {
        return _workable();
    }

    function _workable() internal view returns (bool) {
        for (uint256 i; i < _availablePairs.length(); i++) {
            if (IOracleBondedKeeper(oracleBondedKeeper).workable(_availablePairs.at(i))) return true;
        }
        return false;
    }

    // Keeper actions
    function _work() internal returns (uint256 _credits) {
        uint256 _initialGas = gasleft();

        require(_workable(), "Keep3rV1OracleJob::work:not-workable");

        address[] memory _workedPairs = new address[](_availablePairs.length());
        uint256 _workedPairsAmount;

        for (uint256 i; i < _availablePairs.length(); i++) {
            address _pair = _availablePairs.at(i);
            if (IOracleBondedKeeper(oracleBondedKeeper).workable(_pair)) {
                require(_updatePair(_pair), "Keep3rV1OracleJob::work:pair-not-updated");
                _workedPairs[_workedPairsAmount] = _pair;
                _workedPairsAmount += 1;
            }
        }

        _credits = _calculateCredits(_initialGas);

        emit Worked(_workedPairs, msg.sender, _credits);
    }

    function work() public override notPaused onlyKeeper returns (uint256 _credits) {
        _credits = _work();
        _paysKeeperInTokens(msg.sender, _credits);
    }

    function _calculateCredits(uint256 _initialGas) internal view returns (uint256 _credits) {
        // Gets default credits from KP3R_Helper and applies job reward multiplier
        return _getQuoteLimit(_initialGas).mul(rewardMultiplier).div(PRECISION);
    }

    // Bypass
    function forceWork(address _pair) external override onlyGovernor {
        require(_updatePair(_pair), "Keep3rV1OracleJob::force-work:pair-not-updated");
        emit ForceWorked(_pair);
    }

    function _updatePair(address _pair) internal returns (bool _updated) {
        return IOracleBondedKeeper(oracleBondedKeeper).updatePair(_pair);
    }
}
