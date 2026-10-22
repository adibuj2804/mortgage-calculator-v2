// Test support: the example files of the API contract (api/examples/*.json) as a fake server.
export type Example = {
  name: string;
  setup: Record<string, unknown>;
  request: { method: string; path: string; body: unknown };
  status: number;
  response: unknown;
};

const files = import.meta.glob('../../../api/examples/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Example>;

export const examples: Example[] = Object.values(files);

export const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
export const LIST_PATH = `/api/v1/calculations?client_id=${CLIENT_ID}&limit=20`;

export function example(name: string): Example {
  const found = examples.find((item) => item.name === name);
  if (!found) throw new Error(`No example file named ${name}`);
  return found;
}

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
}

export function findExample(method: string, path: string, body: unknown): Example | undefined {
  return examples.find(
    (item) =>
      item.request.method === method &&
      item.request.path === path &&
      canonical(item.request.body ?? null) === canonical(body ?? null) &&
      item.setup.repository === undefined,
  );
}

export function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export type Call = { method: string; path: string; body: unknown };

// A fetch that answers from the example files. A request without an example fails loudly.
export function fakeServer(
  override?: (call: Call, index: number) => Response | Promise<Response> | undefined,
) {
  const calls: Call[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    const path = String(url).replace('http://api.test', '');
    const call: Call = {
      method: init?.method ?? 'GET',
      path,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    };
    calls.push(call);
    const custom = override?.(call, calls.length - 1);
    if (custom) return custom;
    const found = findExample(call.method, call.path, call.body);
    if (!found)
      throw new Error(`No example for ${call.method} ${call.path} ${JSON.stringify(call.body)}`);
    return reply(found.status, found.response);
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
