// Small fetch wrapper: descriptive User-Agent, timeout, normalized errors.
// Tool handlers catch HttpError and turn it into an MCP error response rather
// than letting a raw exception escape.

const USER_AGENT =
  "chaimp-mcp-rcw/0.1 (MCP learning project; contact james.whelan@chaimp.org)";
const DEFAULT_TIMEOUT_MS = 10_000;

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

async function request(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, ...headers },
    });
    if (!res.ok) {
      throw new HttpError(`${url} -> ${res.status} ${res.statusText}`, res.status);
    }
    return res;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new HttpError(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw new HttpError(`Request to ${url} failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url: string): Promise<string> {
  const res = await request(url);
  return res.text();
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await request(url, { headers: { Accept: "application/json" } });
  return (await res.json()) as T;
}

export async function postSoap(
  url: string,
  soapAction: string,
  envelope: string,
): Promise<string> {
  const res = await request(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"${soapAction}"`,
    },
    body: envelope,
  });
  return res.text();
}
