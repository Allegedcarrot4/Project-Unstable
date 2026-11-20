"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface QuestionnaireChoiceOption {
  value: string
  label: string
  description?: string
}

export interface QuestionnaireItemData {
  name: string
  prompt: string
  description?: string
  required?: boolean
  multiple?: boolean
  choices: QuestionnaireChoiceOption[]
  input?: { label?: string; placeholder?: string }
}

type Answers = Record<string, string[]>

interface QuestionnaireContextValue {
  items: QuestionnaireItemData[]
  index: number
  current: QuestionnaireItemData
  isLast: boolean
  answers: Answers
  selected: (value: string) => boolean
  toggle: (value: string) => void
  text: string
  setText: (value: string) => void
  next: () => void
  previous: () => void
  skip: () => void
  submit: () => void
  error: string
}

const QuestionnaireContext = React.createContext<QuestionnaireContextValue | null>(null)

function useQuestionnaire() {
  const ctx = React.useContext(QuestionnaireContext)
  if (!ctx) throw new Error("Questionnaire parts must be used inside <Questionnaire>")
  return ctx
}

/**
 * Multi-item questionnaire, following the shadcn questionnaire composition:
 * Questionnaire > QuestionnaireProgress / QuestionnaireItem > ... > Actions.
 */
function Questionnaire({
  items,
  onSubmit,
  defaultValue,
  className,
  children,
}: {
  items: readonly QuestionnaireItemData[]
  onSubmit?: (answers: Answers) => void
  defaultValue?: Answers
  className?: string
  children?: React.ReactNode
}) {
  const list = React.useMemo(() => items.map(item => ({ ...item })), [items])
  const [index, setIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Answers>(defaultValue ?? {})
  const [draft, setDraft] = React.useState<string[]>([])
  const [error, setError] = React.useState("")

  const current = list[Math.min(index, list.length - 1)]
  const isLast = index >= list.length - 1

  // Each item starts from whatever was already recorded for it.
  React.useEffect(() => {
    setDraft(answers[current.name] ?? [])
    setError("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current.name])

  const answered = draft.length > 0

  const toggle = (value: string) => {
    setError("")
    if (current.multiple) {
      setDraft(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]))
      return
    }
    setDraft([value])
  }

  const advance = (allowSkip: boolean) => {
    if (!allowSkip && current.required && !answered) {
      setError("Choose an answer to continue.")
      return
    }
    setError("")
    const merged: Answers = { ...answers, [current.name]: draft }
    if (draft.length === 0) delete merged[current.name]

    if (!isLast) {
      setAnswers(merged)
      setIndex(i => Math.min(i + 1, list.length - 1))
      return
    }

    const missing = list.filter(item => item.required && !(merged[item.name]?.length))
    if (missing.length) {
      setAnswers(merged)
      const at = list.findIndex(item => item.name === missing[0].name)
      if (at !== index) setIndex(at)
      setError("Answer the required questions first.")
      return
    }

    setAnswers(merged)
    onSubmit?.(merged)
  }

  const value: QuestionnaireContextValue = {
    items: list,
    index,
    current,
    isLast,
    answers,
    selected: option => draft.includes(option),
    toggle,
    text: current.multiple ? "" : (draft[0] ?? ""),
    setText: next => {
      setError("")
      setDraft(next ? [next] : [])
    },
    next: () => advance(false),
    previous: () => {
      setError("")
      setAnswers(prev => ({ ...prev, [current.name]: draft }))
      setIndex(i => Math.max(0, i - 1))
    },
    skip: () => advance(true),
    submit: () => advance(false),
    error,
  }

  return (
    <QuestionnaireContext.Provider value={value}>
      <div
        data-slot="questionnaire"
        className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-card p-4", className)}
      >
        {children}
      </div>
    </QuestionnaireContext.Provider>
  )
}

function QuestionnaireProgress({ className }: { className?: string }) {
  const { index, items } = useQuestionnaire()
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-[0.54rem] uppercase tracking-[0.16em] text-muted-foreground",
        className
      )}
    >
      <span className="shrink-0">
        Question {index + 1} of {items.length}
      </span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground/50 transition-all"
          style={{ width: `${((index + 1) / items.length) * 100}%` }}
        />
      </div>
    </div>
  )
}

function QuestionnaireItem({
  name,
  required,
  className,
  children,
}: {
  name: string
  required?: boolean
  className?: string
  children?: React.ReactNode
}) {
  const { current } = useQuestionnaire()
  if (current.name !== name) return null
  return (
    <div
      role="group"
      aria-label={current.prompt}
      aria-required={required ?? current.required}
      data-slot="questionnaire-item"
      className={cn("flex flex-col gap-2", className)}
    >
      {children}
    </div>
  )
}

function QuestionnaireTitle({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <p className={cn("text-[0.74rem] font-medium leading-relaxed text-card-foreground", className)}>{children}</p>
}

function QuestionnaireDescription({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <p className={cn("text-[0.64rem] leading-relaxed text-muted-foreground", className)}>{children}</p>
}

function QuestionnaireChoices({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { current } = useQuestionnaire()
  return (
    <div
      role={current.multiple ? "group" : "radiogroup"}
      aria-label={current.prompt}
      data-slot="questionnaire-choices"
      className={cn("flex flex-col gap-1.5", className)}
    >
      {children}
    </div>
  )
}

function QuestionnaireChoice({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children?: React.ReactNode
}) {
  const { selected, toggle, current } = useQuestionnaire()
  const active = selected(value)
  return (
    <button
      type="button"
      role={current.multiple ? "checkbox" : "radio"}
      aria-checked={active}
      data-slot="questionnaire-choice"
      onClick={() => toggle(value)}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded border px-2.5 py-2 text-left transition-colors",
        active
          ? "border-foreground/40 bg-muted text-card-foreground"
          : "border-border text-card-foreground/80 hover:bg-muted/60",
        className
      )}
    >
      {children}
    </button>
  )
}

function QuestionnaireInput({
  label,
  placeholder,
  className,
}: {
  label?: string
  placeholder?: string
  className?: string
}) {
  const { current, text, setText } = useQuestionnaire()
  const describedBy = label ?? placeholder ?? current.input?.placeholder ?? "Answer"
  return (
    <label className={cn("flex flex-col gap-1 text-[0.6rem] text-muted-foreground", className)}>
      {label ? <span>{label}</span> : null}
      <input
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder={placeholder ?? current.input?.placeholder}
        aria-label={describedBy}
        className="w-full rounded border border-border bg-background px-2 py-1.5 text-[0.7rem] text-card-foreground outline-none focus:border-foreground/30"
      />
    </label>
  )
}

function QuestionnaireError({ className }: { className?: string }) {
  const { error } = useQuestionnaire()
  if (!error) return null
  return (
    <p role="alert" className={cn("text-[0.62rem] text-destructive", className)}>
      {error}
    </p>
  )
}

function QuestionnaireActions({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div data-slot="questionnaire-actions" className={cn("flex items-center gap-1.5", className)}>
      {children}
    </div>
  )
}

function QuestionnaireNext({ className }: { className?: string }) {
  const { next, isLast } = useQuestionnaire()
  if (isLast) return null
  return (
    <Button type="button" size="sm" variant="secondary" className={cn("h-7 text-[0.62rem]", className)} onClick={next}>
      Next
    </Button>
  )
}

function QuestionnairePrevious({ className }: { className?: string }) {
  const { previous, index } = useQuestionnaire()
  if (index === 0) return null
  return (
    <Button type="button" size="sm" variant="ghost" className={cn("h-7 text-[0.62rem]", className)} onClick={previous}>
      Previous
    </Button>
  )
}

function QuestionnaireSkip({ className }: { className?: string }) {
  const { skip } = useQuestionnaire()
  return (
    <Button type="button" size="sm" variant="ghost" className={cn("h-7 text-[0.62rem]", className)} onClick={skip}>
      Skip
    </Button>
  )
}

function QuestionnaireSubmit({ className }: { className?: string }) {
  const { submit, isLast } = useQuestionnaire()
  if (!isLast) return null
  return (
    <Button type="button" size="sm" className={cn("h-7 text-[0.62rem]", className)} onClick={submit}>
      Submit
    </Button>
  )
}

export {
  Questionnaire,
  QuestionnaireProgress,
  QuestionnaireItem,
  QuestionnaireTitle,
  QuestionnaireDescription,
  QuestionnaireChoices,
  QuestionnaireChoice,
  QuestionnaireInput,
  QuestionnaireError,
  QuestionnaireActions,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireSkip,
  QuestionnaireSubmit,
}
