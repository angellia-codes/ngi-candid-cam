export type BlockReason = 'in_app' | 'no_key' | 'no_camera' | 'not_open' | 'closed' | 'denied' | 'busy';

const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|musical_ly|BytedanceWebview|TikTok|\bLine\//i;

export function isInAppBrowser(ua: string): boolean {
  return IN_APP.test(ua);
}

export function mapCameraError(err: unknown): BlockReason | 'retry_relaxed' {
  const name = (err as { name?: unknown } | null)?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotReadableError':
    case 'AbortError':
      return 'busy';
    case 'OverconstrainedError':
      return 'retry_relaxed';
    default:
      return 'no_camera';
  }
}
