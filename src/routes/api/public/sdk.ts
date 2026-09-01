import { createFileRoute } from "@tanstack/react-router";

const sdkContent = `
class WebWatchClient {
  constructor() {
    this.apiKey = null;
    this.endpoint = "";
  }

  init(key, endpoint = "/api/ingest") {
    this.apiKey = key;
    this.endpoint = endpoint;
    
    // Auto-capture uncaught errors in browser
    if (typeof window !== "undefined") {
      window.addEventListener("error", async (event) => {
        this.capture("frontend_error", event.message, event.error?.stack, window.location.href, "GET");
      });
      window.addEventListener("unhandledrejection", async (event) => {
        this.capture("frontend_promise_error", String(event.reason), null, window.location.href, "GET");
      });
    }
  }

  expressErrorHandler() {
    return async (err, req, res, next) => {
      await this.capture("backend_error", err.message, err.stack, req.originalUrl, req.method);
      next(err);
    };
  }

  async capture(type, message, stackTrace, url, method) {
    if (!this.apiKey) return;
    try {
      // If endpoint is relative, assume we are on the same domain (e.g. self-hosted)
      // Otherwise, use the absolute URL provided during init
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const targetUrl = this.endpoint.startsWith("http") ? this.endpoint : (baseUrl + this.endpoint);
      
      await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + this.apiKey
        },
        body: JSON.stringify({
          events: [{
             type, message, stack_trace: stackTrace, url, method,
             environment: (typeof process !== "undefined" && process.env && process.env.NODE_ENV) ? process.env.NODE_ENV : "production"
          }]
        })
      });
    } catch (e) {
      console.error("WebWatch SDK Ingest Failed:", e);
    }
  }
}

export const WebWatch = new WebWatchClient();
`;

export const Route = createFileRoute("/api/public/sdk")({
  server: {
    handlers: {
      GET: () => {
        return new Response(sdkContent, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
