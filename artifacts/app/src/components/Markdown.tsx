import * as React from "react"

import { cn } from "@/lib/utils"
import { Task, TaskContent, TaskItem, TaskTrigger } from "@/components/ui/task"

/**
 * Small, dependency-free markdown renderer for assistant replies.
 *
 * Handles the subset the AI actually produces: headings, paragraphs, emphasis,
 * inline code, links, quotes, rules, ordered/unordered lists and task lists.
 * Everything is rendered as React nodes, so message content is never injected
 * as HTML.
 */

const INLINE_PATTERN =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]\n]+\]\((?:https?:\/\/|\/)[^)\s]+\))|(https?:\/\/[^\s<>)]+)/g

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let index = 0

  INLINE_PATTERN.lastIndex = 0
  while ((match = INLINE_PATTERN.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${keyPrefix}-i${index++}`

    if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.76em] text-foreground">
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {renderInline(token.slice(2, -2), key)}
        </strong>
      )
    } else if (token.startsWith("*") || token.startsWith("_")) {
      nodes.push(
        <em key={key} className="italic">
          {renderInline(token.slice(1, -1), key)}
        </em>
      )
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
          >
            {renderInline(linkMatch[1], key)}
          </a>
        )
      } else {
        nodes.push(token)
      }
    } else if (token.startsWith("http")) {
      nodes.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noreferrer noopener"
          className="break-all text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
        >
          {token}
        </a>
      )
    } else {
      nodes.push(token)
    }
    last = match.index + token.length
  }

  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "quote"; lines: string[] }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "tasks"; items: { text: string; done: boolean }[] }
  | { type: "rule" }

const TASK_ITEM = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/
const BULLET_ITEM = /^\s*[-*•]\s+(.*)$/
const ORDERED_ITEM = /^\s*\d{1,2}[.)]\s+(.*)$/

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i++
      continue
    }

    if (/^```/.test(trimmed)) {
      // Stray fence: keep its body as a paragraph so nothing is swallowed.
      const body: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) body.push(lines[i++])
      i++
      if (body.length) blocks.push({ type: "paragraph", lines: body })
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] })
      i++
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "rule" })
      i++
      continue
    }

    if (trimmed.startsWith(">")) {
      const quote: string[] = []
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""))
        i++
      }
      blocks.push({ type: "quote", lines: quote })
      continue
    }

    if (TASK_ITEM.test(line)) {
      const items: { text: string; done: boolean }[] = []
      while (i < lines.length && TASK_ITEM.test(lines[i])) {
        const task = TASK_ITEM.exec(lines[i])
        if (task) items.push({ done: task[1].toLowerCase() === "x", text: task[2] })
        i++
      }
      blocks.push({ type: "tasks", items })
      continue
    }

    if (BULLET_ITEM.test(line) || ORDERED_ITEM.test(line)) {
      const ordered = ORDERED_ITEM.test(line)
      const items: string[] = []
      while (i < lines.length && (ordered ? ORDERED_ITEM.test(lines[i]) : BULLET_ITEM.test(lines[i]))) {
        const item = ordered ? ORDERED_ITEM.exec(lines[i]) : BULLET_ITEM.exec(lines[i])
        if (item) items.push(item[1])
        i++
      }
      blocks.push({ type: "list", ordered, items })
      continue
    }

    const paragraph: string[] = [line]
    i++
    while (i < lines.length) {
      const next = lines[i]
      if (
        !next.trim() ||
        /^(#{1,6})\s+/.test(next.trim()) ||
        next.trim().startsWith(">") ||
        TASK_ITEM.test(next) ||
        BULLET_ITEM.test(next) ||
        ORDERED_ITEM.test(next) ||
        /^```/.test(next.trim()) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(next.trim())
      ) {
        break
      }
      paragraph.push(next)
      i++
    }
    blocks.push({ type: "paragraph", lines: paragraph })
  }

  return blocks
}

const HEADING_CLASS: Record<number, string> = {
  1: "mt-1 text-[1.02rem] font-semibold",
  2: "mt-1 text-[0.94rem] font-semibold",
  3: "mt-1 text-[0.86rem] font-semibold",
  4: "mt-1 text-[0.8rem] font-semibold",
  5: "mt-1 text-[0.76rem] font-semibold uppercase tracking-wide",
  6: "mt-1 text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground",
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const blocks = React.useMemo(() => parseBlocks(content), [content])

  return (
    <div className={cn("flex flex-col gap-2 text-[0.8rem] leading-relaxed text-foreground/90", className)}>
      {blocks.map((block, blockIndex) => {
        const key = `b${blockIndex}`

        if (block.type === "heading") {
          return (
            <p key={key} className={cn(HEADING_CLASS[block.level] ?? HEADING_CLASS[6], "text-foreground")}>
              {renderInline(block.text, key)}
            </p>
          )
        }

        if (block.type === "rule") {
          return <hr key={key} className="my-1 border-border/70" />
        }

        if (block.type === "quote") {
          return (
            <blockquote key={key} className="border-l-2 border-border pl-3 text-muted-foreground italic">
              {block.lines.map((line, i) => (
                <p key={`${key}-${i}`} className="m-0">
                  {renderInline(line, `${key}-${i}`)}
                </p>
              ))}
            </blockquote>
          )
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul"
          return (
            <ListTag
              key={key}
              className={cn(
                "m-0 flex flex-col gap-1 pl-4",
                block.ordered ? "list-decimal" : "list-disc",
                "marker:text-muted-foreground"
              )}
            >
              {block.items.map((item, i) => (
                <li key={`${key}-${i}`} className="pl-0.5">
                  {renderInline(item, `${key}-${i}`)}
                </li>
              ))}
            </ListTag>
          )
        }

        if (block.type === "tasks") {
          const done = block.items.filter(item => item.done).length
          return (
            <Task key={key} defaultOpen>
              <TaskTrigger title="Plan" count={block.items.length} />
              <TaskContent>
                {block.items.map((item, i) => (
                  <TaskItem key={`${key}-${i}`} status={item.done ? "completed" : "pending"}>
                    {renderInline(item.text, `${key}-${i}`)}
                  </TaskItem>
                ))}
              </TaskContent>
              <span className="sr-only">{done} of {block.items.length} steps done</span>
            </Task>
          )
        }

        return (
          <p key={key} className="m-0 whitespace-pre-wrap break-words">
            {block.lines.map((line, i) => (
              <React.Fragment key={`${key}-${i}`}>
                {i > 0 ? <br /> : null}
                {renderInline(line, `${key}-${i}`)}
              </React.Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

/** Every http(s) link mentioned in a reply, deduplicated, for the sources list. */
export function extractSources(content: string): { title: string; href: string }[] {
  const found = new Map<string, string>()
  const pattern = /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>)"']+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(content))) {
    const href = (match[2] ?? match[3] ?? "").replace(/[.,;:]+$/, "")
    if (!href) continue
    const title = match[1] ?? href
    if (!found.has(href)) found.set(href, title)
  }
  return Array.from(found, ([href, title]) => ({ href, title })).slice(0, 8)
}
