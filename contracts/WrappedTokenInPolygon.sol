// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract WrappedTokenInPolygon is ERC20, Ownable {
    address private _bridge;

    error OnlyBridge();

    event NewBridgeSet(address newBridge);

    constructor(address bridge) ERC20("WrappedTokenInPolygon", "WTIP") Ownable(msg.sender) {
        _bridge = bridge;
    }

    modifier onlyBridge() {
        if (msg.sender != _bridge) {
            revert OnlyBridge();
        }

        _;
    }

    function mintByBridge(address recipient, uint256 amount) external onlyBridge {
        _mint(recipient, amount);
    }

    function burnByBridge(address account, uint256 amount) external onlyBridge {
        _burn(account, amount);
    }

    function setNewBridge(address bridge) external onlyOwner {
        _bridge = bridge;
        emit NewBridgeSet(bridge);
    }

    function getBridge() external view returns (address) {
        return _bridge;
    }
}