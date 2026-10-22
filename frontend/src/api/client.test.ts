import { afterEach, describe, expect, it, vi } from 'vitest';
import { example, fakeServer, reply } from '../testing/examples';
import {
  ApiUnavailableError,
  ApiUnreachableError,
  ApiValidationError,
  createApiClient,
} from './client';

const BASE = 'http://api.test';
const REQUEST = {
  loan: '100000',
  annual_rate_percent: '4',
  term_years: '20',
  extra_monthly_payment: '',
};

afterEach(() => {
  vi.useRealTimers();
});

describe('API client', () => {
  it('api-client-calculate-sends-text-as-typed', async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn = (async (url: string, init: RequestInit) => {
      seen.push({ url, init });
      return reply(422, { errors: { loan: 'Enter a number' } });
    }) as unknown as typeof fetch;
    const typed = {
      loan: ' 100000 ',
      annual_rate_percent: '4,5',
      term_years: '20',
      extra_monthly_payment: '',
    };

    await createApiClient(BASE, fetchFn)
      .calculate(typed)
      .catch(() => undefined);

    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toBe('http://api.test/api/v1/calculate');
    expect(seen[0]?.init.method).toBe('POST');
    expect(new Headers(seen[0]?.init.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(String(seen[0]?.init.body))).toEqual(typed);
  });

  it('api-client-calculate-returns-calculation', async () => {
    const { fetchFn } = fakeServer();
    const result = await createApiClient(BASE, fetchFn).calculate(REQUEST);
    expect(result).toEqual(example('calculate-100k-4pct-20y').response);
  });

  it('api-client-calculate-maps-422-to-field-errors', async () => {
    const { fetchFn } = fakeServer();
    const request = { ...REQUEST, loan: '', annual_rate_percent: '30' };
    const failure = await createApiClient(BASE, fetchFn)
      .calculate(request)
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiValidationError);
    expect((failure as ApiValidationError).errors).toEqual(
      (example('calculate-422-empty-loan-and-rate-30').response as { errors: unknown }).errors,
    );
  });

  it('api-client-network-failure-is-unreachable', async () => {
    const down = (async () => {
      throw new TypeError('network down');
    }) as unknown as typeof fetch;
    const notJson = (async () =>
      new Response('<html>', { status: 200 })) as unknown as typeof fetch;
    await expect(createApiClient(BASE, down).calculate(REQUEST)).rejects.toBeInstanceOf(
      ApiUnreachableError,
    );
    await expect(createApiClient(BASE, notJson).calculate(REQUEST)).rejects.toBeInstanceOf(
      ApiUnreachableError,
    );
  });

  it('api-client-wrong-shape-is-unreachable', async () => {
    const noResult = (async () => reply(200, { input: {} })) as unknown as typeof fetch;
    const serverError = (async () =>
      reply(500, { error: 'internal_error' })) as unknown as typeof fetch;
    await expect(createApiClient(BASE, noResult).calculate(REQUEST)).rejects.toBeInstanceOf(
      ApiUnreachableError,
    );
    await expect(createApiClient(BASE, serverError).calculate(REQUEST)).rejects.toBeInstanceOf(
      ApiUnreachableError,
    );
  });

  it('api-client-times-out', async () => {
    let aborted = false;
    const hanging = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          aborted = true;
          reject(new DOMException('Aborted', 'AbortError'));
        });
      })) as unknown as typeof fetch;
    const started = Date.now();
    await expect(createApiClient(BASE, hanging, 50).calculate(REQUEST)).rejects.toBeInstanceOf(
      ApiUnreachableError,
    );
    expect(aborted).toBe(true);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('api-client-default-timeout-is-10-seconds', async () => {
    vi.useFakeTimers();
    const hanging = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      })) as unknown as typeof fetch;
    let settled = false;
    const pending = createApiClient(BASE, hanging)
      .calculate(REQUEST)
      .catch((error: unknown) => {
        settled = true;
        return error;
      });

    await vi.advanceTimersByTimeAsync(9999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBeInstanceOf(ApiUnreachableError);
  });

  it('api-client-422-with-unknown-keys-is-unreachable', async () => {
    const request = (async () =>
      reply(422, { errors: { _request: 'Invalid request' } })) as unknown as typeof fetch;
    const clientId = (async () =>
      reply(422, { errors: { client_id: 'Invalid client id' } })) as unknown as typeof fetch;
    await expect(createApiClient(BASE, request).calculate(REQUEST)).rejects.toBeInstanceOf(
      ApiUnreachableError,
    );
    await expect(createApiClient(BASE, clientId).calculate(REQUEST)).rejects.toBeInstanceOf(
      ApiUnreachableError,
    );
  });

  it('api-client-save-sends-client-id', async () => {
    const { fetchFn, calls } = fakeServer();
    const saved = await createApiClient(BASE, fetchFn).save(
      REQUEST,
      '11111111-1111-4111-8111-111111111111',
    );
    expect(calls).toEqual([
      {
        method: 'POST',
        path: '/api/v1/calculations',
        body: { ...REQUEST, client_id: '11111111-1111-4111-8111-111111111111' },
      },
    ]);
    expect(saved).toEqual(example('save-100k-4pct-20y').response);
  });

  it('api-client-save-503-is-unavailable', async () => {
    const offline = example('save-database-unavailable');
    const fetchFn = (async () =>
      reply(offline.status, offline.response)) as unknown as typeof fetch;
    await expect(
      createApiClient(BASE, fetchFn).save(REQUEST, '11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it('api-client-list-builds-query', async () => {
    const { fetchFn, calls } = fakeServer((call) =>
      call.method === 'GET' ? reply(200, example('list-newest-first').response) : undefined,
    );
    const items = await createApiClient(BASE, fetchFn).list(
      '11111111-1111-4111-8111-111111111111',
      20,
    );
    expect(calls).toEqual([
      {
        method: 'GET',
        path: '/api/v1/calculations?client_id=11111111-1111-4111-8111-111111111111&limit=20',
        body: null,
      },
    ]);
    expect(items).toEqual((example('list-newest-first').response as { items: unknown }).items);
    expect(items).toHaveLength(2);
  });
});
