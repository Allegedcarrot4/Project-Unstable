"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"

import { cn } from "@/lib/utils"
import * as CodeBlockPrimitive from "@animate-ui/react/primitives/code-block"

/**
 * Code block surface, following the shadcn code-block composition:
 * CodeBlock > CodeBlockHeader (Title + Actions/CopyButton) > CodeBlockContent.
 */
function CodeBlock({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive"
  size?: "default" | "sm"
}) {
  return (
    <div
      data-slot="code-block"
      data-variant={variant}
      data-size={size}
      className={cn(
        "my-2 flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground",
        size === "sm" ? "text-[0.68rem]" : "text-[0.72rem]",
        variant === "destructive" && "border-destructive/50",
        className
      )}
      {...props}
    />
  )
}

function CodeBlockHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="code-block-header"
      className={cn(
        "flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5",
        className
      )}
      {...props}
    />
  )
}

function CodeBlockTitle({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="code-block-title"
      className={cn(
        "truncate text-[0.58rem] font-medium uppercase tracking-[0.16em] text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CodeBlockActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="code-block-actions" className={cn("flex shrink-0 items-center gap-1", className)} {...props} />
  )
}

function CodeBlockCopyButton({
  value,
  className,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<number | undefined>(undefined)

  React.useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy code"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          timer.current = window.setTimeout(() => setCopied(false), 1600)
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  )
}

function CodeBlockContent({
  className,
  wrap = false,
  lineNumbers = false,
  startLine = 1,
  children,
  ...props
}: React.ComponentProps<typeof CodeBlockPrimitive.Content> & {
  wrap?: boolean
  lineNumbers?: boolean
  startLine?: number
}) {
  const lines = typeof children === "string" ? children.replace(/\n$/, "").split("\n") : null

  return (
    <CodeBlockPrimitive.Content
      data-slot="code-block-content"
      tabIndex={0}
      className={cn(
        "max-h-80 overflow-auto px-3 py-2.5 font-mono leading-relaxed text-card-foreground/90",
        wrap && "whitespace-pre-wrap break-words",
        className
      )}
      {...props}
    >
      {lines && lineNumbers
        ? lines.map((line, i) => (
            <span key={i} className="flex gap-3">
              <span className="w-6 shrink-0 select-none text-right text-muted-foreground/50">{startLine + i}</span>
              <span className="whitespace-pre">{line || " "}</span>
            </span>
          ))
        : children}
    </CodeBlockPrimitive.Content>
  )
}

function CodeBlockLine({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: "default" | "added" | "removed" }) {
  return (
    <span
      data-slot="code-block-line"
      data-variant={variant}
      className={cn(
        "block whitespace-pre",
        variant === "added" && "bg-emerald-500/10 text-emerald-200",
        variant === "removed" && "bg-red-500/10 text-red-200",
        className
      )}
      {...props}
    />
  )
}

function CodeBlockFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="code-block-footer"
      className={cn("flex items-center justify-between border-t border-border/60 px-3 py-1.5", className)}
      {...props}
    />
  )
}

export {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
  CodeBlockLine,
  CodeBlockFooter,
}
