'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pipette } from 'lucide-react';
import clsx from 'clsx';

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  className?: string;
  /** Swatches offered under the picker. */
  presets?: string[];
}

const DEFAULT_PRESETS = [
  '#0f172a',
  '#64748b',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#f5f5f4',
];

const POPOVER_WIDTH = 252;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .split('')
      .map((char) => char + char)
      .join('')
      .toLowerCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
  return null;
}

function parseInput(input: string): string | null {
  const hex = parseHex(input);
  if (hex) return hex;
  const rgb = input.match(
    /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})/i
  );
  if (!rgb) return null;
  const [r, g, b] = rgb.slice(1, 4).map((part) => clamp(Number(part), 0, 255));
  return rgbToHex({ r, g, b });
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Hsv {
  h: number;
  s: number;
  v: number;
}

function hexToRgb(hex: string): Rgb {
  const value = parseHex(hex) ?? '#000000';
  return {
    r: parseInt(value.slice(1, 3), 16),
    g: parseInt(value.slice(3, 5), 16),
    b: parseInt(value.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const part = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rgb: [number, number, number];

  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  };
}

function hsvToHex(hsv: Hsv): string {
  return rgbToHex(hsvToRgb(hsv));
}

/** Swatch trigger with a hex field, saturation/hue picker and eyedropper. */
export function ColorPicker({
  value,
  onChange,
  disabled = false,
  className,
  presets = DEFAULT_PRESETS,
}: ColorPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(hexToRgb(value)));
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const squareRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'square' | 'hue' | null>(null);

  const supportedEyeDropper =
    mounted && typeof window !== 'undefined' && 'EyeDropper' in window;

  useEffect(() => setMounted(true), []);

  // Keep the local HSV in sync when the value is changed from outside.
  useEffect(() => {
    const next = parseHex(value) ?? '';
    setDraft(next);
    setInvalid(false);
    if (next) setHsv((current) => {
      // Preserve hue while dragging through greys/black so the handle stays put.
      const fromValue = rgbToHsv(hexToRgb(next));
      if (fromValue.s === 0 || fromValue.v === 0) {
        return { ...fromValue, h: current.h };
      }
      return fromValue;
    });
  }, [value]);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const height = popoverRef.current?.offsetHeight ?? 248;
    const left = clamp(rect.left, 8, window.innerWidth - POPOVER_WIDTH - 8);
    const below = rect.bottom + 8;
    const top =
      below + height > window.innerHeight - 8
        ? Math.max(8, rect.top - height - 8)
        : below;
    setPosition({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const commit = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setDraft(hex);
    setInvalid(false);
    onChange(hex);
  };

  const pickFromSquare = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = squareRef.current?.getBoundingClientRect();
    if (!rect) return;
    const s = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const v = 1 - clamp((event.clientY - rect.top) / rect.height, 0, 1);
    commit({ ...hsv, s, v });
  };

  const pickHue = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const h = clamp((event.clientX - rect.left) / rect.width, 0, 1) * 360;
    commit({ ...hsv, h: h >= 360 ? 359.99 : h });
  };

  const applyHex = () => {
    const next = parseInput(draft);
    if (!next) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft(next);
    setHsv(rgbToHsv(hexToRgb(next)));
    onChange(next);
  };

  const openEyeDropper = async () => {
    type EyeDropperResult = { sRGBHex: string };
    type EyeDropperCtor = new () => {
      open: () => Promise<EyeDropperResult>;
    };
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
    if (!Ctor) return;
    try {
      const result = await new Ctor().open();
      const next = parseHex(result.sRGBHex);
      if (!next) return;
      setDraft(next);
      setHsv(rgbToHsv(hexToRgb(next)));
      onChange(next);
    } catch {
      /* user dismissed the eyedropper */
    }
  };

  const swatch = parseHex(value) ?? '#3b82f6';
  const hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const rgb = hsvToRgb(hsv);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Colour ${swatch}`}
        onClick={() => setOpen((current) => !current)}
        className={clsx(
          'flex h-9 w-full items-center gap-2 rounded-lg border border-black/10 bg-white px-2 text-left outline-none transition-colors',
          'hover:border-black/20 focus-visible:border-black/25',
          disabled && 'cursor-not-allowed opacity-60',
          className
        )}
      >
        <span
          className="h-5 w-5 shrink-0 rounded-md border border-black/10"
          style={{ backgroundColor: swatch }}
        />
        <span className="truncate font-mono text-[11px] uppercase text-text-secondary">
          {swatch}
        </span>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Pick a colour"
            style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
            className="fixed z-[120] rounded-2xl border border-black/10 bg-bg-secondary p-3 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.55)]"
          >
            <div
              ref={squareRef}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                dragging.current = 'square';
                pickFromSquare(event);
              }}
              onPointerMove={(event) => {
                if (dragging.current === 'square') pickFromSquare(event);
              }}
              onPointerUp={() => {
                dragging.current = null;
              }}
              onPointerCancel={() => {
                dragging.current = null;
              }}
              className="relative h-28 w-full cursor-crosshair touch-none rounded-xl"
              style={{
                backgroundColor: hueColor,
                backgroundImage:
                  'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
              }}
            >
              <span
                className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                style={{
                  left: `${hsv.s * 100}%`,
                  top: `${(1 - hsv.v) * 100}%`,
                  backgroundColor: hsvToHex(hsv),
                }}
              />
            </div>

            <div
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                dragging.current = 'hue';
                pickHue(event);
              }}
              onPointerMove={(event) => {
                if (dragging.current === 'hue') pickHue(event);
              }}
              onPointerUp={() => {
                dragging.current = null;
              }}
              onPointerCancel={() => {
                dragging.current = null;
              }}
              className="relative mt-3 h-3 w-full cursor-pointer touch-none rounded-full"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
              }}
            >
              <span
                className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                style={{
                  left: `${(hsv.h / 360) * 100}%`,
                  backgroundColor: hueColor,
                }}
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div
                className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-black/10 bg-white px-2"
                data-invalid={invalid || undefined}
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-md border border-black/10"
                  style={{ backgroundColor: invalid ? 'transparent' : swatch }}
                />
                <input
                  value={draft}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label="Hex colour"
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setInvalid(false);
                  }}
                  onBlur={applyHex}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      applyHex();
                    }
                    if (event.key === 'Escape') {
                      event.stopPropagation();
                      setOpen(false);
                    }
                  }}
                  className={clsx(
                    'w-full border-0 bg-transparent p-0 font-mono text-[11.5px] uppercase text-text-primary outline-none',
                    invalid && 'text-rose-500 placeholder:text-rose-400'
                  )}
                  placeholder="#000000"
                />
              </div>
              {supportedEyeDropper && (
                <button
                  type="button"
                  onClick={openEyeDropper}
                  title="Pick a colour from the screen"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white text-text-muted transition-colors hover:text-text-primary"
                >
                  <Pipette size={15} />
                </button>
              )}
            </div>

            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-text-muted">
              rgb({rgb.r}, {rgb.g}, {rgb.b})
            </p>

            <div className="mt-2.5 grid grid-cols-6 gap-1.5">
              {presets.map((preset) => {
                const active = preset.toLowerCase() === swatch.toLowerCase();
                return (
                  <button
                    key={preset}
                    type="button"
                    title={preset}
                    aria-label={preset}
                    onClick={() => {
                      setDraft(preset);
                      setInvalid(false);
                      setHsv(rgbToHsv(hexToRgb(preset)));
                      onChange(preset);
                    }}
                    className={clsx(
                      'h-6 w-full rounded-md border transition-transform hover:scale-105',
                      active
                        ? 'border-accent-primary ring-2 ring-accent-primary/30'
                        : 'border-black/10'
                    )}
                    style={{ backgroundColor: preset }}
                  />
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
