import * as React from "react";

/**
 * Minimal, dependency-free renderer for GitHub release notes.
 *
 * Release bodies are Markdown, but pulling a full Markdown engine into the
 * bundle for one page is not worth it. This handles the subset that release
 * notes actually use (headings, lists, code fences, quotes, rules, bold,
 * italics, inline code, links) and renders it as React nodes — never as
 * HTML — so a release body can't inject markup into the app.
 */

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; lang: string; value: string }
  | { kind: "quote"; text: string }
  | { kind: "rule" };

const BULLET = /^[-*+]\s+(.*)$/;
const NUMBERED = /^\d{1,2}[.)]\s+(.*)$/;

function isBlockStart(line: string): boolean {
  return (
    /^#{1,6}\s+/.test(line) ||
    /^```/.test(line) ||
    /^>\s?/.test(line) ||
    BULLET.test(line) ||
    NUMBERED.test(line)
  );
}

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    const fence = /^```(\S*)/.exec(line);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        body.push(lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push({ kind: "code", lang: fence[1] ?? "", value: body.join("\n") });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(line.replace(/\s/g, ""))) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "quote", text: quote.join(" ") });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        const match = ordered ? NUMBERED.exec(current) : BULLET.exec(current);
        if (!match) break;
        items.push(match[1].trim());
        i++;
        // Indented continuation lines belong to the item they follow.
        while (
          i < lines.length &&
          /^\s{2,}\S/.test(lines[i]) &&
          !BULLET.test(lines[i].trim()) &&
          !NUMBERED.test(lines[i].trim())
        ) {
          items[items.length - 1] += " " + lines[i].trim();
          i++;
        }
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    const paragraph: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next || isBlockStart(next)) break;
      paragraph.push(next);
      i++;
    }
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

const INLINE =
  /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]*\]\([^)\s]+\)|\*[^*\n]+\*|_[^_\n]+_)/g;

const codeStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: "0.68rem",
  padding: "0.05rem 0.28rem",
  borderRadius: 4,
  background: "rgba(255,255,255,0.07)",
  color: "rgba(255,255,255,0.82)",
};

const linkStyle: React.CSSProperties = {
  color: "var(--t-accent, #e8e8e8)",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

/**
 * GitHub escapes punctuation in generated notes (`child\_process`, `\[link]`).
 * Escapes have to be masked before tokenizing, otherwise `\[` would start a
 * link; they are restored afterwards so the reader sees the literal character.
 */
const ESCAPE_MARK = "\uE000";

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const escaped: string[] = [];
  const masked = text.replace(/\\([\\`*_{}[\]()#+\-.!~|>])/g, (_match, char: string) => {
    escaped.push(char);
    return `${ESCAPE_MARK}${escaped.length - 1}${ESCAPE_MARK}`;
  });
  const restore = (value: string): string =>
    value.replace(/\uE000(\d+)\uE000/g, (_match, index: string) => escaped[Number(index)] ?? "");

  const nodes: React.ReactNode[] = [];
  const pattern = new RegExp(INLINE.source, "g");
  let last = 0;
  let index = 0;

  for (let match = pattern.exec(masked); match; match = pattern.exec(masked)) {
    if (match.index > last) nodes.push(restore(masked.slice(last, match.index)));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;

    if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(
        <strong key={key} style={{ fontWeight: 600, color: "var(--t-text, #e0e0e0)" }}>
          {restore(token.slice(2, -2))}
        </strong>
      );
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key} style={codeStyle}>{restore(token.slice(1, -1))}</code>);
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]*)\]\(([^)\s]+)\)$/.exec(token);
      if (link && /^https?:\/\//i.test(link[2])) {
        const label = inline(restore(link[1]), `${key}-label`);
        nodes.push(
          <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {label.length ? label : link[2]}
          </a>
        );
      } else {
        nodes.push(restore(token));
      }
    } else {
      nodes.push(<em key={key}>{restore(token.slice(1, -1))}</em>);
    }

    last = match.index + token.length;
  }

  if (last < masked.length) nodes.push(restore(masked.slice(last)));
  return nodes;
}

function renderItem(item: string, key: string): React.ReactNode {
  const task = /^\[([ xX])\]\s+(.*)$/.exec(item);
  if (task) {
    const done = task[1].toLowerCase() === "x";
    return (
      <React.Fragment key={key}>
        <span aria-hidden="true" style={{ opacity: done ? 0.85 : 0.45, marginRight: "0.35rem" }}>
          {done ? "☑" : "☐"}
        </span>
        {inline(task[2], key)}
      </React.Fragment>
    );
  }
  return <React.Fragment key={key}>{inline(item, key)}</React.Fragment>;
}

function renderBlock(block: Block, index: number): React.ReactNode {
  const key = `block-${index}`;

  switch (block.kind) {
    case "heading": {
      const size = block.level <= 2 ? "0.85rem" : block.level === 3 ? "0.78rem" : "0.74rem";
      return (
        <p
          key={key}
          style={{
            margin: index === 0 ? 0 : "0.35rem 0 0",
            fontSize: size,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: "var(--t-text, #e0e0e0)",
          }}
        >
          {inline(block.text, key)}
        </p>
      );
    }

    case "paragraph":
      return (
        <p key={key} style={{ margin: 0 }}>
          {inline(block.text, key)}
        </p>
      );

    case "list": {
      const items = block.items.map((item, itemIndex) => (
        <li key={`${key}-${itemIndex}`} style={{ margin: "0.1rem 0" }}>
          {renderItem(item, `${key}-${itemIndex}`)}
        </li>
      ));
      const listStyle: React.CSSProperties = {
        margin: 0,
        paddingLeft: "1.15rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.05rem",
      };
      return block.ordered ? (
        <ol key={key} style={listStyle}>{items}</ol>
      ) : (
        <ul key={key} style={listStyle}>{items}</ul>
      );
    }

    case "code":
      return (
        <pre
          key={key}
          style={{
            margin: 0,
            padding: "0.6rem 0.7rem",
            borderRadius: 6,
            border: "1px solid var(--t-border-light, #222)",
            background: "rgba(255,255,255,0.04)",
            overflowX: "auto",
            fontSize: "0.68rem",
            lineHeight: 1.55,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            color: "rgba(255,255,255,0.78)",
          }}
        >
          <code>{block.value}</code>
        </pre>
      );

    case "quote":
      return (
        <blockquote
          key={key}
          style={{
            margin: 0,
            paddingLeft: "0.7rem",
            borderLeft: "2px solid var(--t-border-light, #222)",
            color: "var(--t-text-muted, rgba(255,255,255,0.35))",
          }}
        >
          {inline(block.text, key)}
        </blockquote>
      );

    case "rule":
      return <hr key={key} style={{ border: "none", borderTop: "1px solid var(--t-border-light, #222)", margin: "0.2rem 0" }} />;

    default:
      return null;
  }
}

export function ReleaseNotes({ source }: { source: string }) {
  const blocks = React.useMemo(() => parse(source), [source]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        fontSize: "0.74rem",
        lineHeight: 1.65,
        color: "var(--t-text-secondary, rgba(255,255,255,0.55))",
        wordBreak: "break-word",
      }}
    >
      {blocks.map(renderBlock)}
    </div>
  );
}
