// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./CustomizableKeep3rV2OracleJob.sol";

contract RestrictedKeep3rV2OracleJob is CustomizableKeep3rV2OracleJob {
    constructor()
        public
        CustomizableKeep3rV2OracleJob(
            0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44, // keep3r
            0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44, // bond
            0, // bond
            0, // min bond
            0, // earned
            false, // age
            address(0) // TODO: Set new oracle bonded keep3r v2 address
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
        revert("Keep3rV2OracleJob::not-allowed");
    }
}
