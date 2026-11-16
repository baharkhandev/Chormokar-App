'use client';

export interface ChatAttachment {
  name: string;
  size: number;
  type: string;
  /** Base64 data URL, only present while sending. */
  data?: string;
}

export interface ModelCapabilities {
  id: string;
  name: string;
  input: string[];
  output: string[];
  tools: boolean;
  structured_output: boolean;
  reasoning: boolean;
  web_search: boolean;
  paid?: boolean;
  locked?: boolean;
  lock_reason?: string;
  files?: boolean;
  files_native?: boolean;
  source?: 'api' | 'inferred';
  context_window?: number | null;
  max_tokens?: number | null;
  free?: boolean;
}

export interface ChatUsage {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  cached_tokens?: number | null;
  reasoning_tokens?: number | null;
  cost?: number | null;
  context_window?: number | null;
  context_dropped?: number;
  context_compacted?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachment?: ChatAttachment;
  usage?: ChatUsage;
  model?: string;
  createdAt: number;
}

interface ChatState {
  open: boolean;
  busy: boolean;
  messages: ChatMessage[];
  hydrated: boolean;
  model: string | null;
  defaultModel: string | null;
  modelCatalog: Record<string, ModelCapabilities>;
  catalogLoaded: boolean;
  providerBaseUrl: string | null;
  contextBudgetPct: number;
  hasMore: boolean;
  loadingOlder: boolean;
}

const CHAT_MODEL_KEY = 'tp_ai_chat_model';

const REVIEW_TOOLS = new Set([
  'update_review_item',
  'update_review_items',
  'delete_review_item',
  'delete_review_items',
]);

let state: ChatState = {
  open: false,
  busy: false,
  messages: [],
  hydrated: false,
  model: null,
  defaultModel: null,
  modelCatalog: {},
  catalogLoaded: false,
  providerBaseUrl: null,
  contextBudgetPct: 60,
  hasMore: false,
  loadingOlder: false,
};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(patch: Partial<ChatState>) {
  state = { ...state, ...patch };
  emit();
}

interface ApiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  model?: string;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  cached_tokens?: number | null;
  reasoning_tokens?: number | null;
  cost?: number | null;
  context_window?: number | null;
  context_dropped?: number;
  context_compacted?: number;
}

function toChatMessage(message: ApiMessage): ChatMessage {
  return {
    id: String(message.id),
    role: message.role,
    content: message.content,
    model: message.model,
    usage: {
      prompt_tokens: message.prompt_tokens,
      completion_tokens: message.completion_tokens,
      total_tokens: message.total_tokens,
      cached_tokens: message.cached_tokens,
      reasoning_tokens: message.reasoning_tokens,
      cost: message.cost,
      context_window: message.context_window,
      context_dropped: message.context_dropped,
      context_compacted: message.context_compacted,
    },
    createdAt: new Date(message.created_at).getTime(),
  };
}

function markModelLocked(model: string, reason: string) {
  const caps = state.modelCatalog[model];
  setState({
    modelCatalog: {
      ...state.modelCatalog,
      [model]: {
        ...(caps ?? {
          id: model,
          name: model,
          input: ['text'],
          output: ['text'],
          tools: false,
          structured_output: false,
          reasoning: false,
          web_search: false,
        }),
        locked: true,
        lock_reason: reason,
      },
    },
  });
}

function patchMessage(id: string, patch: Partial<ChatMessage>) {
  setState({
    messages: state.messages.map((message) =>
      message.id === id ? { ...message, ...patch } : message
    ),
  });
}

/**
 * A single typewriter pump per message. Provider tokens are written into the
 * target buffer; the pump reveals them at a steady, chat-like pace and speeds
 * up only when the backlog would take too long to drain.
 */
interface Writer {
  id: string;
  target: string;
  shown: number;
  closed: boolean;
  raf: number | null;
  lastTs: number;
  lastCount: number;
  resolve: (() => void) | null;
}

let activeWriter: Writer | null = null;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );
}

function writerFor(id: string): Writer {
  if (activeWriter && activeWriter.id === id) return activeWriter;
  if (activeWriter?.raf) cancelAnimationFrame(activeWriter.raf);

  const writer: Writer = {
    id,
    target: '',
    shown: 0,
    closed: false,
    raf: null,
    lastTs: 0,
    lastCount: -1,
    resolve: null,
  };
  activeWriter = writer;

  const loop = (timestamp: number) => {
    if (activeWriter !== writer) return;
    if (!writer.lastTs) writer.lastTs = timestamp;
    const dt = Math.min(80, timestamp - writer.lastTs) / 1000;
    writer.lastTs = timestamp;

    const backlog = writer.target.length - writer.shown;
    if (backlog > 0) {
      // Steady, chat-like pace (~110 chars/s). Very long answers speed up
      // just enough to finish within roughly nine seconds.
      const speed = Math.max(110, writer.target.length / 9);
      writer.shown = Math.min(writer.target.length, writer.shown + speed * dt);
      const count = Math.floor(writer.shown);
      if (count !== writer.lastCount) {
        writer.lastCount = count;
        patchMessage(writer.id, { content: writer.target.slice(0, count) });
      }
    }

    if (writer.shown < writer.target.length || !writer.closed) {
      writer.raf = requestAnimationFrame(loop);
      return;
    }

    writer.raf = null;
    const resolve = writer.resolve;
    writer.resolve = null;
    resolve?.();
  };

  writer.raf = requestAnimationFrame(loop);
  return writer;
}

function writeToWriter(id: string, text: string) {
  const writer = writerFor(id);
  writer.target += text;
}

function finishWriter(id: string, finalText?: string): Promise<void> {
  const writer = writerFor(id);
  if (typeof finalText === 'string') writer.target = finalText;
  writer.closed = true;
  if (writer.shown >= writer.target.length) return Promise.resolve();
  return new Promise((resolve) => {
    writer.resolve = resolve;
  });
}

function cancelWriter() {
  const writer = activeWriter;
  if (writer?.raf) cancelAnimationFrame(writer.raf);
  writer?.resolve?.();
  activeWriter = null;
}

function aiError(json: unknown, fallback: string): string {
  const payload = (json ?? {}) as {
    detail?: unknown;
    error?: unknown;
    message?: unknown;
  };

  // The API wraps errors as { error: { code, message, details } } — prefer the
  // message, never the code (that is how "NOT_ACCEPTABLE" leaked into a reply).
  const error = payload.error;
  if (typeof payload.detail === 'string' && payload.detail.trim()) return payload.detail;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const wrapped = error as Record<string, unknown>;
    if (typeof wrapped.message === 'string' && wrapped.message.trim()) return wrapped.message;
    if (typeof wrapped.detail === 'string' && wrapped.detail.trim()) return wrapped.detail;
  }
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
  return fallback;
}

function readPage(json: unknown): { messages: ApiMessage[]; hasMore: boolean } {
  const payload = (json as { data?: unknown })?.data ?? json;
  if (Array.isArray(payload)) {
    return { messages: payload as ApiMessage[], hasMore: false };
  }
  const data = payload as { messages?: unknown; has_more?: unknown };
  return {
    messages: Array.isArray(data?.messages) ? (data.messages as ApiMessage[]) : [],
    hasMore: Boolean(data?.has_more),
  };
}

export function subscribeChat(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getChatState(): ChatState {
  return state;
}

let hydratePromise: Promise<void> | null = null;

export function hydrateChat() {
  if (state.hydrated) return;
  if (hydratePromise) return;

  hydratePromise = (async () => {
    try {
      const res = await fetch('/api/ai/chat?limit=40', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      const page = readPage(json);
      setState({
        messages: page.messages.map(toChatMessage),
        hasMore: page.hasMore,
        hydrated: true,
      });
    } catch {
      setState({ hydrated: true });
    } finally {
      hydratePromise = null;
    }
  })();
}

export function openChat() {
  setState({ open: true });
}

export function closeChat() {
  setState({ open: false });
}

export function toggleChat() {
  setState({ open: !state.open });
}

export function setChatModel(model: string | null) {
  const next = model || null;
  try {
    if (next) window.localStorage.setItem(CHAT_MODEL_KEY, next);
    else window.localStorage.removeItem(CHAT_MODEL_KEY);
  } catch {
    // storage can be unavailable; the in-memory selection still works
  }
  setState({ model: next });
  if (next) {
    // Keep the saved extraction/default model in step with the chat choice.
    fetch('/api/settings/ai', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_model: next }),
    }).catch(() => {
      // The per-turn model still works if saving the default fails.
    });
  }
}

export function setDefaultChatModel(model: string | null) {
  setState({ defaultModel: model || null });
}

export function setModelCatalog(
  catalog: Record<string, ModelCapabilities>,
  defaultModel?: string,
  baseUrl?: string,
  contextBudgetPct?: number
) {
  const nextBase = baseUrl || state.providerBaseUrl;
  const providerChanged =
    Boolean(nextBase) &&
    Boolean(state.providerBaseUrl) &&
    nextBase !== state.providerBaseUrl;
  const known = Object.keys(catalog);
  const nextModel =
    state.model && known.includes(state.model) ? state.model : null;
  const nextDefault =
    defaultModel && known.includes(defaultModel) ? defaultModel : null;
  if (providerChanged || !nextModel) {
    try {
      window.localStorage.removeItem(CHAT_MODEL_KEY);
    } catch {
      // storage unavailable
    }
  }
  setState({
    modelCatalog: catalog,
    defaultModel: providerChanged ? null : nextDefault,
    catalogLoaded: true,
    providerBaseUrl: nextBase || null,
    model: providerChanged ? null : nextModel,
    ...(typeof contextBudgetPct === 'number'
      ? { contextBudgetPct }
      : {}),
  });
}

/**
 * Load the active provider's model catalogue once. The composer uses it to
 * enable only the attachments the selected model actually accepts.
 */
export async function loadModelCatalog(force = false) {
  if (state.catalogLoaded && !force) return;
  try {
    const res = await fetch('/api/settings/ai/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const data = json?.data ?? json;
    const catalog = (data?.model_info ?? {}) as Record<string, ModelCapabilities>;
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
  } catch {
    // the composer stays text-only until a catalog can be loaded
  }
}


export async function refreshChat() {
  try {
    const res = await fetch('/api/ai/chat?limit=40', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    const page = readPage(json);
    setState({
      messages: page.messages.map(toChatMessage),
      hasMore: page.hasMore,
      hydrated: true,
    });
  } catch {
    // keep current thread on failure
  }
}

export async function loadOlderChat() {
  if (!state.hasMore || state.loadingOlder || state.messages.length === 0) {
    return;
  }
  const oldest = state.messages.find((message) => /^\d+$/.test(String(message.id)));
  if (!oldest) return;
  setState({ loadingOlder: true });
  try {
    const res = await fetch(
      `/api/ai/chat?limit=40&before=${encodeURIComponent(String(oldest.id))}`,
      { cache: 'no-store' },
    );
    const json = await res.json().catch(() => ({}));
    const page = readPage(json);
    if (!res.ok) {
      setState({ loadingOlder: false });
      return;
    }
    const known = new Set(state.messages.map((message) => String(message.id)));
    const older = page.messages
      .map(toChatMessage)
      .filter((message) => !known.has(String(message.id)));
    setState({
      messages: [...older, ...state.messages],
      hasMore: page.hasMore,
      loadingOlder: false,
    });
  } catch {
    setState({ loadingOlder: false });
  }
}

export async function clearChat() {
  setState({ messages: [], hasMore: false, loadingOlder: false });
  try {
    await fetch('/api/ai/chat', { method: 'DELETE' });
  } catch {
    // the server copy will reappear on the next reload if this failed
  }
}

export async function sendChatMessage(text: string, attachment?: ChatAttachment) {
  if (state.busy) return;
  const body = (text || '').trim();
  if (!body && !attachment) return;

  const content = body || `Uploaded ${attachment?.name ?? 'a file'}`;
  const optimistic: ChatMessage = {
    id: `local-${Date.now()}`,
    role: 'user',
    content,
    attachment: attachment
      ? {
          name: attachment.name,
          size: attachment.size,
          type: attachment.type,
        }
      : undefined,
    createdAt: Date.now(),
  };
  const streamId = `stream-${Date.now()}`;

  // The assistant bubble starts empty and fills in as tokens arrive.
  setState({
    messages: [
      ...state.messages,
      optimistic,
      { id: streamId, role: 'assistant', content: '', createdAt: Date.now() },
    ],
    busy: true,
  });

  const selectedModel = state.model;
  const apiAttachment = attachment?.data
    ? { name: attachment.name, mime: attachment.type, data: attachment.data }
    : undefined;

  const animate = !prefersReducedMotion();

  const fallbackToBlocking = async () => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: body,
        ...(selectedModel ? { model: selectedModel } : {}),
        ...(apiAttachment ? { attachment: apiAttachment } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(aiError(json, 'The assistant could not answer that.'));
    const data = (json as { data?: ApiMessage })?.data ?? (json as ApiMessage);
    const finalText = typeof data?.content === 'string' ? data.content : '';
    if (animate) {
      await finishWriter(streamId, finalText);
    } else {
      patchMessage(streamId, { content: finalText });
    }
    patchMessage(streamId, {
      id: data?.id ? String(data.id) : streamId,
      model: data?.model,
      usage: {
        prompt_tokens: data?.prompt_tokens,
        completion_tokens: data?.completion_tokens,
        total_tokens: data?.total_tokens,
        cached_tokens: data?.cached_tokens,
        reasoning_tokens: data?.reasoning_tokens,
        cost: data?.cost,
        context_window: data?.context_window,
        context_dropped: data?.context_dropped,
        context_compacted: data?.context_compacted,
      },
    });
  };

  try {
    const res = await fetch('/api/ai/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: body,
        ...(selectedModel ? { model: selectedModel } : {}),
        ...(apiAttachment ? { attachment: apiAttachment } : {}),
      }),
    });

    if (!res.ok || !res.body) {
      const json = await res.json().catch(() => ({}));
      // Older backend without the SSE route: fall back once.
      if (res.status === 404 || res.status === 405) {
        await fallbackToBlocking();
        return;
      }
      throw new Error(aiError(json, 'The assistant could not answer that.'));
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamed = '';
    let deltaCount = 0;
    let finished = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        const lines = block.split('\n');
        const eventLine = lines.find((line) => line.startsWith('event:'));
        const dataLine = lines.find((line) => line.startsWith('data:'));
        if (!dataLine) continue;

        const event = eventLine ? eventLine.slice(6).trim() : 'message';
        let eventData: any = null;
        try {
          eventData = JSON.parse(dataLine.slice(5).trim());
        } catch {
          continue;
        }

        if (event === 'delta' && typeof eventData?.text === 'string') {
          deltaCount += 1;
          streamed += eventData.text;
          if (animate) writeToWriter(streamId, eventData.text);
          else patchMessage(streamId, { content: streamed });
        } else if (event === 'done') {
          finished = true;
          const finalText =
            typeof eventData?.content === 'string' && eventData.content
              ? eventData.content
              : streamed;

          // Provider ignored stream=true (or the proxy buffered it): animate
          // the text as if it had streamed.
          if (animate) {
            await finishWriter(streamId, finalText);
          } else {
            patchMessage(streamId, { content: finalText });
          }

          patchMessage(streamId, {
            id: eventData?.id ? String(eventData.id) : streamId,
            model: eventData?.model,
            usage: eventData?.usage ?? undefined,
            createdAt: eventData?.created_at
              ? new Date(eventData.created_at).getTime()
              : Date.now(),
          });

          // The assistant may have edited or deleted AI Upload proposals, so
          // tell any open review table to refetch instead of staying stale.
          const tools: string[] = Array.isArray(eventData?.tools)
            ? eventData.tools
            : [];
          if (tools.some((name) => REVIEW_TOOLS.has(name))) {
            window.dispatchEvent(new CustomEvent('ai:review-changed'));
          }
        } else if (event === 'error') {
          throw new Error(eventData?.message || 'The assistant could not answer that.');
        }
      }
    }

    if (!finished && !streamed) {
      throw new Error('The assistant returned an empty answer.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The assistant is unavailable.';
    const lockedModel = selectedModel || state.defaultModel;
    if (
      lockedModel &&
      /free tier|paid credits|requires credits|payment required|do not have access|not have access|insufficient credits/i.test(
        message
      )
    ) {
      markModelLocked(lockedModel, message);
    }
    const partial = state.messages.find((item) => item.id === streamId)?.content ?? '';
    cancelWriter();
    if (!partial) patchMessage(streamId, { content: message });
  } finally {
    setState({ busy: false });
  }
}

export async function setContextBudgetPct(value: number) {
  const pct = Math.max(10, Math.min(90, Math.round(value)));
  setState({ contextBudgetPct: pct });
  try {
    await fetch('/api/settings/ai', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_budget_pct: pct }),
    });
  } catch {
    // the next load will restore the server value
  }
}

export async function refreshChatProvider() {
  try {
    const res = await fetch('/api/settings/ai', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    const data = json?.data ?? json;
    const baseUrl = String(data?.base_url || '');
    if (!state.catalogLoaded || baseUrl !== (state.providerBaseUrl || '')) {
      await loadModelCatalog(true);
    }
  } catch {
    // keep the current catalogue; the next focus will retry
  }
}

// Screen position of the floating button when the panel opened, used for the
// GSAP grow/shrink origin.
let fabAnchor: { x: number; y: number } | null = null;

export function setFabAnchor(anchor: { x: number; y: number } | null) {
  fabAnchor = anchor;
}

export function getFabAnchor() {
  return fabAnchor;
}
