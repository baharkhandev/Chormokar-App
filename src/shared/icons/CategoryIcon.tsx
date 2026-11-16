import { Folder } from 'lucide-react';
import { ICON_BY_NAME } from './catalog';
import { isUploadedIcon, uploadedIconUrl } from './assets';

interface CategoryIconProps {
  /** Lucide/custom icon name or an uploaded media path. Falls back to a folder. */
  name?: string | null;
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** Render nothing instead of the folder fallback when no icon is set. */
  hideFallback?: boolean;
}

export function CategoryIcon({
  name,
  size = 18,
  className,
  strokeWidth = 1.6,
  hideFallback = false,
}: CategoryIconProps) {
  if (isUploadedIcon(name)) {
    return (
      <img
        src={uploadedIconUrl(name as string)}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className={className}
        style={{ objectFit: 'contain' }}
      />
    );
  }

  const Icon = name ? ICON_BY_NAME[name] : undefined;
  if (Icon) return <Icon size={size} className={className} strokeWidth={strokeWidth} />;
  if (hideFallback) return null;
  return <Folder size={size} className={className} strokeWidth={strokeWidth} />;
}
