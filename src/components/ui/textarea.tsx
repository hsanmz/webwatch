import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color] duration-[var(--motion-fast)] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-55 aria-[invalid=true]:border-danger",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
