export const WebWatch = {
  apiKey: null,

  init(key) {
    this.apiKey = key;
    if (typeof window !== "undefined") {
      window.addEventListener("error", async (event) => {
        this.capture(
          "frontend_error",
          event.message,
          event.error?.stack,
          window.location.href,
          "GET",
        );
      });
    }
  },

  expressErrorHandler() {
    return async (err, req, res, next) => {
      await this.capture("backend_error", err.message, err.stack, req.originalUrl, req.method);
      next(err);
    };
  },

  async capture(type, message, stackTrace, url, method) {
    if (!this.apiKey) return;
    try {
      await fetch("https://your-webwatch-domain.com/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          events: [
            {
              type,
              message,
              stack_trace: stackTrace,
              url,
              method,
              environment: process?.env?.NODE_ENV || "production",
            },
          ],
        }),
      });
    } catch (e) {
      console.error("WebWatch SDK Ingest Failed:", e);
    }
  },
};
