'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  ArrowUp,
  Check,
  Copy,
  FileSpreadsheet,
  Globe,
  Loader2,
  Paperclip,
  PencilLine,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import gsap from 'gsap';
import { ChatContextMeter } from './ChatContextMeter';
import { ChatGatewayCredits } from './ChatGatewayCredits';
import { ChatModelPicker } from './ChatModelPicker';
import {
  getChatState,
  loadOlderChat,
  refreshChatProvider,
  sendChatMessage,
  subscribeChat,
  type ChatAttachment,
  type ChatMessage,
} from './store';

const SUGGESTIONS = [
  { icon: FileSpreadsheet, label: 'Compare a distributor price list with our catalog' },
  { icon: RefreshCw, label: 'Show what changed since the last import' },
  { icon: PencilLine, label: 'Draft listings for missing products' },
  { icon: Globe, label: 'Which products are out of stock everywhere?' },
];

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path (non-secure contexts, denied permission)
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function AssistantActions({ message }: { message: ChatMessage }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    const ok = await writeClipboard(message.content);
    setState(ok ? 'copied' : 'failed');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 1600);
  };

  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-text-muted">
      <button
        type="button"
        aria-label={state === 'copied' ? 'Copied' : 'Copy response'}
        onClick={copy}
        className={clsx(
          'flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors',
          state === 'copied'
            ? 'text-emerald-600'
            : state === 'failed'
              ? 'text-danger'
              : 'hover:bg-black/5 hover:text-text-primary'
        )}
      >
        {state === 'copied' ? <Check size={14} /> : <Copy size={14} />}
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : ''}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === 'copied' ? 'Answer copied to clipboard' : ''}
      </span>
    </div>
  );
}

function TextBlock({ content, compact }: { content: string; compact?: boolean }) {
  return (
    <div
      className={clsx(
        'space-y-2 text-text-primary',
        compact ? 'text-[12.5px] leading-[1.65]' : 'text-[14px] leading-[1.7]'
      )}
    >
      {content.split('\n').map((line, index) => {
        if (!line.trim()) return <span key={index} className="block h-1" />;
        const bullet = /^[•\-]\s/.test(line);
        const parts = line.replace(/^[•\-]\s/, '').split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        const body = parts.map((part, partIndex) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={partIndex} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={partIndex}>{part}</span>
          )
        );
        if (bullet) {
          return (
            <div key={index} className="flex gap-2.5 pl-1">
              <span className="text-text-muted">•</span>
              <span>{body}</span>
            </div>
          );
        }
        return <p key={index}>{body}</p>;
      })}
    </div>
  );
}

interface ChatFullViewProps {
  /** 'page' = the spacious ChatGPT screen, 'panel' = the compact docked version. */
  variant?: 'page' | 'panel';
}

export function ChatFullView({ variant = 'page' }: ChatFullViewProps) {
  const state = useSyncExternalStore(subscribeChat, getChatState, getChatState);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [attachError, setAttachError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const composerStartRect = useRef<DOMRect | null>(null);
  const olderAnchor = useRef<{ height: number; top: number } | null>(null);

  const compact = variant === 'panel';

  const didInitialScroll = useRef(false);
  const scrollRaf = useRef<number | null>(null);
  const wasBusy = useRef(false);
  // Runs before paint, so the transcript is already pinned to the bottom on the
  // first frame — never a visible scroll from the top.
  // One controlled scroll animation at a time. Native smooth scrolling
  // restarts whenever the target moves (typing indicator, composer easing),
  // which is what made the transcript visibly spring. This eases over a
  // distance-aware duration and re-reads the target every frame instead.
  const scrollToBottom = (smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;

    if (scrollRaf.current !== null) {
      cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = null;
    }

    const target = () => el.scrollHeight - el.clientHeight;
    const from = el.scrollTop;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!smooth || reduceMotion || Math.abs(target() - from) < 4) {
      el.scrollTop = target();
      return;
    }

    const startedAt = performance.now();
    const duration = Math.min(650, Math.max(240, Math.abs(target() - from) * 0.5));
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.scrollTop = from + (target() - from) * eased;
      scrollRaf.current = progress < 1 ? requestAnimationFrame(step) : null;
    };
    scrollRaf.current = requestAnimationFrame(step);
  };

  const lastMessage = state.messages[state.messages.length - 1];
  const lastLength = lastMessage?.content.length ?? 0;
  const awaitingFirstToken = state.busy && !(lastMessage?.role === 'assistant' && lastLength > 0);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Wait for the persisted thread before deciding anything — otherwise the
    // empty first render consumes the "initial" flag and the real load animates.
    if (!state.hydrated || state.messages.length === 0) return;
    if (!didInitialScroll.current) {
      el.scrollTop = el.scrollHeight;
      didInitialScroll.current = true;
      return;
    }

    const sending = state.busy && !wasBusy.current;
    wasBusy.current = state.busy;

    // Don't yank the reader back down if they scrolled up to read history.
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (state.busy) {
      // Streaming: stay glued to the bottom as tokens arrive. Each delta is
      // tiny, so pinning per frame looks continuous.
      if (sending || distanceFromBottom < 160) el.scrollTop = el.scrollHeight;
      return;
    }

    if (sending || distanceFromBottom < 160) scrollToBottom(true);
  }, [state.messages.length, state.busy, state.hydrated, lastLength]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    const anchor = olderAnchor.current;
    if (!el || !anchor || state.loadingOlder) return;
    olderAnchor.current = null;
    el.scrollTop = el.scrollHeight - anchor.height + anchor.top;
  }, [state.messages.length, state.loadingOlder]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || state.loadingOlder || !state.hasMore) return;
    if (el.scrollTop > 80) return;
    olderAnchor.current = { height: el.scrollHeight, top: el.scrollTop };
    void loadOlderChat();
  };

  useEffect(() => {
    return () => {
      if (scrollRaf.current !== null) cancelAnimationFrame(scrollRaf.current);
    };
  }, []);

  useEffect(() => {
    void refreshChatProvider();
    const onFocus = () => void refreshChatProvider();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshChatProvider();
    };
    const onProviderChange = () => void refreshChatProvider();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('ai:provider-changed', onProviderChange);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('ai:provider-changed', onProviderChange);
    };
  }, []);

  const activeModel = state.model || state.defaultModel || '';
  const capabilities = activeModel ? state.modelCatalog[activeModel] : undefined;
  const fromProvider = capabilities?.source === 'api';
  const supportsImages = Boolean(
    fromProvider && capabilities?.input?.includes('image')
  );
  const supportsFiles = Boolean(fromProvider && capabilities?.files);
  const canAttach = supportsImages || supportsFiles;
  const accept = canAttach
    ? [
        supportsImages ? 'image/*' : '',
        supportsFiles ? '.pdf,.docx,.xlsx,.pptx,.csv,.txt,.md,.json,.tsv' : '',
      ]
        .filter(Boolean)
        .join(',')
    : '';

  const pickFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!canAttach) {
      setAttachError('This model does not accept attachments.');
      return;
    }
    const isImage = file.type.startsWith('image/');
    const isDocument = /\.(pdf|docx|xlsx|pptx|csv|txt|md|json|tsv)$/i.test(
      file.name
    );
    if (isImage && !supportsImages) {
      setAttachError('This model does not accept images.');
      return;
    }
    if (!isImage && !supportsFiles) {
      setAttachError('This model does not accept documents.');
      return;
    }
    if (!isImage && !isDocument) {
      setAttachError(
        'Attach an image, PDF, DOCX, XLSX, PPTX, CSV, TXT, Markdown or JSON.'
      );
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setAttachError('That file is larger than 12 MB.');
      return;
    }
    setAttachError('');
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        size: file.size,
        type: file.type,
        data: String(reader.result || ''),
      });
    };
    reader.onerror = () => setAttachError('Could not read that file.');
    reader.readAsDataURL(file);
  };

  const startChat = (body: string, file?: ChatAttachment) => {
    if (empty && composerRef.current) {
      composerStartRect.current = composerRef.current.getBoundingClientRect();
    }
    sendChatMessage(body, file);
  };

  const submit = () => {
    if (state.busy) return;
    const body = text.trim();
    if (!body && !attachment) return;
    startChat(body, attachment ?? undefined);
    setText('');
    setAttachment(null);
  };

  const empty = state.messages.length === 0;

  const composer = (
    <div
      ref={composerRef}
      className={clsx(
        'ai-composer w-full border bg-white transition-colors',
        compact ? 'rounded-[20px] bg-bg-tertiary p-1.5' : 'rounded-[26px] p-2',
        dragging && 'ai-composer--dragging'
      )}
    >
      {attachError && (
        <p className="mb-1 px-2 text-[11px] text-danger">{attachError}</p>
      )}
      {attachment && (
        <div className="mb-1 flex items-center gap-2 rounded-2xl bg-black/[0.03] px-3 py-2 text-[12px] text-text-secondary">
          <FileSpreadsheet size={14} className="shrink-0 text-accent-primary" />
          <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            aria-label="Remove attachment"
            className="rounded p-0.5 text-text-muted hover:text-text-primary"
          >
            <X size={13} />
          </button>
        </div>
      )}
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        rows={compact || !empty ? 1 : 2}
        placeholder={dragging ? 'Drop the file…' : 'Ask anything'}
        className={clsx(
          'max-h-40 w-full resize-none bg-transparent outline-none placeholder:text-text-muted',
          compact
            ? 'min-h-[38px] px-2.5 pt-1 text-[12.5px] leading-relaxed'
            : 'min-h-[46px] px-3 pt-2 text-[14px] leading-relaxed'
        )}
      />
      <div className={clsx('flex items-center justify-between', compact ? 'px-1' : 'px-1.5 pb-0.5')}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canAttach}
            aria-label="Attach a file"
            title={
              canAttach
                ? supportsImages && supportsFiles
                  ? 'Attach a document or image'
                  : supportsImages
                    ? 'Attach an image'
                    : 'Attach a document'
                : capabilities
                  ? 'The provider does not publish capabilities for this model'
                  : 'Choose a model first'
            }
            className={clsx(
              'flex items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
              compact ? 'h-8 w-8' : 'h-9 w-9'
            )}
          >
            <span
              className={clsx(
                'flex items-center justify-center rounded-full border border-border-color',
                compact ? 'h-5 w-5' : 'h-6 w-6'
              )}
            >
              <Paperclip size={compact ? 11 : 13} />
            </span>
          </button>
          {!compact && (
            <span className="hidden text-[11px] text-text-muted sm:inline">
              {canAttach
                ? supportsFiles && supportsImages
                  ? 'Documents or images'
                  : supportsFiles
                    ? capabilities?.files_native
                      ? 'Documents'
                      : 'Documents (parsed)'
                    : 'Images'
                : capabilities
                  ? 'Capabilities unavailable'
                  : 'Choose a model'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <ChatContextMeter compact={compact} />
          <ChatGatewayCredits compact={compact} />
          <ChatModelPicker compact={compact} dropUp />
          <button
            type="button"
            onClick={submit}
            disabled={state.busy || (!text.trim() && !attachment)}
            aria-label="Send"
            className={clsx(
              'flex items-center justify-center rounded-full bg-accent-primary text-white transition-colors hover:bg-accent-primary/90 disabled:bg-black/10 disabled:text-text-muted',
              compact ? 'h-8 w-8' : 'h-9 w-9'
            )}
          >
            <ArrowUp size={compact ? 15 : 17} />
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          pickFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );

  const emptyState = (
    <div
      className={clsx(
        'mx-auto flex min-h-full w-full flex-col justify-center',
        compact ? 'max-w-[340px] px-2 py-4' : 'max-w-[760px] px-4 py-10'
      )}
    >
      <span
        className={clsx(
          'mx-auto flex items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary',
          compact ? 'h-10 w-10' : 'h-12 w-12'
        )}
      >
        <Sparkles size={compact ? 18 : 20} />
      </span>
      <h1
        className={clsx(
          'mt-3 text-center font-display font-semibold tracking-[-0.02em] text-text-primary',
          compact ? 'text-[16px]' : 'text-[26px]'
        )}
      >
        How can I help you today?
      </h1>
      <p
        className={clsx(
          'mx-auto mt-1 text-center text-text-secondary',
          compact ? 'max-w-[280px] text-[11.5px] leading-snug' : 'mt-2 max-w-md text-[13px] leading-relaxed'
        )}
      >
        Ask anything about your catalog, orders or pricing.
      </p>

      <div className={clsx('mx-auto w-full', compact ? 'mt-4 space-y-0.5' : 'mt-5 space-y-1')}>
        {SUGGESTIONS.slice(0, compact ? 3 : 4).map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => startChat(label)}
            className={clsx(
              'flex w-full items-center gap-2.5 rounded-xl text-left text-text-secondary transition-colors hover:bg-black/[0.04] hover:text-text-primary',
              compact ? 'px-2 py-2 text-[11.5px]' : 'px-3 py-2.5 text-[13px]'
            )}
          >
            <Icon size={compact ? 14 : 16} className="shrink-0 text-text-muted" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // While the reply is still empty, the "Reading…" indicator stands in for it.
  // Rendering the empty bubble as well showed a second assistant avatar.
  const visibleMessages = state.messages.filter(
    (message, index) =>
      !(
        state.busy &&
        index === state.messages.length - 1 &&
        message.role === 'assistant' &&
        message.content.length === 0
      )
  );

  const messageList = (
    <div
      className={clsx(
        'mx-auto w-full',
        compact ? 'space-y-5 px-4 pb-4 pt-4' : 'max-w-[760px] space-y-8 px-4 pb-6 pt-8'
      )}
    >
      {visibleMessages.map((message) => (
        <div
          key={message.id}
          className={clsx('group/msg', message.role === 'user' ? 'flex justify-end' : 'block')}
        >
          {message.role === 'user' ? (
            <div
              className={clsx(
                'rounded-3xl bg-bg-secondary text-text-primary',
                compact
                  ? 'max-w-[88%] px-3.5 py-2 text-[12.5px] leading-relaxed'
                  : 'max-w-[85%] px-4 py-2.5 text-[14px] leading-relaxed sm:max-w-[70%]'
              )}
            >
              {message.attachment && (
                <span className="mb-1.5 flex items-center gap-2 text-[11.5px] text-text-secondary">
                  <FileSpreadsheet size={13} />
                  {message.attachment.name}
                </span>
              )}
              <span className="whitespace-pre-wrap">{message.content}</span>
            </div>
          ) : (
            <div>
              <span
                className={clsx(
                  'mb-2 flex items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary',
                  compact ? 'h-6 w-6' : 'h-7 w-7'
                )}
              >
                <Sparkles size={compact ? 12 : 14} />
              </span>
              <TextBlock content={message.content} compact={compact} />
              {!compact && <AssistantActions message={message} />}
            </div>
          )}
        </div>
      ))}

      {awaitingFirstToken && (
        <div className="flex items-center gap-2.5 text-[11.5px] text-text-muted">
          <span
            className={clsx(
              'flex items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary',
              compact ? 'h-6 w-6' : 'h-7 w-7'
            )}
          >
            <Sparkles size={compact ? 12 : 14} className="animate-pulse" />
          </span>
          Reading…
        </div>
      )}
    </div>
  );

  useLayoutEffect(() => {
    const el = composerRef.current;
    const from = composerStartRect.current;
    if (!el || !from || state.messages.length === 0) return;
    composerStartRect.current = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const to = el.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;

    gsap.fromTo(
      el,
      { x: dx, y: dy },
      {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'power3.out',
        clearProps: 'transform',
      }
    );
  }, [state.messages.length]);

  const dropProps = {
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      pickFile(event.dataTransfer.files?.[0]);
    },
  };

  // Blank until the thread is restored, so the composer never renders in the
  // wrong position and then jumps.
  if (!state.hydrated) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 text-[12.5px] text-text-muted">
        <Loader2 size={15} className="animate-spin" />
        Loading conversation…
      </div>
    );
  }

  if (empty) {
    if (compact) {
      return (
        <div className="flex min-h-0 flex-1 flex-col" {...dropProps}>
          <div className="min-h-0 flex-1 overflow-y-auto">{emptyState}</div>
          <div className="shrink-0 px-3 pb-3">
            <div className="mx-auto w-full">{composer}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col" {...dropProps}>
        <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col justify-center px-4 py-10">
          <h1 className="text-center font-display text-[26px] font-semibold tracking-[-0.02em] text-text-primary">
            Where should we begin?
          </h1>
          <div className="mx-auto mt-6 w-full max-w-[700px]">{composer}</div>
          <div className="mx-auto mt-5 w-full max-w-[700px] space-y-1">
            {SUGGESTIONS.map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => startChat(label)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-text-secondary transition-colors hover:bg-black/[0.04] hover:text-text-primary"
              >
                <Icon size={16} className="shrink-0 text-text-muted" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const body = (
    <div className="flex min-h-0 flex-1 flex-col" {...dropProps}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {state.loadingOlder && (
          <div className="flex items-center justify-center gap-2 py-2 text-[11px] text-text-muted">
            <Loader2 size={12} className="animate-spin" />
            Loading older messages…
          </div>
        )}
        {messageList}
      </div>

      <div
        className={clsx(
          'shrink-0 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent',
          compact ? 'px-3 pb-2.5 pt-4' : 'px-4 pb-3 pt-6'
        )}
      >
        <div className={clsx('mx-auto w-full', compact ? 'max-w-full' : 'max-w-[760px]')}>
          {composer}
        </div>
        {!compact && (
          <p className="mt-2 text-center text-[10.5px] text-text-muted">
            AI can make mistakes. Everything it proposes waits for your approval in Review.
          </p>
        )}
      </div>
    </div>
  );

  return body;
}
