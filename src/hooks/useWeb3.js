import { useCallback, useEffect, useRef, useState } from 'react';
import { Web3 } from 'web3';
import {
    GANACHE_CHAIN_ID,
    VOTING_ABI,
    VOTING_ADDRESS,
} from '../contracts/Voting.js';

function getErrorCodes(cause) {
    return [
        cause?.code,
        cause?.cause?.code,
        cause?.innerError?.code,
        cause?.data?.originalError?.code,
    ].map(Number);
}

export function getErrorMessage(cause) {
    const codes = getErrorCodes(cause);
    const message = [
        cause?.message,
        cause?.cause?.message,
        cause?.innerError?.message,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    if (codes.includes(4001) || /user denied|user rejected/.test(message)) {
        return 'MetaMask сұрауынан бас тартылды.';
    }

    if (codes.includes(-32002)) {
        return 'MetaMask-та ашық сұрау бар. Қалта терезесіндегі сұрауды аяқтаңыз.';
    }

    if (codes.includes(4900) || codes.includes(4901)) {
        return 'Желімен байланыс жоқ. Ganache іске қосылғанын тексеріңіз.';
    }

    if (codes.includes(4902)) {
        return 'Ganache желісі қалтаға қосылмаған.';
    }

    if (/insufficient funds/.test(message)) {
        return 'Газ төлеміне сынақ ETH жеткіліксіз. Ganache шотын пайдаланыңыз.';
    }

    if (/nonce/.test(message)) {
        return 'Транзакция нөмірі сәйкес емес. MetaMask әрекеттері мен Ganache күйін тексеріңіз.';
    }

    if (/invalid opcode/.test(message)) {
        return 'EVM нұсқасы сәйкес емес. Келісімшартты Solidity 0.8.19 және London арқылы қайта құрастырыңыз.';
    }

    if (/revert/.test(message)) {
        return 'Келісімшарт транзакцияны қабылдамады. Кандидат нөмірі мен келісімшарт мекенжайын тексеріңіз.';
    }

    return 'Сұрау орындалмады. Ganache, желі, келісімшарт мекенжайы және ABI сәйкестігін тексеріңіз.';
}

/** MetaMask байланысын, желіні және келісімшарт нысанын басқарады. */
export default function useWeb3() {
    const [web3, setWeb3] = useState(null);
    const [account, setAccount] = useState('');
    const [contract, setContract] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [error, setError] = useState('');
    const [hasProvider, setHasProvider] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);

    const providerRef = useRef(null);
    const web3Ref = useRef(null);
    const sessionRef = useRef(0);
    const chainRevisionRef = useRef(0);
    const actionLockRef = useRef(false);

    const isValidAddress = Web3.utils.isAddress(VOTING_ADDRESS);

    const applyChain = useCallback((value) => {
        const nextChainId = BigInt(value);

        setChainId(nextChainId);
        setContract(
            isValidAddress && web3Ref.current
                ? new web3Ref.current.eth.Contract(VOTING_ABI, VOTING_ADDRESS)
                : null,
        );

        console.log('Ағымдағы желі нөмірі:', nextChainId.toString());
    }, [isValidAddress]);

    useEffect(() => {
        const session = ++sessionRef.current;
        const provider = window.ethereum;
        let accountRevision = 0;

        if (!provider) {
            setHasProvider(false);
            setIsInitializing(false);
            console.log('MetaMask провайдері табылмады.');

            return () => {
                sessionRef.current += 1;
            };
        }

        const instance = new Web3(provider);

        providerRef.current = provider;
        web3Ref.current = instance;
        setWeb3(instance);
        setHasProvider(true);
        setIsInitializing(true);

        function handleAccountsChanged(accounts) {
            if (sessionRef.current !== session) return;

            accountRevision += 1;
            setAccount(accounts[0] ?? '');
            setError('');

            console.log(
                'Белсенді шот өзгерді:',
                accounts[0] ?? 'Шот қосылмаған',
            );
        }

        function handleChainChanged(value) {
            if (sessionRef.current !== session) return;

            chainRevisionRef.current += 1;

            try {
                applyChain(value);
                setError('');
            } catch (cause) {
                setError(getErrorMessage(cause));
                console.error('Желі өзгерісін өңдеу қатесі:', cause);
            }
        }

        provider.on('accountsChanged', handleAccountsChanged);
        provider.on('chainChanged', handleChainChanged);

        async function initialize() {
            const initialAccountRevision = accountRevision;
            const initialChainRevision = chainRevisionRef.current;

            try {
                const [accounts, initialChainId] = await Promise.all([
                    provider.request({ method: 'eth_accounts' }),
                    instance.eth.getChainId(),
                ]);

                if (sessionRef.current !== session) return;

                // Бұрын басталған сұрау кейінгі оқиға нәтижесін алмастырмайды.
                if (accountRevision === initialAccountRevision) {
                    setAccount(accounts[0] ?? '');
                }

                if (chainRevisionRef.current === initialChainRevision) {
                    applyChain(initialChainId);
                }

                console.log('Қалта күйі оқылды.');
            } catch (cause) {
                if (sessionRef.current === session) {
                    setError(getErrorMessage(cause));
                }

                console.error('Қалтаны бастапқы тексеру қатесі:', cause);
            } finally {
                if (sessionRef.current === session) {
                    setIsInitializing(false);
                }
            }
        }

        void initialize();

        return () => {
            sessionRef.current += 1;

            provider.removeListener('accountsChanged', handleAccountsChanged);
            provider.removeListener('chainChanged', handleChainChanged);

            providerRef.current = null;
            web3Ref.current = null;
        };
    }, [applyChain]);

    const readCurrentChain = useCallback(async () => {
        const session = sessionRef.current;
        const revision = chainRevisionRef.current;

        const value = await providerRef.current.request({
            method: 'eth_chainId',
        });

        if (
            sessionRef.current === session
            && chainRevisionRef.current === revision
        ) {
            applyChain(value);
        }

        return BigInt(value);
    }, [applyChain]);

    const connect = useCallback(async () => {
        if (actionLockRef.current) return;

        const provider = providerRef.current;

        if (!provider) {
            setError('MetaMask орнатып, бетті қайта жүктеңіз.');
            return;
        }

        const session = sessionRef.current;

        actionLockRef.current = true;
        setIsConnecting(true);
        setError('');

        try {
            const accounts = await provider.request({
                method: 'eth_requestAccounts',
            });

            if (sessionRef.current !== session) return;

            setAccount(accounts[0] ?? '');
            await readCurrentChain();

            console.log('MetaMask қосылды:', accounts[0] ?? 'Шот берілмеді');
        } catch (cause) {
            if (sessionRef.current === session) {
                setError(getErrorMessage(cause));
            }

            console.error('MetaMask қосу қатесі:', cause);
        } finally {
            actionLockRef.current = false;

            if (sessionRef.current === session) {
                setIsConnecting(false);
            }
        }
    }, [readCurrentChain]);

    const switchToGanache = useCallback(async () => {
        if (actionLockRef.current) return;

        const provider = providerRef.current;

        if (!provider) {
            setError('MetaMask орнатып, бетті қайта жүктеңіз.');
            return;
        }

        const session = sessionRef.current;

        actionLockRef.current = true;
        setIsSwitching(true);
        setError('');

        try {
            const params = [{ chainId: '0x539' }];

            try {
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params,
                });
            } catch (cause) {
                // Желі әлі тіркелмесе, алдымен оның параметрлерін қосамыз.
                if (!getErrorCodes(cause).includes(4902)) throw cause;

                await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: '0x539',
                            chainName: 'Ganache жергілікті желісі',
                            nativeCurrency: {
                                name: 'Сынақ эфирі',
                                symbol: 'ETH',
                                decimals: 18,
                            },
                            rpcUrls: ['http://127.0.0.1:8545'],
                        },
                    ],
                });

                // Желіні қосу мен белсенді желіні ауыстыру бөлек әрекеттер.
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params,
                });
            }

            if (sessionRef.current !== session) return;

            const currentChainId = await readCurrentChain();

            if (
                sessionRef.current === session
                && currentChainId !== GANACHE_CHAIN_ID
            ) {
                setError(
                    'Ganache желісіне ауысу аяқталмады. MetaMask желісін тексеріңіз.',
                );
            }

            console.log(
                'Желіге ауысу сұрауы аяқталды:',
                currentChainId.toString(),
            );
        } catch (cause) {
            if (sessionRef.current === session) {
                setError(getErrorMessage(cause));
            }

            console.error('Ganache желісіне ауысу қатесі:', cause);
        } finally {
            actionLockRef.current = false;

            if (sessionRef.current === session) {
                setIsSwitching(false);
            }
        }
    }, [readCurrentChain]);

    return {
        web3,
        account,
        contract,
        chainId,
        isCorrectNetwork: chainId === GANACHE_CHAIN_ID,
        error: isValidAddress
            ? error
            : 'src/contracts/Voting.js файлындағы VOTING_ADDRESS мәніне орналастырылған келісімшарттың мекенжайын енгізіңіз.',
        hasProvider,
        isInitializing,
        isConnecting,
        isSwitching,
        connect,
        switchToGanache,
    };
}