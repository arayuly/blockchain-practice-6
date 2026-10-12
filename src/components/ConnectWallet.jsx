/** Қалта байланысын, шот мекенжайын және желі күйін көрсетеді. */
export default function ConnectWallet({
    account,
    hasProvider,
    isCorrectNetwork,
    isInitializing,
    isConnecting,
    isSwitching,
    connect,
    switchToGanache,
}) {
    if (isInitializing) {
        return (
            <p
                role="status"
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600"
            >
                Қалта тексерілуде...
            </p>
        );
    }

    if (!hasProvider) {
        return (
            <a
                href="https://metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
                title="MetaMask ресми сайтын ашу"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
                MetaMask орнату
            </a>
        );
    }

    const isBusy = isConnecting || isSwitching;
    const shortAccount = account
        ? `${account.slice(0, 6)}...${account.slice(-4)}`
        : '';

    return (
        <div className="flex flex-col gap-3 sm:items-end">
            {account && (
                <div
                    aria-live="polite"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                    <span
                        aria-hidden="true"
                        className={
                            isCorrectNetwork
                                ? 'h-3 w-3 rounded-full bg-emerald-500'
                                : 'h-3 w-3 rounded-full bg-amber-400'
                        }
                    />

                    <div>
                        <p className="text-xs text-slate-500">Қосылған шот</p>
                        <p
                            title={account}
                            className="font-mono text-sm font-semibold text-slate-800"
                        >
                            {shortAccount}
                        </p>
                        <p
                            className={
                                isCorrectNetwork
                                    ? 'mt-1 text-xs text-emerald-700'
                                    : 'mt-1 text-xs text-amber-700'
                            }
                        >
                            {isCorrectNetwork ? 'Ganache желісі' : 'Басқа желі'}
                        </p>
                    </div>
                </div>
            )}

            {!account && (
                <button
                    type="button"
                    title="MetaMask арқылы шотты қосу"
                    onClick={connect}
                    disabled={isBusy}
                    aria-busy={isConnecting}
                    className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isConnecting ? 'Қосылуда...' : 'MetaMask-ты қосу'}
                </button>
            )}

            {account && !isCorrectNetwork && (
                <button
                    type="button"
                    title="Ganache жергілікті желісіне ауысу"
                    onClick={switchToGanache}
                    disabled={isBusy}
                    aria-busy={isSwitching}
                    className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSwitching ? 'Ауыстырылуда...' : 'Ganache-ке ауысу'}
                </button>
            )}
        </div>
    );
}