'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  PackageSearch,
  RefreshCw,
  Search,
  Send,
  Truck,
  Wallet,
} from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../../../components';
import { useAdminFetch } from '../../../../shared/api/useAdminFetch';
import { useAdminAuth } from '../../../../shared/auth/AuthContext';
import { apiErrorMessage } from '../../../../shared/api/errorMessage';

interface SteadfastStatus {
  configured: boolean;
  base_url: string;
  timeout_seconds: number;
  ping: { ok: boolean; message: string };
  credentials: { ok: boolean | null; message: string };
  balance: { amount: number; formatted: string; currency: string } | null;
  error: { code?: string; message: string } | null;
}

interface TimelineEntry {
  text: string;
  type: number | string | null;
  created_at: string | null;
}

interface LocalShipment {
  id: string;
  order_id: string;
  order_number: string;
  carrier: string;
  status: string;
  provider_status: string;
  tracking_number: string;
  consignment_id: string;
  tracking_url: string;
  dispatch_attempts: number;
  sync_error: string;
  last_synced_at: string | null;
}

interface LookupResult {
  identifier_type: string;
  identifier: string;
  provider_status: string;
  status: { value: string; label: string; is_terminal: boolean };
  timeline: TimelineEntry[];
  local_shipment: LocalShipment | null;
  checked_at: string;
}

interface ShipmentRow extends LocalShipment {
  customer_name: string;
  total_amount: string;
  created_at: string;
}

interface Station {
  id: number | string;
  name: string;
  district: string;
}

type IdentifierType = 'invoice' | 'consignment_id' | 'tracking_code';

const IDENTIFIER_LABELS: Record<IdentifierType, string> = {
  invoice: 'Order number / invoice',
  consignment_id: 'Consignment ID',
  tracking_code: 'Tracking code',
};

function unwrap(payload: any) {
  return payload?.data ?? payload;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusTone(status: string): string {
  const value = status.toLowerCase();
  if (value === 'delivered' || value === 'partial_delivered') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (value.startsWith('cancelled') || value === 'exceptional') {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (value.startsWith('partial_delivered_return') || value.startsWith('cancelled_return')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-sky-50 text-sky-700 border-sky-200';
}

export default function SteadfastPage() {
  const { status: authStatus } = useAdminAuth();
  const adminFetch = useAdminFetch();

  const [connection, setConnection] = useState<SteadfastStatus | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [connectionError, setConnectionError] = useState('');

  const [identifierType, setIdentifierType] = useState<IdentifierType>('invoice');
  const [identifier, setIdentifier] = useState('');
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const [stations, setStations] = useState<Station[]>([]);
  const [stationsError, setStationsError] = useState('');
  const [pickup, setPickup] = useState({
    address_id: '',
    police_station_id: '',
    address: '',
    contact_number: '',
    note: '',
    estim_qty: '',
  });
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupError, setPickupError] = useState('');
  const [pickupSuccess, setPickupSuccess] = useState('');

  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [shipmentMeta, setShipmentMeta] = useState({
    pending_booking: 0,
    failed_sync: 0,
  });
  const [shipmentsLoading, setShipmentsLoading] = useState(true);
  const [shipmentError, setShipmentError] = useState('');
  const [shipmentActionId, setShipmentActionId] = useState('');
  const [notice, setNotice] = useState('');

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4000);
  }, []);

  const loadConnection = useCallback(async () => {
    setConnectionLoading(true);
    setConnectionError('');
    try {
      const res = await adminFetch('/api/shipping/steadfast/status');
      const json = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(json, 'Could not reach Steadfast.'));
      setConnection(unwrap(json));
    } catch (error: any) {
      setConnectionError(error?.message || 'Could not check the Steadfast connection.');
    } finally {
      setConnectionLoading(false);
    }
  }, [adminFetch]);

  const loadShipments = useCallback(async () => {
    setShipmentsLoading(true);
    setShipmentError('');
    try {
      const res = await adminFetch('/api/shipping/steadfast/shipments?limit=50');
      const json = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(json, 'Could not load Steadfast shipments.'));
      setShipments(unwrap(json) ?? []);
      setShipmentMeta({
        pending_booking: Number(json?.meta?.pending_booking ?? 0),
        failed_sync: Number(json?.meta?.failed_sync ?? 0),
      });
    } catch (error: any) {
      setShipmentError(error?.message || 'Could not load Steadfast shipments.');
    } finally {
      setShipmentsLoading(false);
    }
  }, [adminFetch]);

  const loadStations = useCallback(async () => {
    setStationsError('');
    try {
      const res = await adminFetch('/api/shipping/steadfast/police-stations');
      const json = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(json, 'Could not load police stations.'));
      setStations(unwrap(json) ?? []);
    } catch (error: any) {
      setStationsError(
        error?.message ||
          'Police stations could not be loaded. Enter the station ID from your Steadfast dashboard.'
      );
    }
  }, [adminFetch]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    void loadConnection();
    void loadShipments();
    void loadStations();
  }, [authStatus, loadConnection, loadShipments, loadStations]);

  const runLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    try {
      const res = await adminFetch('/api/shipping/steadfast/lookup', {
        method: 'POST',
        body: JSON.stringify({ identifier_type: identifierType, value: identifier.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(json, 'Parcel lookup failed.'));
      setLookup(unwrap(json));
    } catch (error: any) {
      setLookup(null);
      setLookupError(error?.message || 'Parcel lookup failed.');
    } finally {
      setLookupLoading(false);
    }
  };

  const sendPickup = async (event: React.FormEvent) => {
    event.preventDefault();
    setPickupLoading(true);
    setPickupError('');
    setPickupSuccess('');
    try {
      const payload: Record<string, unknown> = {
        address_id: Number(pickup.address_id),
        police_station_id: Number(pickup.police_station_id),
        address: pickup.address.trim(),
        contact_number: pickup.contact_number.trim(),
      };
      if (pickup.note.trim()) payload.note = pickup.note.trim();
      if (pickup.estim_qty.trim()) payload.estim_qty = Number(pickup.estim_qty);

      const res = await adminFetch('/api/shipping/steadfast/pickup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(json, 'Pickup request failed.'));
      const data = unwrap(json);
      setPickupSuccess(
        data?.message || 'Pickup request sent. A rider will be assigned shortly.'
      );
      setPickup((prev) => ({ ...prev, note: '', estim_qty: '' }));
    } catch (error: any) {
      setPickupError(error?.message || 'Pickup request failed.');
    } finally {
      setPickupLoading(false);
    }
  };

  const runShipmentAction = async (shipment: ShipmentRow, action: 'dispatch' | 'sync') => {
    setShipmentActionId(shipment.id);
    try {
      const res = await adminFetch(
        `/api/shipping/steadfast/shipments/${shipment.id}/${action}`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(json, 'Steadfast request failed.'));
      showNotice(
        action === 'dispatch'
          ? `Parcel booked for ${shipment.order_number}.`
          : `Status refreshed for ${shipment.order_number}.`
      );
      await loadShipments();
      await loadConnection();
    } catch (error: any) {
      showNotice(error?.message || 'Steadfast request failed.');
    } finally {
      setShipmentActionId('');
    }
  };

  const connectionState = useMemo(() => {
    if (!connection) {
      return {
        tone: 'border-border-color bg-white',
        icon: <AlertTriangle size={18} className="text-amber-500" />,
        title: 'Checking Steadfast…',
        detail: 'Contacting the courier API.',
      };
    }
    if (!connection.configured) {
      return {
        tone: 'border-amber-200 bg-amber-50',
        icon: <AlertTriangle size={18} className="text-amber-600" />,
        title: 'Steadfast is not configured',
        detail:
          'Add STEADFAST_API_KEY and STEADFAST_SECRET_KEY to the backend environment, then restart the API. Orders will continue to work without it.',
      };
    }
    if (!connection.ping.ok) {
      return {
        tone: 'border-red-200 bg-red-50',
        icon: <AlertTriangle size={18} className="text-red-600" />,
        title: 'Steadfast is unreachable',
        detail: `${connection.ping.message} New orders are still saved safely and can be retried below.`,
      };
    }
    if (connection.credentials?.ok === false) {
      return {
        tone: 'border-red-200 bg-red-50',
        icon: <AlertTriangle size={18} className="text-red-600" />,
        title: 'Steadfast rejected the API keys',
        detail: `${connection.credentials.message} Replace STEADFAST_API_KEY and STEADFAST_SECRET_KEY with keys from the packzy dashboard, then restart the backend. Checkout keeps working meanwhile.`,
      };
    }
    return {
      tone: 'border-emerald-200 bg-emerald-50',
      icon: <CheckCircle2 size={18} className="text-emerald-600" />,
      title: 'Steadfast is connected',
      detail: 'New confirmed orders are booked automatically.',
    };
  }, [connection]);

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader
        title="Steadfast Courier"
        description="Book, track and manage Steadfast parcels. Courier failures never block checkout — failed bookings stay here for retry."
        actions={
          <button
            type="button"
            onClick={() => {
              void loadConnection();
              void loadShipments();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-color bg-white px-4 text-[12.5px] font-semibold text-text-primary transition-colors hover:bg-bg-secondary"
          >
            <RefreshCw size={14} className={connectionLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {notice ? (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-accent-primary/20 bg-accent-primary/5 px-4 py-3 text-[12.5px] font-medium text-text-primary">
          <CheckCircle2 size={15} className="text-accent-primary" />
          {notice}
        </div>
      ) : null}

      {connectionError ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
          {connectionError}
        </div>
      ) : null}

      <div className={clsx('mb-6 flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between', connectionState.tone)}>
        <div className="flex items-start gap-3">
          {connectionState.icon}
          <div>
            <p className="text-[13.5px] font-semibold text-text-primary">{connectionState.title}</p>
            <p className="mt-0.5 max-w-2xl text-[12px] leading-relaxed text-text-secondary">
              {connectionState.detail}
            </p>
          </div>
        </div>
        {connection ? (
          <div className="text-right text-[11px] text-text-muted">
            <p className="font-mono">{connection.base_url}</p>
            <p className="mt-0.5">Timeout {connection.timeout_seconds}s</p>
          </div>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-border-color bg-white p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              Steadfast balance
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-text-primary">
              {connection?.balance?.formatted ?? '—'}
            </p>
            <p className="text-[11px] text-text-muted">
              {connection?.balance
                ? 'Available for payout'
                : connection && !connection.configured
                  ? 'Not configured'
                  : connection?.credentials?.ok === false
                    ? 'Credentials rejected'
                    : 'Connect credentials to view'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-border-color bg-white p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
            <Clock3 size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              Awaiting booking
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-text-primary">
              {shipmentMeta.pending_booking}
            </p>
            <p className="text-[11px] text-text-muted">Will retry automatically</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-border-color bg-white p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              Booking errors
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-text-primary">
              {shipmentMeta.failed_sync}
            </p>
            <p className="text-[11px] text-text-muted">Retry from the table below</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-border-color bg-white p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              API connection
            </p>
            <p className="mt-0.5 text-lg font-bold tracking-tight text-text-primary">
              {connection?.ping.ok
                ? connection?.credentials?.ok === false
                  ? 'Keys rejected'
                  : 'Online'
                : connection?.configured
                  ? 'Offline'
                  : 'Not set up'}
            </p>
            <p className="text-[11px] text-text-muted">No credentials needed for ping</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="admin-card p-5 xl:col-span-3">
          <div className="mb-4 flex items-center gap-2">
            <PackageSearch size={17} className="text-accent-primary" />
            <h2 className="text-[14px] font-semibold text-text-primary">Find a parcel</h2>
          </div>

          <form onSubmit={runLookup} className="flex flex-col gap-2 sm:flex-row">
            <select
              value={identifierType}
              onChange={(event) => setIdentifierType(event.target.value as IdentifierType)}
              className="h-10 rounded-lg border border-border-color bg-white px-3 text-[12.5px] text-text-primary outline-none focus:border-accent-primary sm:w-52"
            >
              {(Object.keys(IDENTIFIER_LABELS) as IdentifierType[]).map((key) => (
                <option key={key} value={key}>
                  {IDENTIFIER_LABELS[key]}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={
                  identifierType === 'invoice'
                    ? 'e.g. TP-2026-000123'
                    : identifierType === 'consignment_id'
                      ? 'e.g. 1424107'
                      : 'e.g. 15BAEB8A'
                }
                className="h-10 w-full rounded-lg border border-border-color bg-bg-secondary/50 pl-9 pr-3 text-[12.5px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={lookupLoading || !identifier.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {lookupLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              Look up
            </button>
          </form>

          {lookupError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
              {lookupError}
            </div>
          ) : null}

          {lookup ? (
            <div className="mt-5 rounded-xl border border-border-color bg-bg-secondary/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                    {IDENTIFIER_LABELS[lookup.identifier_type as IdentifierType] ?? 'Identifier'}
                  </p>
                  <p className="mt-0.5 font-mono text-[13.5px] font-semibold text-text-primary">
                    {lookup.identifier}
                  </p>
                </div>
                <span
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold',
                    statusTone(lookup.status.value)
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {lookup.status.label}
                </span>
              </div>

              {lookup.local_shipment ? (
                <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-border-color bg-white p-3 text-[12px] sm:grid-cols-2">
                  <div>
                    <p className="text-text-muted">Local order</p>
                    <p className="font-semibold text-text-primary">
                      {lookup.local_shipment.order_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted">Booking state</p>
                    <p className="font-semibold text-text-primary">
                      {lookup.local_shipment.consignment_id
                        ? `Booked · ${lookup.local_shipment.tracking_number}`
                        : lookup.local_shipment.sync_error
                          ? 'Booking failed — retry below'
                          : 'Awaiting booking'}
                    </p>
                  </div>
                  {lookup.local_shipment.tracking_url ? (
                    <div className="sm:col-span-2">
                      <a
                        href={lookup.local_shipment.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-accent-primary hover:underline"
                      >
                        Open Steadfast tracking <ExternalLink size={13} />
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  Parcel timeline
                </p>
                {lookup.timeline.length === 0 ? (
                  <p className="text-[12.5px] text-text-secondary">
                    No tracking events yet. Steadfast caches status for 60 seconds and adds events
                    as the parcel moves.
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {lookup.timeline.map((entry, index) => (
                      <li key={`${entry.created_at}-${index}`} className="flex gap-3">
                        <div className="mt-1 flex flex-col items-center">
                          <span className="h-2 w-2 rounded-full bg-accent-primary" />
                          {index < lookup.timeline.length - 1 ? (
                            <span className="mt-1 h-full min-h-6 w-px bg-border-color" />
                          ) : null}
                        </div>
                        <div className="pb-1">
                          <p className="text-[12.5px] font-medium text-text-primary">{entry.text}</p>
                          <p className="mt-0.5 text-[11px] text-text-muted">
                            {formatDate(entry.created_at)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <p className="mt-4 text-[11px] text-text-muted">
                Checked {formatDate(lookup.checked_at)}
              </p>
            </div>
          ) : null}
        </section>

        <section className="admin-card p-5 xl:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <Send size={17} className="text-accent-primary" />
            <h2 className="text-[14px] font-semibold text-text-primary">Request a pickup</h2>
          </div>
          <p className="mb-4 text-[12px] leading-relaxed text-text-secondary">
            Ask a Steadfast rider to collect booked parcels from one of your saved pickup
            addresses.
          </p>

          {stationsError ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800">
              {stationsError}
            </div>
          ) : null}

          <form onSubmit={sendPickup} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-text-secondary">
                  Pickup address ID
                </span>
                <input
                  required
                  type="number"
                  min={1}
                  value={pickup.address_id}
                  onChange={(event) =>
                    setPickup((prev) => ({ ...prev, address_id: event.target.value }))
                  }
                  placeholder="42"
                  className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[12.5px] text-text-primary outline-none focus:border-accent-primary focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-text-secondary">
                  Police station ID
                </span>
                <input
                  required
                  type="number"
                  min={1}
                  list="steadfast-police-stations"
                  value={pickup.police_station_id}
                  onChange={(event) =>
                    setPickup((prev) => ({ ...prev, police_station_id: event.target.value }))
                  }
                  placeholder="17"
                  className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[12.5px] text-text-primary outline-none focus:border-accent-primary focus:bg-white"
                />
                <datalist id="steadfast-police-stations">
                  {stations.map((station) => (
                    <option key={String(station.id)} value={String(station.id)}>
                      {station.name}
                      {station.district ? ` — ${station.district}` : ''}
                    </option>
                  ))}
                </datalist>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-text-secondary">
                Pickup address
              </span>
              <input
                required
                value={pickup.address}
                onChange={(event) =>
                  setPickup((prev) => ({ ...prev, address: event.target.value }))
                }
                placeholder="House 17/1, Road 3/A, Dhanmondi, Dhaka"
                className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[12.5px] text-text-primary outline-none focus:border-accent-primary focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-text-secondary">
                Contact number
              </span>
              <input
                required
                value={pickup.contact_number}
                onChange={(event) =>
                  setPickup((prev) => ({ ...prev, contact_number: event.target.value }))
                }
                placeholder="01712345678"
                inputMode="numeric"
                className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[12.5px] text-text-primary outline-none focus:border-accent-primary focus:bg-white"
              />
            </label>

            <div className="grid grid-cols-3 gap-3">
              <label className="col-span-1 block">
                <span className="mb-1 block text-[11px] font-medium text-text-secondary">
                  Parcels
                </span>
                <input
                  type="number"
                  min={0}
                  value={pickup.estim_qty}
                  onChange={(event) =>
                    setPickup((prev) => ({ ...prev, estim_qty: event.target.value }))
                  }
                  placeholder="25"
                  className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[12.5px] text-text-primary outline-none focus:border-accent-primary focus:bg-white"
                />
              </label>
              <label className="col-span-2 block">
                <span className="mb-1 block text-[11px] font-medium text-text-secondary">
                  Note for the rider
                </span>
                <input
                  value={pickup.note}
                  onChange={(event) =>
                    setPickup((prev) => ({ ...prev, note: event.target.value }))
                  }
                  placeholder="Call before 3 PM"
                  className="h-9 w-full rounded-lg border border-border-color bg-bg-secondary/50 px-3 text-[12.5px] text-text-primary outline-none focus:border-accent-primary focus:bg-white"
                />
              </label>
            </div>

            {pickupError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] text-red-700">
                {pickupError}
              </div>
            ) : null}
            {pickupSuccess ? (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] text-emerald-800">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                {pickupSuccess}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pickupLoading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pickupLoading ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
              Send pickup request
            </button>
          </form>

          <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
            Address and station IDs come from your Steadfast dashboard (Pickup Addresses and
            Police Stations). Asking twice while a request is pending is safe — Steadfast returns
            it as a conflict instead of sending two riders.
          </p>
        </section>
      </div>

      <section className="admin-card mt-6 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border-color p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-text-primary">Steadfast shipments</h2>
            <p className="mt-0.5 text-[11.5px] text-text-secondary">
              Bookings that failed or are waiting to be sent. Confirmed orders are booked
              automatically after checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadShipments()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-color bg-white px-3 text-[12px] font-semibold text-text-primary hover:bg-bg-secondary"
          >
            <RefreshCw size={13} className={shipmentsLoading ? 'animate-spin' : ''} />
            Reload
          </button>
        </div>

        {shipmentError ? (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {shipmentError}
          </div>
        ) : null}

        {shipmentsLoading ? (
          <div className="px-6 py-14 text-center text-[12.5px] text-text-secondary">
            Loading shipments…
          </div>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg-secondary text-text-muted">
              <Truck size={22} />
            </div>
            <p className="text-[14px] font-semibold text-text-primary">No Steadfast shipments yet</p>
            <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-text-secondary">
              When a customer chooses Steadfast Delivery and the order is confirmed, the parcel
              appears here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-color bg-bg-secondary/40">
                  {['Order', 'Customer', 'Status', 'Tracking', 'Last sync', ''].map((heading, i) => (
                    <th
                      key={heading || i}
                      className={clsx(
                        'p-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted',
                        i === 0 && 'pl-6',
                        i === 5 && 'pr-6 text-right'
                      )}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color/70">
                {shipments.map((shipment) => {
                  const busy = shipmentActionId === shipment.id;
                  const booked = Boolean(
                    shipment.consignment_id || shipment.tracking_number
                  );
                  return (
                    <tr key={shipment.id} className="align-top">
                      <td className="py-4 pl-6 pr-4">
                        <p className="text-[13px] font-semibold text-text-primary">
                          {shipment.order_number}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          ৳{Number(shipment.total_amount || 0).toLocaleString('en-US')}
                        </p>
                      </td>
                      <td className="p-4 text-[12.5px] text-text-secondary">
                        {shipment.customer_name || '—'}
                      </td>
                      <td className="p-4">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold',
                            booked
                              ? statusTone(shipment.provider_status || shipment.status)
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          )}
                        >
                          {booked
                            ? shipment.provider_status || shipment.status
                            : shipment.sync_error
                              ? 'Booking failed'
                              : 'Awaiting booking'}
                        </span>
                        {shipment.sync_error ? (
                          <p className="mt-1.5 max-w-xs text-[11px] leading-relaxed text-red-600">
                            {shipment.sync_error}
                          </p>
                        ) : null}
                        {!booked && shipment.dispatch_attempts > 0 ? (
                          <p className="mt-1 text-[10.5px] text-text-muted">
                            {shipment.dispatch_attempts} attempt
                            {shipment.dispatch_attempts === 1 ? '' : 's'}
                          </p>
                        ) : null}
                      </td>
                      <td className="p-4">
                        {booked ? (
                          <div className="text-[12px]">
                            <p className="font-mono font-semibold text-text-primary">
                              {shipment.tracking_number || '—'}
                            </p>
                            <p className="text-[10.5px] text-text-muted">
                              CID {shipment.consignment_id || '—'}
                            </p>
                            {shipment.tracking_url ? (
                              <a
                                href={shipment.tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-primary hover:underline"
                              >
                                Track <ExternalLink size={11} />
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[12px] text-text-muted">Not booked</span>
                        )}
                      </td>
                      <td className="p-4 text-[11.5px] text-text-secondary">
                        {formatDate(shipment.last_synced_at)}
                      </td>
                      <td className="py-4 pr-6 pl-2 text-right">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void runShipmentAction(shipment, booked ? 'sync' : 'dispatch')
                          }
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-color bg-white px-2.5 text-[11.5px] font-semibold text-text-primary transition-colors hover:border-accent-primary/40 hover:text-accent-primary disabled:opacity-50"
                        >
                          {busy ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : booked ? (
                            <RefreshCw size={13} />
                          ) : (
                            <Send size={13} />
                          )}
                          {booked ? 'Sync' : 'Retry'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
