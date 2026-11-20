"use client"

import * as React from "react"
import { Brain, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

/**
 * Collapsible reasoning / thinking block for assistant replies. The trigger
 * stays visible while the content is folded away, so the thread reads cleanly.
 */
function Reasoning({
  className,
  defaultOpen = false,
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Collapsible>) {
  return (
    <Collapsible
      data-slot="reasoning"
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      className={cn("w-full", className)}
      {...props}
    />
  )
}

function ReasoningTrigger({
  className,
  children,
  isStreaming = false,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & { isStreaming?: boolean }) {
  return (
    <CollapsibleTrigger
      data-slot="reasoning-trigger"
      className={cn(
        "group/reasoning flex w-fit items-center gap-1.5 rounded-full px-2 py-1 text-[0.66rem] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
        className
      )}
      {...props}
    >
      <Brain className={cn("size-3.5", isStreaming && "animate-pulse text-primary")} />
      <span>{children ?? (isStreaming ? "Thinking…" : "Reasoning")}</span>
      <ChevronDown className="size-3 transition-transform group-data-[state=open]/reasoning:rotate-180" />
    </CollapsibleTrigger>
  )
}

function ReasoningContent({ className, ...props }: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="reasoning-content"
      className={cn(
        "mt-1.5 ml-1.5 border-l border-border/70 pl-3 text-[0.72rem] leading-relaxed text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Reasoning, ReasoningTrigger, ReasoningContent }
