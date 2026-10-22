import { RefreshCw, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
 * The error state says what broke and offers the way out. It is announced to
 * assistive technology with role="alert" and keeps the retry control in the
 * normal tab order.
 */
export function ErrorState({
  title = "Data tidak bisa dimuat",
  description = "Permintaan ke server gagal. Coba muat ulang sekali lagi.",
  onRetry,
  className,
  action,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "panel flex min-h-[200px] flex-col items-center justify-center gap-4 border-danger/30 bg-danger-surface px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-danger/30 bg-surface text-danger">
        <TriangleAlert className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="max-w-sm">
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Muat ulang
        </Button>
      ) : (
        action
      )}
    </div>
  );
}
