"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { accents, nav, site, type AccentName } from "@/content/site";
import { copyEmail, goTo, startGame, toggleSoundWithToast } from "@/lib/actions";
import { setAccent, showToast, store, useStore } from "@/lib/store";
import { lockScroll } from "@/lib/scroll";

type Command = { id: string; group: string; label: string; hint?: string; run: () => void };

export function PaletteDialog() {
  const open = useStore((s) => s.paletteOpen);
  const sound = useStore((s) => s.sound);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const commands = useMemo<Command[]>(
    () => [
      { id: "top", group: "Navigate", label: "Go to top", run: () => goTo("#top") },
      ...nav.map((n) => ({ id: `nav-${n.href}`, group: "Navigate", label: `Go to ${n.label}`, hint: n.href, run: () => goTo(n.href) })),
      { id: "game", group: "Actions", label: "Start Production Defense", hint: "game", run: startGame },
      { id: "email", group: "Actions", label: "Copy email", hint: site.email, run: () => void copyEmail() },
      { id: "sound", group: "Actions", label: sound ? "Turn sound off" : "Turn sound on", run: toggleSoundWithToast },
      {
        id: "cv",
        group: "Actions",
        label: "Download CV",
        run: () => {
          const a = document.createElement("a");
          a.href = site.cvUrl;
          a.download = site.cvFileName;
          a.click();
        },
      },
      ...(Object.keys(accents) as AccentName[]).map((name) => ({
        id: `accent-${name}`,
        group: "Accent",
        label: `Accent: ${name}`,
        run: () => {
          setAccent(name);
          showToast(`Accent set to ${name}`);
        },
      })),
    ],
    [sound],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.group} ${c.label} ${c.hint ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActive(0);
      lockScroll(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (returnFocus.current) {
      lockScroll(false);
      returnFocus.current.focus?.({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const close = () => store.set({ paletteOpen: false });
  const run = (cmd?: Command) => {
    if (!cmd) return;
    close();
    // Let the dialog unmount and scrolling unlock before running.
    setTimeout(cmd.run, 60);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(filtered[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  let lastGroup = "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="palette"
          className="fixed inset-0 z-[180] flex items-start justify-center px-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" onClick={close} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ y: 12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg overflow-hidden rounded-[20px] border border-line bg-surface shadow-2xl"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-line-subtle px-4">
              <span className="font-mono text-accent" aria-hidden="true">
                &gt;
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search..."
                className="h-14 flex-1 bg-transparent font-mono text-[14px] text-text outline-none placeholder:text-dim"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
                aria-autocomplete="list"
                aria-label="Search commands"
              />
              <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px] text-dim">esc</kbd>
            </div>
            <ul
              id="palette-list"
              ref={listRef}
              role="listbox"
              aria-label="Commands"
              className="max-h-[50vh] overflow-y-auto p-2"
              data-lenis-prevent
            >
              {filtered.length === 0 && <li className="px-3 py-6 text-center font-mono text-[13px] text-dim">no matching commands</li>}
              {filtered.map((cmd, i) => {
                const header = cmd.group !== lastGroup ? cmd.group : null;
                lastGroup = cmd.group;
                return (
                  <li key={cmd.id} role="presentation">
                    {header && <div className="px-3 pb-1 pt-3 font-mono text-[11px] lowercase tracking-wider text-dim">{header}</div>}
                    <div
                      id={`cmd-${cmd.id}`}
                      role="option"
                      aria-selected={i === active}
                      data-index={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => run(cmd)}
                      className={`flex cursor-pointer items-center justify-between rounded-[12px] px-3 py-2.5 text-[15px] transition-colors ${
                        i === active ? "bg-surface-hover text-text" : "text-muted"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {cmd.group === "Accent" && (
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ background: accents[cmd.id.replace("accent-", "") as AccentName] }}
                            aria-hidden="true"
                          />
                        )}
                        {cmd.label}
                      </span>
                      {cmd.hint && <span className="truncate pl-4 font-mono text-[12px] text-dim">{cmd.hint}</span>}
                      {i === active && !cmd.hint && <span className="font-mono text-[12px] text-accent" aria-hidden="true">enter</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
