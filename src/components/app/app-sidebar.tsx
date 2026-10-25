import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, BookOpen, Code2, Globe, LayoutDashboard, Radio, Settings } from "lucide-react";

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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/app/brand";
import { api, type ApiSite } from "@/lib/api";

const NAV_MAIN = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Log Error (APM)", href: "/apm", icon: Activity },
];

const NAV_DEV = [
  { label: "SDK & Integrasi", href: "/docs#sdk", icon: Code2 },
  { label: "Status Layanan", href: "/status", icon: Radio },
];

const NAV_FOOTER = [
  { label: "Dokumentasi", href: "/docs", icon: BookOpen },
  { label: "Pengaturan", href: "/settings", icon: Settings },
];

function useActive(): string {
  return useLocation().pathname;
}

export function AppSidebar() {
  const active = useActive();

  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const data = await api<{ sites: ApiSite[] }>("/api/sites");
      return data.sites;
    },
    staleTime: 10000,
  });

  function isActive(href: string): boolean {
    return active === href;
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="WebWatch APM">
              <Link to="/dashboard" className="gap-3">
                <BrandMark className="h-6 w-6 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-display text-sm font-bold tracking-tight">WebWatch</span>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                    APM Engine
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Utama */}
        <SidebarGroup>
          <SidebarGroupLabel>Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_MAIN.map((item) => (
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

        {/* Domain Terpantau (Cloudflare-style zone list) */}
        {sites && sites.length > 0 && (
          <SidebarGroup>
            <div className="flex items-center justify-between px-2 py-1.5">
              <SidebarGroupLabel className="p-0">Domain Terpantau</SidebarGroupLabel>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {sites.length}
              </span>
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {sites.slice(0, 6).map((site) => {
                  const isCurrent = active === `/sites/${site.id}`;
                  const label =
                    site.name || site.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
                  return (
                    <SidebarMenuItem key={site.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isCurrent}
                        tooltip={`${label} (${site.is_active ? "Aktif" : "Jeda"})`}
                      >
                        <Link to="/sites/$id" params={{ id: site.id }}>
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              site.is_active ? "bg-emerald-500 shadow-sm" : "bg-amber-500"
                            }`}
                            aria-hidden="true"
                          />
                          <span className="truncate">{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarSeparator />

        {/* Developer & Ekosistem */}
        <SidebarGroup>
          <SidebarGroupLabel>Pengembang</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_DEV.map((item) => (
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
          </SidebarGroupContent>
        </SidebarGroup>
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
