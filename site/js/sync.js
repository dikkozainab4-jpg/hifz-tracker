// Debounced, retrying upload of a user's data. A "dirty" flag survives reloads, so changes that
// never reached the server win over the server copy the next time the user signs in.

/**
 * @param opts { userId, push(snapshot), getSnapshot(), storage?, onStatus?(status), delayMs?, retryMs? }
 * status is one of "saving" | "saved" | "offline".
 */
export function createSync({ userId, push, getSnapshot, storage = globalThis.localStorage, onStatus = () => {}, delayMs = 1500, retryMs = 15000 }) {
  const dirtyKey = `hifzly:dirty:${userId}`;
  let timer = null;
  let inflight = null;
  let version = 0; // bumped on every local change, so an upload never marks newer edits as sent
  let stopped = false;

  const read = () => { try { return storage?.getItem(dirtyKey) === "1"; } catch { return false; } };
  const write = (on) => { try { on ? storage?.setItem(dirtyKey, "1") : storage?.removeItem(dirtyKey); } catch { /* ignore */ } };

  const schedule = (ms) => {
    clearTimeout(timer);
    if (!stopped) timer = setTimeout(run, ms);
  };

  async function run() {
    clearTimeout(timer);
    timer = null;
    if (stopped) return;
    if (inflight) return inflight;
    const sent = version;
    onStatus("saving");
    inflight = (async () => {
      try {
        await push(getSnapshot());
        onStatus("saved");
        if (sent === version) write(false);
        else schedule(delayMs);
      } catch (e) {
        console.warn("Could not sync to your account", e);
        onStatus("offline");
        schedule(retryMs);
      }
    })();
    await inflight;
    inflight = null;
  }

  return {
    isDirty: read,
    /** Call after every local change. */
    changed() { version++; write(true); schedule(delayMs); },
    /** Upload now if anything is unsent. */
    async flush() { if (read()) await run(); },
    /** Mark everything as sent (used after loading from the server). */
    clean() { write(false); },
    stop() { stopped = true; clearTimeout(timer); },
  };
}
