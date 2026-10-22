import { cn } from "@/lib/utils";

/*
 * One place decides how the WebWatch mark is drawn.
 *
 *   BrandLockup - the mark at full size, used where the brand is introduced
 *                 (landing page, auth screen).
 *   BrandMark    - the square badge glyph, used in the app chrome next to the
 *                 product name where a full-size lockup would not fit.
 *
 * Both point at files that already live in /public, so the naming convention
 * stays untouched.
 */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="WebWatch"
      width={990}
      height={606}
      className={cn("h-8 w-auto", className)}
    />
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/favicon.png"
      alt=""
      aria-hidden="true"
      width={256}
      height={256}
      className={cn("h-7 w-7", className)}
    />
  );
}
