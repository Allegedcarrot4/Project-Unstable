"use client"

import * as React from "react"
import { ChevronDown, ExternalLink, Globe } from "lucide-react"

import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

/** Citations attached to an assistant reply. */
function Sources({ className, ...props }: React.ComponentProps<typeof Collapsible>) {
  return <Collapsible data-slot="sources" className={cn("w-full", className)} {...props} />
}

function SourcesTrigger({
  className,
  count,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & { count: number }) {
  return (
    <CollapsibleTrigger
      data-slot="sources-trigger"
      className={cn(
        "group/sources flex w-fit items-center gap-1.5 rounded-full px-2 py-1 text-[0.66rem] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
        className
      )}
      {...props}
    >
      <Globe className="size-3.5" />
      <span>{children ?? `Used ${count} source${count === 1 ? "" : "s"}`}</span>
      <ChevronDown className="size-3 transition-transform group-data-[state=open]/sources:rotate-180" />
    </CollapsibleTrigger>
  )
}

function SourcesContent({ className, ...props }: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="sources-content"
      className={cn("mt-1.5 flex flex-col gap-1 border-l border-border/70 pl-3", className)}
      {...props}
    />
  )
}

function Source({
  className,
  href,
  title,
  ...props
}: React.ComponentProps<"a"> & { title: string }) {
  let host = ""
  try {
    host = new URL(href ?? "").hostname.replace(/^www\./, "")
  } catch {
    host = href ?? ""
  }

  return (
    <a
      data-slot="source"
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "flex w-fit max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[0.68rem] text-card-foreground transition-colors hover:bg-muted",
        className
      )}
      {...props}
    >
      <span className="truncate">{title}</span>
      <span className="shrink-0 text-[0.6rem] text-muted-foreground">{host}</span>
      <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
    </a>
  )
}

export { Sources, SourcesTrigger, SourcesContent, Source }
