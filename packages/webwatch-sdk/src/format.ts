/** Minimal string guard used for log output — never raises on weird values. */
export function escapeless(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

const CAUSE_DEPTH = 3;

/**
 * Error-shaped values keep their message + stack (plus a compact `caused by:`
 * trail); anything else degrades to a safe string.
 */
export function describeError(error: unknown): { message: string; stack: string | null } {
  if (!(error instanceof Error)) {
    return { message: escapeless(error), stack: null };
  }

  const message =
    typeof error.message === "string" && error.message !== "" ? error.message : error.name;
  let stack = typeof error.stack === "string" && error.stack !== "" ? error.stack : null;

  let current = (error as { cause?: unknown }).cause;
  for (let depth = 0; depth < CAUSE_DEPTH && current && current !== error; depth++) {
    const cause = current instanceof Error ? current.message : escapeless(current);
    stack = stack ? `${stack}\ncaused by: ${cause}` : `caused by: ${cause}`;
    current = (current as { cause?: unknown }).cause;
  }

  return { message, stack };
}
