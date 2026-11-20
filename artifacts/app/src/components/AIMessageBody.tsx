"use client"

import * as React from "react"
import { CalendarIcon, Sparkles } from "lucide-react"

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
  type QuestionnaireItemData,
} from "@/components/ui/questionnaire"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ui/reasoning"
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ui/sources"
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ui/tool"
import { Markdown, extractSources } from "@/components/Markdown"

type Segment = { type: "text"; value: string } | { type: "code"; value: string; lang: string }

export interface AIMessageMeta {
  model?: string
  mode?: string
  elapsedMs?: number
  /** Optional reasoning / plan text supplied by the caller. */
  reasoning?: string
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

const MONTH_ALIASES = MONTHS.map(month => month.slice(0, 3)).join("|")

// `(?!\\d)` keeps a bare year ("March 2027") from being read as a day number.
const LONG_DATE = new RegExp(
  `\\b(${MONTH_ALIASES})[a-z]*\\.?\\s+(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?`,
  "i"
)
const DAY_FIRST_DATE = new RegExp(
  `\\b(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_ALIASES})[a-z]*\\.?(?:,?\\s*(\\d{4}))?`,
  "i"
)

function buildDate(year: number, monthIndex: number, day: number): Date | null {
  const date = new Date(year, monthIndex, day)
  return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day ? date : null
}

function monthFromAlias(alias: string) {
  const needle = alias.toLowerCase()
  return MONTHS.findIndex(month => month.startsWith(needle))
}

/** The first day the reply actually talks about, if any. */
function findMentionedDate(text: string): Date | null {
  const now = new Date()
  if (/\btomorrow\b/i.test(text)) {
    const date = new Date(now)
    date.setDate(date.getDate() + 1)
    return date
  }
  if (/\btoday\b|\btonight\b/i.test(text)) return now

  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text)
  if (iso) {
    const date = buildDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    if (date) return date
  }

  const long = LONG_DATE.exec(text)
  if (long) {
    const monthIndex = monthFromAlias(long[1])
    const date = buildDate(long[3] ? Number(long[3]) : now.getFullYear(), monthIndex, Number(long[2]))
    if (date) return date
  }

  const dayFirst = DAY_FIRST_DATE.exec(text)
  if (dayFirst) {
    const monthIndex = monthFromAlias(dayFirst[2])
    const date = buildDate(dayFirst[3] ? Number(dayFirst[3]) : now.getFullYear(), monthIndex, Number(dayFirst[1]))
    if (date) return date
  }

  const weekday = new RegExp(`\\b(${WEEKDAYS.join("|")})\\b`, "i").exec(text)
  if (weekday) {
    const target = WEEKDAYS.indexOf(weekday[1].toLowerCase())
    const date = new Date(now)
    const delta = (target - date.getDay() + 7) % 7 || 7
    date.setDate(date.getDate() + delta)
    return date
  }

  return null
}

interface DetectedQuestion {
  prompt: string
  options: string[]
  questionLine: number
  optionLines: number[]
}

const LIST_PREFIX = /^(?:\d{1,2}[.)]|[-*•])\s+/

/** A trailing question followed by at least two listed answers. */
function findQuestion(content: string): DetectedQuestion | null {
  const lines = content.split(/\r?\n/)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (!line.endsWith("?")) continue

    const options: string[] = []
    const optionLines: number[] = []
    for (let j = i + 1; j < lines.length; j++) {
      const candidate = lines[j].trim()
      if (!candidate) continue
      const stripped = candidate.replace(LIST_PREFIX, "")
      if (stripped === candidate) break
      options.push(stripped)
      optionLines.push(j)
    }
    if (options.length < 2) continue
    return {
      prompt: line.replace(LIST_PREFIX, ""),
      options,
      questionLine: i,
      optionLines,
    }
  }
  return null
}

function splitSegments(content: string): Segment[] {
  const segments: Segment[] = []
  const fence = /```([\w+#.-]*)[^\S\r\n]*\r?\n([\s\S]*?)```/g
  let last = 0
  for (let match = fence.exec(content); match; match = fence.exec(content)) {
    if (match.index > last) segments.push({ type: "text", value: content.slice(last, match.index) })
    segments.push({ type: "code", value: match[2].replace(/\r?\n$/, ""), lang: (match[1] || "code").toLowerCase() })
    last = match.index + match[0].length
  }
  if (last < content.length) segments.push({ type: "text", value: content.slice(last) })
  return segments.length ? segments : [{ type: "text", value: content }]
}

/* ── Questionnaire parsing ──────────────────────────────────────────────── */

const QUESTIONNAIRE_FENCE = /```questionnaire[^\n]*\r?\n([\s\S]*?)```/i

function normalizeOptions(raw: unknown): { value: string; label: string }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((option, index) => {
      if (typeof option === "string") return { value: String(index), label: option }
      if (option && typeof option === "object") {
        const record = option as { label?: unknown; value?: unknown }
        const label = typeof record.label === "string" ? record.label : String(record.value ?? "")
        const value = typeof record.value === "string" ? record.value : String(index)
        return label ? { value, label } : null
      }
      return null
    })
    .filter((option): option is { value: string; label: string } => !!option)
}

/** Reads an explicit ```questionnaire JSON block, if the model emitted one. */
function readQuestionnaireBlock(content: string): { items: QuestionnaireItemData[]; cleaned: string } | null {
  const match = QUESTIONNAIRE_FENCE.exec(content)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1].trim()) as {
      title?: string
      questions?: Array<Record<string, unknown>>
      prompt?: string
      options?: unknown
      multiple?: boolean
    }
    const rawQuestions = Array.isArray(parsed.questions)
      ? parsed.questions
      : parsed.prompt
        ? [parsed as unknown as Record<string, unknown>]
        : []

    const items: QuestionnaireItemData[] = rawQuestions
      .map((question, index): QuestionnaireItemData | null => {
        const prompt = typeof question.prompt === "string" ? question.prompt : typeof question.title === "string" ? question.title : ""
        const choices = normalizeOptions(question.options ?? question.choices)
        if (!prompt || choices.length === 0) return null
        return {
          name: `q${index}`,
          prompt,
          description: typeof question.description === "string" ? question.description : undefined,
          required: question.required !== false,
          multiple: question.multiple === true,
          choices,
          input: { label: "Something else", placeholder: "Type another answer…" },
        }
      })
      .filter((item): item is QuestionnaireItemData => !!item)

    if (!items.length) return null
    return { items, cleaned: content.replace(match[0], "").trimEnd() }
  } catch {
    return null
  }
}

/** Falls back to the trailing "question + listed answers" pattern. */
function heuristicQuestionnaire(content: string, interactive: boolean): {
  items: QuestionnaireItemData[]
  cleaned: string
} | null {
  if (!interactive) return null
  const question = findQuestion(content)
  if (!question) return null
  const drop = new Set<number>([question.questionLine, ...question.optionLines])
  const cleaned = content
    .split(/\r?\n/)
    .filter((_, index) => !drop.has(index))
    .join("\n")
    .trimEnd()
  return {
    items: [
      {
        name: "answer",
        prompt: question.prompt,
        required: true,
        choices: question.options.map((option, index) => ({ value: String(index), label: option })),
        input: { label: "Something else", placeholder: "Type another answer…" },
      },
    ],
    cleaned,
  }
}

export function AIMessageBody({
  content,
  interactive = false,
  onAnswer,
  meta,
}: {
  content: string
  /** Only the newest reply offers the questionnaire, so old answers stay readable. */
  interactive?: boolean
  onAnswer?: (answer: string) => void
  meta?: AIMessageMeta
}) {
  const questionnaire = React.useMemo(() => {
    const explicit = readQuestionnaireBlock(content)
    if (explicit) return explicit
    return heuristicQuestionnaire(content, interactive)
  }, [content, interactive])

  const visibleContent = questionnaire?.cleaned ?? content
  const segments = React.useMemo(() => splitSegments(visibleContent), [visibleContent])
  const sources = React.useMemo(() => extractSources(visibleContent), [visibleContent])

  return (
    <div className="flex flex-col gap-2">
      {meta?.reasoning ? (
        <Reasoning defaultOpen={false}>
          <ReasoningTrigger>Reasoning</ReasoningTrigger>
          <ReasoningContent>
            <Markdown content={meta.reasoning} />
          </ReasoningContent>
        </Reasoning>
      ) : null}

      {meta?.model ? (
        <Tool defaultOpen={false}>
          <ToolHeader title={`Model · ${meta.model}`} state="output-available" />
          <ToolContent>
            <ToolInput>{meta.mode ?? "fast"}</ToolInput>
            <ToolOutput>
              {meta.elapsedMs ? `${(meta.elapsedMs / 1000).toFixed(1)}s response time` : "response received"}
            </ToolOutput>
          </ToolContent>
        </Tool>
      ) : null}

      {segments.map((segment, index) =>
        segment.type === "code" ? (
          <CodeBlock key={`code-${index}`}>
            <CodeBlockHeader>
              <CodeBlockTitle>{segment.lang}</CodeBlockTitle>
              <CodeBlockActions>
                <CodeBlockCopyButton value={segment.value} />
              </CodeBlockActions>
            </CodeBlockHeader>
            <CodeBlockContent lineNumbers={segment.value.split("\n").length > 8}>{segment.value}</CodeBlockContent>
            <CodeBlockFooter>
              <span className="text-[0.56rem] uppercase tracking-[0.14em] text-muted-foreground">
                {segment.value.split("\n").length} lines
              </span>
              <span className="text-[0.56rem] text-muted-foreground/70">{segment.lang}</span>
            </CodeBlockFooter>
          </CodeBlock>
        ) : segment.value.trim() ? (
          <Markdown key={`text-${index}`} content={segment.value.trim()} />
        ) : null
      )}

      <MentionedDate text={visibleContent} />

      {sources.length > 0 ? (
        <Sources defaultOpen={false}>
          <SourcesTrigger count={sources.length} />
          <SourcesContent>
            {sources.map(source => (
              <Source key={source.href} href={source.href} title={source.title} />
            ))}
          </SourcesContent>
        </Sources>
      ) : null}

      {questionnaire && onAnswer ? (
        <Questionnaire
          className="mt-1"
          items={questionnaire.items}
          onSubmit={answers => {
            const lines: string[] = []
            for (const item of questionnaire.items) {
              const picked = answers[item.name] ?? []
              if (!picked.length) continue
              const labels = picked.map(value => item.choices.find(choice => choice.value === value)?.label ?? value)
              lines.push(`${item.prompt} ${labels.join(", ")}`)
            }
            const answer = lines.join("\n").trim()
            if (answer) onAnswer(answer)
          }}
        >
          <QuestionnaireProgress />
          {questionnaire.items.map(item => (
            <QuestionnaireItem key={item.name} name={item.name} required={item.required}>
              <QuestionnaireTitle>{item.prompt}</QuestionnaireTitle>
              {item.description ? <QuestionnaireDescription>{item.description}</QuestionnaireDescription> : null}
              <QuestionnaireChoices>
                {item.choices.map(choice => (
                  <QuestionnaireChoice key={choice.value} value={choice.value}>
                    <span className="text-[0.72rem]">{choice.label}</span>
                  </QuestionnaireChoice>
                ))}
              </QuestionnaireChoices>
              <QuestionnaireInput label="Something else" placeholder="Type another answer…" />
            </QuestionnaireItem>
          ))}
          <QuestionnaireError />
          <QuestionnaireActions>
            <QuestionnairePrevious />
            <QuestionnaireSkip />
            <QuestionnaireNext />
            <QuestionnaireSubmit />
          </QuestionnaireActions>
        </Questionnaire>
      ) : questionnaire ? (
        <Marker variant="border">
          <MarkerIcon>
            <Sparkles />
          </MarkerIcon>
          <MarkerContent>
            The assistant asked: {questionnaire.items.map(item => item.prompt).join(" ")}
          </MarkerContent>
        </Marker>
      ) : null}
    </div>
  )
}

function MentionedDate({ text }: { text: string }) {
  const date = React.useMemo(() => findMentionedDate(text), [text])
  const [selected, setSelected] = React.useState<Date | undefined>(date ?? undefined)

  React.useEffect(() => setSelected(date ?? undefined), [date])

  if (!date) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-2xl border border-border bg-card px-3 py-1.5 text-[0.66rem] text-card-foreground/85 transition-colors hover:bg-muted"
        >
          <CalendarIcon className="size-3.5 opacity-70" />
          {date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar mode="single" selected={selected} onSelect={setSelected} defaultMonth={selected ?? date} />
      </PopoverContent>
    </Popover>
  )
}
