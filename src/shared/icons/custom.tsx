import type { LucideProps } from 'lucide-react';

/**
 * Hand-drawn tech icons, drawn on the same 24×24 grid and stroke language as
 * Lucide so they sit next to library icons without looking off. These cover
 * things Lucide has no glyph for: TWS earbuds/cases, neckbands, wired
 * earphones, boom-mic headsets, powerbanks and gimbals.
 */

interface ShellProps extends LucideProps {
  children: React.ReactNode;
}

function Shell({ size = 24, strokeWidth = 2, className, children }: ShellProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Two earbuds side by side — the core TWS mark. */
export function TwsEarbuds(props: LucideProps) {
  return (
    <Shell {...props}>
      <circle cx="8.7" cy="7.7" r="3.1" />
      <rect x="6.85" y="10.2" width="3.7" height="7.2" rx="1.85" />
      <circle cx="15.3" cy="7.7" r="3.1" />
      <rect x="13.45" y="10.2" width="3.7" height="7.2" rx="1.85" />
      <path d="M8.7 10.2v1.6M15.3 10.2v1.6" />
    </Shell>
  );
}

/** Closed charging case. */
export function TwsCase(props: LucideProps) {
  return (
    <Shell {...props}>
      <rect x="5" y="6.4" width="14" height="12.6" rx="3.4" />
      <path d="M5 11.1h14" />
      <circle cx="12" cy="15.9" r="0.9" />
    </Shell>
  );
}

/** Open case with both buds sitting inside. */
export function TwsOpenCase(props: LucideProps) {
  return (
    <Shell {...props}>
      <rect x="4.2" y="10.3" width="15.6" height="9.5" rx="3" />
      <path d="M4.2 13.5h15.6" />
      <circle cx="9.1" cy="7.5" r="2.5" />
      <circle cx="14.9" cy="7.5" r="2.5" />
      <path d="M9.1 9.7v1.3M14.9 9.7v1.3" />
    </Shell>
  );
}

/** Wired earphones: two buds, split cable, jack. */
export function EarphonesWired(props: LucideProps) {
  return (
    <Shell {...props}>
      <circle cx="7.3" cy="7.4" r="1.7" />
      <circle cx="16.7" cy="7.4" r="1.7" />
      <path d="M7.3 9.1V12c0 1.5.7 2.5 2 3.3L12 17" />
      <path d="M16.7 9.1V12c0 1.5-.7 2.5-2 3.3L12 17" />
      <path d="M12 17v3.4" />
      <path d="M10.7 20.4h2.6" />
    </Shell>
  );
}

/** Neckband earphones — band that sits around the neck. */
export function Neckband(props: LucideProps) {
  return (
    <Shell {...props}>
      <path d="M6.5 8.4a10 10 0 0 0-2.3 6.2c0 3.5 2.8 6.3 6.3 6.3h3c3.5 0 6.3-2.8 6.3-6.3a10 10 0 0 0-2.3-6.2" />
      <circle cx="6.5" cy="7" r="1.9" />
      <circle cx="17.5" cy="7" r="1.9" />
      <path d="M6.5 8.9v1.4M17.5 8.9v1.4" />
    </Shell>
  );
}

/** Over-ear headset with a boom microphone. */
export function GamingHeadset(props: LucideProps) {
  return (
    <Shell {...props}>
      <path d="M4.8 13.6v-1.5a7.2 7.2 0 0 1 14.4 0v1.5" />
      <rect x="2.9" y="12.2" width="3.9" height="5.9" rx="1.9" />
      <rect x="17.2" y="12.2" width="3.9" height="5.9" rx="1.9" />
      <path d="M19.2 18v.8a2.3 2.3 0 0 1-2.3 2.3h-2.3" />
      <circle cx="13.1" cy="21.1" r="1.2" />
    </Shell>
  );
}

/** Powerbank: battery block, charge bolt, port strip. */
export function Powerbank(props: LucideProps) {
  return (
    <Shell {...props}>
      <rect x="6.8" y="3.4" width="10.4" height="17.2" rx="2.6" />
      <path d="M11.9 8.4l-2.3 4.2h2.4l-.5 3 2.8-4.4h-2.4z" />
      <path d="M9.6 17.6h1.5M12.9 17.6h1.5" />
    </Shell>
  );
}

/** Handheld gimbal: camera head, arm and grip. */
export function Gimbal(props: LucideProps) {
  return (
    <Shell {...props}>
      <rect x="8.6" y="3.2" width="6.8" height="8.4" rx="2.1" />
      <circle cx="12" cy="7.4" r="1.8" />
      <path d="M8.6 4.9H6.4v6.7h2.2" />
      <path d="M12 11.6v5.1" />
      <path d="M9.4 20.4h5.2" />
      <path d="M9.9 16.7h4.2" />
    </Shell>
  );
}

/** Air fryer: lid, tapered basket and handle. */
export function AirFryer(props: LucideProps) {
  return (
    <Shell {...props}>
      <rect x="3.4" y="5.4" width="17.2" height="4.2" rx="1.8" />
      <path d="M6.2 9.6 7.1 19a2.4 2.4 0 0 0 2.4 2.2h5a2.4 2.4 0 0 0 2.4-2.2l.9-9.4" />
      <path d="M12 5.4V3" />
      <path d="M9.4 13.4h5.2" />
      <path d="M10 17h4" />
    </Shell>
  );
}

/** Portable power station: body, carry handle, AC outlet and display. */
export function PowerStation(props: LucideProps) {
  return (
    <Shell {...props}>
      <rect x="4.4" y="6.6" width="15.2" height="14" rx="2.6" />
      <path d="M9 6.6V5.1a1.4 1.4 0 0 1 1.4-1.4h3.2A1.4 1.4 0 0 1 15 5.1v1.5" />
      <rect x="7.2" y="9.4" width="4.6" height="4.4" rx="1.1" />
      <circle cx="9.5" cy="11.6" r="0.9" />
      <path d="M14.6 10h2.2M14.6 12.2h2.2M14.6 14.4h2.2" />
      <path d="M7.6 17.4h8.8" />
    </Shell>
  );
}

/** Hair/beard trimmer: toothed blade, head and body. */
export function Trimmer(props: LucideProps) {
  return (
    <Shell {...props}>
      <path d="M8.4 3.4h7.2v2.8H8.4z" />
      <path d="M9.8 3.4v2.8M12 3.4v2.8M14.2 3.4v2.8" />
      <path d="M8.6 6.2h6.8v3.4H8.6z" />
      <rect x="8.6" y="9.6" width="6.8" height="11" rx="2.2" />
      <path d="M12 12.4v3.2" />
    </Shell>
  );
}

/** WiFi / smart camera: body with lens and signal arcs. */
export function WifiCamera(props: LucideProps) {
  return (
    <Shell {...props}>
      <rect x="4.2" y="9.8" width="15.6" height="9.6" rx="2.6" />
      <circle cx="12" cy="14.6" r="2.3" />
      <path d="M6.9 12.4h.01" />
      <path d="M9.9 6.8a4 4 0 0 1 4.2 0" />
      <path d="M7.9 4.6a7.2 7.2 0 0 1 8.2 0" />
      <path d="M9.6 19.4h4.8" />
    </Shell>
  );
}

/**
 * Every custom icon keyed by the name stored on a category. Kept in sync with
 * the storefront copy so a stored name resolves in both apps.
 */
export const CUSTOM_ICONS: Record<string, (props: LucideProps) => React.ReactElement> = {
  TwsEarbuds,
  TwsCase,
  TwsOpenCase,
  EarphonesWired,
  Neckband,
  GamingHeadset,
  Powerbank,
  Gimbal,
  AirFryer,
  PowerStation,
  Trimmer,
  WifiCamera,
};
