import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, LogOut, MessageCircle, Settings } from "lucide-react";

import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProfileDropdown() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  const email = user?.email ?? "…";
  const initials = email.charAt(0).toUpperCase();

  async function signOut() {
    try {
      await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
    } finally {
      queryClient.clear();
      navigate({ to: "/auth" });
    }
  }

  const connected = user?.chat_id != null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2" title="Akun">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary-subtle font-display text-xs font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[160px] truncate text-sm font-medium sm:block">
            {email}
          </span>
          <ChevronsUpDown
            className="hidden h-3.5 w-3.5 text-muted-foreground sm:block"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Account info */}
        <DropdownMenuLabel className="font-normal">
          <p className="font-mono text-[10px] font-medium text-muted-foreground">akun</p>
          <p className="mt-0.5 truncate text-sm font-medium">{email}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Telegram status — read-only row */}
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
          <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-muted-foreground">Telegram</span>
          <Badge variant={connected ? "success" : "neutral"} className="ml-auto">
            {connected ? "Terhubung" : "Belum terhubung"}
          </Badge>
        </div>

        <DropdownMenuSeparator />

        {/* Settings */}
        <DropdownMenuItem onClick={() => navigate({ to: "/settings" })} className="gap-2">
          <Settings className="h-4 w-4" aria-hidden="true" />
          Pengaturan
        </DropdownMenuItem>

        {/* Sign out */}
        <DropdownMenuItem
          onClick={signOut}
          className="gap-2 text-destructive focus:bg-danger-surface focus:text-destructive"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
