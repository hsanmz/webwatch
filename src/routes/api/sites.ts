import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sites")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { listSites } = await import("@/lib/sites-api.server");
        return listSites(request);
      },
      POST: async ({ request }) => {
        const { createSite } = await import("@/lib/sites-api.server");
        return createSite(request);
      },
      PATCH: async ({ request }) => {
        const { updateSite } = await import("@/lib/sites-api.server");
        return updateSite(request);
      },
      DELETE: async ({ request }) => {
        const { deleteSite } = await import("@/lib/sites-api.server");
        return deleteSite(request);
      },
    },
  },
});
