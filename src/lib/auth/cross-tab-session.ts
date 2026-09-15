/**
 * Wake other same-origin tabs when a magic-link tab finishes sign-in.
 * Session cookies are HttpOnly, so tabs still confirm via getSession();
 * this only speeds up the wait.
 */

export const AUTH_SESSION_CHANNEL = "greggs-auth-session";
export const AUTH_SESSION_STORAGE_KEY = "greggs-auth-session-ping";

export type AuthSessionMessage = { type: "session-ready" };

export function notifyAuthSessionReady(): void {
  if (typeof window === "undefined") return;

  try {
    const channel = new BroadcastChannel(AUTH_SESSION_CHANNEL);
    const message: AuthSessionMessage = { type: "session-ready" };
    channel.postMessage(message);
    channel.close();
  } catch {
    // BroadcastChannel unavailable — polling still works.
  }

  try {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, String(Date.now()));
  } catch {
    // Private mode / blocked storage — ignore.
  }
}

export function subscribeAuthSessionReady(onReady: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(AUTH_SESSION_CHANNEL);
    channel.onmessage = (event: MessageEvent<AuthSessionMessage>) => {
      if (event.data?.type === "session-ready") onReady();
    };
  } catch {
    channel = null;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === AUTH_SESSION_STORAGE_KEY && event.newValue) onReady();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}
