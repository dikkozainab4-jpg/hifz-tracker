// Minimal IndexedDB key/value persistence for the SQLite database bytes.
const DB_NAME = "hifzly";
const STORE = "kv";
const DEFAULT_KEY = "sqlite"; // pre-accounts database; signed-in users get "sqlite:<userId>"

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
}

const request = (db, mode, fn) =>
  new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

/** Resolves {bytes, save} or rejects when persistent storage cannot be used. */
export async function openPersistence(KEY = DEFAULT_KEY) {
  const db = await open();
  const bytes = await request(db, "readonly", (s) => s.get(KEY));
  return {
    bytes: bytes ? new Uint8Array(bytes) : undefined,
    save: (data) => request(db, "readwrite", (s) => s.put(data, KEY)),
  };
}
