// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@lbertenasco/contract-utils/contracts/abstract/UtilsReady.sol";
import "@lbertenasco/contract-utils/interfaces/keep3r/IKeep3rV1.sol";
import "./interfaces/keep3r/IKeep3rV2OracleFactory.sol";

interface IOracleBondedKeeper {
    event JobAdded(address _job);
    event JobRemoved(address _job);

    // Getters
    function keep3r() external view returns (address _keep3r);

    function keep3rOracleFactory() external view returns (address _keep3rOracleFactory);

    function jobs() external view returns (address[] memory);

    // Setters
    function addJobs(address[] calldata _jobs) external;

    function addJob(address _job) external;

    function removeJob(address _job) external;

    // Jobs actions
    function workable(address _pair) external view returns (bool);

    function updatePair(address _pair) external returns (bool);

    // Governor Keeper Bond
    function bond(address bonding, uint256 amount) external;

    function activate(address bonding) external;

    function unbond(address bonding, uint256 amount) external;

    function withdraw(address bonding) external;
}

contract OracleBondedKeeper is UtilsReady, IOracleBondedKeeper {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet internal _validJobs;

    address public immutable override keep3r;
    address public immutable override keep3rOracleFactory;

    constructor(address _keep3r, address _keep3rOracleFactory) public UtilsReady() {
        keep3r = _keep3r;
        keep3rOracleFactory = _keep3rOracleFactory;
    }

    // Setters
    function addJobs(address[] calldata _jobs) external override onlyGovernor {
        for (uint256 i; i < _jobs.length; i++) {
            _addJob(_jobs[i]);
        }
    }

    function addJob(address _job) external override onlyGovernor {
        _addJob(_job);
    }

    function _addJob(address _job) internal {
        _validJobs.add(_job);
        emit JobAdded(_job);
    }

    function removeJob(address _job) external override onlyGovernor {
        _validJobs.remove(_job);
        emit JobRemoved(_job);
    }

    // Getters
    function jobs() public view override returns (address[] memory _jobs) {
        _jobs = new address[](_validJobs.length());
        for (uint256 i; i < _validJobs.length(); i++) {
            _jobs[i] = _validJobs.at(i);
        }
    }

    // Jobs functions
    function workable(address _pair) external view override returns (bool) {
        return IKeep3rV2OracleFactory(keep3rOracleFactory).workable(_pair);
    }

    function updatePair(address _pair) external override onlyValidJob returns (bool _updated) {
        IKeep3rV2OracleFactory(keep3rOracleFactory).update(_pair);
        return true;
    }

    modifier onlyValidJob() {
        require(_validJobs.contains(msg.sender), "OracleBondedKeeper::onlyValidJob:msg-sender-not-valid-job");
        _;
    }

    // Governor Keeper Bond
    function bond(address _bonding, uint256 _amount) external override onlyGovernor {
        IKeep3rV1(keep3r).bond(_bonding, _amount);
    }

    function activate(address _bonding) external override onlyGovernor {
        IKeep3rV1(keep3r).activate(_bonding);
    }

    function unbond(address _bonding, uint256 _amount) external override onlyGovernor {
        IKeep3rV1(keep3r).unbond(_bonding, _amount);
    }

    function withdraw(address _bonding) external override onlyGovernor {
        IKeep3rV1(keep3r).withdraw(_bonding);
    }
}
