import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * A small syntax highlighter for the snippets we ship in the docs and in the
 * SDK install dialog. It is deliberately tiny: it recognises comments,
 * strings, keywords and numbers, and colours them with the code roles from
 * styles.css instead of a hard-coded palette.
 */

const TOKEN_RE =
  /(\/\/[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:const|let|var|function|return|await|async|import|from|export|new|try|catch|finally|if|else|for|of|in|true|false|null|undefined|class|extends|throw)\b|\b\d+(?:\.\d+)?\b)/g;

function highlightLine(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of line.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(line.slice(cursor, index));

    const token = match[0];
    let className = "text-code-keyword";
    if (token.startsWith("//")) className = "text-code-punctuation";
    else if (/^["'`]/.test(token)) className = "text-code-string";
    else if (/^\d/.test(token)) className = "text-code-attribute";

    parts.push(
      <span key={`${index}-${token}`} className={className}>
        {token}
      </span>,
    );
    cursor = index + token.length;
  }

  if (cursor < line.length) parts.push(line.slice(cursor));
  return parts;
}

export function CodeBlock({
  file,
  code,
  className,
}: {
  file?: string;
  code: string;
  className?: string;
}) {
  return (
    <figure className={cn("overflow-hidden rounded-lg border border-border bg-muted", className)}>
      {file && (
        <figcaption className="border-b border-border px-4 py-2 font-mono text-xs text-muted-foreground">
          {file}
        </figcaption>
      )}
      <div className="overflow-x-auto p-4">
        <pre className="font-mono text-xs leading-relaxed text-code-plain">
          {code.split("\n").map((line, i) => (
            <div key={i} className="whitespace-pre">
              {highlightLine(line)}
            </div>
          ))}
        </pre>
      </div>
    </figure>
  );
}
