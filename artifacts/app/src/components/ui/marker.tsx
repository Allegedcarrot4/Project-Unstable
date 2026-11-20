"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const markerVariants = cva("flex w-full items-center gap-2 text-[0.68rem] text-muted-foreground", {
  variants: {
    variant: {
      default: "py-1",
      border: "border-b border-border/60 py-1.5",
      separator:
        "justify-center py-2 before:h-px before:flex-1 before:bg-border/70 after:h-px after:flex-1 after:bg-border/70",
    },
  },
  defaultVariants: { variant: "default" },
})

function Marker({
  className,
  variant = "default",
  render,
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof markerVariants> & { render?: React.ReactElement }) {
  const classes = cn(markerVariants({ variant }), className)

  if (render) {
    return React.cloneElement(render, {
      ...props,
      className: cn(classes, (render.props as { className?: string } | undefined)?.className),
      children,
    } as React.HTMLAttributes<HTMLElement>)
  }

  return (
    <div data-slot="marker" data-variant={variant} className={classes} {...props}>
      {children}
    </div>
  )
}

/** Decorative icon slot, hidden from assistive tech. */
function MarkerIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden
      className={cn("flex shrink-0 items-center [&_svg]:size-3.5", className)}
      {...props}
    />
  )
}

function MarkerContent({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="marker-content"
      className={cn("min-w-0 [&_svg]:size-3.5", className)}
      {...props}
    />
  )
}

export { Marker, MarkerIcon, MarkerContent, markerVariants }
