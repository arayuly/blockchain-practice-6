// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Әр мекенжайға бір рет дауыс беруге мүмкіндік береді.
contract Voting {
    string[] public candidateList;

    mapping(uint256 => uint256) public votesReceived;

    // Мекенжайдың бұрын дауыс бергенін сақтайды.
    mapping(address => bool) public hasVoted;

    event VoteCast(
        uint256 indexed candidateId,
        address indexed voter,
        uint256 newTotal
    );

    constructor(string[] memory candidateNames) {
        require(
            candidateNames.length > 0,
            unicode"Кемінде бір кандидат қажет."
        );

        for (uint256 i = 0; i < candidateNames.length; i++) {
            require(
                bytes(candidateNames[i]).length > 0,
                unicode"Кандидаттың атауы бос болмауы керек."
            );

            candidateList.push(candidateNames[i]);
        }
    }

    /// @notice Бір мекенжайдан тек алғашқы дауысты қабылдайды.
    function voteForCandidate(uint256 candidateId) external {
        require(
            candidateId < candidateList.length,
            unicode"Кандидат нөмірі жарамсыз."
        );

        require(
            !hasVoted[msg.sender],
            unicode"Сіз бұрын дауыс бердіңіз."
        );

        hasVoted[msg.sender] = true;
        votesReceived[candidateId] += 1;

        emit VoteCast(
            candidateId,
            msg.sender,
            votesReceived[candidateId]
        );
    }

    /// @notice Кандидаттың дауыс санын қайтарады.
    function totalVotesFor(
        uint256 candidateId
    ) external view returns (uint256) {
        require(
            candidateId < candidateList.length,
            unicode"Кандидат нөмірі жарамсыз."
        );

        return votesReceived[candidateId];
    }

    /// @notice Кандидаттардың толық тізімін қайтарады.
    function getCandidates()
        external
        view
        returns (string[] memory)
    {
        return candidateList;
    }

    /// @notice Кандидаттардың санын қайтарады.
    function candidatesCount() external view returns (uint256) {
        return candidateList.length;
    }
}