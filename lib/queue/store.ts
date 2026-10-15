import type { PhotoRecord } from '@/lib/queue/policy';

export interface PhotoStore {
  put(record: PhotoRecord): Promise<void>;
  get(photoId: string): Promise<PhotoRecord | undefined>;
  /** All records, oldest first. */
  all(): Promise<PhotoRecord[]>;
}

const DB_NAME = 'nf26-candid-cam';
const STORE = 'photos';
const VERSION = 1;

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function openPhotoStore(factory: IDBFactory = indexedDB): Promise<PhotoStore> {
  const open = factory.open(DB_NAME, VERSION);
  open.onupgradeneeded = () => {
    const db = open.result;
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'photoId' });
  };
  const db = await done(open);

  const store = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);

  return {
    async put(record) {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    },
    async get(photoId) {
      return (await done(store('readonly').get(photoId))) as PhotoRecord | undefined;
    },
    async all() {
      const rows = (await done(store('readonly').getAll())) as PhotoRecord[];
      return rows.sort((a, b) => a.createdAt - b.createdAt);
    },
  };
}
