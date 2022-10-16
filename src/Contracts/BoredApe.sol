//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

pragma solidity ^0.8.0;

interface IBRT {
    function balanceOf(address owner) external view returns (uint256 balance);
}

contract BoaredApe is ERC20 {
    // IBRT private ape = IBRT(bored);

    constructor(string memory _name, string memory _symbol)
        ERC20(_name, _symbol)
    {
        _mint(msg.sender, 1000000 * 10**18);
    }

    struct Stake {
        uint256 time;
        address staker;
        uint256 stakeAmount;
        bool valid;
    }
    mapping(address => Stake) public stakes;
    event stakeEvent(
        address from,
        uint256 amount,
        uint256 time,
        string actionType
    );

    function stakeBRT(uint256 amount) public {
        Stake storage s = stakes[msg.sender];
        transfer(address(this), amount);
        if (s.valid == true) {
            uint256 daySpent = block.timestamp - s.time;
            uint256 token = s.stakeAmount;

            if (daySpent >= 3 days) {
                uint256 interest = ((token * (daySpent / 86400)) / 300);
                uint256 total = token + interest + amount;
                s.stakeAmount = total;
            } else {
                s.stakeAmount += amount;
            }
        } else {
            s.stakeAmount += amount;
            s.staker = msg.sender;
            s.valid = true;
        }

        s.time = block.timestamp;
        emit stakeEvent(msg.sender, amount, block.timestamp, "stake");
    }

    function myStake() external view returns (Stake memory) {
        return stakes[msg.sender];
    }

    function getStakeByAddress(address staker)
        external
        view
        returns (Stake memory)
    {
        return stakes[staker];
    }

    function withdraw(uint256 amount) public {
        Stake storage s = stakes[msg.sender];
        require(s.valid == true, "you dont have money in the stake");
        uint256 daySpent = block.timestamp - s.time;
        if (daySpent >= 3 days) {
            uint256 token = s.stakeAmount;
            uint256 interest = ((token * (daySpent / 86400)) / 300);
            s.stakeAmount += interest;
        }
        require(s.stakeAmount >= amount, "insufficient funds");
        s.stakeAmount -= amount;
        transfer(msg.sender, amount);
        s.time = block.timestamp;
        s.stakeAmount == 0 ? s.valid = false : s.valid = true;
        emit stakeEvent(msg.sender, amount, block.timestamp, "unstake");
    }
}
