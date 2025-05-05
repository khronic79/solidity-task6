// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
contract BaseTokenInBNB is ERC20, Ownable {
    constructor() ERC20("BaseInBNB", "BTIB") Ownable(msg.sender) {
        _mint(msg.sender, 10000e18);
    }

    function mint(address recipient, uint256 amount) external onlyOwner {
        _mint(recipient, amount);
    } 
}