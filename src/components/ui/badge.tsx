import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Badges are labels, not decoration. They carry a real state (monitoring
 * status, severity, count), so every tone maps to a semantic role in
 * styles.css and never to a raw palette colour.
 *
 *   success / warning / danger / info  monitoring and severity states
 *   neutral                            anything with no active state
 *   default / secondary / outline      generic shadcn surfaces
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-[var(--motion-fast)]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        success: "border-success/25 bg-success-surface text-success",
        warning: "border-warning/25 bg-warning-surface text-warning",
        danger: "border-danger/25 bg-danger-surface text-danger",
        info: "border-info/25 bg-info-surface text-info",
        neutral: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
