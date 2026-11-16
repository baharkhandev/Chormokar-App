'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Check, ChevronDown, Loader2, Lock } from 'lucide-react';
import clsx from 'clsx';
import {
  getChatState,
  loadModelCatalog,
  setChatModel,
  setDefaultChatModel,
  setModelCatalog,
  subscribeChat,
  type ModelCapabilities,
} from './store';

function shortModel(model: string) {
  return model.split('/').pop() || model;
}

function formatOutput(value?: number | null) {
  if (!value || value <= 0) return '';
  if (value >= 1_000) return `${Math.round(value / 1_000)}K out`;
  return `${value} out`;
}

function formatContext(value?: number | null) {
  if (!value || value <= 0) return '';
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace('.0', '')}M ctx`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}K ctx`;
  return `${value} ctx`;
}

export function ChatModelPicker({
  compact = false,
  dropUp = false,
  buttonClassName,
  recommended,
}: {
  compact?: boolean;
  dropUp?: boolean;
  buttonClassName?: string;
  /** Model to badge as recommended — only inside this picker's list. */
  recommended?: string;
}) {
  const state = useSyncExternalStore(subscribeChat, getChatState, getChatState);
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [freeModels, setFreeModels] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    void loadModelCatalog();
    // Keep the saved model visible even if the provider catalogue cannot be
    // fetched on this page load.
    void (async () => {
      try {
        const res = await fetch('/api/settings/ai', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        const data = json?.data ?? json;
        if (typeof data?.chat_model === 'string') {
          setDefaultChatModel(data.chat_model || null);
        }
      } catch {
        // the catalogue still provides the default when it loads
      }
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
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
    void loadModelCatalog();
    if (loadedRef.current) return;
    loadedRef.current = true;
    let alive = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const creditsRes = await fetch('/api/settings/ai/gateway-usage', {
          cache: 'no-store',
        });
        const creditsJson = await creditsRes.json().catch(() => ({}));
        const creditsData = creditsJson?.data ?? creditsJson;
        setCreditBalance(
          typeof creditsData?.balance === 'number' ? creditsData.balance : null
        );
      } catch {
        setCreditBalance(null);
      }
      try {
        const res = await fetch('/api/settings/ai/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.detail || 'Could not load models');
        }
        const data = json?.data ?? json;
        const list = (data?.models ?? []) as string[];
        const free = (data?.free_models ?? []) as string[];
        const catalog = (data?.model_info ?? {}) as Record<
          string,
          ModelCapabilities
        >;
        if (alive) {
          setModels(list);
          setFreeModels(new Set(free));
          if (Object.keys(catalog).length > 0) {
            setModelCatalog(
              catalog,
              String(data?.default_model || ''),
              String(data?.base_url || ''),
              typeof data?.context_budget_pct === 'number'
                ? data.context_budget_pct
                : undefined
            );
          }
        }
      } catch (err: any) {
        if (alive) setError(err?.message || 'Could not load models');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  const selected = state.model || state.defaultModel || '';
  const label = selected
    ? shortModel(selected)
    : state.defaultModel
      ? shortModel(state.defaultModel)
      : 'Model';
  const tagOptions = [
    'Free',
    'Image',
    'File',
    'Tools',
    'Reasoning',
    'Web',
  ] as const;

  const tagsFor = (model: string) => {
    const caps = state.modelCatalog[model];
    const values: string[] = [];
    if (freeModels.has(model)) values.push('free');
    // Only advertise capabilities the provider itself published. Inferred
    // fallbacks are used for behaviour, never for visible tags.
    if (caps?.source === 'api') {
      if (caps.input?.includes('image')) values.push('image');
      if (caps.files) values.push('file');
      if (caps.tools) values.push('tools');
      if (caps.reasoning) values.push('reasoning');
      if (caps.web_search) values.push('web');
    }
    return values;
  };

  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = models
    .filter((model) => {
      const modelTags = tagsFor(model);
      if (tags.length > 0 && !tags.every((tag) => modelTags.includes(tag.toLowerCase()))) {
        return false;
      }
      if (tokens.length === 0) return true;
      const caps = state.modelCatalog[model];
      const haystack = [
        model,
        caps?.name,
        ...modelTags,
        ...(caps?.source === 'api' ? caps.input ?? [] : []),
        caps?.files_native ? 'native' : caps?.files ? 'parsed' : '',
      ]
        .join(' ')
        .toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    })
    .sort((a, b) => {
      const freeA = freeModels.has(a) ? 0 : 1;
      const freeB = freeModels.has(b) ? 0 : 1;
      return freeA - freeB || a.localeCompare(b);
    });

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title={selected || 'Choose a chat model'}
        aria-label="Choose a chat model"
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-lg border border-border-color bg-white text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary',
          compact
            ? 'h-7 max-w-[132px] px-2 text-[11px]'
            : 'h-8 max-w-[220px] px-2.5 text-[11.5px]',
          buttonClassName
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={12}
          className={clsx('shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          className={clsx(
            'absolute z-[80] overflow-hidden rounded-xl border border-border-color bg-white shadow-[0_20px_45px_-12px_rgba(0,0,0,0.45)]',
            dropUp ? 'bottom-full mb-1.5' : 'mt-1.5',
            compact ? 'right-0 w-[300px]' : 'right-0 w-[340px]'
          )}
        >
          <div className="border-b border-black/5 p-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search models or tags…"
              className="h-8 w-full rounded-lg border border-border-color bg-bg-secondary/60 px-2.5 text-[12px] text-text-primary outline-none focus:border-accent-primary/60"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tagOptions.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setTags((current) =>
                        current.includes(tag)
                          ? current.filter((value) => value !== tag)
                          : [...current, tag]
                      )
                    }
                    className={clsx(
                      'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                      active
                        ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary'
                        : 'border-border-color text-text-muted hover:text-text-primary'
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[260px] overflow-y-auto p-1.5">
            {loading && (
              <div className="flex items-center gap-2 px-2.5 py-3 text-[11.5px] text-text-muted">
                <Loader2 size={12} className="animate-spin" />
                Loading models…
              </div>
            )}
            {error && <p className="px-2.5 py-3 text-[11.5px] text-danger">{error}</p>}
            {!loading && !error && filtered.length === 0 && (
              <p className="px-2.5 py-3 text-[11.5px] text-text-muted">
                {models.length === 0 ? 'No models available.' : 'No model matches.'}
              </p>
            )}
            {filtered.map((model) => {
              const isSelected = selected === model;
              const caps = state.modelCatalog[model];
              const fromProvider = caps?.source === 'api';
              const context = fromProvider ? formatContext(caps?.context_window) : '';
              const output = fromProvider ? formatOutput(caps?.max_tokens) : '';
              const creditsExhausted =
                creditBalance !== null && creditBalance <= 0;
              const locked =
                Boolean(caps?.locked) ||
                (Boolean(caps?.paid) && creditsExhausted);
              return (
                <button
                  key={model}
                  type="button"
                  disabled={locked}
                  title={
                    locked
                      ? caps?.lock_reason ||
                        'No provider credits left for paid models'
                      : undefined
                  }
                  onClick={() => {
                    if (locked) return;
                    setChatModel(model);
                    setOpen(false);
                  }}
                  className={clsx(
                    'flex w-full items-start justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors',
                    locked
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-accent-primary/[0.12]',
                    isSelected
                      ? 'bg-accent-primary/10 font-medium text-accent-primary'
                      : 'text-text-secondary',
                    !locked && !isSelected && 'hover:text-text-primary'
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{model}</span>
                      {freeModels.has(model) && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">
                          <span className="h-1 w-1 rounded-full bg-emerald-500" />
                          Free
                        </span>
                      )}
                      {recommended === model && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-accent-primary">
                          Recommended
                        </span>
                      )}
                    </span>
                    {fromProvider &&
                      (context ||
                        output ||
                        caps?.input?.includes('image') ||
                        caps?.files ||
                        caps?.tools ||
                        caps?.reasoning ||
                        caps?.web_search) && (
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        {context && (
                          <span
                            title="Input limit — the model's context window"
                            className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-text-muted"
                          >
                            {context}
                          </span>
                        )}
                        {output && (
                          <span
                            title="Output limit — the provider's max completion tokens"
                            className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-text-muted"
                          >
                            {output}
                          </span>
                        )}
                        {caps?.input?.includes('image') && (
                          <span
                            title="Image input (from the provider model list)"
                            className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-text-muted"
                          >
                            Image
                          </span>
                        )}
                        {caps?.files_native && (
                          <span
                            title="Accepts document files natively"
                            className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-text-muted"
                          >
                            File
                          </span>
                        )}
                        {caps?.files && !caps?.files_native && (
                          <span
                            title="OpenRouter parses documents for this model"
                            className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-text-muted"
                          >
                            File*
                          </span>
                        )}
                        {caps?.tools && (
                          <span
                            title="Supports tool calling"
                            className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-text-muted"
                          >
                            Tools
                          </span>
                        )}
                        {caps?.reasoning && (
                          <span
                            title="Reasoning model"
                            className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-text-muted"
                          >
                            Reasoning
                          </span>
                        )}
                        {caps?.web_search && (
                          <span
                            title="Supports web search"
                            className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-text-muted"
                          >
                            Web
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
                    {locked && (
                      <span
                        title="Paid model — requires provider credits"
                        className="text-text-muted"
                      >
                        <Lock size={11} />
                      </span>
                    )}
                    {isSelected && <Check size={13} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
