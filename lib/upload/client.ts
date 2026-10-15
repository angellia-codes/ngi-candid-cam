import type { PhotoRecord, SendResult } from '@/lib/queue/policy';
import { formatFileName } from '@/lib/shared/time';

export function sendPhoto(
  rec: Pick<PhotoRecord, 'photoId' | 'capturedAt' | 'bytes'>,
  consentVersion: string,
  onProgress?: (fraction: number) => void,
  timeoutMs = 45_000,
): Promise<SendResult> {
  return new Promise((resolve) => {
    const form = new FormData();
    form.append('photoId', rec.photoId);
    form.append('capturedAt', rec.capturedAt);
    form.append('consentVersion', consentVersion);
    form.append('image', new Blob([rec.bytes], { type: 'image/jpeg' }), formatFileName(new Date(rec.capturedAt), rec.photoId));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.timeout = timeoutMs;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let code: string | undefined;
      try {
        code = (JSON.parse(xhr.responseText) as { code?: string }).code;
      } catch {
        code = undefined;
      }
      resolve({ status: xhr.status, code });
    };
    const networkFailure = () => resolve({ status: null });
    xhr.onerror = networkFailure;
    xhr.ontimeout = networkFailure;
    xhr.onabort = networkFailure;
    xhr.send(form);
  });
}
