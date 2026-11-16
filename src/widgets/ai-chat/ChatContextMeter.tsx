'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Gauge } from 'lucide-react';
import clsx from 'clsx';
import {
  getChatState,
  setContextBudgetPct,
  subscribeChat,
} from './store';

const FALLBACK_WINDOW = 32_000;

function formatTokens(value?: number | null) {
  if (!value || value <= 0) return '0';
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace('.0', '')}M`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export function ChatContextMeter({ compact = false }: { compact?: boolean }) {
  const state = useSyncExternalStore(subscribeChat, getChatState, getChatState);
  const [open, setOpen] = useState(false);
  const [draftPct, setDraftPct] = useState(state.contextBudgetPct);
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    right: number;
    bottom: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const activeModel = state.model || state.defaultModel || '';
  const caps = activeModel ? state.modelCatalog[activeModel] : undefined;
  const lastAssistant = [...state.messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.usage);
  const usage = lastAssistant?.usage;
  const usageIsForActiveModel =
    Boolean(activeModel) && lastAssistant?.model === activeModel;
  const contextWindow =
    (typeof caps?.context_window === 'number' && caps.context_window > 0
      ? caps.context_window
      : null) ||
    (usageIsForActiveModel &&
    typeof usage?.context_window === 'number' &&
    usage.context_window > 0
      ? usage.context_window
      : FALLBACK_WINDOW);
  const published = Boolean(
    (caps?.context_window && caps.context_window > 0) ||
      (usageIsForActiveModel && usage?.context_window && usage.context_window > 0),
  );
  const promptTokens = usage?.prompt_tokens ?? 0;
  const reserve = Math.min(
    caps?.max_tokens && caps.max_tokens > 0 ? caps.max_tokens : 8192,
    16384,
    Math.max(512, Math.floor(contextWindow / 4)),
  );
  const budget = Math.max(512, Math.round(((contextWindow - reserve) * draftPct) / 100));
  const usedPct =
    contextWindow > 0 ? Math.min(100, (promptTokens / contextWindow) * 100) : 0;

  useEffect(() => {
    setDraftPct(state.contextBudgetPct);
  }, [state.contextBudgetPct]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !boxRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(290, window.innerWidth - 16);
      const right = Math.max(
        8,
        Math.min(window.innerWidth - rect.right, window.innerWidth - width - 8),
      );
      setPosition({
        right,
        bottom: Math.max(8, window.innerHeight - rect.top + 8),
        width,
        maxHeight: Math.max(180, rect.top - 16),
      });
    }
    setOpen(true);
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        title="Context budget"
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-lg border border-border-color bg-white text-text-muted transition-colors hover:text-text-primary',
          compact ? 'h-7 px-2 text-[10px]' : 'h-8 px-2.5 text-[11px]',
        )}
      >
        <Gauge size={compact ? 11 : 12} />
        <span
          className={clsx(
            'whitespace-nowrap',
            compact ? 'hidden' : 'hidden sm:inline',
          )}
        >
          {formatTokens(promptTokens)} / {formatTokens(contextWindow)}
        </span>
      </button>

      {open &&
        position &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              right: position.right,
              bottom: position.bottom,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            className="z-[130] overflow-y-auto rounded-xl border border-border-color bg-white p-3 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.45)]"
          >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold text-text-primary">
                Context budget
              </p>
              <p className="mt-0.5 text-[10.5px] text-text-muted">
                {published
                  ? 'Prompt tokens sent on the last turn.'
                  : 'This provider does not publish a context window. The limit below is a safety estimate.'}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline justify-between text-[10.5px] text-text-muted">
              <span>Last prompt</span>
              <span className="font-medium text-text-secondary">
                {formatTokens(promptTokens)} / {formatTokens(contextWindow)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className={clsx(
                  'h-full rounded-full transition-all',
                  usedPct > 85 ? 'bg-danger' : 'bg-accent-primary',
                )}
                style={{ width: `${usedPct}%` }}
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline justify-between text-[10.5px]">
              <span className="text-text-muted">Send at most</span>
              <span className="font-semibold text-text-primary">
                {draftPct}% · {formatTokens(budget)} tokens
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={draftPct}
              onChange={(event) => setDraftPct(Number(event.target.value))}
              onPointerUp={() => void setContextBudgetPct(draftPct)}
              onKeyUp={() => void setContextBudgetPct(draftPct)}
              onBlur={() => void setContextBudgetPct(draftPct)}
              className="mt-1.5 w-full accent-accent-primary"
            />
            <div className="flex justify-between text-[9.5px] text-text-muted">
              <span>10%</span>
              <span>Output reserve: {formatTokens(reserve)}</span>
              <span>90%</span>
            </div>
          </div>

          {usage?.context_compacted ? (
            <p className="mt-2 text-[10px] text-text-muted">
              {usage.context_compacted} older message
              {usage.context_compacted === 1 ? '' : 's'} summarised on the last
              turn.
            </p>
          ) : usage?.context_dropped ? (
            <p className="mt-2 text-[10px] text-text-muted">
              {usage.context_dropped} older message
              {usage.context_dropped === 1 ? '' : 's'} omitted on the last turn.
            </p>
          ) : (
            <p className="mt-2 text-[10px] text-text-muted">
              Older messages are summarised or omitted once the budget is
              reached.
            </p>
          )}
          </div>,
          document.body
        )}
    </div>
  );
}
