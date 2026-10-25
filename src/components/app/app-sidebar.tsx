import { Link, useLocation } from "@tanstack/react-router";
import { Activity, BookOpen, LayoutDashboard, Settings } from "lucide-react";

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
import { BrandMark } from "@/components/app/brand";

const NAV_MAIN = [
  {
    title: "Ringkasan",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Pemantauan",
    items: [{ label: "Log Error (APM)", href: "/apm", icon: Activity }],
  },
];

/*
 * Footer items give users a persistent path to docs and settings without
 * cluttering the primary nav. They sit below a separator visually distinct
 * from the main groups.
 */
const NAV_FOOTER = [
  { label: "Dokumentasi", href: "/docs", icon: BookOpen },
  { label: "Pengaturan", href: "/settings", icon: Settings },
];

function useActive(): string {
  return useLocation().pathname;
}

export function AppSidebar() {
  const active = useActive();

  function isActive(href: string): boolean {
    return active === href;
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="WebWatch">
              <Link to="/dashboard" className="gap-3">
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
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                      <Link to={item.href as "/dashboard"}>
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {NAV_FOOTER.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                <Link to={item.href as "/docs"}>
                  <item.icon aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
