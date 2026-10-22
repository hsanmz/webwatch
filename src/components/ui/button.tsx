import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Buttons follow the shared state model: default, hover, focus-visible,
 * disabled and loading. The focus ring is global (`:focus-visible` in
 * styles.css), so no variant overrides it and every button shows the same
 * indicator.
 *
 * Touch targets. A finger needs 44px, a mouse does not. Every size therefore
 * declares a coarse-pointer height first and compacts to the dense desktop
 * height only under `pointer-fine`. The console stays dense on a desk and
 * stays tappable on a phone, from the same primitive.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,border-color,color] duration-[var(--motion-fast)] ease-[var(--motion-ease)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        outline: "border border-input bg-surface text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground hover:bg-danger-hover",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-11 px-4 text-xs pointer-fine:h-8 pointer-fine:px-3",
        default: "h-11 px-5 pointer-fine:h-10 pointer-fine:px-4",
        lg: "h-12 px-6 text-base",
        icon: "size-11 pointer-fine:size-10",
        "icon-sm": "size-11 pointer-fine:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
