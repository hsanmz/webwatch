import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app/app-sidebar";
import { ProfileDropdown } from "@/components/app/profile-dropdown";

/*
 * The shell owns three things: the landmark structure, the skip link for
 * keyboard users, and the reading width of the content column.
 *
 * The topbar carries navigation utility only — the trigger, the current
 * section label (derived from the route), the docs link, and the profile
 * menu. No filler copy.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: (loc) => loc.pathname });
  const sectionLabel = resolveSectionLabel(pathname);

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Lompat ke konten utama
      </a>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1 h-11 w-11 text-muted-foreground hover:text-foreground" />
            {sectionLabel && (
              <>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <span className="truncate text-sm font-medium text-muted-foreground">
                  {sectionLabel}
                </span>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-muted-foreground hover:text-foreground"
                  >
                    <Link to="/docs">
                      <BookOpen className="h-4 w-4" />
                      <span className="sr-only">Dokumentasi</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Dokumentasi</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ProfileDropdown />
          </div>
        </header>
        <main id="main-content" className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-content">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function resolveSectionLabel(pathname: string): string | null {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname.startsWith("/sites/")) return "Detail Situs";
  if (pathname === "/apm") return "Log Error (APM)";
  if (pathname === "/docs") return "Dokumentasi";
  if (pathname === "/settings") return "Pengaturan";
  return null;
}
