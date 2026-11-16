'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/** Small styled listbox — native <select> popups cannot be themed. */
export function SelectMenu({
  value,
  options,
  onChange,
  disabled = false,
  className,
  placeholder = 'Select…',
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
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

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            setOpen(false);
          }
        }}
        className={clsx(
          'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3.5 text-left text-[13.5px] text-text-primary outline-none transition-colors',
          'hover:border-black/20 focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/10',
          open && 'border-accent-primary ring-4 ring-accent-primary/10',
          disabled && 'cursor-not-allowed bg-bg-secondary opacity-70'
        )}
      >
        <span className={clsx('truncate', !selected && 'text-text-muted')}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={clsx(
            'shrink-0 text-text-muted transition-transform duration-150',
            open && 'rotate-180 text-accent-primary'
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-black/10 bg-bg-secondary p-1 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.45)]"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={clsx(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors',
                  active
                    ? 'bg-accent-primary/10 font-semibold text-accent-primary'
                    : 'text-text-secondary hover:bg-black/[0.04] hover:text-text-primary'
                )}
              >
                <span className="truncate">{option.label}</span>
                {active && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
