import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { requestOtp } = await import("@/lib/auth-flows.server");
          return await requestOtp(request);
        } catch (error: unknown) {
          console.error("OTP Error:", error);
          const msg = error instanceof Error ? error.message : "Unknown error";
          const stack = error instanceof Error ? error.stack : undefined;
          return new Response(JSON.stringify({ error: msg, stack }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
