import 'server-only';
import { env } from '@/lib/env';
import { getAccessToken } from '@/lib/drive/auth';

export type DriveDeps = {
  fetch: typeof fetch;
  getToken: () => Promise<string>;
  folderId: string;
};

export type DriveErrorCode = 'auth_failed' | 'timeout' | 'network' | 'http_error';

export class DriveError extends Error {
  constructor(
    readonly code: DriveErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DriveError';
  }
}

const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

export function driveDeps(): DriveDeps {
  const e = env();
  return {
    fetch: globalThis.fetch.bind(globalThis),
    getToken: getAccessToken,
    folderId: e.driveFolderId,
  };
}

function escapeQueryValue(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function call(deps: DriveDeps, url: string, init: RequestInit, signal: AbortSignal): Promise<unknown> {
  let token: string;
  try {
    token = await deps.getToken();
  } catch (e) {
    throw new DriveError('auth_failed', e instanceof Error ? e.message : 'Token request failed');
  }

  let res: Response;
  try {
    res = await deps.fetch(url, {
      ...init,
      signal,
      headers: { ...(init.headers as Record<string, string> | undefined), authorization: `Bearer ${token}` },
    });
  } catch (e) {
    const name = (e as Error | undefined)?.name;
    const code: DriveErrorCode = name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network';
    throw new DriveError(code, (e as Error | undefined)?.message ?? 'fetch failed');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new DriveError('http_error', `Drive ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function listDevicePhotos(deps: DriveDeps, deviceId: string, signal: AbortSignal): Promise<string[]> {
  const q =
    `'${escapeQueryValue(deps.folderId)}' in parents and trashed = false and ` +
    `appProperties has { key='deviceId' and value='${escapeQueryValue(deviceId)}' }`;
  const ids: string[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({
      q,
      spaces: 'drive',
      pageSize: '100',
      fields: 'nextPageToken,files(id,appProperties)',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const data = (await call(deps, `${API}?${params}`, { method: 'GET' }, signal)) as {
      nextPageToken?: string;
      files?: { appProperties?: Record<string, string> }[];
    };
    for (const f of data.files ?? []) {
      const id = f.appProperties?.photoId;
      if (id) ids.push(id);
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return ids;
}

export async function createPhoto(
  deps: DriveDeps,
  input: { name: string; bytes: Uint8Array; appProperties: Record<string, string> },
  signal: AbortSignal,
): Promise<{ id: string }> {
  const boundary = `nf26-${crypto.randomUUID()}`;
  const meta = JSON.stringify({
    name: input.name,
    parents: [deps.folderId],
    mimeType: 'image/jpeg',
    appProperties: input.appProperties,
  });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
    `--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`,
    new Uint8Array(input.bytes),
    `\r\n--${boundary}--\r\n`,
  ]);
  const params = new URLSearchParams({ uploadType: 'multipart', fields: 'id' });
  const data = (await call(
    deps,
    `${UPLOAD}?${params}`,
    { method: 'POST', headers: { 'content-type': `multipart/related; boundary=${boundary}` }, body },
    signal,
  )) as { id?: string } | null;
  if (!data?.id) throw new DriveError('http_error', 'Drive did not return a file ID');
  return { id: data.id };
}

export async function trashFile(deps: DriveDeps, id: string, signal: AbortSignal): Promise<void> {
  await call(
    deps,
    `${API}/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ trashed: true }) },
    signal,
  );
}

export async function checkFolder(deps: DriveDeps, signal: AbortSignal): Promise<void> {
  const params = new URLSearchParams({ fields: 'id,mimeType,trashed,capabilities(canAddChildren)' });
  const data = (await call(deps, `${API}/${encodeURIComponent(deps.folderId)}?${params}`, { method: 'GET' }, signal)) as {
    mimeType?: string;
    trashed?: boolean;
    capabilities?: { canAddChildren?: boolean };
  };
  if (data.mimeType !== FOLDER_MIME) throw new DriveError('http_error', 'DRIVE_FOLDER_ID is not a folder');
  if (data.trashed) throw new DriveError('http_error', 'The Photos folder is in the Drive trash');
  if (!data.capabilities?.canAddChildren) {
    throw new DriveError('http_error', 'This Google account cannot add files to the Photos folder');
  }
}
