import { useState } from 'react';

/** Кандидаттың атауын, дауыс санын және әрекет батырмаларын көрсетеді. */
export default function CandidateCard({
    candidate,
    votes,
    onVote,
    onRefresh,
    isVoting,
    disabled,
}) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isBusy = disabled || isVoting || isRefreshing;
    const voteCount = BigInt(votes ?? '0').toLocaleString('kk-KZ');
    const initial = candidate.name.trim().slice(0, 1).toUpperCase();

    async function refresh() {
        if (isBusy) return;

        setIsRefreshing(true);

        try {
            await onRefresh();
        } catch (cause) {
            console.error('Кандидат дауыстарын жаңарту қатесі:', cause);
        } finally {
            setIsRefreshing(false);
        }
    }

    return (
        <article
            aria-busy={isVoting || isRefreshing}
            className={`rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-lg shadow-indigo-100/40 transition ${disabled ? 'cursor-not-allowed opacity-50' : ''
                }`}
        >
            <div className="mb-6 flex items-center gap-4">
                <div
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-bold text-indigo-700"
                >
                    {initial}
                </div>

                <div className="min-w-0">
                    <p className="mb-1 text-xs font-semibold text-slate-500">
                        Кандидат №{candidate.id}
                    </p>
                    <h3 className="break-words text-xl font-bold text-slate-900">
                        {candidate.name}
                    </h3>
                </div>
            </div>

            <p className="text-sm text-slate-500">Жиналған дауыс</p>
            <p
                aria-live="polite"
                className="mt-2 break-words text-5xl font-extrabold tracking-tight text-indigo-600"
            >
                {voteCount}
            </p>

            <div className="mt-7 flex gap-3">
                <button
                    type="button"
                    title={`${candidate.name} кандидатына дауыс беру`}
                    onClick={onVote}
                    disabled={isBusy}
                    aria-busy={isVoting}
                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isVoting ? 'Жіберілуде...' : 'Дауыс беру'}
                </button>

                <button
                    type="button"
                    title={`${candidate.name} кандидатының дауыс санын жаңарту`}
                    aria-label={`${candidate.name} кандидатының дауыс санын жаңарту`}
                    onClick={refresh}
                    disabled={isBusy}
                    aria-busy={isRefreshing}
                    className="flex h-12 min-w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xl font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <span className={isRefreshing ? 'animate-spin' : ''}>↻</span>
                </button>
            </div>

            {isRefreshing && (
                <p role="status" className="mt-3 text-xs text-slate-500">
                    Дауыс саны жаңартылуда...
                </p>
            )}
        </article>
    );
}