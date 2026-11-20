"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** Row of prompt chips shown above an empty composer. */
function Suggestions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="suggestions" className={cn("flex w-full flex-wrap items-center gap-2", className)} {...props} />
}

function Suggestion({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="suggestion"
      className={cn(
        "rounded-full border border-border bg-card px-3 py-1.5 text-[0.68rem] text-card-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export { Suggestions, Suggestion }
