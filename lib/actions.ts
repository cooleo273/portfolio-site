"use client";

import { site } from "@/content/site";
import { scrollToTarget } from "./scroll";
import { copyText, emit, showToast, store, toggleSound } from "./store";

export function goTo(hash: string) {
  scrollToTarget(hash);
}

export async function copyEmail() {
  const ok = await copyText(site.email);
  showToast(ok ? "Email copied to clipboard" : "Could not copy email");
  return ok;
}

/** Scroll the game frame into view, then start a run once the scroll settles. */
export function startGame() {
  const frame = document.getElementById("game-frame");
  if (!frame) return;
  const offset = -Math.max(72, (window.innerHeight - frame.offsetHeight) / 2);
  scrollToTarget(frame, () => emit("game:start"), offset);
}

export function toggleSoundWithToast() {
  toggleSound();
  showToast(store.get().sound ? "Sound on" : "Sound off");
}
