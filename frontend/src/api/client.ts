import type { CalculateRequest, CalculateResponse, SavedCalculation } from './types';

export class ApiValidationError extends Error {
  constructor(readonly errors: Record<string, string>) {
    super('The server found invalid input');
  }
}

export class ApiUnavailableError extends Error {
  constructor() {
    super('The database is unavailable');
  }
}

export class ApiUnreachableError extends Error {
  constructor(reason: string) {
    super(`The calculator cannot be reached: ${reason}`);
  }
}

const FIELDS = ['loan', 'annual_rate_percent', 'term_years', 'extra_monthly_payment'];

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCalculation = (value: unknown): boolean =>
  isObject(value) && isObject(value.input) && isObject(value.result);

const isCalculateResponse = (value: unknown): value is CalculateResponse =>
  isCalculation(value) &&
  isObject((value as Json).schedule) &&
  Array.isArray(((value as Json).schedule as Json).yearly);

const isSaved = (value: unknown): value is SavedCalculation =>
  isCalculation(value) && typeof (value as Json).id === 'string';

function fieldErrors(body: unknown): Record<string, string> {
  const errors = isObject(body) ? body.errors : undefined;
  if (!isObject(errors)) throw new ApiUnreachableError('unexpected validation reply');
  const entries = Object.entries(errors);
  if (!entries.every(([key, message]) => FIELDS.includes(key) && typeof message === 'string')) {
    throw new ApiUnreachableError('validation reply with unknown fields');
  }
  return errors as Record<string, string>;
}

export function createApiClient(
  baseUrl: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 10_000,
) {
  async function send(method: 'GET' | 'POST', path: string, body?: unknown) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFn(baseUrl + path, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      let json: unknown;
      try {
        json = await response.json();
      } catch {
        throw new ApiUnreachableError('the reply is not JSON');
      }
      return { status: response.status, json };
    } catch (error) {
      if (error instanceof ApiUnreachableError) throw error;
      throw new ApiUnreachableError(error instanceof Error ? error.message : 'unknown failure');
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async calculate(request: CalculateRequest): Promise<CalculateResponse> {
      const { status, json } = await send('POST', '/api/v1/calculate', request);
      if (status === 200 && isCalculateResponse(json)) return json;
      if (status === 422) throw new ApiValidationError(fieldErrors(json));
      throw new ApiUnreachableError(`unexpected reply (HTTP ${status})`);
    },

    async save(request: CalculateRequest, clientId: string): Promise<SavedCalculation> {
      const { status, json } = await send('POST', '/api/v1/calculations', {
        ...request,
        client_id: clientId,
      });
      if (status === 201 && isSaved(json)) return json;
      if (status === 503) throw new ApiUnavailableError();
      if (status === 422) throw new ApiValidationError(fieldErrors(json));
      throw new ApiUnreachableError(`unexpected reply (HTTP ${status})`);
    },

    async list(clientId: string, limit: number): Promise<SavedCalculation[]> {
      const query = `client_id=${encodeURIComponent(clientId)}&limit=${limit}`;
      const { status, json } = await send('GET', `/api/v1/calculations?${query}`);
      if (
        status === 200 &&
        isObject(json) &&
        Array.isArray(json.items) &&
        json.items.every(isSaved)
      ) {
        return json.items;
      }
      if (status === 503) throw new ApiUnavailableError();
      throw new ApiUnreachableError(`unexpected reply (HTTP ${status})`);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
