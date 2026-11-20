"use client"

import * as React from "react"
import { ArrowUp, Loader2, Paperclip } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Composer shell used by both chat and AI. Mirrors the shadcn `prompt-input`
 * composition: PromptInput > Body > Textarea, then a toolbar with tools and a
 * submit button.
 */
function PromptInput({ className, ...props }: React.ComponentProps<"form">) {
  return (
    <form
      data-slot="prompt-input"
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-3xl border border-border/60 bg-card/80 p-2 shadow-sm transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20",
        className
      )}
      {...props}
    />
  )
}

function PromptInputAttachments({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="prompt-input-attachments"
      className={cn("flex flex-wrap items-center gap-1.5 px-1 pt-1", className)}
      {...props}
    />
  )
}

function PromptInputBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="prompt-input-body" className={cn("flex min-w-0 flex-col", className)} {...props} />
}

function PromptInputTextarea({
  className,
  value,
  maxHeight = 180,
  ...props
}: React.ComponentProps<"textarea"> & { maxHeight?: number }) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [value, maxHeight])

  return (
    <textarea
      ref={ref}
      data-slot="prompt-input-textarea"
      rows={1}
      value={value}
      className={cn(
        "w-full resize-none border-0 bg-transparent px-2.5 py-2 text-[0.8rem] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70",
        className
      )}
      {...props}
    />
  )
}

function PromptInputToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="prompt-input-toolbar"
      className={cn("flex items-center justify-between gap-2 px-1 pb-0.5", className)}
      {...props}
    />
  )
}

function PromptInputTools({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="prompt-input-tools" className={cn("flex min-w-0 flex-wrap items-center gap-1", className)} {...props} />
  )
}

function PromptInputButton({
  className,
  variant = "ghost",
  size = "sm",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      data-slot="prompt-input-button"
      className={cn("h-7 gap-1 rounded-full px-2 text-[0.64rem] text-muted-foreground hover:text-foreground", className)}
      {...props}
    />
  )
}

function PromptInputSubmit({
  className,
  status = "ready",
  children,
  ...props
}: React.ComponentProps<typeof Button> & { status?: "ready" | "submitting" | "streaming" }) {
  const busy = status !== "ready"
  return (
    <Button
      type="submit"
      size="icon"
      data-slot="prompt-input-submit"
      disabled={busy || props.disabled}
      aria-label={busy ? "Sending" : "Send message"}
      className={cn(
        "size-8 shrink-0 rounded-full",
        busy ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
        className
      )}
      {...props}
    >
      {children ?? (busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />)}
    </Button>
  )
}

function PromptInputAttachButton({ className, ...props }: React.ComponentProps<typeof PromptInputButton>) {
  return (
    <PromptInputButton aria-label="Attach a text file" className={className} {...props}>
      <Paperclip className="size-3.5" />
      <span className="hidden sm:inline">Attach</span>
    </PromptInputButton>
  )
}

export {
  PromptInput,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputAttachButton,
}
