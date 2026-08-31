import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyOtpLogin } = await import("@/lib/auth-flows.server");
        return verifyOtpLogin(request);
      },
    },
  },
});
