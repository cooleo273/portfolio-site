"use client";

import { useSyncExternalStore } from "react";
import { accents, type AccentName } from "@/content/site";

type State = {
  accent: AccentName;
  sound: boolean;
  booted: boolean;
  paletteOpen: boolean;
  modalOpen: boolean;
  toast: string | null;
};

const initial: State = {
  accent: "lime",
  sound: false,
  booted: false,
  paletteOpen: false,
  modalOpen: false,
  toast: null,
};

let state: State = initial;
const listeners = new Set<() => void>();

export const store = {
  get: () => state,
  set(partial: Partial<State>) {
    state = { ...state, ...partial };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(initial),
  );
}

export const ACCENT_KEY = "leul-accent";
export const BOOT_KEY = "leul-booted";

export function isAccent(value: string | null | undefined): value is AccentName {
  return !!value && value in accents;
}

export function setAccent(name: AccentName) {
  store.set({ accent: name });
  document.documentElement.setAttribute("data-accent", name);
  try {
    localStorage.setItem(ACCENT_KEY, name);
  } catch {}
}

export function getAccentHex() {
  return accents[state.accent];
}

export function toggleSound(force?: boolean) {
  store.set({ sound: force ?? !state.sound });
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function showToast(message: string) {
  store.set({ toast: message });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => store.set({ toast: null }), 2200);
}

/* Tiny event bus for cross-component actions (terminal -> game, palette -> game). */
type Events = { "game:start": void };
const bus = new EventTarget();
export function emit<K extends keyof Events>(name: K) {
  bus.dispatchEvent(new Event(name));
}
export function on<K extends keyof Events>(name: K, fn: () => void) {
  bus.addEventListener(name, fn);
  return () => bus.removeEventListener(name, fn);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
