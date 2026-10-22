import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app/app-sidebar";
import { ProfileDropdown } from "@/components/app/profile-dropdown";

/*
 * The shell owns three things: the landmark structure, the skip link that
 * lets keyboard users jump past the navigation, and the reading width of the
 * content column. Everything inside `main` shares one container width so the
 * pages line up with each other.
 */
export function AppShell({ children }: { children: ReactNode }) {
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
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 h-11 w-11" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium text-muted-foreground">Konsol WebWatch</span>
          </div>
          <div className="flex items-center gap-1">
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
