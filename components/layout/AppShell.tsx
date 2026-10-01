import { SmoothScroll } from "./SmoothScroll";
import { Preloader } from "./Preloader";
import { Cursor } from "./Cursor";
import { ScrollProgress } from "./ScrollProgress";
import { Nav } from "./Nav";
import { ThemePicker } from "./ThemePicker";
import { CommandPalette } from "./CommandPalette";
import { Toast } from "./Toast";
import { ScrollEffects } from "./ScrollEffects";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div id="bg-tint" aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10" />
      <SmoothScroll />
      <Preloader />
      <ScrollProgress />
      <Nav />
      {children}
      <ScrollEffects />
      <ThemePicker />
      <CommandPalette />
      <Toast />
      <Cursor />
    </>
  );
}
