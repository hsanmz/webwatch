import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Pengaturan - WebWatch" }],
  }),
  component: SettingsPage,
});

/*
 * Pengaturan akun — currently a placeholder.
 *
 * Account-level settings (Telegram reconnect, session management, etc.)
 * will live here. The route is registered so the sidebar link resolves
 * cleanly instead of 404-ing.
 */
function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pengaturan"
        title="Pengaturan Akun"
        description="Kelola koneksi Telegram, sesi aktif, dan preferensi akunmu."
      />

      <div className="panel flex min-h-[260px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          <Settings className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="max-w-sm">
          <h3 className="font-display text-base font-semibold text-foreground">Segera hadir</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Halaman pengaturan akun sedang disiapkan. Untuk saat ini, kamu bisa mengelola koneksi
            Telegram melalui menu profil di pojok kanan atas.
          </p>
        </div>
      </div>
    </>
  );
}
