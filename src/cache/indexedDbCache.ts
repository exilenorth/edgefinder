const DB_NAME = "edgefinder-cache";
const DB_VERSION = 1;
const STORE_NAME = "responses";

export interface CacheRecord<T> {
  key: string;
  value: T;
  savedAt: number;
  expiresAt: number;
}

export interface CacheMeta {
  key: string;
  savedAt: number;
  expiresAt: number;
}

export async function getCachedValue<T>(key: string): Promise<CacheRecord<T> | undefined> {
  if (!hasIndexedDb()) return undefined;

  const record = await withStore<CacheRecord<T> | undefined>("readonly", (store) => requestToPromise(store.get(key)));
  if (!record) return undefined;

  if (record.expiresAt <= Date.now()) {
    await deleteCachedValue(key);
    return undefined;
  }

  return record;
}

export async function setCachedValue<T>(key: string, value: T, ttlMs: number): Promise<CacheRecord<T> | undefined> {
  if (!hasIndexedDb()) return undefined;

  const now = Date.now();
  const record = {
    key,
    value,
    savedAt: now,
    expiresAt: now + ttlMs
  };

  await withStore("readwrite", (store) => requestToPromise(store.put(record)));
  return record;
}

export async function deleteCachedValue(key: string): Promise<void> {
  if (!hasIndexedDb()) return;
  await withStore("readwrite", (store) => requestToPromise(store.delete(key)));
}

export async function getCacheMeta(key: string): Promise<CacheMeta | undefined> {
  const record = await getCachedValue<unknown>(key);
  if (!record) return undefined;
  return {
    key: record.key,
    savedAt: record.savedAt,
    expiresAt: record.expiresAt
  };
}

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    action(store).then(resolve).catch(reject);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
