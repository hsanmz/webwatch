import type { ReactNode } from "react";

/*
 * PageHeader sets the tone for every authenticated page.
 *
 * The eyebrow system uses a small colored bar beside a mono label to mark
 * which part of the product the user is in — the same visual grammar used on
 * the landing page sections. This makes section identity consistent across
 * the whole product without adding decorative weight.
 *
 * The heading is always Space Grotesk (font-display) for authority. The
 * description stays muted — it explains, it does not announce.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1 w-5 rounded-full bg-primary" aria-hidden="true" />
            <p className="font-mono text-xs font-medium text-primary">{eyebrow}</p>
          </div>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
