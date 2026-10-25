import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { resolveSystemStatus } from "@/components/app/status-badge";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Brand anchor */}
      <div className="mb-12">
        <img src="/favicon.png" alt="" aria-hidden="true" className="h-10 w-10 opacity-40" />
      </div>
      <div className="max-w-sm text-center">
        <p className="font-mono text-xs font-medium text-muted-foreground">404</p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          Alamat yang kamu buka tidak ada atau sudah dipindahkan.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/">Kembali ke beranda</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-12">
        <img src="/favicon.png" alt="" aria-hidden="true" className="h-10 w-10 opacity-40" />
      </div>
      <div className="max-w-sm text-center">
        <p className="font-mono text-xs font-medium text-danger">error</p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
          Halaman ini gagal dimuat
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          Ada masalah di sisi kami. Coba muat ulang, atau kembali ke beranda.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Coba lagi
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Browser chrome cannot read a CSS variable, so the value mirrors
      // --brand-700 from src/styles.css.
      { name: "theme-color", content: "#078765" },
      { title: "WebWatch: APM & Error Monitoring dengan Alert Telegram" },
      {
        name: "description",
        content:
          "Terima log error dari aplikasi frontend/backend kamu dan dapatkan alert Telegram instan saat error terjadi.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "WebWatch: APM & Error Monitoring dengan Alert Telegram",
      },
      { property: "og:title", content: "WebWatch: APM & Error Monitoring dengan Alert Telegram" },
      {
        property: "og:description",
        content:
          "Terima log error dari aplikasi frontend/backend kamu dan dapatkan alert Telegram instan saat error terjadi.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/og.png" },
      { name: "twitter:title", content: "WebWatch: APM & Error Monitoring dengan Alert Telegram" },
      {
        name: "twitter:description",
        content:
          "Terima log error dari aplikasi frontend/backend kamu dan dapatkan alert Telegram instan saat error terjadi.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon", sizes: "any" },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "256x256" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { useQuery } from "@tanstack/react-query";

function GlobalSystemStatus() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["global-system-status"],
    queryFn: async () => {
      const res = await fetch("/api/system-status");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 60000,
  });

  if (isLoading) return null;

  const status = isError ? "unknown" : (data?.status ?? "unknown");
  const state = resolveSystemStatus(status);

  const dot =
    state.key === "operational"
      ? "bg-up"
      : state.key === "degraded"
        ? "bg-degraded"
        : state.key === "outage"
          ? "bg-down"
          : "bg-paused";

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link
        to="/status"
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-md backdrop-blur transition-colors duration-[var(--motion-fast)] hover:border-border-strong hover:text-foreground"
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot} ${state.key === "operational" ? "live-dot" : ""}`}
          aria-hidden="true"
        />
        <span className="sr-only">Status sistem WebWatch: </span>
        {state.label}
      </Link>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <GlobalSystemStatus />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
