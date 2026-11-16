'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { apiErrorMessage } from '../../../../shared/api/errorMessage';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  Pencil,
  Server,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

export interface ProviderPreset {
  id: string;
  name: string;
  base_url: string;
  chat_model: string;
  has_api_key: boolean;
  api_key_hint: string;
}

export interface AISettings {
  quick_access: boolean;
  base_url: string;
  chat_model: string;
  context_budget_pct?: number;
  has_api_key: boolean;
  api_key_hint: string;
  api_key_length: number;
  has_firecrawl_key: boolean;
  firecrawl_key_hint: string;
  firecrawl_key_length: number;
  has_llama_key: boolean;
  llama_key_hint: string;
  llama_key_length: number;
  llama_tier: string;
}

const EMPTY: AISettings = {
  quick_access: true,
  base_url: '',
  chat_model: '',
  context_budget_pct: 60,
  has_api_key: false,
  api_key_hint: '',
  api_key_length: 0,
  has_firecrawl_key: false,
  firecrawl_key_hint: '',
  firecrawl_key_length: 0,
  has_llama_key: false,
  llama_key_hint: '',
  llama_key_length: 0,
  llama_tier: 'auto',
};

function VercelMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 76 65"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M37.527 0 75.055 65H0L37.527 0Z" />
    </svg>
  );
}

function OpenRouterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 730"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M795.893 0C915.776 0 1012.95 97.9963 1012.95 218.88C1012.95 339.764 915.776 437.76 795.893 437.76L1011.2 654.869C1038.55 682.447 1019.18 729.6 980.504 729.6H361.77C161.97 729.6 0 566.273 0 364.8C0 163.327 161.97 0 361.77 0L795.893 0ZM361.77 145.92C241.89 145.92 144.708 243.916 144.708 364.8C144.708 485.684 241.89 583.68 361.77 583.68C481.649 583.68 578.831 485.684 578.831 364.8C578.831 243.916 481.649 145.92 361.77 145.92Z" />
    </svg>
  );
}

const PROVIDER_TEMPLATES = [
  {
    id: 'vercel' as const,
    name: 'Vercel AI Gateway',
    base_url: 'https://ai-gateway.vercel.sh/v1',
  },
  {
    id: 'openrouter' as const,
    name: 'OpenRouter',
    base_url: 'https://openrouter.ai/api/v1',
  },
  { id: 'other' as const, name: '', base_url: '' },
];

const PARSE_TIERS = [
  { value: 'auto', label: 'Auto', detail: 'recommended' },
  { value: 'fast', label: 'Fast', detail: '1 credit/page' },
  { value: 'cost_effective', label: 'Cost-effective', detail: '3 credits/page' },
  { value: 'agentic', label: 'Agentic', detail: '10 credits/page' },
  { value: 'agentic_plus', label: 'Agentic Plus', detail: '45 credits/page' },
];

const inputClasses =
  'w-full rounded-xl border border-black/10 bg-black/[0.02] px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary focus:bg-white focus:ring-2 focus:ring-accent-primary/20';
const labelClasses =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text-muted';

export function AISettingsSection({
  initial = null,
  initialPresets = null,
}: {
  initial?: AISettings | null;
  initialPresets?: ProviderPreset[] | null;
}) {
  const [settings, setSettings] = useState<AISettings>(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [apiKey, setApiKey] = useState('');
  const [firecrawlKey, setFirecrawlKey] = useState('');
  const [showFirecrawlKey, setShowFirecrawlKey] = useState(false);
  const [firecrawlEditing, setFirecrawlEditing] = useState(false);
  const [revealingFirecrawl, setRevealingFirecrawl] = useState(false);
  const [llamaKey, setLlamaKey] = useState('');
  const [showLlamaKey, setShowLlamaKey] = useState(false);
  const [llamaEditing, setLlamaEditing] = useState(false);
  const [revealingLlama, setRevealingLlama] = useState(false);
  const [baselineLlamaKey, setBaselineLlamaKey] = useState('');
  const statusTimer = useRef<number | null>(null);
  const [credits, setCredits] = useState<{ remaining?: number; plan?: number } | null>(null);
  const [presetUsage, setPresetUsage] = useState<
    Record<
      string,
      { balance?: number; total_used?: number; error?: string }
    >
  >({});
  const [presets, setPresets] = useState<ProviderPreset[]>(initialPresets ?? []);
  const [presetsLoaded, setPresetsLoaded] = useState(initialPresets !== null);
  const [presetName, setPresetName] = useState('');
  const [providerFormOpen, setProviderFormOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState('');
  const [revealingKey, setRevealingKey] = useState(false);
  const [providerTemplate, setProviderTemplate] = useState<'vercel' | 'openrouter' | 'other'>(
    'other'
  );
  const [presetBusy, setPresetBusy] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presetToDelete, setPresetToDelete] = useState<ProviderPreset | null>(null);
  const [llamaUsage, setLlamaUsage] = useState<{
    remaining?: number;
    limit?: number;
    used?: number;
    plan?: string;
    error?: string;
  } | null>(null);
  const [webTest, setWebTest] = useState<
    | {
        state: 'idle' | 'running' | 'ok' | 'error';
        detail?: string;
        url?: string;
        credits?: { remaining?: number; plan?: number };
      }
    | null
  >(null);
  const [baselineFirecrawlKey, setBaselineFirecrawlKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSaving, setShowSaving] = useState(false);
  const [baseline, setBaseline] = useState<AISettings | null>(
    initial ? { ...EMPTY, ...initial } : null
  );
  const [baselineKey, setBaselineKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [tierOpen, setTierOpen] = useState(false);
  const tierBoxRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemoveKey, setConfirmRemoveKey] = useState<
    'ai' | 'firecrawl' | 'llama' | null
  >(null);
  const [testingKey, setTestingKey] = useState(false);
  const [keyTest, setKeyTest] = useState<{ ok: boolean; detail: string; models?: number } | null>(null);
  const [presetKeyTest, setPresetKeyTest] = useState<{
    id: string;
    ok: boolean;
    detail: string;
    models?: number;
  } | null>(null);
  const [testingPresetKey, setTestingPresetKey] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings/ai', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        const data = json?.data ?? json;
        if (!cancelled && data) {
          const loaded = { ...EMPTY, ...data };
          setSettings(loaded);
          setBaseline(loaded);
        }
      } catch {
        // keep defaults
      } finally {
        // nothing to gate: the form is rendered from the start
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial]);

  useEffect(() => {
    if (!settings.has_llama_key) {
      setLlamaUsage(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings/ai/llama-usage', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!cancelled) setLlamaUsage((json?.data ?? json) || null);
      } catch {
        if (!cancelled) setLlamaUsage(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings.has_llama_key, settings.llama_key_length]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/settings/ai/providers', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (res.ok && alive) {
          setPresets((json?.data ?? json ?? []) as ProviderPreset[]);
        }
      } catch {
        // ignore; saving still works
      } finally {
        if (alive) setPresetsLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const targets = presets.filter(
      (preset) =>
        preset.has_api_key &&
        /ai-gateway\.vercel\.sh|openrouter\.ai/i.test(preset.base_url)
    );
    if (targets.length === 0) {
      setPresetUsage({});
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        targets.map(async (preset) => {
          try {
            const res = await fetch(
              `/api/settings/ai/gateway-usage?preset_id=${encodeURIComponent(preset.id)}`,
              { cache: 'no-store' }
            );
            const json = await res.json().catch(() => ({}));
            const data = json?.data ?? json;
            if (
              !res.ok ||
              !data ||
              typeof data.balance !== 'number' ||
              data.error
            ) {
              return [preset.id, null] as const;
            }
            return [preset.id, data] as const;
          } catch {
            return [preset.id, null] as const;
          }
        })
      );
      if (!cancelled) {
        setPresetUsage(
          Object.fromEntries(
            entries.filter((entry): entry is readonly [string, any] =>
              Boolean(entry[1])
            )
          )
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [presets]);

  // A save takes ~30ms locally; showing "Saving…" that briefly would just
  // flicker. Only surface it if the request is actually slow.
  useEffect(() => {
    if (!saving) {
      setShowSaving(false);
      return;
    }
    const timer = window.setTimeout(() => setShowSaving(true), 250);
    return () => window.clearTimeout(timer);
  }, [saving]);

  const update = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const save = async (extra: Record<string, unknown> = {}) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: settings.base_url.trim(),
          chat_model: settings.chat_model.trim(),
          ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
          ...(firecrawlKey.trim() ? { firecrawl_api_key: firecrawlKey.trim() } : {}),
          ...(llamaKey.trim() ? { llama_api_key: llamaKey.trim() } : {}),
          llama_tier: settings.llama_tier,
          ...extra,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(apiErrorMessage(json, 'Save failed'));
      }
      const data = json?.data ?? json;
      const savedSettings = { ...EMPTY, ...data };
      setSettings(savedSettings);
      setBaseline(savedSettings);
      window.dispatchEvent(new CustomEvent('ai:provider-changed'));
      setBaselineKey('');
      setApiKey('');
      setFirecrawlKey('');
      setBaselineFirecrawlKey('');
      setFirecrawlEditing(false);
      setShowFirecrawlKey(false);
      setLlamaKey('');
      setBaselineLlamaKey('');
      setLlamaEditing(false);
      setShowLlamaKey(false);
      setShowApiKey(false);
    } catch (err: any) {
      setError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const reloadPresets = async () => {
    try {
      const res = await fetch('/api/settings/ai/providers', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setPresets((json?.data ?? json ?? []) as ProviderPreset[]);
    } catch {
      // keep the current list
    }
  };

  const applyProviderTemplate = (
    template: (typeof PROVIDER_TEMPLATES)[number]
  ) => {
    setProviderTemplate(template.id);
    setPresetName(template.name);
    update('base_url', template.base_url);
    setApiKey('');
    setShowApiKey(false);
    setKeyTest(null);
    setPresetKeyTest(null);
    setPresetError(null);
  };

  const startProvider = (template: (typeof PROVIDER_TEMPLATES)[number]) => {
    setEditingPresetId(null);
    setEditingKey('');
    applyProviderTemplate(template);
    setProviderFormOpen(true);
  };

  const fetchPresetKey = async (presetId: string) => {
    const res = await fetch(`/api/settings/ai/providers/${presetId}/reveal`, {
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(apiErrorMessage(json, 'Could not read the saved key'));
    }
    const key = json?.data?.api_key ?? json?.api_key ?? '';
    if (!key) throw new Error('There is no saved key to show');
    return String(key);
  };

  const startEditProvider = (preset: ProviderPreset) => {
    setEditingPresetId(preset.id);
    setEditingKey('');
    setProviderTemplate(
      /ai-gateway\.vercel\.sh/i.test(preset.base_url)
        ? 'vercel'
        : /openrouter\.ai/i.test(preset.base_url)
          ? 'openrouter'
          : 'other'
    );
    setPresetName(preset.name);
    update('base_url', preset.base_url);
    setApiKey('');
    setShowApiKey(false);
    setKeyTest(null);
    setPresetKeyTest(null);
    setPresetError(null);
    setProviderFormOpen(true);
    if (preset.has_api_key) {
      setRevealingKey(true);
      void (async () => {
        try {
          const key = await fetchPresetKey(preset.id);
          setApiKey(key);
          setEditingKey(key);
          setShowApiKey(false);
        } catch (err: any) {
          setPresetError(err?.message || 'Could not read the saved key');
        } finally {
          setRevealingKey(false);
        }
      })();
    }
  };

  const cancelProvider = () => {
    setProviderFormOpen(false);
    setEditingPresetId(null);
    setEditingKey('');
    setApiKey('');
    setShowApiKey(false);
    setKeyTest(null);
    setPresetKeyTest(null);
    setPresetName('');
    setPresetError(null);
    if (baseline) {
      setSettings((prev) => ({
        ...prev,
        base_url: baseline.base_url,
        chat_model: baseline.chat_model,
      }));
    }
  };

  const savePreset = async () => {
    if (!presetName.trim()) {
      setPresetError('Give this provider a name.');
      return;
    }
    if (!settings.base_url.trim()) {
      setPresetError('Set a base URL first.');
      return;
    }
    if (!apiKey.trim() && !editingPreset?.has_api_key) {
      setPresetError('Enter the API key for this provider.');
      return;
    }
    setPresetBusy('save');
    setPresetError(null);
    try {
      const editing = editingPresetId
        ? presets.find((preset) => preset.id === editingPresetId)
        : undefined;
      const existing =
        editing ??
        presets.find(
          (preset) => preset.base_url.trim() === settings.base_url.trim()
        );
      const wasActive = editing
        ? Boolean(
            baseline &&
              baseline.base_url.trim() === editing.base_url.trim() &&
              baseline.chat_model.trim() === editing.chat_model.trim()
          )
        : true;
      const baseChanged = editing
        ? editing.base_url.trim() !== settings.base_url.trim()
        : false;
      const res = await fetch(
        existing
          ? `/api/settings/ai/providers/${existing.id}`
          : '/api/settings/ai/providers',
        {
          method: existing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: presetName.trim(),
            base_url: settings.base_url.trim(),
            chat_model: editing
              ? baseChanged
                ? ''
                : editing.chat_model.trim()
              : existing?.chat_model.trim() || '',
            ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorMessage(json, 'Could not save provider'));
      const saved = json?.data;
      setPresetName('');
      setKeyTest(null);
      setPresetError(null);
      setEditingPresetId(null);
      setEditingKey('');
      setProviderFormOpen(false);
      void reloadPresets();
      if (saved?.id && wasActive) {
        await activatePreset(saved as ProviderPreset);
      }
    } catch (err: any) {
      setPresetError(err?.message || 'Could not save provider');
    } finally {
      setPresetBusy(null);
    }
  };

  const activatePreset = async (preset: ProviderPreset) => {
    setPresetBusy(preset.id);
    setPresetError(null);
    try {
      const res = await fetch(`/api/settings/ai/providers/${preset.id}/activate`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorMessage(json, 'Could not switch provider'));
      const data = json?.data ?? json;
      const loaded = { ...EMPTY, ...data };
      setSettings(loaded);
      setBaseline(loaded);
      window.dispatchEvent(new CustomEvent('ai:provider-changed'));
      setApiKey('');
      setBaselineKey('');
      setFirecrawlKey('');
      setBaselineFirecrawlKey('');
      setFirecrawlEditing(false);
      setShowFirecrawlKey(false);
      setLlamaKey('');
      setBaselineLlamaKey('');
      setLlamaEditing(false);
      setShowLlamaKey(false);
      setShowApiKey(false);
    } catch (err: any) {
      setPresetError(err?.message || 'Could not switch provider');
    } finally {
      setPresetBusy(null);
    }
  };

  const deletePreset = async () => {
    if (!presetToDelete) return;
    setPresetBusy(presetToDelete.id);
    try {
      const res = await fetch(`/api/settings/ai/providers/${presetToDelete.id}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorMessage(json, 'Could not delete provider'));
      const cleared = Boolean(json?.data?.cleared_active);
      setPresetToDelete(null);
      await reloadPresets();
      if (cleared) {
        const settingsRes = await fetch('/api/settings/ai', { cache: 'no-store' });
        const settingsJson = await settingsRes.json().catch(() => ({}));
        const data = settingsJson?.data ?? settingsJson;
        const loaded = { ...EMPTY, ...data };
        setSettings(loaded);
        setBaseline(loaded);
        setPresetUsage({});
        window.dispatchEvent(new CustomEvent('ai:provider-changed'));
        setProviderFormOpen(false);
      }
    } catch (err: any) {
      setPresetError(err?.message || 'Could not delete provider');
    } finally {
      setPresetBusy(null);
    }
  };

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!providerFormOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelProvider();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerFormOpen]);

  useEffect(() => {
    if (!tierOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!tierBoxRef.current?.contains(event.target as Node)) setTierOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTierOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [tierOpen]);

  const scheduleStatusClear = () => {
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => {
      setWebTest(null);
    }, 6000);
  };

  useEffect(() => {
    return () => {
      if (statusTimer.current) window.clearTimeout(statusTimer.current);
    };
  }, []);

  const testWebAccess = async () => {
    setWebTest({ state: 'running' });
    try {
      const res = await fetch('/api/settings/ai/test-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || 'Web access failed');
      const data = json?.data ?? json;
      if (data?.credits) setCredits(data.credits);
      setWebTest(
        data?.ok
          ? {
              state: 'ok',
              detail: data?.detail,
              url: data?.url,
              credits: data?.credits || undefined,
            }
          : { state: 'error', detail: data?.detail || 'Web access failed' }
      );
      scheduleStatusClear();
    } catch (err: any) {
      setWebTest({ state: 'error', detail: err?.message || 'Web access failed' });
      scheduleStatusClear();
    }
  };

  const toggleFirecrawlVisibility = async () => {
    if (showFirecrawlKey) {
      setShowFirecrawlKey(false);
      return;
    }
    if (!firecrawlKey && settings.has_firecrawl_key) {
      setRevealingFirecrawl(true);
      setError(null);
      try {
        const res = await fetch('/api/settings/ai/reveal', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(apiErrorMessage(json, 'Could not read the saved key'));
        }
        const key = json?.data?.firecrawl_api_key ?? '';
        if (!key) throw new Error('The saved key could not be read');
        setFirecrawlKey(key);
        setBaselineFirecrawlKey(key);
        setFirecrawlEditing(true);
        setShowFirecrawlKey(true);
      } catch (err: any) {
        setError(err?.message || 'Could not read the saved key');
      } finally {
        setRevealingFirecrawl(false);
      }
      return;
    }
    setShowFirecrawlKey(true);
  };

  const toggleLlamaVisibility = async () => {
    if (showLlamaKey) {
      setShowLlamaKey(false);
      return;
    }
    if (!llamaKey && settings.has_llama_key) {
      setRevealingLlama(true);
      setError(null);
      try {
        const res = await fetch('/api/settings/ai/reveal', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(apiErrorMessage(json, 'Could not read the saved key'));
        }
        const key = json?.data?.llama_api_key ?? '';
        if (!key) throw new Error('The saved key could not be read');
        setLlamaKey(key);
        setBaselineLlamaKey(key);
        setLlamaEditing(true);
        setShowLlamaKey(true);
      } catch (err: any) {
        setError(err?.message || 'Could not read the saved key');
      } finally {
        setRevealingLlama(false);
      }
      return;
    }
    setShowLlamaKey(true);
  };

  const toggleApiKeyVisibility = async () => {
    if (showApiKey) {
      setShowApiKey(false);
      return;
    }
    if (!apiKey && editingPreset?.has_api_key && editingPresetId) {
      setRevealingKey(true);
      setPresetError(null);
      try {
        const key = await fetchPresetKey(editingPresetId);
        setApiKey(key);
        setEditingKey(key);
        setShowApiKey(true);
      } catch (err: any) {
        setPresetError(err?.message || 'Could not read the saved key');
      } finally {
        setRevealingKey(false);
      }
      return;
    }
    setShowApiKey(true);
  };

  const testKey = async () => {
    setTestingKey(true);
    setKeyTest(null);
    setError(null);
    try {
      const res = await fetch('/api/settings/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          !apiKey.trim() &&
            editingPresetId &&
            editingPreset &&
            editingPreset.base_url.trim() === settings.base_url.trim()
            ? { preset_id: editingPresetId }
            : {
                base_url: settings.base_url.trim(),
                ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
              }
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorMessage(json, 'Key test failed'));
      const data = json?.data ?? json;
      setKeyTest({
        ok: true,
        detail: 'Key works',
        models: typeof data?.models === 'number' ? data.models : undefined,
      });
    } catch (err: any) {
      setKeyTest({ ok: false, detail: err?.message || 'Key test failed' });
    } finally {
      setTestingKey(false);
    }
  };

  const testPresetKey = async (preset: ProviderPreset) => {
    setTestingPresetKey(preset.id);
    setPresetKeyTest(null);
    setPresetError(null);
    try {
      const res = await fetch('/api/settings/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_id: preset.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorMessage(json, 'Key test failed'));
      const data = json?.data ?? json;
      setPresetKeyTest({
        id: preset.id,
        ok: true,
        detail: 'Key works',
        models: typeof data?.models === 'number' ? data.models : undefined,
      });
    } catch (err: any) {
      setPresetKeyTest({
        id: preset.id,
        ok: false,
        detail: err?.message || 'Key test failed',
      });
    } finally {
      setTestingPresetKey(null);
    }
  };

  const testOk = Boolean(keyTest?.ok);
  useEffect(() => {
    if (!testOk) return;
    const timer = window.setTimeout(() => setKeyTest(null), 3200);
    return () => window.clearTimeout(timer);
  }, [testOk]);

  const presetTestOk = Boolean(presetKeyTest?.ok);
  useEffect(() => {
    if (!presetTestOk) return;
    const timer = window.setTimeout(() => setPresetKeyTest(null), 3200);
    return () => window.clearTimeout(timer);
  }, [presetTestOk, presetKeyTest?.id]);

  const toggleQuickAccess = async (next: boolean) => {
    const previous = settings.quick_access;
    setSettings((prev) => ({ ...prev, quick_access: next }));
    setError(null);
    window.dispatchEvent(new CustomEvent('ai:quick-access', { detail: next }));
    try {
      const res = await fetch('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quick_access: next }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(apiErrorMessage(json, 'Could not update the quick access button'));
      }
    } catch (err: any) {
      setSettings((prev) => ({ ...prev, quick_access: previous }));
      window.dispatchEvent(new CustomEvent('ai:quick-access', { detail: previous }));
      setError(err?.message || 'Could not update the quick access button');
    }
  };

  const removeKey = async () => {
    await save({ clear_api_key: true });
  };


  const savedFirecrawlMask = '•'.repeat(Math.max(settings.firecrawl_key_length || 0, 12));
  const showSavedFirecrawl = !firecrawlKey && settings.has_firecrawl_key && !firecrawlEditing;
  const firecrawlFieldValue = showFirecrawlKey
    ? firecrawlKey
    : firecrawlKey
      ? '•'.repeat(firecrawlKey.length)
      : showSavedFirecrawl
        ? savedFirecrawlMask
        : '';
  const firecrawlDots = !showFirecrawlKey && firecrawlFieldValue !== '';

  const savedLlamaMask = '•'.repeat(Math.max(settings.llama_key_length || 0, 12));
  const showSavedLlama = !llamaKey && settings.has_llama_key && !llamaEditing;
  const llamaFieldValue = showLlamaKey
    ? llamaKey
    : llamaKey
      ? '•'.repeat(llamaKey.length)
      : showSavedLlama
        ? savedLlamaMask
        : '';
  const llamaDots = !showLlamaKey && llamaFieldValue !== '';

  const configured =
    Boolean(settings.has_api_key) &&
    settings.base_url.trim() !== '' &&
    settings.chat_model.trim() !== '';
  const statusLabel = configured ? 'Configured' : 'Not configured';

  const providerUsesActiveKey =
    Boolean(baseline) &&
    settings.base_url.trim() === (baseline?.base_url || '').trim();
  const canTestKey =
    /^https?:\/\//i.test(settings.base_url.trim()) &&
    Boolean(
      apiKey.trim() ||
        (!providerFormOpen && settings.has_api_key) ||
        (providerFormOpen && providerUsesActiveKey && settings.has_api_key)
    );

  const editingPreset = editingPresetId
    ? presets.find((preset) => preset.id === editingPresetId)
    : undefined;
  const activePresetId = (() => {
    const base = settings.base_url.trim();
    if (!base) return null;
    const matches = presets.filter(
      (preset) => preset.base_url.trim() === base
    );
    const exact = matches.find(
      (preset) => preset.chat_model.trim() === settings.chat_model.trim()
    );
    if (exact) return exact.id;
    return matches.length === 1 ? matches[0].id : null;
  })();

  const providerKeyChanged = apiKey.trim() !== editingKey.trim();
  const providerEditChanged =
    Boolean(editingPreset) &&
    (presetName.trim() !== editingPreset!.name.trim() ||
      settings.base_url.trim() !== editingPreset!.base_url.trim() ||
      providerKeyChanged);
  const canSaveProvider = Boolean(
    presetName.trim() &&
      settings.base_url.trim() &&
      (apiKey.trim() || editingPreset?.has_api_key) &&
      (!editingPreset || providerEditChanged)
  );

  const dirty =
    !providerFormOpen &&
    baseline !== null &&
    (settings.base_url.trim() !== baseline.base_url.trim() ||
      settings.chat_model.trim() !== baseline.chat_model.trim() ||
      apiKey !== baselineKey ||
      firecrawlKey !== baselineFirecrawlKey ||
      llamaKey !== baselineLlamaKey);

  return (
    <>
      <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div>
          <h2 className="mb-1 text-lg font-bold text-text-primary">AI assistant</h2>
          <p className="text-xs text-text-secondary">
            Answers store questions and reads distributor files. Nothing goes live without
            approval.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-bold',
              configured
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-black/5 bg-black/[0.04] text-text-secondary'
            )}
          >
            {statusLabel}
          </span>
          <label className="flex shrink-0 cursor-pointer items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Quick access
            </span>
            <input
              type="checkbox"
              checked={settings.quick_access}
              onChange={(e) => toggleQuickAccess(e.target.checked)}
              className="peer sr-only"
              aria-label="Show the floating AI button"
            />
            <span className="relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent-primary peer-checked:after:translate-x-4 peer-checked:after:border-white peer-focus:outline-none" />
          </label>
        </div>
      </div>

      <div className="space-y-4">
          <div className="space-y-5 rounded-2xl border border-black/5 bg-black/[0.01] p-5">
            <div>
              <div className="mb-1.5 flex h-[22px] items-center justify-between gap-3">
                <label className={`${labelClasses} mb-0`}>Firecrawl API key</label>
                {typeof credits?.remaining === 'number' && (
                  <span className="text-[11px] font-medium text-text-muted">
                    {credits.remaining.toLocaleString()}
                    {typeof credits.plan === 'number' &&
                      ` / ${credits.plan.toLocaleString()}`}{' '}
                    credits
                  </span>
                )}
              </div>
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={firecrawlFieldValue}
                    onChange={(event) => {
                      const next = event.target.value;
                      setFirecrawlEditing(true);
                      setFirecrawlKey(
                        showFirecrawlKey ? next : next.replace(/•/g, '')
                      );
                    }}
                    onFocus={(event) => event.currentTarget.select()}
                    onBlur={() => {
                      if (!firecrawlKey) setFirecrawlEditing(false);
                    }}
                    placeholder={
                      settings.has_firecrawl_key
                        ? 'Enter a new key to replace the saved one'
                        : 'fc-…'
                    }
                    aria-label="Firecrawl API key"
                    className={clsx(
                      inputClasses,
                      'pr-16',
                      firecrawlDots && 'tracking-[0.15em]'
                    )}
                  />
                  {settings.has_firecrawl_key && (
                    <button
                      type="button"
                      aria-label="Remove Firecrawl key"
                      title="Remove key"
                      onClick={() => {
                        setWebTest(null);
                        setConfirmRemoveKey('firecrawl');
                      }}
                      className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-0.5 text-danger/70 transition-colors hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleFirecrawlVisibility}
                    disabled={
                      revealingFirecrawl || (!firecrawlKey && !settings.has_firecrawl_key)
                    }
                    aria-label={
                      showFirecrawlKey ? 'Hide Firecrawl key' : 'Show Firecrawl key'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted transition-colors hover:text-text-primary disabled:opacity-40"
                  >
                    {revealingFirecrawl ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : showFirecrawlKey ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex h-[22px] items-center justify-between gap-3">
                <label className={`${labelClasses} mb-0`}>LlamaParse API key</label>
                {(typeof llamaUsage?.remaining === 'number' ||
                  typeof llamaUsage?.used === 'number') && (
                  <span className="text-[11px] font-medium text-text-muted">
                    {typeof llamaUsage?.remaining === 'number'
                      ? `${llamaUsage.remaining.toLocaleString()}${
                          typeof llamaUsage.limit === 'number'
                            ? ` / ${llamaUsage.limit.toLocaleString()}`
                            : ''
                        } credits`
                      : `${Number(llamaUsage?.used ?? 0).toLocaleString()} credits used`}
                  </span>
                )}
              </div>
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={llamaFieldValue}
                    onChange={(event) => {
                      const next = event.target.value;
                      setLlamaEditing(true);
                      setLlamaKey(showLlamaKey ? next : next.replace(/•/g, ''));
                    }}
                    onFocus={(event) => event.currentTarget.select()}
                    onBlur={() => {
                      if (!llamaKey) setLlamaEditing(false);
                    }}
                    placeholder={
                      settings.has_llama_key
                        ? 'Enter a new key to replace the saved one'
                        : 'llx-…'
                    }
                    aria-label="LlamaParse API key"
                    className={clsx(
                      inputClasses,
                      'pr-16',
                      llamaDots && 'tracking-[0.15em]'
                    )}
                  />
                  {settings.has_llama_key && (
                    <button
                      type="button"
                      aria-label="Remove LlamaParse key"
                      title="Remove key"
                      onClick={() => setConfirmRemoveKey('llama')}
                      className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-0.5 text-danger/70 transition-colors hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleLlamaVisibility}
                    disabled={
                      revealingLlama || (!llamaKey && !settings.has_llama_key)
                    }
                    aria-label={
                      showLlamaKey ? 'Hide LlamaParse key' : 'Show LlamaParse key'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted transition-colors hover:text-text-primary disabled:opacity-40"
                  >
                    {revealingLlama ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : showLlamaKey ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex h-[22px] items-center">
                <label className={`${labelClasses} mb-0`}>LlamaParse tier</label>
              </div>
              <div ref={tierBoxRef} className="relative">
                <button
                  type="button"
                  onClick={() => setTierOpen((value) => !value)}
                  className={clsx(
                    inputClasses,
                    'flex items-center justify-between gap-3 text-left',
                    tierOpen &&
                      'border-accent-primary/60 bg-white ring-2 ring-accent-primary/15'
                  )}
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-text-primary">
                      {PARSE_TIERS.find((tier) => tier.value === settings.llama_tier)
                        ?.label || 'Select a tier'}
                    </span>
                    <span className="shrink-0 text-[11px] text-text-muted">
                      {PARSE_TIERS.find((tier) => tier.value === settings.llama_tier)
                        ?.detail || ''}
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={clsx(
                      'shrink-0 text-text-muted transition-transform',
                      tierOpen && 'rotate-180'
                    )}
                  />
                </button>

                {tierOpen && (
                  <div className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-xl border border-border-color bg-bg-secondary p-1.5 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.45)]">
                    {PARSE_TIERS.map((tier) => {
                      const selected = settings.llama_tier === tier.value;
                      return (
                        <button
                          key={tier.value}
                          type="button"
                          onClick={() => {
                            update('llama_tier', tier.value);
                            setTierOpen(false);
                          }}
                          className={clsx(
                            'flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors hover:bg-accent-primary/[0.12]',
                            selected
                              ? 'bg-accent-primary/10 text-accent-primary'
                              : 'text-text-secondary hover:text-text-primary'
                          )}
                        >
                          <span className="flex min-w-0 items-baseline gap-2">
                            <span className="font-medium">{tier.label}</span>
                            <span className="text-[11px] text-text-muted">
                              {tier.detail}
                            </span>
                          </span>
                          {selected && (
                            <CheckCircle2 size={14} className="shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

        {!presetsLoaded ? (
          <div className="h-[74px] animate-pulse rounded-xl bg-bg-secondary/60" />
        ) : presets.length > 0 ? (
        <div className="rounded-2xl border border-black/5 bg-black/[0.01] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-bold text-text-primary">AI providers</h3>
              <p className="mt-0.5 text-[11.5px] text-text-muted">
                Connect a provider to power the assistant.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startProvider(PROVIDER_TEMPLATES[2])}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[12.5px] font-semibold text-text-muted transition-colors hover:bg-black/[0.04] hover:text-text-primary"
            >
              + Add provider
            </button>
          </div>

          {presetError && <p className="mt-2 text-[11.5px] text-danger">{presetError}</p>}

          <div className="mt-3 space-y-2">
            {presets.map((preset) => {
              const active = preset.id === activePresetId;
              const expanded = expandedPreset === preset.id;
              const brand = /ai-gateway\.vercel\.sh/i.test(preset.base_url)
                ? 'vercel'
                : /openrouter\.ai/i.test(preset.base_url)
                  ? 'openrouter'
                  : 'other';
              const subtitle = preset.has_api_key
                ? `key ${preset.api_key_hint}`
                : 'no key';
              return (
                <div
                  key={preset.id}
                  className="overflow-hidden rounded-xl bg-bg-secondary"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPreset(expanded ? null : preset.id)
                    }
                    aria-expanded={expanded}
                    className="group flex w-full items-center gap-3 px-3.5 py-3 text-left"
                  >
                    <span
                      className={clsx(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        brand === 'vercel'
                          ? 'bg-black/[0.05] text-text-primary'
                          : brand === 'openrouter'
                            ? 'bg-[#7624F4] text-white'
                            : 'bg-black/[0.04] text-text-muted'
                      )}
                    >
                      {brand === 'vercel' ? (
                        <VercelMark className="h-4 w-4" />
                      ) : brand === 'openrouter' ? (
                        <OpenRouterMark className="h-3.5 w-3.5" />
                      ) : (
                        <Server size={14} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[12.5px] font-semibold text-text-primary">
                          {preset.name}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[10.5px] text-text-muted">
                        {subtitle}
                      </span>
                    </span>
                    <span className="flex w-[48px] shrink-0 justify-end">
                      {active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-600">
                          <span className="h-1 w-1 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </span>
                    {(() => {
                      const usage = presetUsage[preset.id];
                      if (!usage || typeof usage.balance !== 'number') {
                        return null;
                      }
                      const label =
                        brand === 'openrouter' ? 'OpenRouter' : 'AI Gateway';
                      return (
                        <span
                          title={`${label}: $${usage.balance.toFixed(4)} left${
                            typeof usage.total_used === 'number'
                              ? ` · $${usage.total_used.toFixed(4)} used`
                              : ''
                          }`}
                          className="hidden shrink-0 items-center gap-1 rounded-full bg-black/[0.04] px-2 py-1 text-[10px] font-medium text-text-muted sm:inline-flex"
                        >
                          <Wallet size={11} />
                          ${usage.balance.toFixed(2)} left
                        </span>
                      );
                    })()}
                    <ChevronDown
                      size={15}
                      className={clsx(
                        'shrink-0 text-text-muted transition-all group-hover:text-text-primary',
                        expanded && 'rotate-180'
                      )}
                    />
                  </button>

                  <div
                    aria-hidden={!expanded}
                    inert={!expanded}
                    className={clsx(
                      'grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
                      expanded
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0'
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="px-3.5 pb-3 pt-1">
                      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                        <dl className="flex min-w-0 flex-1 flex-wrap items-start gap-x-8 gap-y-2">
                          <div className="min-w-0">
                            <dt className="text-[9.5px] font-semibold uppercase tracking-wider text-text-muted">
                              Endpoint
                            </dt>
                            <dd
                              title={preset.base_url}
                              className="mt-0.5 max-w-[520px] truncate text-[11.5px] text-text-secondary"
                            >
                              {preset.base_url}
                            </dd>
                          </div>
                          <div className="shrink-0">
                            <dt className="text-[9.5px] font-semibold uppercase tracking-wider text-text-muted">
                              API key
                            </dt>
                            <dd className="mt-0.5 text-[11.5px] text-text-secondary">
                              {preset.has_api_key
                                ? preset.api_key_hint
                                : 'Not saved'}
                            </dd>
                          </div>
                        </dl>
                        <div className="ml-auto flex shrink-0 items-center gap-2">
                          {!active && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!preset.has_api_key) {
                                  startEditProvider(preset);
                                  return;
                                }
                                void activatePreset(preset);
                              }}
                              disabled={presetBusy === preset.id}
                              aria-busy={presetBusy === preset.id}
                              className="inline-flex h-8 w-[58px] items-center justify-center gap-1 rounded-lg border border-border-color bg-white px-2.5 text-[11.5px] font-semibold text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
                            >
                              {presetBusy === preset.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                'Use'
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditProvider(preset)}
                            disabled={presetBusy === preset.id}
                            className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-semibold text-text-secondary transition-colors hover:bg-black/[0.04] hover:text-text-primary disabled:opacity-40"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void testPresetKey(preset)}
                            disabled={
                              !preset.has_api_key ||
                              testingPresetKey === preset.id
                            }
                            className={clsx(
                              'inline-flex h-8 w-[110px] shrink-0 items-center justify-center gap-1.5 rounded-lg border text-[11.5px] font-semibold transition-colors disabled:opacity-40',
                              presetKeyTest?.id === preset.id &&
                                presetKeyTest.ok
                                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600'
                                : 'border-border-color/70 bg-transparent text-text-muted hover:border-text-muted/40 hover:bg-black/[0.03] hover:text-text-primary'
                            )}
                          >
                            {testingPresetKey === preset.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : presetKeyTest?.id === preset.id &&
                              presetKeyTest.ok ? (
                              <CheckCircle2 size={11} />
                            ) : (
                              <KeyRound size={11} />
                            )}
                            {presetKeyTest?.id === preset.id &&
                            presetKeyTest.ok
                              ? 'Key works'
                              : 'Test key'}
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${preset.name}`}
                            onClick={() => setPresetToDelete(preset)}
                            disabled={presetBusy === preset.id}
                            className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-40"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </div>
                      {presetKeyTest?.id === preset.id &&
                        !presetKeyTest.ok && (
                          <p
                            className="mt-2 truncate text-[10.5px] text-danger"
                            title={presetKeyTest.detail}
                          >
                            {presetKeyTest.detail}
                          </p>
                        )}
                    </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        ) : (
          !providerFormOpen && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-black/[0.02] px-5 py-4">
              <div>
                <p className="text-[12px] font-semibold text-text-primary">
                  No provider connected
                </p>
                <p className="text-[10.5px] text-text-muted">
                  Add a base URL and key to get started.
                </p>
              </div>
              <button
                type="button"
                onClick={() => startProvider(PROVIDER_TEMPLATES[2])}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[12.5px] font-semibold text-text-muted transition-colors hover:bg-black/[0.04] hover:text-text-primary"
              >
                + Add provider
              </button>
            </div>
          )
        )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="mr-auto min-w-0 text-[12px]">
              {error ? (
                <span className="text-danger">{error}</span>
              ) : webTest?.state === 'ok' ? (
                <span className="inline-flex flex-wrap items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 size={13} />
                  Web access works · {webTest.detail}
                </span>
              ) : webTest?.state === 'error' ? (
                <span className="text-danger">{webTest.detail}</span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={testWebAccess}
              disabled={!settings.has_firecrawl_key || webTest?.state === 'running'}
              title={
                settings.has_firecrawl_key
                  ? 'Run a live search to check web access'
                  : 'Save the Firecrawl key first'
              }
              className="inline-flex h-10 min-w-[168px] items-center justify-center gap-2 rounded-xl border border-border-color bg-white px-4 text-[13px] font-semibold text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {webTest?.state === 'running' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Globe size={14} />
              )}
              Test web access
            </button>

            <button
              type="button"
              onClick={() => save()}
              disabled={saving || !dirty}
              title={
                dirty ? 'Save the changes' : 'No unsaved changes'
              }
              className={clsx(
                'inline-flex h-10 min-w-[136px] items-center justify-center gap-2 rounded-xl px-5 text-[13px] font-semibold transition-colors',
                dirty
                  ? 'bg-accent-primary text-white hover:bg-accent-primary/90'
                  : 'cursor-not-allowed border border-black/5 bg-black/[0.05] text-text-muted'
              )}
            >
              {showSaving && <Loader2 size={15} className="animate-spin" />}
              {showSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
      </section>

      {portalReady &&
        providerFormOpen &&
        createPortal(
          <div
            className="ai-modal-overlay fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) cancelProvider();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={editingPresetId ? 'Edit provider' : 'Add provider'}
              className="ai-modal-panel flex max-h-[calc(100vh-4rem)] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-border-color bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-border-color px-6 py-4">
                <div>
                  <h3 className="text-[15px] font-bold text-text-primary">
                    {editingPresetId ? 'Edit provider' : 'Add provider'}
                  </h3>
                  <p className="mt-0.5 text-[11.5px] text-text-muted">
                    {editingPresetId
                      ? 'Update this provider’s name, endpoint or key.'
                      : 'Connect a gateway or any OpenAI-compatible endpoint.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cancelProvider}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-5 overflow-y-auto px-6 py-5">
                <div>
                  <label className={labelClasses}>Provider</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {PROVIDER_TEMPLATES.map((template) => {
                      const selected = providerTemplate === template.id;
                      const detail =
                        template.id === 'vercel'
                          ? 'AI Gateway'
                          : template.id === 'openrouter'
                            ? 'Unified API'
                            : 'OpenAI-compatible';
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => applyProviderTemplate(template)}
                          disabled={Boolean(editingPresetId)}
                          className={clsx(
                            'flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                            selected
                              ? 'border-accent-primary/50 bg-transparent'
                              : 'border-border-color bg-bg-secondary/30 hover:border-text-muted/40 hover:bg-bg-secondary/60'
                          )}
                        >
                          <span
                            className={clsx(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                              template.id === 'vercel'
                                ? 'bg-black/[0.05] text-text-primary'
                                : template.id === 'openrouter'
                                  ? 'bg-[#7624F4] text-white'
                                  : 'bg-black/[0.04] text-text-muted'
                            )}
                          >
                            {template.id === 'vercel' ? (
                              <VercelMark className="h-3.5 w-3.5" />
                            ) : template.id === 'openrouter' ? (
                              <OpenRouterMark className="h-3 w-3" />
                            ) : (
                              <Server size={13} />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] font-semibold text-text-primary">
                              {template.name || 'Custom'}
                            </span>
                            <span className="block truncate text-[10.5px] text-text-muted">
                              {detail}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>Provider name</label>
                  <input
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    placeholder="e.g. OpenRouter personal"
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>API base URL</label>
                  <input
                    type="url"
                    value={settings.base_url}
                    onChange={(e) => update('base_url', e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>API key</label>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      type="text"
                      value={
                        showApiKey
                          ? apiKey
                          : apiKey
                            ? '•'.repeat(apiKey.length)
                            : ''
                      }
                      onChange={(e) => {
                        const next = e.target.value;
                        setApiKey(
                          showApiKey ? next : next.replace(/•/g, '')
                        );
                      }}
                      onFocus={(e) => e.currentTarget.select()}
                      placeholder={
                        editingPreset?.has_api_key && !apiKey
                          ? `Saved key ${editingPreset.api_key_hint} — leave blank to keep`
                          : 'sk-…'
                      }
                      autoComplete="new-password"
                      className={clsx(
                        inputClasses,
                        'pl-9 pr-10',
                        !showApiKey && apiKey && 'tracking-[0.15em]'
                      )}
                      aria-label="API key"
                    />
                    <button
                      type="button"
                      onClick={() => void toggleApiKeyVisibility()}
                      disabled={
                        revealingKey ||
                        (!apiKey && !editingPreset?.has_api_key)
                      }
                      aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted transition-colors hover:text-text-primary disabled:opacity-40"
                    >
                      {revealingKey ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : showApiKey ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-text-muted">
                    {editingPreset?.has_api_key
                      ? 'Leave blank to keep the saved key. Use Test key to verify it.'
                      : 'Stored encrypted. Use Test key to verify it before saving.'}
                  </p>
                </div>

                {(presetError || (keyTest && !keyTest.ok)) && (
                  <p className="flex max-h-24 items-start gap-1.5 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-danger/10 px-3 py-2 text-[11.5px] leading-relaxed text-danger [overflow-wrap:anywhere]">
                    <AlertCircle size={13} className="mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      {keyTest?.detail || presetError}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-color bg-bg-secondary/40 px-6 py-4">
                <button
                  type="button"
                  onClick={() => void testKey()}
                  disabled={testingKey || (!canTestKey && !testOk)}
                  className={clsx(
                    'inline-flex h-9 w-[110px] items-center justify-center gap-1.5 rounded-lg border text-[12px] font-semibold transition-colors disabled:opacity-50',
                    testOk
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600'
                      : 'border-border-color bg-white text-text-secondary hover:text-text-primary'
                  )}
                >
                  {testingKey ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : testOk ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <KeyRound size={12} />
                  )}
                  {testOk ? 'Key works' : 'Test key'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelProvider}
                    className="inline-flex h-9 items-center rounded-lg px-3 text-[12px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void savePreset()}
                    disabled={presetBusy === 'save' || !canSaveProvider}
                    className={clsx(
                      'inline-flex h-9 min-w-[132px] items-center justify-center gap-1.5 rounded-lg px-4 text-[12px] font-semibold transition-colors',
                      canSaveProvider && presetBusy !== 'save'
                        ? 'bg-accent-primary text-white hover:bg-accent-primary/90'
                        : 'cursor-not-allowed border border-black/5 bg-black/[0.05] text-text-muted'
                    )}
                  >
                    {presetBusy === 'save' && (
                      <Loader2 size={12} className="animate-spin" />
                    )}
                    Save provider
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      <ConfirmDialog
        open={Boolean(presetToDelete)}
        title="Delete this saved provider?"
        tone="danger"
        confirmLabel="Delete provider"
        message={
          presetToDelete
            ? `“${presetToDelete.name}” and its saved key will be removed.`
            : ''
        }
        onConfirm={() => void deletePreset()}
        onClose={() => setPresetToDelete(null)}
      />

      <ConfirmDialog
        open={confirmRemoveKey !== null}
        title={
          confirmRemoveKey === 'firecrawl'
            ? 'Remove the Firecrawl key?'
            : confirmRemoveKey === 'llama'
              ? 'Remove the LlamaParse key?'
              : 'Remove the saved API key?'
        }
        tone="danger"
        confirmLabel="Remove key"
        message={
          confirmRemoveKey === 'firecrawl'
            ? 'Web access stops working until you add a new Firecrawl key.'
            : confirmRemoveKey === 'llama'
              ? 'Document parsing stops working until you add a new LlamaParse key.'
              : 'The key is deleted from the database and the assistant stops answering until you add a new one.'
        }
        onConfirm={() => {
          if (confirmRemoveKey === 'firecrawl') {
            void save({ clear_firecrawl_key: true });
          } else if (confirmRemoveKey === 'llama') {
            void save({ clear_llama_key: true });
          } else {
            void removeKey();
          }
        }}
        onClose={() => setConfirmRemoveKey(null)}
      />
    </>
  );
}
