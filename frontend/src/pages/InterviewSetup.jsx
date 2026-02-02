import { useState } from "react";

const PRESETS = [
  {
    label: "AI / ML Engineer",
    domain: "AI / ML Engineer",
    topics: "Machine Learning, Deep Learning, CNN, NLP, Transformers",
  },
  {
    label: "Software Engineer",
    domain: "Software Engineer",
    topics: "DSA, OOP, Operating Systems, DBMS, System Design",
  },
  {
    label: "Frontend Developer",
    domain: "Frontend Developer",
    topics: "React, JavaScript, HTML, CSS, Performance, Accessibility",
  },
  {
    label: "Backend Developer",
    domain: "Backend Developer",
    topics: "APIs, Databases, Authentication, Caching, System Design",
  },
  {
    label: "Data Analyst",
    domain: "Data Analyst",
    topics: "SQL, Python, Statistics, Data Visualization, Pandas",
  },
];

export default function InterviewSetup({ onStart, onCancel }) {
  const [domain, setDomain] = useState("");
  const [topics, setTopics] = useState("");
  const [level, setLevel] = useState("fresher");
  const [duration, setDuration] = useState(5);
  const [agreed, setAgreed] = useState(false);

  const canStart =
    domain.trim().length > 0 &&
    topics.trim().length > 0 &&
    agreed;

  const handlePreset = (preset) => {
    setDomain(preset.domain);
    setTopics(preset.topics);
  };

  const handleStart = () => {
    if (!canStart) return;
    onStart({
      role: domain,
      topics: topics.split(",").map(t => t.trim()),
      level,
      duration,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F1A]/80 backdrop-blur-xl flex items-center justify-center px-6">
      <div className="w-full max-w-5xl rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_40px_120px_rgba(0,0,0,0.6)] flex">

        {/* LEFT – PRESETS */}
        <div className="w-1/2 p-8 border-r border-white/10">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            Interview Presets
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Start fast with curated roles and topics
          </p>

          <div className="flex flex-col gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className="group text-left rounded-2xl px-5 py-4
                  bg-white/5 border border-white/10
                  hover:bg-white/10 hover:border-indigo-400/40
                  transition"
              >
                <div className="font-semibold text-slate-100 group-hover:text-indigo-300">
                  {p.label}
                </div>
                <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {p.topics}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT – FORM */}
        <div className="w-1/2 p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-slate-100">
              Interview Setup
            </h3>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-200 text-2xl"
            >
              ×
            </button>
          </div>

          {/* DOMAIN */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Target Role *
            </label>
            <input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="e.g. AI / ML Engineer"
              className="w-full rounded-full px-4 py-2
                bg-white/5 border border-white/10
                text-slate-100 placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
            />
          </div>

          {/* TOPICS */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Topics *
            </label>
            <input
              value={topics}
              onChange={e => setTopics(e.target.value)}
              placeholder="DSA, CNN, SQL, APIs"
              className="w-full rounded-full px-4 py-2
                bg-white/5 border border-white/10
                text-slate-100 placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
            />
            <p className="text-xs text-slate-500 mt-1">
              Comma separated (e.g. System Design, Databases)
            </p>
          </div>

          {/* EXPERIENCE */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Experience Level *
            </label>
            <div className="flex gap-2">
              {["fresher", "intermediate", "experienced"].map(l => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`px-5 py-2 rounded-full text-sm transition ${
                    level === l
                      ? "bg-indigo-400 text-black"
                      : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* DURATION */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Interview Duration *
            </label>
            <div className="flex gap-2">
              {[5, 10].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-5 py-2 rounded-full text-sm transition ${
                    duration === d
                      ? "bg-indigo-400 text-black"
                      : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {d} mins
                </button>
              ))}
            </div>
          </div>

          {/* CONSENT */}
          <div className="flex items-start gap-3 mb-8">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-1 accent-indigo-400"
            />
            <p className="text-sm text-slate-400">
              I agree to the Terms & Conditions and allow camera and microphone access.
            </p>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`px-8 py-2.5 rounded-full font-semibold transition ${
                canStart
                  ? "bg-indigo-400 text-black hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]"
                  : "bg-white/10 text-slate-500 cursor-not-allowed"
              }`}
            >
              Start Interview
            </button>

            <button
              onClick={onCancel}
              className="px-6 py-2 rounded-full border border-white/10 text-slate-400 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
