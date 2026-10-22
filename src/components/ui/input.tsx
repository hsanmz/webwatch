import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Inputs are 44px tall on a touch device and 40px with a mouse, so they line
 * up with the default button at either pointer type. They inherit the global
 * focus indicator. An invalid field is flagged with the danger role plus the
 * native `aria-invalid` attribute, so the state is announced and not only
 * coloured.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color] duration-[var(--motion-fast)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-55 pointer-fine:h-10 aria-[invalid=true]:border-danger",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
