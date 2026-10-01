"use client";

import { useState } from "react";
import { contact, site, socials } from "@/content/site";
import { copyText } from "@/lib/store";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RevealHeading } from "@/components/ui/RevealHeading";
import { Magnetic } from "@/components/ui/Magnetic";
import { Arrow } from "@/components/hero/Hero";
import { ContactForm } from "./ContactForm";

export function Contact() {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (await copyText(site.email)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      data-tint="color-mix(in srgb, #FF8A5B 2.5%, #0B0D0A)"
      className="relative overflow-hidden pb-20 pt-24 sm:pt-36"
    >
      <div className="container-x">
        <SectionLabel index={5} text="contact" className="mb-6" />
        <RevealHeading
          id="contact-title"
          text={contact.heading}
          accentWords={["good."]}
          rotate
          stagger={0.09}
          className="max-w-6xl text-[clamp(3rem,10vw,9rem)] font-semibold leading-[0.9] tracking-[-0.05em]"
        />

        <div className="mt-16 grid grid-cols-1 gap-14 lg:mt-24 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div>
            <p className="max-w-md text-[18px] leading-relaxed text-muted">{contact.blurb}</p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Magnetic>
                <a
                  href={`mailto:${site.email}`}
                  className="group inline-flex h-14 items-center gap-3 rounded-full bg-accent px-7 text-[16px] font-medium text-bg"
                >
                  {site.email}
                  <Arrow className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </Magnetic>
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex h-14 min-w-[136px] items-center justify-center gap-2 rounded-full border border-line px-6 font-mono text-[13px] text-text transition-colors hover:border-accent"
                aria-live="polite"
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                      <path d="M2 7.5 5.5 11 12 3.5" stroke="var(--accent)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  "Copy email"
                )}
              </button>
            </div>

            <ul className="mt-12 flex flex-col border-t border-line-subtle">
              {socials.map((s) => (
                <li key={s.label} className="border-b border-line-subtle">
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between py-5 text-[clamp(1.5rem,3vw,2rem)] font-medium tracking-tight transition-colors hover:text-accent"
                  >
                    {s.label}
                    <span className="sr-only"> (opens in new tab)</span>
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      aria-hidden="true"
                      className="text-dim transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent"
                    >
                      <path d="M6 16 16 6M8 6h8v8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <ContactForm />
        </div>
      </div>
    </section>
  );
}
