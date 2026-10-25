/**
 * Types shared across the SDK. Event field names mirror the POST /api/ingest
 * contract exactly (snake_case) so payloads serialize as-is.
 */
export type WebWatchEvent = {
  /** Free-form event type, mis. frontend_error, backend_error, api_error, log. */
  type: string;
  message: string;
  stack_trace?: string | null;
  url?: string | null;
  method?: string | null;
  environment?: string;
  user_agent?: string;
};

export type CaptureOptions = {
  url?: string | null;
  method?: string | null;
  /** Overrides the resolved NODE_ENV for this event only. */
  environment?: string;
};

export type RuntimeKind = "browser" | "bun" | "edge" | "node";
