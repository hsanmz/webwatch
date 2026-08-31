import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sites/detail")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { siteDetail } = await import("@/lib/sites-api.server");
        return siteDetail(request);
      },
    },
  },
});
