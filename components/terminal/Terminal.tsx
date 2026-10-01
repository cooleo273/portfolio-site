"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { terminal } from "@/content/site";
import { startGame } from "@/lib/actions";
import { confetti } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/hooks";
import { setAccent } from "@/lib/store";
import { complete, runCommand, type LineKind, type OutLine } from "./commands";

type Line = { id: number; kind: LineKind; text: string };

const PROMPT = "visitor@leul.dev:~$";
const KIND_CLASS: Record<LineKind, string> = {
  input: "text-text",
  output: "text-muted",
  error: "text-coral",
  accent: "text-accent",
  muted: "text-dim",
};

let uid = 0;
const nextId = () => ++uid;

export function Terminal() {
  const [lines, setLines] = useState<Line[]>(() => terminal.welcome.map((text, i) => ({ id: -1 - i, kind: i ? "muted" : "output", text })));
  const [typing, setTyping] = useState<{ line: OutLine; n: number } | null>(null);
  const [value, setValue] = useState("");
  const [announce, setAnnounce] = useState("");
  const queue = useRef<OutLine[]>([]);
  const history = useRef<string[]>([]);
  const histIndex = useRef(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [pump, setPump] = useState(0);

  // Typewriter: takes one queued line at a time and reveals it a few characters per tick.
  useEffect(() => {
    if (!typing) {
      const next = queue.current.shift();
      if (next) setTyping({ line: next, n: 0 });
      return;
    }
    const { line, n } = typing;
    if (n >= line.text.length) {
      setLines((prev) => [...prev, { id: nextId(), kind: line.kind, text: line.text }]);
      line.onDone?.();
      setTyping(null);
      return;
    }
    const t = setTimeout(() => setTyping({ line, n: n + 3 }), 12);
    return () => clearTimeout(t);
  }, [typing, pump]);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [lines, typing]);

  const clear = useCallback(() => {
    queue.current = [];
    setTyping(null);
    setLines([]);
  }, []);

  const typingRef = useRef(typing);
  typingRef.current = typing;

  /** Print anything still being typed instantly so a new command never interleaves with old output. */
  const flush = useCallback(() => {
    const pending = [...(typingRef.current ? [typingRef.current.line] : []), ...queue.current];
    if (!pending.length) return;
    queue.current = [];
    setTyping(null);
    setLines((prev) => [...prev, ...pending.map((l) => ({ id: nextId(), kind: l.kind, text: l.text }))]);
    pending.forEach((l) => l.onDone?.());
  }, []);

  const execute = useCallback(
    (raw: string) => {
      flush();
      const input = raw.trim();
      if (input) {
        history.current.push(input);
        histIndex.current = -1;
      }
      setLines((prev) => [...prev, { id: nextId(), kind: "input", text: input }]);
      const output = runCommand(input, { setAccent, startGame, confetti, clear });
      if (input.toLowerCase() === "clear") return;
      setAnnounce(output.map((l) => l.text).join(". "));

      if (prefersReducedMotion()) {
        setLines((prev) => [...prev, ...output.map((l) => ({ id: nextId(), kind: l.kind, text: l.text }))]);
        output.forEach((l) => l.onDone?.());
        return;
      }
      queue.current.push(...output);
      setPump((p) => p + 1);
    },
    [clear, flush],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const h = history.current;
    if (e.key === "Enter") {
      e.preventDefault();
      execute(value);
      setValue("");
    } else if (e.key === "ArrowUp") {
      if (!h.length) return;
      e.preventDefault();
      histIndex.current = histIndex.current === -1 ? h.length - 1 : Math.max(0, histIndex.current - 1);
      setValue(h[histIndex.current]);
    } else if (e.key === "ArrowDown") {
      if (histIndex.current === -1) return;
      e.preventDefault();
      histIndex.current++;
      if (histIndex.current >= h.length) {
        histIndex.current = -1;
        setValue("");
      } else setValue(h[histIndex.current]);
    } else if (e.key === "Tab") {
      const completion = complete(value);
      if (completion) {
        e.preventDefault();
        setValue(completion + (completion === "theme" || completion === "sudo" ? " " : ""));
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      clear();
    }
  };

  return (
    <div className="relative w-full">
      <div
        className="overflow-hidden rounded-[20px] border border-line bg-surface transition-colors focus-within:border-accent shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]"
        onClick={() => {
          if (!window.getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <div className="flex items-center gap-2 border-b border-line-subtle px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-coral" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-yellow" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-lime" aria-hidden="true" />
          <p className="flex-1 pr-10 text-center font-mono text-[12px] text-dim">leul@portfolio: ~</p>
        </div>

        <div
          ref={bodyRef}
          role="log"
          aria-label="Terminal output"
          aria-live="off"
          data-lenis-prevent
          className="no-scrollbar h-[300px] overflow-y-auto px-4 py-4 font-mono text-[12.5px] leading-[1.7] sm:h-[360px] sm:text-[13px]"
        >
          {lines.map((l) => (
            <TermLine key={l.id} kind={l.kind} text={l.text} />
          ))}
          {typing && <TermLine kind={typing.line.kind} text={typing.line.text.slice(0, typing.n)} />}

          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <label htmlFor="term-input" className="shrink-0 text-accent">
              <span aria-hidden="true">{PROMPT}</span>
              <span className="sr-only">Terminal command</span>
            </label>
            <input
              id="term-input"
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              className="min-w-0 flex-1 bg-transparent text-text caret-accent outline-none focus-visible:outline-none"
              aria-describedby="term-hint"
            />
          </form>
        </div>
      </div>

      <p id="term-hint" className="sr-only">
        Type help and press Enter. Use the up and down arrows for command history.
      </p>
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Quick commands">
        {terminal.chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => execute(c)}
            className="rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-[12px] text-muted transition-colors hover:border-accent hover:text-text"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function TermLine({ kind, text }: { kind: LineKind; text: string }) {
  if (kind === "input") {
    return (
      <div className="whitespace-pre-wrap break-words">
        <span className="text-accent">{PROMPT}</span> <span className="text-text">{text}</span>
      </div>
    );
  }
  return <div className={`whitespace-pre-wrap break-words ${KIND_CLASS[kind]}`}>{text || " "}</div>;
}
