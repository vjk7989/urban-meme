// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RockPaperScissors {
    address public constant RECIPIENT = 0x000aE9e629A16C2d5D2660E058d93e3b82DFCf98;
    uint256 public constant MIN_BET = 0.001 ether;

    enum Choice { Rock, Paper, Scissors }
    enum Result { Win, Lose, Draw }

    event GamePlayed(address player, uint256 bet, Choice playerChoice, Choice botChoice, Result result);

    function play(Choice _playerChoice) external payable {
        require(msg.value >= MIN_BET, "Bet amount too low");

        Choice botChoice = Choice(uint(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender))) % 3);
        Result result = getResult(_playerChoice, botChoice);

        if (result == Result.Win) {
            uint256 payout = msg.value * 2;
            payable(msg.sender).transfer(payout);
        } else if (result == Result.Lose) {
            // Send the bet to the RECIPIENT address
            payable(RECIPIENT).transfer(msg.value);
        } else {
            // In case of a draw, return the bet to the player
            payable(msg.sender).transfer(msg.value);
        }

        emit GamePlayed(msg.sender, msg.value, _playerChoice, botChoice, result);
    }

    function getResult(Choice _playerChoice, Choice _botChoice) private pure returns (Result) {
        if (_playerChoice == _botChoice) {
            return Result.Draw;
        }
        if (
            (_playerChoice == Choice.Rock && _botChoice == Choice.Scissors) ||
            (_playerChoice == Choice.Paper && _botChoice == Choice.Rock) ||
            (_playerChoice == Choice.Scissors && _botChoice == Choice.Paper)
        ) {
            return Result.Win;
        }
        return Result.Lose;
    }

    // Function to withdraw any remaining balance (if needed)
    function withdraw() external {
        payable(RECIPIENT).transfer(address(this).balance);
    }
}

