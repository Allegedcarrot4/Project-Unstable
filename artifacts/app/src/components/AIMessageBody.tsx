"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type Segment = { type: "text"; value: string } | { type: "code"; value: string; lang: string }

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

export function AIMessageBody({
  content,
  interactive = false,
  onAnswer,
}: {
  content: string
  /** Only the newest reply offers the questionnaire, so old answers stay readable. */
  interactive?: boolean
  onAnswer?: (answer: string) => void
}) {
  const question = React.useMemo(() => (interactive ? findQuestion(content) : null), [content, interactive])

  const visibleContent = React.useMemo(() => {
    if (!question) return content
    const drop = new Set<number>([question.questionLine, ...question.optionLines])
    return content
      .split(/\r?\n/)
      .filter((_, index) => !drop.has(index))
      .join("\n")
      .trimEnd()
  }, [content, question])

  const segments = React.useMemo(() => splitSegments(visibleContent), [visibleContent])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      {segments.map((segment, index) =>
        segment.type === "code" ? (
          <CodeBlock key={`code-${index}`}>
            <CodeBlockHeader>
              <CodeBlockTitle>{segment.lang}</CodeBlockTitle>
              <CodeBlockActions>
                <CodeBlockCopyButton value={segment.value} />
              </CodeBlockActions>
            </CodeBlockHeader>
            <CodeBlockContent>{segment.value}</CodeBlockContent>
          </CodeBlock>
        ) : (
          <p
            key={`text-${index}`}
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.84)",
              fontSize: "0.79rem",
              lineHeight: 1.72,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {segment.value.trim()}
          </p>
        )
      )}

      <MentionedDate text={content} />

      {question ? (
        <Questionnaire
          className="mt-1"
          items={[
            {
              name: "answer",
              prompt: question.prompt,
              required: true,
              choices: question.options.map((option, index) => ({ value: String(index), label: option })),
              input: { label: "Something else", placeholder: "Type another answer…" },
            },
          ]}
          onSubmit={answers => {
            const picked = (answers.answer ?? []).map(value => question.options[Number(value)] ?? value)
            const answer = picked.join(", ").trim()
            if (answer) onAnswer?.(answer)
          }}
        >
          <QuestionnaireProgress />
          <QuestionnaireItem name="answer" required>
            <QuestionnaireTitle>{question.prompt}</QuestionnaireTitle>
            <QuestionnaireChoices>
              {question.options.map((option, index) => (
                <QuestionnaireChoice key={option} value={String(index)}>
                  <span style={{ fontSize: "0.72rem" }}>{option}</span>
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>
            <QuestionnaireInput label="Something else" placeholder="Type another answer…" />
          </QuestionnaireItem>
          <QuestionnaireActions>
            <QuestionnaireSubmit />
          </QuestionnaireActions>
        </Questionnaire>
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
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-[0.66rem] text-card-foreground/85 transition-colors hover:bg-muted"
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
