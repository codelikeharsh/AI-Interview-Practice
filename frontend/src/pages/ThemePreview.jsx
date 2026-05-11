import { useState } from "react";

const THEMES = [
  { id: "graphite", name: "Graphite + Sand" },
  { id: "emerald", name: "Charcoal + Emerald" },
  { id: "amber", name: "Midnight + Amber" },
  { id: "mono", name: "Slate Monochrome" },
  { id: "teal", name: "Deep Teal" },
];

export default function ThemePreview() {
  const [theme, setTheme] = useState("graphite");

  return (
    <div
      data-theme={theme}
      className="min-h-screen transition-colors duration-500"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* THEME SWITCHER */}
      <div className="flex gap-3 p-6 border-b" style={{ borderColor: "var(--border)" }}>
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className="px-4 py-2 rounded-full text-sm"
            style={{
              background: theme === t.id ? "var(--accent)" : "transparent",
              color: theme === t.id ? "#000" : "var(--text)",
              border: `1px solid var(--border)`
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* HERO */}
      <div className="flex flex-col items-center justify-center text-center px-6 h-[70vh]">
        <h1 className="text-5xl font-bold mb-4">
          AI Interview Coach
        </h1>
        <p className="max-w-xl text-lg mb-8" style={{ color: "var(--muted)" }}>
          Practice real interviews with adaptive AI feedback.
        </p>

        <button
          className="px-8 py-3 rounded-full font-semibold transition"
          style={{
            background: "var(--accent)",
            color: "#000",
            boxShadow: "0 0 30px rgba(0,0,0,0.3)"
          }}
        >
          Start Mock Interview
        </button>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-10 pb-20">
        {["Real Interaction", "Smart Evaluation", "Actionable Feedback"].map(f => (
          <div
            key={f}
            className="p-6 rounded-2xl"
            style={{
              background: "var(--card)",
              border: `1px solid var(--border)`
            }}
          >
            <h3 className="font-semibold mb-2">{f}</h3>
            <p style={{ color: "var(--muted)" }}>
              Designed to feel like a real interview.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
