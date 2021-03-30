// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@lbertenasco/contract-utils/contracts/abstract/UtilsReady.sol";
import "@lbertenasco/contract-utils/contracts/keep3r/Keep3rAbstract.sol";
import "./interfaces/keep3r/IKeep3rV2OracleFactory.sol";
import "./interfaces/jobs/IKeep3rJob.sol";

interface IKeep3rV2OracleJob is IKeep3rJob {
    event PairAdded(address _pair);
    event PairRemoved(address _pair);

    // Actions by Keeper
    event Worked(address[] _pair, address _keeper, uint256 _credits);

    // Actions forced by Governor
    event ForceWorked(address _pair);

    // Getters
    function keep3rV2OracleFactory() external view returns (address);

    function workable() external view returns (bool);

    function pairs() external view returns (address[] memory _pairs);

    // Setters
    function addPairs(address[] calldata _pairs) external;

    function addPair(address _pair) external;

    function removePair(address _pair) external;

    // Worker actions
    function work() external returns (uint256 _credits);

    function forceWork(address _pair) external;

    // Governor Keeper Bond
    function keep3rBond(address bonding, uint256 amount) external;

    function keep3rActivate(address bonding) external;

    function keep3rUnbond(address bonding, uint256 amount) external;

    function keep3rWithdraw(address bonding) external;
}

contract Keep3rV2OracleJob is UtilsReady, Keep3r, IKeep3rV2OracleJob {
    uint256 public constant PRECISION = 1_000;
    uint256 public constant MAX_REWARD_MULTIPLIER = 1 * PRECISION; // 1x max reward multiplier
    uint256 public override rewardMultiplier = MAX_REWARD_MULTIPLIER;

    EnumerableSet.AddressSet internal _availablePairs;

    address public immutable override keep3rV2OracleFactory;

    constructor(
        address _keep3r,
        address _bond,
        uint256 _minBond,
        uint256 _earned,
        uint256 _age,
        bool _onlyEOA,
        address _keep3rV2OracleFactory
    ) public UtilsReady() Keep3r(_keep3r) {
        _setKeep3rRequirements(_bond, _minBond, _earned, _age, _onlyEOA);
        keep3rV2OracleFactory = _keep3rV2OracleFactory;
        keep3rBond(_keep3r, 0);
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
        require(_rewardMultiplier <= MAX_REWARD_MULTIPLIER, "Keep3rV2OracleJob::set-reward-multiplier:multiplier-exceeds-max");
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
        require(!_availablePairs.contains(_pair), "Keep3rV2OracleJob::add-pair:pair-already-added");
        _availablePairs.add(_pair);
        emit PairAdded(_pair);
    }

    function removePair(address _pair) external override onlyGovernor {
        require(_availablePairs.contains(_pair), "Keep3rV2OracleJob::remove-pair:pair-not-found");
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
        for (uint256 i; i < _availablePairs.length(); i++) {
            if (IKeep3rV2OracleFactory(keep3rV2OracleFactory).workable(_availablePairs.at(i))) return true;
        }
        return false;
    }

    // Worker actions
    function _work() internal returns (uint256 _credits) {
        uint256 _initialGas = gasleft();
        bool hasWorked = false;
        address[] memory _workedPairs = new address[](_availablePairs.length());
        uint256 _workedPairsAmount;
        for (uint256 i; i < _availablePairs.length(); i++) {
            address _pair = _availablePairs.at(i);
            if (IKeep3rV2OracleFactory(keep3rV2OracleFactory).workable(_pair)) {
                IKeep3rV2OracleFactory(keep3rV2OracleFactory).update(_pair);
                hasWorked = true;
                _workedPairs[_workedPairsAmount] = _pair;
                _workedPairsAmount += 1;
            }
        }
        _credits = _getQuoteLimit(_initialGas).mul(rewardMultiplier).div(PRECISION);
        require(hasWorked, "Keep3rV2OracleJob::should-have-worked");
        emit Worked(_workedPairs, msg.sender, _credits);
    }

    function work() public override notPaused onlyKeeper returns (uint256 _credits) {
        _credits = _work();
        _paysKeeperInTokens(msg.sender, _credits);
    }

    function forceWork(address _pair) public override onlyGovernor {
        IKeep3rV2OracleFactory(keep3rV2OracleFactory).update(_pair);
        emit ForceWorked(_pair);
    }

    // Keep3r Network Actions

    function keep3rBond(address _bonding, uint256 _amount) public override onlyGovernor {
        IKeep3rV1(_Keep3r).bond(_bonding, _amount);
    }

    function keep3rActivate(address _bonding) public override onlyGovernor {
        IKeep3rV1(_Keep3r).activate(_bonding);
    }

    function keep3rUnbond(address _bonding, uint256 _amount) public override onlyGovernor {
        IKeep3rV1(_Keep3r).unbond(_bonding, _amount);
    }

    function keep3rWithdraw(address _bonding) public override onlyGovernor {
        IKeep3rV1(_Keep3r).withdraw(_bonding);
    }
}
