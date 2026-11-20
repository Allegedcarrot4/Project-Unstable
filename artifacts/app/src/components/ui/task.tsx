"use client"

import * as React from "react"
import { Check, ChevronDown, Circle, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

type TaskStatus = "pending" | "in_progress" | "completed"

const TaskStatusContext = React.createContext<TaskStatus>("pending")

/** Collapsible task/plan list for multi-step assistant work. */
function Task({ className, defaultOpen = true, ...props }: React.ComponentProps<typeof Collapsible>) {
  return (
    <Collapsible
      data-slot="task"
      defaultOpen={defaultOpen}
      className={cn("w-full rounded-2xl border border-border/70 bg-card/60", className)}
      {...props}
    />
  )
}

function TaskTrigger({
  className,
  title,
  count,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & { title: string; count?: number }) {
  return (
    <CollapsibleTrigger
      data-slot="task-trigger"
      className={cn(
        "group/task flex w-full items-center gap-2 px-3 py-2 text-left text-[0.72rem] font-medium text-card-foreground",
        className
      )}
      {...props}
    >
      <span className="flex-1 truncate">{title}</span>
      {typeof count === "number" ? (
        <span className="text-[0.62rem] text-muted-foreground">{count} steps</span>
      ) : null}
      <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]/task:rotate-180" />
    </CollapsibleTrigger>
  )
}

function TaskContent({ className, ...props }: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="task-content"
      className={cn("flex flex-col gap-1.5 border-t border-border/60 px-3 py-2", className)}
      {...props}
    />
  )
}

function TaskItem({
  className,
  status = "pending",
  children,
  ...props
}: React.ComponentProps<"div"> & { status?: TaskStatus }) {
  const Icon = status === "completed" ? Check : status === "in_progress" ? Loader2 : Circle
  return (
    <TaskStatusContext.Provider value={status}>
      <div
        data-slot="task-item"
        data-status={status}
        className={cn(
          "flex items-start gap-2 text-[0.7rem] leading-relaxed",
          status === "completed" ? "text-muted-foreground line-through" : "text-card-foreground",
          className
        )}
        {...props}
      >
        <Icon
          className={cn(
            "mt-0.5 size-3.5 shrink-0",
            status === "in_progress" && "animate-spin text-primary",
            status === "completed" && "text-emerald-400"
          )}
        />
        <span className="min-w-0 flex-1">{children}</span>
      </div>
    </TaskStatusContext.Provider>
  )
}

function TaskItemFile({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="task-item-file"
      className={cn(
        "ml-1 inline-flex items-center rounded border border-border/70 bg-muted px-1.5 py-0.5 font-mono text-[0.62rem] text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile, TaskStatusContext }
export type { TaskStatus }
