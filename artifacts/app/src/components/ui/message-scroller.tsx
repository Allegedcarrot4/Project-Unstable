"use client"

import * as React from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Chat transcript scroller.
 *
 * Implements the shadcn `message-scroller` surface without pulling in
 * `@shadcn/react`: the provider owns the viewport ref and scroll commands, the
 * viewport owns scroll position, and rows are addressable by `messageId` so
 * jumps, anchoring and visibility tracking work. Everything is imperative and
 * event driven (no animation frames), so it stays responsive and works even in
 * a tab that is not compositing frames.
 */

type ScrollPosition = "start" | "end" | "last-anchor"

interface MessageScrollerContextValue {
  viewportRef: React.RefObject<HTMLDivElement | null>
  scrollToEnd: (behavior?: ScrollBehavior) => void
  scrollToStart: () => void
  scrollToMessage: (messageId: string) => boolean
  scrollable: { start: boolean; end: boolean }
  following: boolean
  registerItem: (messageId: string, el: HTMLElement | null) => void
  currentAnchorId: string | null
  visibleMessageIds: string[]
  enableVisibility: () => () => void
}

const MessageScrollerContext = React.createContext<MessageScrollerContextValue | null>(null)

function useScrollerContext() {
  const ctx = React.useContext(MessageScrollerContext)
  if (!ctx) throw new Error("MessageScroller parts must be used inside <MessageScrollerProvider>")
  return ctx
}

export function MessageScrollerProvider({
  children,
  autoScroll = true,
  defaultScrollPosition = "end",
  scrollPreviousItemPeek = 48,
}: {
  children: React.ReactNode
  /** Follow the live edge while the reader is already at the bottom. */
  autoScroll?: boolean
  /** Where a transcript opens once its rows have mounted. */
  defaultScrollPosition?: ScrollPosition
  /** Pixels of the previous turn kept visible above an anchored row. */
  scrollPreviousItemPeek?: number
}) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const [scrollable, setScrollable] = React.useState({ start: false, end: false })
  const [following, setFollowing] = React.useState(true)
  const followingRef = React.useRef(true)
  const autoScrollRef = React.useRef(autoScroll)
  const [currentAnchorId, setCurrentAnchorId] = React.useState<string | null>(null)
  const [visibleMessageIds, setVisibleMessageIds] = React.useState<string[]>([])
  const visibilityCount = React.useRef(0)
  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const itemsRef = React.useRef<Map<string, HTMLElement>>(new Map())
  const visibleRef = React.useRef<Set<string>>(new Set())
  const didInitialScroll = React.useRef(false)

  autoScrollRef.current = autoScroll

  const setFollowingBoth = React.useCallback((next: boolean) => {
    followingRef.current = next
    setFollowing(prev => (prev === next ? prev : next))
  }, [])

  const updateScrollState = React.useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const start = el.scrollTop > 4
    const end = el.scrollTop + el.clientHeight < el.scrollHeight - 8
    setScrollable(prev => (prev.start === start && prev.end === end ? prev : { start, end }))
    setFollowingBoth(!end)

    // Track the current anchored turn for outline / jump controls.
    const anchors = el.querySelectorAll<HTMLElement>("[data-scroll-anchor='true']")
    let current: string | null = null
    for (const anchor of anchors) {
      if (anchor.offsetTop - el.scrollTop <= 48) current = anchor.dataset.messageId ?? null
      else break
    }
    setCurrentAnchorId(prev => (prev === current ? prev : current))
  }, [setFollowingBoth])

  const scrollToEnd = React.useCallback((behavior: ScrollBehavior = "auto") => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
    setFollowingBoth(true)
  }, [setFollowingBoth])

  const scrollToStart = React.useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTo({ top: 0, behavior: "auto" })
    setFollowingBoth(false)
  }, [setFollowingBoth])

  const scrollToMessage = React.useCallback((messageId: string) => {
    const el = viewportRef.current
    if (!el) return false
    const row = el.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(messageId)}"]`)
    if (!row) return false
    const top = row.offsetTop - scrollPreviousItemPeek
    el.scrollTo({ top: Math.max(0, top), behavior: "auto" })
    setFollowingBoth(false)
    return true
  }, [scrollPreviousItemPeek, setFollowingBoth])

  const registerItem = React.useCallback((messageId: string, el: HTMLElement | null) => {
    if (el) itemsRef.current.set(messageId, el)
    else itemsRef.current.delete(messageId)
    if (observerRef.current) {
      if (el) observerRef.current.observe(el)
      else if (el === null) {
        visibleRef.current.delete(messageId)
      }
    }
  }, [])

  const enableVisibility = React.useCallback(() => {
    visibilityCount.current += 1
    if (!observerRef.current && viewportRef.current) {
      const observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.messageId
            if (!id) continue
            if (entry.isIntersecting) visibleRef.current.add(id)
            else visibleRef.current.delete(id)
          }
          const ordered = Array.from(itemsRef.current.keys()).filter(id => visibleRef.current.has(id))
          setVisibleMessageIds(prev => (prev.join("|") === ordered.join("|") ? prev : ordered))
        },
        { root: viewportRef.current, rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
      )
      observerRef.current = observer
      for (const el of itemsRef.current.values()) observer.observe(el)
    }
    return () => {
      visibilityCount.current -= 1
      if (visibilityCount.current <= 0 && observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
        visibleRef.current.clear()
      }
    }
  }, [])

  React.useEffect(() => {
    const el = viewportRef.current
    if (!el || didInitialScroll.current) return
    didInitialScroll.current = true
    const apply = () => {
      if (defaultScrollPosition === "start") return
      if (defaultScrollPosition === "last-anchor") {
        const anchors = el.querySelectorAll<HTMLElement>("[data-scroll-anchor='true']")
        const last = anchors[anchors.length - 1]
        if (last) {
          el.scrollTop = Math.max(0, last.offsetTop - scrollPreviousItemPeek)
          updateScrollState()
          return
        }
      }
      el.scrollTop = el.scrollHeight
      updateScrollState()
    }
    // Two passes: rows can change height after fonts/markdown settle.
    apply()
    const timer = window.setTimeout(apply, 60)
    return () => window.clearTimeout(timer)
  }, [defaultScrollPosition, scrollPreviousItemPeek, updateScrollState])

  const value: MessageScrollerContextValue = {
    viewportRef,
    scrollToEnd,
    scrollToStart,
    scrollToMessage,
    scrollable,
    following,
    registerItem,
    currentAnchorId,
    visibleMessageIds,
    enableVisibility,
  }

  return (
    <MessageScrollerContext.Provider value={value}>
      <ScrollerInternals.Provider value={{ autoScrollRef, followingRef, updateScrollState }}>
        {children}
      </ScrollerInternals.Provider>
    </MessageScrollerContext.Provider>
  )
}

const ScrollerInternals = React.createContext<{
  autoScrollRef: React.MutableRefObject<boolean>
  followingRef: React.MutableRefObject<boolean>
  updateScrollState: () => void
} | null>(null)

function useInternals() {
  const ctx = React.useContext(ScrollerInternals)
  if (!ctx) throw new Error("MessageScroller parts must be used inside <MessageScrollerProvider>")
  return ctx
}

/** Styled frame: viewport, transcript and controls share one positioning context. */
function MessageScroller({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-scroller"
      className={cn("relative flex min-h-0 w-full flex-1 flex-col overflow-hidden", className)}
      {...props}
    />
  )
}

function MessageScrollerViewport({
  className,
  onScroll,
  ...props
}: React.ComponentProps<"div">) {
  const { viewportRef, scrollable } = useScrollerContext()
  const { updateScrollState } = useInternals()

  return (
    <div
      ref={viewportRef}
      data-slot="message-scroller-viewport"
      data-scrollable={scrollable.start || scrollable.end ? "true" : "false"}
      role="region"
      aria-label="Messages"
      tabIndex={0}
      onScroll={event => {
        updateScrollState()
        onScroll?.(event)
      }}
      className={cn(
        "min-h-0 w-full flex-1 overflow-y-auto overscroll-contain outline-none",
        "[scrollbar-gutter:stable] focus-visible:ring-1 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  )
}

function MessageScrollerContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const { autoScrollRef, followingRef, updateScrollState } = useInternals()
  const lastHeight = React.useRef(0)
  const lastTop = React.useRef(0)

  React.useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const viewport = el.parentElement
    if (!viewport) return
    lastHeight.current = viewport.scrollHeight
    lastTop.current = viewport.scrollTop

    const observer = new MutationObserver(() => {
      const delta = viewport.scrollHeight - lastHeight.current
      if (delta > 0) {
        if (autoScrollRef.current && followingRef.current) {
          viewport.scrollTop = viewport.scrollHeight
        } else if (viewport.scrollTop < 80) {
          // Older rows were prepended: keep the reader on the same content.
          viewport.scrollTop = lastTop.current + delta
        }
      }
      lastHeight.current = viewport.scrollHeight
      lastTop.current = viewport.scrollTop
      updateScrollState()
    })
    observer.observe(el, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [autoScrollRef, followingRef, updateScrollState])

  return (
    <div
      ref={contentRef}
      data-slot="message-scroller-content"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className={cn("flex min-h-full w-full flex-col gap-4 px-3 py-4 sm:px-5", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function MessageScrollerItem({
  className,
  messageId,
  scrollAnchor = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  messageId: string
  /** Marks the start of a turn so the scroller can anchor it. */
  scrollAnchor?: boolean
}) {
  const { registerItem } = useScrollerContext()
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    registerItem(messageId, ref.current)
    return () => registerItem(messageId, null)
  }, [messageId, registerItem])

  return (
    <div
      ref={ref}
      data-slot="message-scroller-item"
      data-message-id={messageId}
      data-scroll-anchor={scrollAnchor ? "true" : undefined}
      className={cn(
        "relative w-full min-w-0 [contain-intrinsic-size:auto_80px] [content-visibility:auto]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function MessageScrollerButton({
  className,
  label = "Jump to latest",
  ...props
}: React.ComponentProps<"button"> & { label?: string }) {
  const { scrollable, scrollToEnd } = useScrollerContext()
  const active = scrollable.end

  return (
    <button
      type="button"
      data-slot="message-scroller-button"
      data-active={active ? "true" : "false"}
      aria-label={label}
      aria-hidden={!active}
      tabIndex={active ? 0 : -1}
      onClick={() => scrollToEnd("auto")}
      className={cn(
        "absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-popover px-3 py-1.5 text-[0.66rem] font-medium text-popover-foreground shadow-lg transition-opacity",
        active ? "opacity-100" : "pointer-events-none opacity-0",
        className
      )}
      {...props}
    >
      <ArrowDown className="size-3.5" />
      {label}
    </button>
  )
}

/** Imperative transcript controls. Works anywhere inside the provider. */
export function useMessageScroller() {
  const { scrollToEnd, scrollToStart, scrollToMessage } = useScrollerContext()
  return { scrollToEnd, scrollToStart, scrollToMessage }
}

/** Which edges the viewport can still scroll toward. */
export function useMessageScrollerScrollable() {
  const { scrollable } = useScrollerContext()
  return scrollable
}

/** Pay-for-what-you-use visibility tracking for anchored rows. */
export function useMessageScrollerVisibility() {
  const { currentAnchorId, visibleMessageIds, enableVisibility } = useScrollerContext()
  React.useEffect(() => enableVisibility(), [enableVisibility])
  return { currentAnchorId, visibleMessageIds }
}

/** Convenience control that flips between start and end. */
function MessageScrollerJump({ className, ...props }: React.ComponentProps<"button">) {
  const { scrollable, scrollToStart, scrollToEnd } = useScrollerContext()
  const up = scrollable.end
  return (
    <button
      type="button"
      onClick={() => (up ? scrollToEnd("auto") : scrollToStart())}
      className={cn("rounded-full border border-border bg-popover p-1.5 text-popover-foreground", className)}
      {...props}
    >
      {up ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}
    </button>
  )
}

export {
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  MessageScrollerJump,
}
