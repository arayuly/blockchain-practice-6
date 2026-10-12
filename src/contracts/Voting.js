export const VOTING_ADDRESS = (
    import.meta.env.VITE_VOTING_ADDRESS ?? ''
).trim();

// Web3.js желі нөмірін bigint түрінде қайтарады.
export const GANACHE_CHAIN_ID = 1337n;

// Voting.sol келісімшартының толық ABI сипаттамасы.
export const VOTING_ABI = [
    {
        inputs: [
            {
                internalType: 'string[]',
                name: 'candidateNames',
                type: 'string[]',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'uint256',
                name: 'candidateId',
                type: 'uint256',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'voter',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'newTotal',
                type: 'uint256',
            },
        ],
        name: 'VoteCast',
        type: 'event',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        name: 'candidateList',
        outputs: [
            {
                internalType: 'string',
                name: '',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'candidatesCount',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getCandidates',
        outputs: [
            {
                internalType: 'string[]',
                name: '',
                type: 'string[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        name: 'hasVoted',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'candidateId',
                type: 'uint256',
            },
        ],
        name: 'totalVotesFor',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'candidateId',
                type: 'uint256',
            },
        ],
        name: 'voteForCandidate',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        name: 'votesReceived',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
];