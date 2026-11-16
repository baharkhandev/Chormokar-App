'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Truck, Loader2, AlertCircle, Check, RotateCcw, MapPin, Scale } from 'lucide-react';
import clsx from 'clsx';
import { useAdminFetch } from '../../../../shared/api/useAdminFetch';
import { apiErrorMessage } from '../../../../shared/api/errorMessage';

export interface DeliveryRouteRate {
  name: string;
  tier_0_500g: number;
  tier_500g_1kg: number;
  tier_1_2kg: number;
  extra_per_kg: number;
}

export type DeliveryRatesMatrix = Record<string, DeliveryRouteRate>;

export interface CheckoutRules {
  delivery_fee_enabled: boolean;
  delivery_fee_amount: string;
  delivery_rates?: DeliveryRatesMatrix;
}

const DEFAULT_RATES: DeliveryRatesMatrix = {
  inside_dhaka: {
    name: 'Inside Dhaka to Inside Dhaka',
    tier_0_500g: 60,
    tier_500g_1kg: 70,
    tier_1_2kg: 90,
    extra_per_kg: 20,
  },
  dhaka_suburbs: {
    name: 'Inside Dhaka to Suburbs',
    tier_0_500g: 80,
    tier_500g_1kg: 100,
    tier_1_2kg: 130,
    extra_per_kg: 25,
  },
  outside_dhaka: {
    name: 'Inside Dhaka to Outside Dhaka',
    tier_0_500g: 110,
    tier_500g_1kg: 130,
    tier_1_2kg: 170,
    extra_per_kg: 30,
  },
};

const ROUTE_CONFIG = [
  {
    key: 'inside_dhaka',
    title: 'Inside Dhaka to Inside Dhaka',
    subtitle: 'Mirpur, Uttara, Gulshan, Dhanmondi, Mohammadpur, etc.',
    badge: 'Inside Dhaka',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    key: 'dhaka_suburbs',
    title: 'Inside Dhaka to Suburbs',
    subtitle: 'Savar, Keraniganj, Dhamrai, Dohar, Gazipur, Narayanganj',
    badge: 'Dhaka Suburbs',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    key: 'outside_dhaka',
    title: 'Inside Dhaka to Outside Dhaka',
    subtitle: 'Chattogram, Sylhet, Rajshahi, Khulna, Barishal, etc.',
    badge: 'Outside Dhaka',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];

const Toggle = ({
  enabled,
  label,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  label: string;
  onToggle: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    disabled={disabled}
    onClick={onToggle}
    className={clsx(
      'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40',
      enabled ? 'bg-accent-primary' : 'bg-black/15',
      disabled && 'opacity-50'
    )}
  >
    <span
      className={clsx(
        'h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
        enabled ? 'translate-x-6' : 'translate-x-1'
      )}
    />
  </button>
);

function ratesFromRules(rules: CheckoutRules | null): DeliveryRatesMatrix {
  const merged: DeliveryRatesMatrix = { ...DEFAULT_RATES };
  if (rules?.delivery_rates && typeof rules.delivery_rates === 'object') {
    for (const [key, value] of Object.entries(rules.delivery_rates)) {
      if (value && typeof value === 'object') {
        merged[key] = { ...DEFAULT_RATES[key], ...value };
      }
    }
  }
  return merged;
}

export function CheckoutRulesCard({
  embedded = false,
  initial = null,
}: { embedded?: boolean; initial?: CheckoutRules | null } = {}) {
  const adminFetch = useAdminFetch();
  const [rules, setRules] = useState<CheckoutRules | null>(initial);
  const [rates, setRates] = useState<DeliveryRatesMatrix>(() => ratesFromRules(initial));
  const [fallbackAmount, setFallbackAmount] = useState(
    String(Number(initial?.delivery_fee_amount) || 120)
  );
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const requestSeq = useRef(0);

  const applyRules = useCallback((data: CheckoutRules) => {
    setRules(data);
    setFallbackAmount(String(Number(data.delivery_fee_amount) || 120));
    if (data.delivery_rates && typeof data.delivery_rates === 'object') {
      const merged: DeliveryRatesMatrix = { ...DEFAULT_RATES };
      for (const [key, value] of Object.entries(data.delivery_rates)) {
        if (value && typeof value === 'object') {
          merged[key] = { ...DEFAULT_RATES[key], ...value };
        }
      }
      setRates(merged);
    } else {
      setRates(DEFAULT_RATES);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminFetch('/api/settings/checkout');
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(apiErrorMessage(json, 'Could not load checkout rules.'));
          setLoadFailed(true);
          return;
        }
        applyRules((json.data ?? json) as CheckoutRules);
        setError(null);
        setLoadFailed(false);
      } catch {
        setError('Could not reach the server to load checkout rules.');
        setLoadFailed(true);
      }
    };

    if (initial) {
      applyRules(initial);
    } else {
      void load();
    }
    const onUpdate = () => void load();
    window.addEventListener('checkout-settings-updated', onUpdate);
    return () => window.removeEventListener('checkout-settings-updated', onUpdate);
  }, [adminFetch, applyRules, initial, reloadKey]);

  const save = async (patch: Partial<CheckoutRules>, options?: { isMatrix?: boolean }) => {
    if (!rules) return;
    const previous = rules;
    const seq = ++requestSeq.current;

    setRules({ ...rules, ...patch } as CheckoutRules);
    if (options?.isMatrix) {
      setSavingMatrix(true);
      setSavedSuccess(false);
    }
    setError(null);

    try {
      const res = await adminFetch('/api/settings/checkout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (seq !== requestSeq.current) return;
      if (!res.ok) {
        setRules(previous);
        setError(apiErrorMessage(json, 'Could not save settings. Please try again.'));
        return;
      }
      const data = (json.data ?? json) as CheckoutRules;
      applyRules(data);
      if (options?.isMatrix) {
        setSavedSuccess(true);
        window.setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch {
      if (seq === requestSeq.current) {
        setRules(previous);
        setError('Could not reach the server. Please try again.');
      }
    } finally {
      if (options?.isMatrix) setSavingMatrix(false);
    }
  };

  const updateRateCell = (routeKey: string, field: keyof DeliveryRouteRate, rawValue: string) => {
    const val = rawValue === '' ? 0 : Math.max(0, parseInt(rawValue, 10) || 0);
    setRates((prev) => {
      const currentRoute = prev[routeKey] ?? DEFAULT_RATES[routeKey];
      return {
        ...prev,
        [routeKey]: {
          ...currentRoute,
          [field]: val,
        },
      };
    });
  };

  const handleSaveRates = () => {
    void save(
      {
        delivery_rates: rates,
        delivery_fee_amount: fallbackAmount,
      },
      { isMatrix: true }
    );
  };

  const handleResetToDefaults = () => {
    setRates(DEFAULT_RATES);
  };

  return (
    <section className={embedded ? '' : 'rounded-2xl border border-border-color bg-white p-6 shadow-sm'}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
            <Truck size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Delivery charges & checkout rules</h2>
            <p className="mt-0.5 text-[12px] text-text-secondary">
              Configure dynamic delivery charges based on delivery route and weight brackets (0–500 gm, 500 gm–1 kg, 1–2 kg).
            </p>
          </div>
        </div>
      </div>

      {!rules ? (
        loadFailed ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-danger/20 bg-danger/[0.06] px-4 py-3">
            <AlertCircle size={15} className="text-danger" />
            <p className="text-[12.5px] text-danger">{error || 'Could not load checkout rules.'}</p>
            <button
              type="button"
              onClick={() => {
                setLoadFailed(false);
                setReloadKey((value) => value + 1);
              }}
              className="rounded-lg border border-border-color bg-white px-3 py-1 text-[12px] font-semibold text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
            >
              Retry
            </button>
          </div>
        ) : (
          <p className="mt-6 text-[12.5px] text-text-secondary">Loading checkout rules…</p>
        )
      ) : (
        <div className="mt-6 space-y-5">
          {/* Main Delivery Fee Toggle */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border-color bg-bg-secondary/40 px-4 py-3">
            <div>
              <p className="text-[12.5px] font-semibold text-text-primary">Charge delivery fee</p>
              <p className="text-[11.5px] text-text-secondary">
                When enabled, delivery fees are calculated from the location and weight matrix below. Turn off for free delivery.
              </p>
            </div>
            <Toggle
              label="Charge a delivery fee"
              enabled={rules.delivery_fee_enabled}
              onToggle={() =>
                void save(
                  { delivery_fee_enabled: !rules.delivery_fee_enabled }
                )
              }
            />
          </div>

          {/* Delivery Matrix Table Card */}
          <div
            className={clsx(
              'rounded-xl border border-border-color bg-white p-4 sm:p-5 transition-opacity',
              !rules.delivery_fee_enabled && 'pointer-events-none opacity-50'
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Scale size={15} className="text-accent-primary" />
                  <h3 className="text-[13.5px] font-semibold text-text-primary">
                    Delivery Rate Matrix (Location & Weight)
                  </h3>
                </div>
                <p className="text-[11.5px] text-text-secondary mt-0.5">
                  Standard delivery rates applied across courier networks in Bangladesh (BDT ৳).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  disabled={!rules.delivery_fee_enabled}
                  className="inline-flex items-center gap-1 text-[11.5px] text-text-secondary hover:text-text-primary font-medium px-2.5 py-1.5 rounded-lg border border-border-color bg-bg-secondary/40 hover:bg-bg-secondary transition-colors"
                >
                  <RotateCcw size={12} />
                  Reset defaults
                </button>
                <button
                  type="button"
                  onClick={handleSaveRates}
                  disabled={!rules.delivery_fee_enabled || savingMatrix}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-accent-primary hover:bg-accent-primary/90 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingMatrix ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : savedSuccess ? (
                    <Check size={13} className="text-white" />
                  ) : null}
                  {savedSuccess ? 'Saved!' : 'Save delivery rates'}
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-lg border border-border-color">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-border-color bg-bg-secondary/70">
                    <th className="py-2.5 px-3.5 font-semibold text-text-primary min-w-[200px]">
                      Delivery Route
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-text-primary text-center w-[110px]">
                      0–500 gm
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-text-primary text-center w-[110px]">
                      500 gm–1 kg
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-text-primary text-center w-[110px]">
                      1–2 kg
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-text-primary text-center w-[110px]">
                      Extra / kg
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {ROUTE_CONFIG.map((route) => {
                    const rowData = rates[route.key] ?? DEFAULT_RATES[route.key];
                    return (
                      <tr key={route.key} className="hover:bg-bg-secondary/20 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-primary text-[12.5px]">
                              {route.title}
                            </span>
                            <span
                              className={clsx(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                                route.badgeClass
                              )}
                            >
                              {route.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">
                            {route.subtitle}
                          </p>
                        </td>

                        {/* 0 - 500 gm */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="relative inline-flex items-center">
                            <span className="absolute left-2.5 text-[11px] text-text-muted font-medium pointer-events-none">
                              ৳
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={rowData.tier_0_500g}
                              onChange={(e) =>
                                updateRateCell(route.key, 'tier_0_500g', e.target.value)
                              }
                              className="w-20 h-8 rounded-lg border border-border-color bg-bg-secondary/30 pl-6 pr-2 text-center text-[12px] font-semibold text-text-primary outline-none transition-colors focus:border-accent-primary focus:bg-white"
                            />
                          </div>
                        </td>

                        {/* 500 gm - 1 kg */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="relative inline-flex items-center">
                            <span className="absolute left-2.5 text-[11px] text-text-muted font-medium pointer-events-none">
                              ৳
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={rowData.tier_500g_1kg}
                              onChange={(e) =>
                                updateRateCell(route.key, 'tier_500g_1kg', e.target.value)
                              }
                              className="w-20 h-8 rounded-lg border border-border-color bg-bg-secondary/30 pl-6 pr-2 text-center text-[12px] font-semibold text-text-primary outline-none transition-colors focus:border-accent-primary focus:bg-white"
                            />
                          </div>
                        </td>

                        {/* 1 - 2 kg */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="relative inline-flex items-center">
                            <span className="absolute left-2.5 text-[11px] text-text-muted font-medium pointer-events-none">
                              ৳
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={rowData.tier_1_2kg}
                              onChange={(e) =>
                                updateRateCell(route.key, 'tier_1_2kg', e.target.value)
                              }
                              className="w-20 h-8 rounded-lg border border-border-color bg-bg-secondary/30 pl-6 pr-2 text-center text-[12px] font-semibold text-text-primary outline-none transition-colors focus:border-accent-primary focus:bg-white"
                            />
                          </div>
                        </td>

                        {/* Extra per kg */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="relative inline-flex items-center">
                            <span className="absolute left-2.5 text-[11px] text-text-muted font-medium pointer-events-none">
                              ৳
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={rowData.extra_per_kg}
                              onChange={(e) =>
                                updateRateCell(route.key, 'extra_per_kg', e.target.value)
                              }
                              className="w-20 h-8 rounded-lg border border-border-color bg-bg-secondary/30 pl-6 pr-2 text-center text-[12px] font-semibold text-text-primary outline-none transition-colors focus:border-accent-primary focus:bg-white"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Fallback & Info strip */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11.5px] text-text-secondary pt-2">
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-text-muted shrink-0" />
                <span>
                  Origin hub: <strong className="text-text-primary">Chormokar Dhaka HQ</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>Fallback flat fee:</span>
                <div className="relative inline-flex items-center">
                  <span className="absolute left-2 text-[11px] text-text-muted font-medium pointer-events-none">
                    ৳
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={fallbackAmount}
                    onChange={(e) => setFallbackAmount(e.target.value)}
                    className="w-16 h-7 rounded-md border border-border-color bg-bg-secondary/40 pl-5 pr-1.5 text-center text-[11.5px] font-semibold text-text-primary outline-none focus:border-accent-primary focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[11.5px] font-medium text-danger">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
