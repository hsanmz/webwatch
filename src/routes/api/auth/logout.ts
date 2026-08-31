import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { logout } = await import("@/lib/auth-flows.server");
        return logout(request);
      },
    },
  },
});
