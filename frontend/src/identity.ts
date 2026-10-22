const KEY = 'mortgage.clientId';
const CANONICAL = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Store = Pick<Storage, 'getItem' | 'setItem'>;

let remembered: string | undefined;

function newUuid(source: Crypto): string {
  if (typeof source.randomUUID === 'function') return source.randomUUID();
  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function browserStorage(): Store | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

// The random id of this browser. It is not a login: it only decides which saved list is shown.
export function getClientId(
  storage: Store | undefined = browserStorage(),
  source: Crypto = globalThis.crypto,
): string {
  try {
    const stored = storage?.getItem(KEY);
    if (stored && CANONICAL.test(stored)) return stored;
    const id = newUuid(source);
    storage?.setItem(KEY, id);
    return id;
  } catch {
    remembered ??= newUuid(source);
    return remembered;
  }
}
