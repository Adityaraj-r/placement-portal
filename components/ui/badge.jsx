import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props} />
  );
}

const workflowStatusStyles = {
  draft: "border-border bg-muted text-muted-foreground",
  published: "border-primary/25 bg-primary/10 text-primary",
  in_progress: "border-primary/25 bg-primary/10 text-primary",
  completed: "border-border bg-secondary text-secondary-foreground",
  cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
  applied: "border-primary/25 bg-primary/10 text-primary",
  eligible: "border-border bg-secondary text-secondary-foreground",
  ineligible: "border-destructive/30 bg-destructive/10 text-destructive",
  shortlisted: "border-primary/25 bg-primary/10 text-primary",
  selected: "border-primary/25 bg-primary/10 text-primary",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  offered: "border-border bg-secondary text-secondary-foreground",
  accepted: "border-primary/25 bg-primary/10 text-primary",
};

function StatusBadge({ status, className }) {
  if (!status) return null;
  const value = String(status);
  const label = value.replaceAll("_", " ");

  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full whitespace-normal break-words text-center capitalize leading-4",
        workflowStatusStyles[value.toLowerCase()] || "border-border bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {label}
    </Badge>
  );
}

export { Badge, StatusBadge, badgeVariants }
