// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";

import "./OracleBondedKeeper.sol";
import "./CustomizableKeep3rV1OracleJob.sol";

contract RestrictedKeep3rV1OracleJob is CustomizableKeep3rV1OracleJob {
    constructor()
        public
        CustomizableKeep3rV1OracleJob(
            0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44, // keep3r
            0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44, // bond
            200 ether, // bond
            0, // min bond
            0, // earned
            false, // age
            0xA8646cE5d983E996EbA22eb39e5956653ec63762 // oracle bonded keep3r
        )
    {}

    function setKeep3rRequirements(
        address _bond,
        uint256 _minBond,
        uint256 _earned,
        uint256 _age,
        bool _onlyEOA
    ) external override onlyGovernor {
        _bond;
        _minBond;
        _earned;
        _age;
        _onlyEOA;
        revert("Keep3rV1OracleJob::not-allowed");
    }
}
