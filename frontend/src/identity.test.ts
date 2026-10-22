import { describe, expect, it } from 'vitest';
import { getClientId } from './identity';

const CANONICAL = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

describe('client id', () => {
  it('identity-creates-and-remembers-client-id', () => {
    const storage = memoryStorage();
    const first = getClientId(storage);
    expect(first).toMatch(CANONICAL);
    expect(getClientId(storage)).toBe(first);
  });

  it('identity-works-when-storage-throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const first = getClientId(broken);
    expect(first).toMatch(CANONICAL);
    expect(getClientId(broken)).toBe(first);
  });

  it('identity-works-without-random-uuid', () => {
    const noUuid = {
      getRandomValues: (bytes: Uint8Array) => bytes.map((_value, index) => (index * 37 + 11) % 256),
    } as unknown as Crypto;
    const id = getClientId(memoryStorage(), noUuid);
    expect(id).toMatch(CANONICAL);
    expect(id.split('-')[2]?.startsWith('4')).toBe(true);
  });

  it('identity-replaces-invalid-stored-id', () => {
    const storage = memoryStorage({ 'mortgage.clientId': 'not-a-uuid' });
    const id = getClientId(storage);
    expect(id).toMatch(CANONICAL);
    expect(storage.data.get('mortgage.clientId')).toBe(id);
  });
});
