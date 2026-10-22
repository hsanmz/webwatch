import { cn } from "@/lib/utils";

/*
 * Skeletons stand in for content that is still loading. They use the neutral
 * surface tone so a loading screen never looks like a broken status colour.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
