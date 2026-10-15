import { Button } from '@/components/ui/Button';

export function Access({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <h1 className="font-display text-3xl text-cream">Allow the camera</h1>
      <p className="leading-relaxed">
        Your phone will ask to use the camera. Tap <strong>Allow</strong>. Nothing is saved until you press the shutter and
        confirm a photo.
      </p>
      <Button onClick={onContinue} className="w-full">
        Open camera
      </Button>
    </main>
  );
}
