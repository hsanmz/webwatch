import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requestOtp } = await import("@/lib/auth-flows.server");
        return requestOtp(request);
      },
    },
  },
});
