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
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(
    JSON.stringify({
      event,
      at: new Date().toISOString(),
      level: "error",
      message,
      stack,
      ...payload,
    }),
  );
}

export function isVerboseSessionPoll(): boolean {
  return process.env.LOG_SESSION_POLL === "1" || process.env.LOG_SESSION_POLL === "true";
}
