import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/link-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { linkStatus } = await import("@/lib/auth-flows.server");
        return linkStatus(request);
      },
    },
  },
});
