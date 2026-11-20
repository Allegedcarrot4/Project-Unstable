"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type Align = "start" | "end"

const MessageAlignContext = React.createContext<Align>("start")

/**
 * A single row in a conversation. Owns avatar placement, alignment, and the
 * header/footer slots. Render the visible surface with `Bubble` inside
 * `MessageContent`, and wrap the transcript in `MessageScroller`.
 */
function Message({
  className,
  align = "start",
  ...props
}: React.ComponentProps<"div"> & { align?: Align }) {
  return (
    <MessageAlignContext.Provider value={align}>
      <div
        data-slot="message"
        data-align={align}
        className={cn(
          "group/message flex w-full min-w-0 items-end gap-2.5",
          align === "end" && "flex-row-reverse",
          className
        )}
        {...props}
      />
    </MessageAlignContext.Provider>
  )
}

/** Stacks consecutive messages from the same sender. */
function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-group"
      className={cn("flex w-full flex-col gap-2", className)}
      {...props}
    />
  )
}

/** Avatar slot, pinned to the bottom of the row (and clear of the footer). */
function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-avatar"
      className={cn("mb-5 flex shrink-0 items-center self-end", className)}
      {...props}
    />
  )
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  const align = React.useContext(MessageAlignContext)
  return (
    <div
      data-slot="message-content"
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1",
        align === "end" ? "items-end" : "items-start",
        className
      )}
      {...props}
    />
  )
}

/** Sender name / metadata above the bubble. Always start-aligned. */
function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-header"
      className={cn(
        "flex items-center gap-1.5 text-[0.6rem] font-medium tracking-[0.12em] text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

/** Status, timestamp or actions below the bubble. Follows the message side. */
function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  const align = React.useContext(MessageAlignContext)
  return (
    <div
      data-slot="message-footer"
      className={cn(
        "flex min-h-5 items-center gap-1 text-[0.6rem] text-muted-foreground",
        align === "end" && "justify-end",
        className
      )}
      {...props}
    />
  )
}

export {
  Message,
  MessageGroup,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageFooter,
}
