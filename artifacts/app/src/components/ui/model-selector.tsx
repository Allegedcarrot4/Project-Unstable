"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface ModelOption {
  id: string
  label: string
  hint?: string
  icon?: React.ReactNode
}

/** Compact model/mode picker for the AI header and composer. */
export function ModelSelector({
  value,
  onChange,
  options,
  className,
  label = "Model",
}: {
  value: string
  onChange: (id: string) => void
  options: ModelOption[]
  className?: string
  label?: string
}) {
  const active = options.find(option => option.id === value) ?? options[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-7 gap-1.5 rounded-full px-2.5 text-[0.64rem] font-medium", className)}
          aria-label={`${label}: ${active?.label ?? "select"}`}
        >
          {active?.icon}
          <span className="max-w-[9rem] truncate">{active?.label ?? "Select model"}</span>
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map(option => (
          <DropdownMenuItem
            key={option.id}
            onSelect={() => onChange(option.id)}
            className="flex flex-col items-start gap-0.5 py-1.5"
          >
            <span className="flex w-full items-center gap-2 text-[0.72rem]">
              {option.icon}
              <span className="flex-1 truncate">{option.label}</span>
              {option.id === value ? <Check className="size-3.5 text-emerald-400" /> : null}
            </span>
            {option.hint ? (
              <span className="pl-5 text-[0.6rem] text-muted-foreground">{option.hint}</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
