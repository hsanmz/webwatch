import { Link, useLocation } from "@tanstack/react-router";
import { Activity, Globe, History, LayoutDashboard, Settings } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/app/brand";

const NAV_MAIN = [
  {
    title: "Ringkasan",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Pemantauan",
    items: [
      { label: "Uptime Monitors", href: "/monitors", icon: Globe },
      { label: "APM & Issues", href: "/apm", icon: Activity },
      { label: "Incidents", href: "/incidents", icon: History },
    ],
  },
];

function useActive(): string {
  return useLocation().pathname;
}

export function AppSidebar() {
  const active = useActive();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="WebWatch">
              <Link to="/dashboard" className="gap-2.5">
                <BrandMark className="h-6 w-6 shrink-0" />
                <span className="font-display text-sm font-bold tracking-tight">WebWatch</span>
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
                  let isActive = active === item.href;
                  if (item.href === "/monitors" && active.startsWith("/sites/")) {
                    isActive = true;
                  }
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link to={item.href as "/dashboard"}>
                          <item.icon aria-hidden="true" />
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

      <SidebarRail />
    </Sidebar>
  );
}
