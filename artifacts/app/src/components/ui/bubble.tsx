"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * The message surface. Mirrors the shadcn `bubble` composition:
 * Bubble > BubbleContent (+ BubbleReactions), optionally inside a BubbleGroup.
 */
const bubbleVariants = cva(
  "group/bubble relative flex w-fit min-w-0 max-w-[80%] flex-col rounded-3xl text-sm transition-all",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm",
        secondary: "border border-border/40 bg-secondary/80 text-secondary-foreground shadow-sm",
        muted: "bg-muted/70 text-foreground",
        tinted: "border border-primary/20 bg-primary/10 text-foreground",
        outline: "border border-border/60 bg-transparent text-foreground",
        ghost: "max-w-full bg-transparent text-foreground",
        destructive: "border border-destructive/30 bg-destructive/15 text-foreground",
      },
      align: {
        start: "self-start rounded-3xl",
        end: "self-end rounded-3xl",
      },
    },
    defaultVariants: {
      variant: "secondary",
      align: "start",
    },
  }
)

function Bubble({
  className,
  variant = "secondary",
  align = "start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof bubbleVariants>) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant, align }), className)}
      {...props}
    />
  )
}

function BubbleContent({
  className,
  render,
  children,
  ...props
}: React.ComponentProps<"div"> & { render?: React.ReactElement }) {
  const classes = cn(
    "min-w-0 px-3.5 py-2 text-[0.82rem] leading-relaxed break-words whitespace-pre-wrap",
    "group-data-[variant=ghost]/bubble:px-0 group-data-[variant=ghost]/bubble:py-0",
    className
  )

  if (render) {
    return React.cloneElement(render, {
      ...props,
      className: cn(classes, (render.props as { className?: string } | undefined)?.className),
      children,
    } as React.HTMLAttributes<HTMLElement>)
  }

  return (
    <div data-slot="bubble-content" className={classes} {...props}>
      {children}
    </div>
  )
}

function BubbleReactions({
  className,
  side = "bottom",
  align = "end",
  ...props
}: React.ComponentProps<"div"> & {
  side?: "top" | "bottom"
  align?: "start" | "end"
}) {
  return (
    <div
      data-slot="bubble-reactions"
      data-side={side}
      data-align={align}
      className={cn(
        "absolute z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-full border border-border bg-popover px-1 py-0.5 text-[0.72rem] shadow-sm",
        side === "bottom" ? "-bottom-2.5" : "-top-2.5",
        align === "end" ? "right-2" : "left-2",
        className
      )}
      {...props}
    />
  )
}

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn("flex w-full flex-col gap-1.5", className)}
      {...props}
    />
  )
}

export { Bubble, BubbleContent, BubbleReactions, BubbleGroup, bubbleVariants }
