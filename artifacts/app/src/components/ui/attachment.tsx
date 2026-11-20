"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { FileText, Image as ImageIcon, Paperclip, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const attachmentVariants = cva(
  "group/attachment relative flex w-full min-w-0 items-center gap-2.5 rounded-2xl border border-border bg-card px-3 py-2 text-card-foreground",
  {
    variants: {
      size: {
        default: "",
        sm: "gap-2 px-2.5 py-1.5",
      },
      state: {
        idle: "",
        uploading: "opacity-70",
        error: "border-destructive/50",
      },
    },
    defaultVariants: { size: "default", state: "idle" },
  }
)

function Attachment({
  className,
  size,
  state,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof attachmentVariants>) {
  return (
    <div
      data-slot="attachment"
      data-state={state ?? "idle"}
      className={cn(attachmentVariants({ size, state }), className)}
      {...props}
    />
  )
}

function AttachmentMedia({
  className,
  variant = "icon",
  ...props
}: React.ComponentProps<"div"> & { variant?: "icon" | "image" }) {
  return (
    <div
      data-slot="attachment-media"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted text-muted-foreground",
        variant === "image" && "size-10 [&_img]:size-full [&_img]:object-cover",
        className
      )}
      {...props}
    />
  )
}

function AttachmentContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="attachment-content" className={cn("flex min-w-0 flex-1 flex-col", className)} {...props} />
}

function AttachmentTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-title"
      className={cn("truncate text-[0.74rem] font-medium leading-tight", className)}
      {...props}
    />
  )
}

function AttachmentDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="attachment-description"
      className={cn("truncate text-[0.64rem] leading-tight text-muted-foreground", className)}
      {...props}
    />
  )
}

function AttachmentActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-actions"
      className={cn("flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  )
}

function AttachmentRemove({
  className,
  label = "Remove attachment",
  ...props
}: React.ComponentProps<"button"> & { label?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      className={cn("size-6 text-muted-foreground hover:text-foreground", className)}
      {...props}
    >
      <X className="size-3.5" />
    </Button>
  )
}

/** Compact file card used in a message bubble. */
function AttachmentFile({
  name,
  description,
  kind = "file",
  className,
}: {
  name: string
  description?: string
  kind?: "file" | "image" | "code"
  className?: string
}) {
  const Icon = kind === "image" ? ImageIcon : kind === "code" ? FileText : Paperclip
  return (
    <Attachment size="sm" className={cn("max-w-sm bg-background/40", className)}>
      <AttachmentMedia className="size-7">
        <Icon className="size-3.5" />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{name}</AttachmentTitle>
        {description ? <AttachmentDescription>{description}</AttachmentDescription> : null}
      </AttachmentContent>
    </Attachment>
  )
}

export {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentRemove,
  AttachmentFile,
  attachmentVariants,
}
