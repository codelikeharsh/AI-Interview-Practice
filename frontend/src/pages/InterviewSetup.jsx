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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[900px] max-w-full overflow-hidden flex">

        {/* LEFT PANEL */}
        <div className="w-1/2 bg-gradient-to-br from-green-100 to-teal-50 p-8">
          <h2 className="text-2xl font-bold text-green-700 mb-4">
            Interview Presets
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            Quickly start with a predefined interview setup
          </p>

          <div className="flex flex-col gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className="text-left border rounded-xl px-4 py-3 hover:bg-green-100 transition"
              >
                <div className="font-semibold">{p.label}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {p.topics}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-1/2 p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Interview Details</h3>
            <button onClick={onCancel} className="text-gray-500 text-xl">×</button>
          </div>

          {/* DOMAIN */}
          <label className="block text-sm font-medium mb-1">
            Domain *
          </label>
          <input
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="e.g. AI / ML Engineer"
            className="w-full border rounded-full px-4 py-2 mb-1"
          />
          <p className="text-xs text-gray-500 mb-4">
            You can edit this even after selecting a preset
          </p>

          {/* TOPICS */}
          <label className="block text-sm font-medium mb-1">
            Topics (comma separated) *
          </label>
          <input
            value={topics}
            onChange={e => setTopics(e.target.value)}
            placeholder="DSA, CNN, SQL, APIs"
            className="w-full border rounded-full px-4 py-2 mb-1"
          />
          <p className="text-xs text-gray-500 mb-4">
            Example: DSA, System Design, Databases
          </p>

          {/* EXPERIENCE */}
          <label className="block text-sm font-medium mb-2">
            Experience Level *
          </label>
          <div className="flex gap-2 mb-4">
            {["fresher", "intermediate", "experienced"].map(l => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-4 py-2 rounded-full text-sm ${
                  level === l
                    ? "bg-gray-900 text-white"
                    : "bg-gray-200"
                }`}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>

          {/* DURATION */}
          <label className="block text-sm font-medium mb-2">
            Interview Duration *
          </label>
          <div className="flex gap-2 mb-4">
            {[5, 10].map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-4 py-2 rounded-full ${
                  duration === d
                    ? "bg-gray-900 text-white"
                    : "bg-gray-200"
                }`}
              >
                {d} mins
              </button>
            ))}
          </div>

          {/* CONSENT */}
          <div className="flex items-start gap-2 mb-6">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
            />
            <p className="text-sm text-gray-600">
              I agree to the Terms & Conditions and allow camera/microphone access.
            </p>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-between">
            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`px-6 py-2 rounded-full ${
                canStart
                  ? "bg-green-400 text-black"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Start Interview
            </button>

            <button
              onClick={onCancel}
              className="px-6 py-2 rounded-full border"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
