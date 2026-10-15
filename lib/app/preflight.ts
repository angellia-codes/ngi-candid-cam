import { isInAppBrowser, type BlockReason } from '@/lib/camera/support';

export type PreflightInput = {
  ua: string;
  hasMediaDevices: boolean;
  hasKey: boolean;
  now: number;
  cameraOpenAt: number;
  cameraCloseAt: number;
};

/** First reason the camera cannot open right now, or null when it can. */
export function preflight(i: PreflightInput): BlockReason | null {
  if (isInAppBrowser(i.ua)) return 'in_app';
  if (!i.hasKey) return 'no_key';
  if (!i.hasMediaDevices) return 'no_camera';
  if (i.now < i.cameraOpenAt) return 'not_open';
  if (i.now > i.cameraCloseAt) return 'closed';
  return null;
}
