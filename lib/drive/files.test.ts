import { describe, expect, it } from 'vitest';
import { DriveError, checkFolder, createPhoto, listDevicePhotos, type DriveDeps } from '@/lib/drive/files';

type Call = { url: string; init?: RequestInit };

function deps(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): { d: DriveDeps; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
  return { d: { fetch: fetchFn, getToken: async () => 'tok', folderId: '1XYZ' }, calls };
}

const signal = () => AbortSignal.timeout(5000);

describe('listDevicePhotos', () => {
  it('queries the Photos folder by device ID and returns photo IDs', async () => {
    const { d, calls } = deps(() =>
      Response.json({ files: [{ appProperties: { photoId: 'p1' } }, { appProperties: { photoId: 'p2' } }, {}] }),
    );
    const ids = await listDevicePhotos(d, 'dev-1', signal());
    expect(ids).toEqual(['p1', 'p2']);
    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get('spaces')).toBe('drive');
    expect(url.searchParams.get('q')).toContain("value='dev-1'");
    expect(url.searchParams.get('q')).toContain("'1XYZ' in parents");
    expect((calls[0]!.init!.headers as Record<string, string>).authorization).toBe('Bearer tok');
  });

  it('follows page tokens', async () => {
    let page = 0;
    const { d } = deps(() => {
      page += 1;
      return page === 1
        ? Response.json({ nextPageToken: 'n2', files: [{ appProperties: { photoId: 'a' } }] })
        : Response.json({ files: [{ appProperties: { photoId: 'b' } }] });
    });
    expect(await listDevicePhotos(d, 'dev', signal())).toEqual(['a', 'b']);
  });

  it('escapes quotes in the device ID', async () => {
    const { d, calls } = deps(() => Response.json({ files: [] }));
    await listDevicePhotos(d, "x'y", signal());
    expect(new URL(calls[0]!.url).searchParams.get('q')).toContain("value='x\\'y'");
  });
});

describe('createPhoto', () => {
  it('uploads multipart with metadata into the folder', async () => {
    const { d, calls } = deps(() => Response.json({ id: 'file-9' }));
    const out = await createPhoto(
      d,
      { name: 'NF26_x.jpg', bytes: new Uint8Array([1, 2, 3]), appProperties: { photoId: 'p1' } },
      signal(),
    );
    expect(out).toEqual({ id: 'file-9' });
    const call = calls[0]!;
    expect(call.url).toContain('/upload/drive/v3/files?');
    expect(call.url).toContain('uploadType=multipart');
    const body = await (call.init!.body as Blob).text();
    expect(body).toContain('"name":"NF26_x.jpg"');
    expect(body).toContain('"parents":["1XYZ"]');
    expect(body).toContain('"photoId":"p1"');
  });
});

describe('errors', () => {
  it('maps a timeout to DriveError timeout', async () => {
    const { d } = deps(() => {
      throw Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    });
    await expect(listDevicePhotos(d, 'dev', signal())).rejects.toMatchObject({ code: 'timeout' });
  });

  it('maps a non-2xx response to http_error', async () => {
    const { d } = deps(() => new Response('{"error":"forbidden"}', { status: 403 }));
    await expect(listDevicePhotos(d, 'dev', signal())).rejects.toMatchObject({ code: 'http_error' });
  });

  it('maps a token failure to auth_failed', async () => {
    const { d } = deps(() => Response.json({}));
    d.getToken = async () => {
      throw new Error('invalid_grant');
    };
    await expect(listDevicePhotos(d, 'dev', signal())).rejects.toBeInstanceOf(DriveError);
    await expect(listDevicePhotos(d, 'dev', signal())).rejects.toMatchObject({ code: 'auth_failed' });
  });
});

describe('checkFolder', () => {
  const folder = { id: '1XYZ', mimeType: 'application/vnd.google-apps.folder', trashed: false, capabilities: { canAddChildren: true } };

  it('passes when the folder exists and is writable', async () => {
    const { d } = deps(() => Response.json(folder));
    await expect(checkFolder(d, signal())).resolves.toBeUndefined();
  });

  it('fails when the ID is not a folder', async () => {
    const { d } = deps(() => Response.json({ ...folder, mimeType: 'image/jpeg' }));
    await expect(checkFolder(d, signal())).rejects.toThrow('DRIVE_FOLDER_ID is not a folder');
  });

  it('fails when the folder is in the trash', async () => {
    const { d } = deps(() => Response.json({ ...folder, trashed: true }));
    await expect(checkFolder(d, signal())).rejects.toThrow('The Photos folder is in the Drive trash');
  });

  it('fails when the account cannot add files', async () => {
    const { d } = deps(() => Response.json({ ...folder, capabilities: { canAddChildren: false } }));
    await expect(checkFolder(d, signal())).rejects.toThrow('cannot add files');
  });
});
