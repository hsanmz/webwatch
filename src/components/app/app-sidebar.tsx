import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BookOpen, LayoutDashboard, LogOut, Radar } from "lucide-react";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const NAV_MAIN = [
  {
    title: "Pemantauan",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Referensi",
    items: [
      { label: "Dokumentasi", href: "/docs", icon: BookOpen },
      { label: "Status Sistem", href: "/status", icon: Radar },
    ],
  },
];

function useActive(): string {
  return useLocation().pathname;
}

export function AppSidebar() {
  const active = useActive();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  async function signOut() {
    try {
      await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
    } finally {
      queryClient.clear();
      navigate({ to: "/auth" });
    }
  }

  const email = user?.email ?? "…";
  const initials = email.charAt(0).toUpperCase();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="group-data-[state=collapsed]:justify-center"
            >
              <Link to="/dashboard">
                <div className="flex aspect-square h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Radar className="h-4 w-4" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-display text-sm font-bold">
                    Web<span className="text-primary">Watch</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Ops Console
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_MAIN.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? active === "/dashboard" || active.startsWith("/sites/")
                      : active === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link to={item.href as "/dashboard"}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1 group-data-[state=collapsed]:hidden">
                <p className="truncate text-sm font-medium">{email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 text-muted-foreground hover:text-destructive")}
                onClick={signOut}
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
