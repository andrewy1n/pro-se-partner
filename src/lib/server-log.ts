/** browser-use-sdk throws BrowserUseError with statusCode + detail; message is often useless. */
function browserUseErrorFields(err: Error): { statusCode: number; detail: unknown } | undefined {
  const bu = err as Error & { statusCode?: unknown; detail?: unknown };
  if (typeof bu.statusCode === "number") {
    return { statusCode: bu.statusCode, detail: bu.detail };
  }
  return undefined;
}

function serializeUnknownError(err: unknown): {
  message: string;
  stack: string | undefined;
  errorBody?: unknown;
  browserUse?: { statusCode: number; detail: unknown };
} {
  if (err instanceof Error) {
    const extra = extractNestedBody(err);
    const bu = browserUseErrorFields(err);
    const message =
      bu && (err.message === "[object Object]" || !err.message.trim())
        ? `BrowserUse API error HTTP ${bu.statusCode}`
        : err.message;
    return {
      message,
      stack: err.stack,
      ...(extra !== undefined ? { errorBody: extra } : {}),
      ...(bu !== undefined ? { browserUse: bu } : {}),
    };
  }
  if (typeof err === "string") {
    return { message: err, stack: undefined };
  }
  if (err && typeof err === "object") {
    const asRecord = err as Record<string, unknown>;
    const msg =
      typeof asRecord.message === "string"
        ? asRecord.message
        : typeof asRecord.error === "string"
          ? asRecord.error
          : JSON.stringify(err, null, 2).slice(0, 1000);
    return { message: msg, stack: undefined, errorBody: err };
  }
  return { message: String(err), stack: undefined };
}

function extractNestedBody(err: Error): unknown | undefined {
  const asAny = err as unknown as Record<string, unknown>;
  if (asAny.body !== undefined) return asAny.body;
  if (asAny.response !== undefined) return asAny.response;
  if (asAny.data !== undefined) return asAny.data;
  if (asAny.cause !== undefined) return asAny.cause;
  return undefined;
}

export function logServerEvent(
  event: string,
  payload: Record<string, unknown> = {},
) {
  console.log(
    JSON.stringify({
      event,
      at: new Date().toISOString(),
      ...payload,
    }),
  );
}

export function logServerError(
  event: string,
  err: unknown,
  payload: Record<string, unknown> = {},
) {
  const { message, stack, errorBody, browserUse } = serializeUnknownError(err);
  console.error(
    JSON.stringify({
      event,
      at: new Date().toISOString(),
      level: "error",
      message,
      stack,
      ...(errorBody !== undefined ? { errorBody } : {}),
      ...(browserUse !== undefined ? { browserUse } : {}),
      ...payload,
    }),
  );
}

export function isVerboseSessionPoll(): boolean {
  return process.env.LOG_SESSION_POLL === "1" || process.env.LOG_SESSION_POLL === "true";
}
