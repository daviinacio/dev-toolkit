import { cn } from "@/lib/utils";

/**
 * Dev Toolkit's icon: a terminal prompt (>_). Same shapes as public/favicon.svg, but in the
 * theme colors, so it's acid green on dark and dark green on light.
 */
export function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
    >
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <g
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary-foreground"
      >
        <path d="M9 10.5 14.5 16 9 21.5" />
        <path d="M17.5 21.5H23.5" />
      </g>
    </svg>
  );
}
