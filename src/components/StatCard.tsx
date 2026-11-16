import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: ReactNode;
  iconBg?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  trend = 'up',
  icon,
  iconBg = 'bg-accent-primary/10 text-accent-primary',
  className,
}: StatCardProps) {
  return (
    <div className={clsx('admin-card admin-card-hover p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="pt-0.5 text-[12px] font-medium tracking-wide text-text-secondary">
          {title}
        </p>
        <div
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            iconBg
          )}
        >
          {icon}
        </div>
      </div>

      <h3 className="mt-4 text-[28px] font-semibold leading-none tracking-[-0.02em] text-text-primary tabular-nums">
        {value}
      </h3>

      {change && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={clsx(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              trend === 'up' && 'bg-success',
              trend === 'down' && 'bg-danger',
              trend === 'neutral' && 'bg-text-muted'
            )}
          />
          <p
            className={clsx(
              'text-[11px] font-medium',
              trend === 'up' && 'text-success',
              trend === 'down' && 'text-danger',
              trend === 'neutral' && 'text-text-muted'
            )}
          >
            {change}
          </p>
        </div>
      )}
    </div>
  );
}
