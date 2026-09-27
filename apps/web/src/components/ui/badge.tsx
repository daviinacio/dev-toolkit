import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
  {
    variants: {
      variant: {
        // Status labels, e.g. "popular" or "beta"
        default:
          "border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-primary",
        warning:
          "border border-warning/30 bg-warning/5 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-warning",
        info: "border border-info/30 bg-info/5 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-info",
        destructive:
          "border border-destructive/30 bg-destructive/5 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-destructive",
        outline:
          "border border-input px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground",
        // Tags, e.g. "#json"
        secondary: "bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
