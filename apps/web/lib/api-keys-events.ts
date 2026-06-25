// Lightweight cross-component signal so views that embed the active API key
// (e.g. the MCP connect page) refresh the moment a key is created or deleted
// elsewhere (e.g. the profile API Keys panel), without a page reload.
const EVENT = "compify:api-keys-changed";

export function emitApiKeysChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function onApiKeysChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
