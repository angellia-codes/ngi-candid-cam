import { Button } from '@/components/ui/Button';

export function Welcome({ onStart, disabled, message }: { onStart: () => void; disabled: boolean; message: string | null }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between gap-10 px-6 py-10">
      <header className="space-y-3">
        <p className="font-label text-sm tracking-[0.3em] text-gold">NOURISHFEST 2026 · 08.12.2026</p>
        <h1 className="font-display text-5xl leading-[0.95] text-cream">
          Digital
          <br />
          Candid
          <br />
          Cam
        </h1>
        <p className="font-label text-lg text-green">#MoveInUnity</p>
      </header>

      <ol className="space-y-4 font-label text-lg leading-snug">
        <li>
          <span className="text-gold">1 · Shoot.</span> You have 15 shots. Retakes are free.
        </li>
        <li>
          <span className="text-gold">2 · Check.</span> Pick a film look, then confirm.
        </li>
        <li>
          <span className="text-gold">3 · Save.</span> Confirmed photos go to the NourishFest archive. Save your own copy any time.
        </li>
      </ol>

      <div className="space-y-4">
        <Button onClick={onStart} disabled={disabled} className="w-full">
          Start shooting
        </Button>
        {message ? (
          <p role="alert" className="text-center text-sm text-pink">
            {message}
          </p>
        ) : (
          <p className="text-center text-sm text-muted">Weak Wi-Fi? Mobile data works better.</p>
        )}
      </div>
    </main>
  );
}
