"use client";

import { useTheme } from "@/app/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed right-4 top-4 z-[60] rounded-full border border-blue-400/40 bg-slate-900/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-blue-100 shadow-lg shadow-black/30 transition hover:border-blue-300 hover:bg-slate-800/90"
      aria-label="Promijeni temu"
      title="Promijeni temu"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
