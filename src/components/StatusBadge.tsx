import clsx from 'clsx';

export type StatusType =
  | 'active'
  | 'inactive'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'pending'
  | 'cancelled'
  | 'paid'
  | 'unpaid'
  | 'refunded'
  | 'out of stock'
  | 'draft'
  | string;

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'pill' | 'subtle';
  dot?: boolean;
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  variant = 'pill',
  dot = true,
}: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase().trim();
  const displayLabel = label || status;

  let colorClasses = 'bg-black/5 text-text-secondary border-black/10';
  let dotColor = 'bg-text-secondary';

  switch (normalized) {
    case 'active':
    case 'delivered':
    case 'paid':
      colorClasses = 'bg-success/10 text-success border-success/20';
      dotColor = 'bg-success';
      break;
    case 'processing':
    case 'shipped':
      colorClasses = 'bg-accent-primary/10 text-accent-primary border-accent-primary/20';
      dotColor = 'bg-accent-primary';
      break;
    case 'pending':
    case 'unpaid':
      colorClasses = 'bg-warning/10 text-warning border-warning/20';
      dotColor = 'bg-warning';
      break;
    case 'cancelled':
    case 'inactive':
    case 'out of stock':
      colorClasses = 'bg-danger/10 text-danger border-danger/20';
      dotColor = 'bg-danger';
      break;
    case 'refunded':
    case 'draft':
      colorClasses = 'bg-black/5 text-text-muted border-black/10';
      dotColor = 'bg-text-muted';
      break;
    default:
      colorClasses = 'bg-black/5 text-text-secondary border-black/10';
      dotColor = 'bg-text-secondary';
      break;
  }

  const isSm = size === 'sm';

  return (
    <span
      className={clsx(
        'inline-flex items-center font-semibold tracking-[0.06em] uppercase border select-none backdrop-blur-[2px]',
        variant === 'pill' ? 'rounded-md' : 'rounded-md',
        isSm ? 'px-1.5 py-0.5 text-[9px] gap-1' : 'px-2 py-1 text-[10px] gap-1.5',
        colorClasses
      )}
    >
      {dot && (
        <span
          className={clsx(
            'rounded-full shrink-0',
            isSm ? 'w-1 h-1' : 'w-1.5 h-1.5',
            dotColor
          )}
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
