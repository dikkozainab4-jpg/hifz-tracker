import test from "node:test";
import assert from "node:assert/strict";
import { createSync } from "../site/js/sync.js";

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("pushes once after a burst of changes and clears the dirty flag", async () => {
  const pushed = [];
  const sync = createSync({ userId: "u1", storage: memory(), delayMs: 10, push: async (s) => pushed.push(s), getSnapshot: () => ({ n: pushed.length }) });
  sync.changed(); sync.changed(); sync.changed();
  assert.equal(sync.isDirty(), true);
  await wait(50);
  assert.equal(pushed.length, 1);
  assert.equal(sync.isDirty(), false);
  sync.stop();
});

test("stays dirty and retries when the push fails", async () => {
  let calls = 0;
  const statuses = [];
  const sync = createSync({
    userId: "u1", storage: memory(), delayMs: 5, retryMs: 10, onStatus: (s) => statuses.push(s),
    push: async () => { if (++calls === 1) throw new Error("offline"); },
    getSnapshot: () => ({}),
  });
  sync.changed();
  await wait(80);
  assert.equal(calls, 2);
  assert.equal(sync.isDirty(), false);
  assert.deepEqual(statuses.filter((s) => s !== "saving"), ["offline", "saved"]);
  sync.stop();
});

test("dirty flag is per user and survives a new sync instance", () => {
  const storage = memory();
  const a = createSync({ userId: "a", storage, push: async () => {}, getSnapshot: () => ({}) });
  a.changed(); a.stop();
  assert.equal(createSync({ userId: "a", storage, push: async () => {}, getSnapshot: () => ({}) }).isDirty(), true);
  assert.equal(createSync({ userId: "b", storage, push: async () => {}, getSnapshot: () => ({}) }).isDirty(), false);
});
