import type { ReactNode } from 'react';
import { PackageOpen } from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = <PackageOpen size={24} />,
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={`py-16 text-center ${className || ''}`}>
      <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-3 text-text-muted">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-color bg-bg-secondary text-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          {icon}
        </div>
        <p className="text-[15px] font-semibold text-text-primary">{title}</p>
        {message && <p className="text-[13px] leading-relaxed text-text-secondary">{message}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
