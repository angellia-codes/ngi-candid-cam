import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { PhotoRecord } from '@/lib/queue/policy';
import { openPhotoStore } from '@/lib/queue/store';

const rec = (photoId: string, createdAt: number): PhotoRecord => ({
  photoId,
  capturedAt: '2026-12-08T13:00:00.000Z',
  createdAt,
  bytes: new Uint8Array([1, 2, 3, createdAt]).buffer,
  status: 'developing',
  attempts: 0,
  nextAttemptAt: 0,
});

describe('openPhotoStore', () => {
  it('returns records oldest first', async () => {
    const store = await openPhotoStore(new IDBFactory());
    await store.put(rec('b', 2));
    await store.put(rec('a', 1));
    expect((await store.all()).map((r) => r.photoId)).toEqual(['a', 'b']);
  });

  it('keeps photo bytes intact', async () => {
    const store = await openPhotoStore(new IDBFactory());
    await store.put(rec('a', 7));
    const got = await store.get('a');
    expect([...new Uint8Array(got!.bytes)]).toEqual([1, 2, 3, 7]);
  });

  it('updates a record in place', async () => {
    const store = await openPhotoStore(new IDBFactory());
    await store.put(rec('a', 1));
    await store.put({ ...rec('a', 1), status: 'saved', attempts: 1 });
    const all = await store.all();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ status: 'saved', attempts: 1 });
  });

  it('survives reopening the database', async () => {
    const factory = new IDBFactory();
    await (await openPhotoStore(factory)).put(rec('a', 1));
    expect(await (await openPhotoStore(factory)).get('a')).toBeDefined();
  });
});
