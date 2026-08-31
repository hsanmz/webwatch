import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { currentUser } = await import("@/lib/auth-flows.server");
        return currentUser(request);
      },
    },
  },
});
