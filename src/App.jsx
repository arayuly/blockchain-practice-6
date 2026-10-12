import { useCallback, useEffect, useRef, useState } from 'react';
import ConnectWallet from './components/ConnectWallet.jsx';
import CandidateCard from './components/CandidateCard.jsx';
import useWeb3, { getErrorMessage } from './hooks/useWeb3.js';
import {
  GANACHE_CHAIN_ID,
  VOTING_ADDRESS,
} from './contracts/Voting.js';

const statusStyles = {
  pending: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

/** Кандидаттарды келісімшарттан оқып, дауыс беру әрекетін басқарады. */
function App() {
  const wallet = useWeb3();
  const {
    web3,
    account,
    contract,
    chainId,
    isCorrectNetwork,
    error,
  } = wallet;

  const [candidates, setCandidates] = useState([]);
  const [votes, setVotes] = useState({});
  const [votingId, setVotingId] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [txError, setTxError] = useState('');
  const [readError, setReadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const mountedRef = useRef(false);
  const readRequestRef = useRef(0);
  const votingLockRef = useRef(false);
  const contextRef = useRef(null);

  contextRef.current = { contract, account, chainId };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      readRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    setTxStatus(null);
    setTxError('');
  }, [account, chainId, contract]);

  const loadData = useCallback(async () => {
    const request = ++readRequestRef.current;

    const isCurrent = () => mountedRef.current
      && readRequestRef.current === request
      && contextRef.current.contract === contract
      && contextRef.current.chainId === chainId;

    if (!contract || !web3 || !isCorrectNetwork) return;

    setIsLoading(true);
    setReadError('');

    try {
      const code = await web3.eth.getCode(VOTING_ADDRESS);

      if (!isCurrent()) return;

      if (!code || /^0x0*$/.test(code)) {
        setReadError(
          'Бұл мекенжайда келісімшарт жоқ. Ganache желісіне Voting.sol орналастырып, VOTING_ADDRESS мәнін жаңартыңыз.',
        );
        return;
      }

      // Кандидаттардың атаулары интерфейсте алдын ала жазылмайды.
      const names = await contract.methods.getCandidates().call();
      const nextCandidates = Array.from(
        names,
        (name, id) => ({ id, name }),
      );

      const entries = await Promise.all(
        nextCandidates.map(async (candidate) => {
          const count = await contract.methods
            .totalVotesFor(candidate.id)
            .call();

          // Үлкен сандардың дәлдігін сақтау үшін жолға түрлендіреміз.
          return [candidate.id, count.toString()];
        }),
      );

      if (!isCurrent()) return;

      setCandidates(nextCandidates);
      setVotes(Object.fromEntries(entries));

      console.log(
        'Кандидаттар мен дауыстар жүктелді:',
        nextCandidates.length,
      );
    } catch (cause) {
      if (isCurrent()) {
        setReadError(getErrorMessage(cause));
      }

      console.error('Кандидаттарды жүктеу қатесі:', cause);
    } finally {
      if (isCurrent()) {
        setIsLoading(false);
      }
    }
  }, [contract, web3, chainId, isCorrectNetwork]);

  useEffect(() => {
    setCandidates([]);
    setVotes({});
    setReadError('');
    setIsLoading(false);

    void loadData();

    return () => {
      // Ескі желіден келген жауап жаңа деректерді алмастырмайды.
      readRequestRef.current += 1;
    };
  }, [loadData]);

  const getVotes = useCallback(async (candidateId) => {
    if (!contract || !isCorrectNetwork) return false;

    const isCurrent = () => mountedRef.current
      && contextRef.current.contract === contract
      && contextRef.current.chainId === chainId;

    try {
      const count = await contract.methods
        .totalVotesFor(candidateId)
        .call();

      if (!isCurrent()) return false;

      setVotes((previous) => ({
        ...previous,
        [candidateId]: count.toString(),
      }));
      setReadError('');

      console.log(
        'Кандидаттың дауыс саны жаңарды:',
        candidateId,
        count.toString(),
      );

      return true;
    } catch (cause) {
      if (isCurrent()) {
        setReadError(
          `Дауыстарды оқу қатесі. ${getErrorMessage(cause)}`,
        );
      }

      console.error('Дауыс санын оқу қатесі:', cause);
      return false;
    }
  }, [contract, chainId, isCorrectNetwork]);

  async function vote(candidateId) {
    if (!contract || !account || !web3) {
      window.alert('Алдымен MetaMask-ты қосыңыз!');
      return;
    }

    if (!isCorrectNetwork) {
      window.alert('Ganache желісіне ауысыңыз!');
      return;
    }

    if (votingLockRef.current) return;

    const isCurrent = () => mountedRef.current
      && contextRef.current.contract === contract
      && contextRef.current.account === account
      && contextRef.current.chainId === chainId;

    votingLockRef.current = true;
    setVotingId(candidateId);
    setTxStatus('pending');
    setTxError('');

    try {
      const actualChainId = await web3.eth.getChainId();

      if (!isCurrent()) return;

      if (actualChainId !== GANACHE_CHAIN_ID) {
        setTxStatus('error');
        setTxError('Ganache желісіне ауысып, қайта әрекет жасаңыз.');
        return;
      }

      // Транзакция жіберер алдында мекенжайдың күйін оқимыз.
      const alreadyVoted = await contract.methods
        .hasVoted(account)
        .call();

      if (!isCurrent()) return;

      if (alreadyVoted) {
        setTxStatus('error');
        setTxError(
          'Бұл әмиян бұрын дауыс берген. Қайта дауыс беруге болмайды.',
        );
        return;
      }

      console.log(
        'Дауыс беру транзакциясы жіберілуде:',
        candidateId,
        account,
      );

      const receipt = await contract.methods
        .voteForCandidate(candidateId)
        .send({ from: account });

      console.log(
        'Дауыс беру транзакциясы расталды:',
        receipt.transactionHash,
      );

      if (!isCurrent()) return;

      setTxStatus('success');
      await getVotes(candidateId);
    } catch (cause) {
      if (isCurrent()) {
        setTxStatus('error');
        setTxError(getErrorMessage(cause));
      }

      console.error('Дауыс беру қатесі:', cause);
    } finally {
      votingLockRef.current = false;

      if (mountedRef.current) {
        setVotingId(null);
      }
    }
  }

  const canRead = Boolean(contract && web3 && isCorrectNetwork);

  const disabled = !canRead
    || !account
    || isLoading
    || votingId !== null
    || wallet.isConnecting
    || wallet.isSwitching
    || wallet.isInitializing;

  const appError = [error, readError].filter(Boolean).join(' ');

  const totalVotes = Object.values(votes)
    .reduce((sum, count) => sum + BigInt(count), 0n)
    .toLocaleString('kk-KZ');

  const statusMessage = txStatus === 'pending'
    ? 'Транзакция жіберілуде. MetaMask-та растаңыз және блокқа қосылуын күтіңіз.'
    : txStatus === 'success'
      ? 'Дауыс блокчейнге сәтті тіркелді.'
      : txError || 'Дауыс беру орындалмады.';

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-indigo-50 to-violet-100 text-slate-900">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 flex flex-col gap-6 rounded-3xl border border-white bg-white/80 p-6 shadow-sm sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-indigo-600">
              №6 практикалық жұмыс
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Дауыс беру DApp
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              React + Vite + Web3.js · Жергілікті Ganache
            </p>
          </div>

          <ConnectWallet {...wallet} />
        </header>

        <div className="mb-6 space-y-3">
          {appError && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {appError}
            </div>
          )}

          {account && !isCorrectNetwork && (
            <div
              role="alert"
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            >
              Ganache желісіне ауысыңыз. Қажетті желі нөмірі: 1337.
              Ағымдағы желі: {chainId?.toString() ?? 'Анықталуда'}.
            </div>
          )}

          {txStatus && (
            <div
              role={txStatus === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              className={`rounded-2xl border p-4 text-sm ${statusStyles[txStatus]}`}
            >
              {statusMessage}
            </div>
          )}
        </div>

        <section
          aria-labelledby="candidates-heading"
          aria-busy={isLoading}
        >
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="candidates-heading"
                className="text-2xl font-bold"
              >
                Кандидаттар
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Кандидат саны: {candidates.length}
                {' · '}
                Жалпы дауыс: {totalVotes}
              </p>
            </div>

            <button
              type="button"
              title="Келісімшарттағы барлық дауыс санын қайта оқу"
              onClick={loadData}
              disabled={!canRead || isLoading || votingId !== null}
              className="rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading
                ? 'Жаңартылуда...'
                : 'Барлық дауыстарды жаңарту'}
            </button>
          </div>

          {canRead && candidates.length === 0 && isLoading && (
            <p
              role="status"
              className="rounded-2xl bg-white/80 p-8 text-center text-slate-600"
            >
              Кандидаттар жүктелуде...
            </p>
          )}

          {canRead
            && candidates.length === 0
            && !isLoading
            && !appError && (
              <p className="rounded-2xl bg-white/80 p-8 text-center text-slate-600">
                Келісімшартта кандидаттар жоқ.
              </p>
            )}

          {!wallet.isInitializing && !account && (
            <p className="mb-5 text-sm text-slate-600">
              Дауыс беру үшін MetaMask-ты қосыңыз.
            </p>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                votes={votes[candidate.id] ?? '0'}
                onVote={() => vote(candidate.id)}
                onRefresh={() => getVotes(candidate.id)}
                isVoting={votingId === candidate.id}
                disabled={disabled}
              />
            ))}
          </div>
        </section>

        <footer className="mt-10 space-y-2 text-center text-xs leading-5 text-slate-500">
          <p>
            Кандидаттар келісімшарттан оқылады.
            Әр расталған транзакция бір дауыс қосады.
          </p>
          <p>
            Бұл оқу нұсқасында бір шот бірнеше рет дауыс бере алады.
          </p>
          <p>
            RPC мекенжайы: http://127.0.0.1:8545 · Желі нөмірі: 1337
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App