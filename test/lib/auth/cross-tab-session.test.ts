/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_SESSION_CHANNEL,
  AUTH_SESSION_STORAGE_KEY,
  notifyAuthSessionReady,
  subscribeAuthSessionReady,
} from "@/lib/auth/cross-tab-session";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

describe("cross-tab session signaling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes a storage ping so other tabs can wake", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);

    notifyAuthSessionReady();
    expect(storage.getItem(AUTH_SESSION_STORAGE_KEY)).toMatch(/^\d+$/);
  });

  it("notifies subscribers via BroadcastChannel", async () => {
    const onReady = vi.fn();
    const unsubscribe = subscribeAuthSessionReady(onReady);

    const channel = new BroadcastChannel(AUTH_SESSION_CHANNEL);
    channel.postMessage({ type: "session-ready" });
    channel.close();

    await vi.waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });

    unsubscribe();
  });

  it("notifies subscribers via storage events", () => {
    const onReady = vi.fn();
    const unsubscribe = subscribeAuthSessionReady(onReady);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: AUTH_SESSION_STORAGE_KEY,
        newValue: "123",
      })
    );

    expect(onReady).toHaveBeenCalled();
    unsubscribe();
  });
});
