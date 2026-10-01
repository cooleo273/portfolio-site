"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { store, useStore } from "@/lib/store";

const PaletteDialog = dynamic(() => import("./PaletteDialog").then((m) => m.PaletteDialog), { ssr: false });

/** Registers Cmd/Ctrl+K globally; the dialog itself is loaded on first open. */
export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        store.set({ paletteOpen: !store.get().paletteOpen });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setLoaded(true);
  }, [open]);

  return loaded ? <PaletteDialog /> : null;
}
