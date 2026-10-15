export function PendingBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-30 bg-gold px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 text-center font-label text-sm text-ink"
    >
      Keep this page open to finish sending {count} {count === 1 ? 'photo' : 'photos'}.
    </div>
  );
}
