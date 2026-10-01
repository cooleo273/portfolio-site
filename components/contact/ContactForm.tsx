"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { site } from "@/content/site";

type Fields = { name: string; email: string; message: string };
type Errors = Partial<Record<keyof Fields, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(f: Fields): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Please enter your name.";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Please enter a valid email.";
  if (f.message.trim().length < 10) e.message = "A few more words, please (10+ characters).";
  return e;
}

export function ContactForm() {
  const [fields, setFields] = useState<Fields>({ name: "", email: "", message: "" });
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "mailto" | "error">("idle");

  const update = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...fields, [key]: e.target.value };
    setFields(next);
    if (touched[key]) setErrors(validate(next));
  };
  const blur = (key: keyof Fields) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(validate(fields));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate(fields);
    setErrors(errs);
    setTouched({ name: true, email: true, message: true });
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      (e.currentTarget.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    setStatus("sending");
    try {
      const company = (e.currentTarget.elements.namedItem("company") as HTMLInputElement | null)?.value ?? "";
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, company }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; errors?: Errors; fallback?: string };
      if (res.ok && data.ok) {
        setStatus("sent");
        setFields({ name: "", email: "", message: "" });
        setTouched({});
      } else if (data.fallback === "mailto") {
        // No email service configured: hand the message to the visitor's mail app instead.
        const subject = encodeURIComponent(`Portfolio message from ${fields.name.trim()}`);
        const body = encodeURIComponent(`${fields.message.trim()}\n\n${fields.name.trim()}\n${fields.email.trim()}`);
        window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
        setStatus("mailto");
      } else {
        if (data.errors) setErrors(data.errors);
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="relative min-h-[460px] rounded-[24px] border border-line-subtle bg-surface p-6 sm:p-9">
      <AnimatePresence mode="wait" initial={false}>
        {status === "sent" || status === "mailto" ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[400px] flex-col items-center justify-center text-center"
            role="status"
          >
            <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true" className="mb-6">
              <motion.circle
                cx="44"
                cy="44"
                r="40"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
              <motion.path
                d="M27 45 39 57 62 32"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
              />
            </svg>
            <h3 className="text-[28px] font-semibold tracking-tight">{status === "sent" ? "Message sent." : "Almost there."}</h3>
            <p className="mt-2 max-w-xs text-[15px] text-muted">
              {status === "sent" ? (
                "Thanks for reaching out. I'll get back to you soon."
              ) : (
                <>
                  Your email app should open with the message ready to send. If it didn&apos;t, write to{" "}
                  <a href={`mailto:${site.email}`} className="text-accent underline underline-offset-4">
                    {site.email}
                  </a>
                  .
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-8 rounded-full border border-line px-5 py-2.5 font-mono text-[13px] hover:border-accent"
            >
              send another
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" noValidate onSubmit={onSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <p className="label-mono">send a message</p>
            <Field id="name" label="Name" error={touched.name ? errors.name : undefined}>
              <input
                id="name"
                name="name"
                autoComplete="name"
                value={fields.name}
                onChange={update("name")}
                onBlur={blur("name")}
                className={inputClass(!!(touched.name && errors.name))}
                aria-invalid={!!(touched.name && errors.name)}
                aria-describedby={touched.name && errors.name ? "name-error" : undefined}
                placeholder="Your name"
              />
            </Field>
            <Field id="email" label="Email" error={touched.email ? errors.email : undefined}>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={fields.email}
                onChange={update("email")}
                onBlur={blur("email")}
                className={inputClass(!!(touched.email && errors.email))}
                aria-invalid={!!(touched.email && errors.email)}
                aria-describedby={touched.email && errors.email ? "email-error" : undefined}
                placeholder="you@company.com"
              />
            </Field>
            <Field id="message" label="Message" error={touched.message ? errors.message : undefined}>
              <textarea
                id="message"
                name="message"
                rows={5}
                value={fields.message}
                onChange={update("message")}
                onBlur={blur("message")}
                className={`${inputClass(!!(touched.message && errors.message))} resize-none`}
                aria-invalid={!!(touched.message && errors.message)}
                aria-describedby={touched.message && errors.message ? "message-error" : undefined}
                placeholder="Tell me about your project, timeline and budget."
                data-lenis-prevent
              />
            </Field>
            {/* Honeypot */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="company">Company</label>
              <input id="company" name="company" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <p className="font-mono text-[12px] text-coral" role="alert">
                {status === "error" ? "Something went wrong. Try again or email me directly." : ""}
              </p>
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-medium text-bg transition-opacity disabled:opacity-60"
              >
                {status === "sending" ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg border-t-transparent" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  "Send message"
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputClass = (invalid: boolean) =>
  `w-full rounded-[14px] border bg-bg px-4 py-3.5 text-[16px] text-text placeholder:text-dim outline-none transition-colors focus:border-accent ${
    invalid ? "border-coral" : "border-line"
  }`;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[14px] text-muted">
        {label}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 font-mono text-[12px] text-coral"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
