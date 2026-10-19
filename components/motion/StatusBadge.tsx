import type { Badge, BadgeKind } from '@/lib/motion/badge';

const STYLE: Record<BadgeKind, { pill: string; dot: string }> = {
  developing: { pill: 'bg-body text-[#C9C0B2]', dot: 'm-badge-pulse bg-[#C9C0B2]' },
  sending: { pill: 'bg-body text-paper', dot: 'bg-gold' },
  saved: { pill: 'bg-[#142B12] text-green', dot: '' },
  retrying: { pill: 'bg-[#2B2110] text-amber', dot: 'm-badge-blink bg-amber' },
  waiting: { pill: 'bg-[#2B2110] text-amber', dot: 'bg-amber' },
  not_sent: { pill: 'bg-[#2E1412] text-alert', dot: 'bg-alert' },
};

/** Upload status pill (moment 8). `stamp` plays the saved stamp once; give the badge a new key to replay it. */
export function StatusBadge({ badge, stamp = false }: { badge: Badge; stamp?: boolean }) {
  const s = STYLE[badge.kind];
  return (
    <span className="flex flex-col items-start gap-1">
      <span
        className={`inline-flex min-h-6 origin-left items-center gap-1.5 rounded-full px-2.5 py-1 font-label text-xs font-medium uppercase tracking-wider ${s.pill} ${
          stamp && badge.kind === 'saved' ? 'm-badge-stamp' : ''
        }`}
      >
        {badge.kind === 'saved' ? (
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l5 5L20 6" />
          </svg>
        ) : (
          <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${s.dot}`} />
        )}
        {badge.label}
      </span>
      {badge.kind === 'sending' && (
        <span aria-hidden="true" className="block h-[3px] w-24 overflow-hidden rounded-sm bg-[#2A241E]">
          <span className="m-badge-march block h-full w-[136px] bg-[repeating-linear-gradient(90deg,#D4AF37_0_10px,transparent_10px_20px)]" />
        </span>
      )}
    </span>
  );
}
