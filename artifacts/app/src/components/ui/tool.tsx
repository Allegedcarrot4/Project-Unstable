"use client"

import * as React from "react"
import { ChevronDown, Wrench } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

/** A tool / model call rendered as a collapsible row in an assistant reply. */
function Tool({ className, ...props }: React.ComponentProps<typeof Collapsible>) {
  return (
    <Collapsible
      data-slot="tool"
      className={cn("w-full rounded-2xl border border-border/70 bg-card/60", className)}
      {...props}
    />
  )
}

function ToolHeader({
  className,
  title,
  state = "output-available",
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
  title: string
  state?: "input-streaming" | "input-available" | "output-available" | "output-error"
}) {
  const tone =
    state === "output-error"
      ? "destructive"
      : state === "output-available"
        ? "secondary"
        : "outline"
  const label =
    state === "output-error"
      ? "failed"
      : state === "output-available"
        ? "done"
        : state === "input-available"
          ? "running"
          : "queued"

  return (
    <CollapsibleTrigger
      data-slot="tool-header"
      className={cn("group/tool flex w-full items-center gap-2 px-3 py-2 text-left", className)}
      {...props}
    >
      <Wrench className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-[0.72rem] font-medium text-card-foreground">{title}</span>
      <Badge variant={tone} className="h-5 px-1.5 text-[0.56rem] uppercase tracking-wide">
        {label}
      </Badge>
      <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]/tool:rotate-180" />
    </CollapsibleTrigger>
  )
}

function ToolContent({ className, ...props }: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="tool-content"
      className={cn("flex flex-col gap-2 border-t border-border/60 px-3 py-2", className)}
      {...props}
    />
  )
}

function ToolInput({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="tool-input" className={cn("text-[0.66rem] text-muted-foreground", className)} {...props}>
      <span className="mr-1 text-[0.56rem] uppercase tracking-[0.14em] text-muted-foreground/70">input</span>
      <span className="font-mono">{children}</span>
    </div>
  )
}

function ToolOutput({
  className,
  error = false,
  children,
  ...props
}: React.ComponentProps<"div"> & { error?: boolean }) {
  return (
    <div
      data-slot="tool-output"
      className={cn("text-[0.66rem] leading-relaxed", error ? "text-destructive" : "text-card-foreground", className)}
      {...props}
    >
      <span className="mr-1 text-[0.56rem] uppercase tracking-[0.14em] text-muted-foreground/70">output</span>
      {children}
    </div>
  )
}

export { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput }
