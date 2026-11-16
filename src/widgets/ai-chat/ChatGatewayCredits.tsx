'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getChatState, subscribeChat } from './store';

function formatCredits(value: number) {
  return value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
}

interface FreeQuota {
  used: number;
  limit: number;
  remaining: number;
}

export function ChatGatewayCredits({ compact = false }: { compact?: boolean }) {
  const state = useSyncExternalStore(subscribeChat, getChatState, getChatState);
  const [balance, setBalance] = useState<number | null>(null);
  const [free, setFree] = useState<FreeQuota | null>(null);
  const previousBusy = useRef(state.busy);

  useEffect(() => {
    let alive = true;
    const justFinished = previousBusy.current && !state.busy;
    previousBusy.current = state.busy;
    (async () => {
      try {
        const res = await fetch(
          `/api/settings/ai/gateway-usage${justFinished ? '?fresh=1' : ''}`,
          { cache: 'no-store' }
        );
        const json = await res.json().catch(() => ({}));
        const data = json?.data ?? json;
        if (!alive) return;
        setBalance(
          data?.configured && typeof data?.balance === 'number' ? data.balance : null
        );
        const quota = data?.free_requests;
        setFree(
          quota && typeof quota.limit === 'number' && quota.limit > 0
            ? {
                used: Number(quota.used || 0),
                limit: Number(quota.limit || 0),
                remaining: Number(
                  quota.remaining ?? Math.max(0, Number(quota.limit) - Number(quota.used || 0))
                ),
              }
            : null
        );
      } catch {
        if (alive) setBalance(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [state.busy]);

  if (balance === null && free === null) return null;

  const size = compact ? 'text-[10px]' : 'text-[10.5px]';

  return (
    <span className="flex shrink-0 items-center gap-2 tabular-nums">
      {free && (
        <span
          title={`Free model requests today: ${free.used} of ${free.limit} used (${free.remaining} left)`}
          className={`${size} font-medium ${
            free.remaining <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-text-muted'
          }`}
        >
          {free.used}/{free.limit} free
        </span>
      )}
      {balance !== null && (
        <span
          title={`AI Gateway credits remaining: ${formatCredits(balance)}`}
          className={`${size} font-medium text-text-muted`}
        >
          {formatCredits(balance)}
          {!compact && <span className="ml-1">left</span>}
        </span>
      )}
    </span>
  );
}
