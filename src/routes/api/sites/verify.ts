import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sites/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifySite } = await import("@/lib/sites-api.server");
        return verifySite(request);
      },
    },
  },
});
