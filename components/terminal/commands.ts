import { accents, projects, stack, terminal } from "@/content/site";

export type LineKind = "input" | "output" | "error" | "accent" | "muted";
export type OutLine = { kind: LineKind; text: string; onDone?: () => void };

export type CommandContext = {
  setAccent: (name: keyof typeof accents) => void;
  startGame: () => void;
  confetti: () => void;
  clear: () => void;
};

const pad = (n: number) => String(n).padStart(2, "0");
const out = (text: string, kind: LineKind = "output"): OutLine => ({ kind, text });

export const COMMAND_NAMES = ["help", "whoami", "projects", "stack", "contact", "play", "clear", "theme", "sudo", "ls"];

/** Turns raw input into output lines. Side effects run via ctx (some after printing). */
export function runCommand(raw: string, ctx: CommandContext): OutLine[] {
  const input = raw.trim();
  if (!input) return [];
  const [cmd, ...args] = input.split(/\s+/);
  const name = cmd.toLowerCase();

  switch (name) {
    case "help":
    case "whoami":
    case "contact":
      return terminal.commands[name].map((t, i) => out(t, i === 0 && name === "help" ? "muted" : "output"));

    case "projects":
      return [
        out("selected work:", "muted"),
        ...projects.map((p, i) => out(`  ${pad(i + 1)}  ${p.category.toLowerCase().padEnd(12)}${p.title}`)),
        out("open the Work section for case studies.", "muted"),
      ];

    case "stack": {
      const rows: string[] = [];
      for (let i = 0; i < stack.length; i += 4) rows.push("  " + stack.slice(i, i + 4).map((s) => s.padEnd(14)).join(""));
      return [out("tools I reach for:", "muted"), ...rows.map((r) => out(r))];
    }

    case "ls":
      return [out("work/  play/  about/  contact/  cv.pdf")];

    case "play":
      return [
        out("launching production defense...", "accent"),
        { kind: "output", text: "good luck. bugs incoming.", onDone: ctx.startGame },
      ];

    case "clear":
      ctx.clear();
      return [];

    case "theme": {
      const color = (args[0] || "").toLowerCase();
      if (color in accents) {
        return [{ kind: "accent", text: `accent set to ${color}`, onDone: () => ctx.setAccent(color as keyof typeof accents) }];
      }
      return [out(`usage: theme ${Object.keys(accents).join(" | ")}`, "error")];
    }

    case "sudo": {
      if (args.join(" ").toLowerCase() === "hire-leul") {
        const lines = terminal.commands.hire.map((t) => out(t));
        lines[lines.length - 1] = { kind: "accent", text: lines[lines.length - 1].text, onDone: ctx.confetti };
        return lines;
      }
      return [out("visitor is not in the sudoers file. this incident will be reported.", "error")];
    }

    default:
      return [out(`command not found: ${cmd}. try 'help'`, "error")];
  }
}

export function complete(partial: string) {
  const p = partial.trim().toLowerCase();
  if (!p || p.includes(" ")) return null;
  const matches = COMMAND_NAMES.filter((c) => c.startsWith(p));
  return matches.length === 1 && matches[0] !== p ? matches[0] : null;
}
