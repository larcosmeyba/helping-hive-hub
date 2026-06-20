// Minimal server-side Sentry capture. Posts a Store-API event to Sentry
// using the SENTRY_DSN secret. No-ops if the secret is unset, so local /
// preview deployments don't fail. Never logs secrets, tokens, or request
// bodies — caller controls the context.

interface ParsedDsn {
  storeUrl: string;
  publicKey: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, "");
    if (!publicKey || !projectId) return null;
    const storeUrl = `${u.protocol}//${u.host}/api/${projectId}/store/`;
    return { storeUrl, publicKey };
  } catch {
    return null;
  }
}

const DSN = Deno.env.get("SENTRY_DSN") ?? "";
const parsed = DSN ? parseDsn(DSN) : null;

export interface EdgeErrorContext {
  fn: string;
  user_id?: string | null;
  status?: number;
  extra?: Record<string, unknown>;
}

const SENSITIVE = /(token|authorization|apikey|api_key|password|secret|cookie|jwt)/i;
function scrub<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  try {
    const out: any = Array.isArray(value) ? [...(value as any)] : { ...(value as any) };
    for (const k of Object.keys(out)) {
      if (SENSITIVE.test(k)) out[k] = "[scrubbed]";
      else if (typeof out[k] === "object") out[k] = scrub(out[k]);
    }
    return out as T;
  } catch {
    return value;
  }
}

export async function captureEdgeError(err: unknown, ctx: EdgeErrorContext) {
  if (!parsed) return;
  try {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const event = {
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: new Date().toISOString(),
      platform: "javascript",
      level: "error",
      logger: "edge-function",
      environment: Deno.env.get("SENTRY_ENVIRONMENT") ?? "production",
      release: Deno.env.get("SENTRY_RELEASE") ?? undefined,
      tags: {
        fn: ctx.fn,
        ...(ctx.status ? { status: String(ctx.status) } : {}),
      },
      user: ctx.user_id ? { id: ctx.user_id } : undefined,
      extra: scrub(ctx.extra ?? {}),
      exception: {
        values: [
          {
            type: err instanceof Error ? err.name : "Error",
            value: message.slice(0, 1000),
            stacktrace: stack ? { frames: [{ filename: ctx.fn, function: "handler", in_app: true, context_line: stack.slice(0, 2000) }] } : undefined,
          },
        ],
      },
    };

    const auth = [
      "Sentry sentry_version=7",
      `sentry_client=hth-edge/1.0`,
      `sentry_key=${parsed.publicKey}`,
    ].join(", ");

    await fetch(parsed.storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": auth,
      },
      body: JSON.stringify(event),
    }).catch(() => { /* swallow */ });
  } catch {
    // Never throw from the logger.
  }
}
