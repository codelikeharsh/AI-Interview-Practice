import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { apiFetch } from "../services/apiClient";
import { useAuth } from "../context/useAuth";
import AppHeader from "../components/AppHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const SEGMENT_BASE = "rounded-lg px-4 py-1.5 text-sm transition border";
const SEGMENT_ACTIVE = "border-accent bg-accent text-bg";
const SEGMENT_INACTIVE = "border-border bg-surface text-text-secondary hover:bg-surface-hover";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const DIFFICULTY_TONE = {
  easy: "text-emerald-400",
  medium: "text-yellow-400",
  hard: "text-red-400",
};

export default function QuestionBank() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");

  useEffect(() => {
    apiFetch("/questions/bank")
      .then((res) => res.json())
      .then(setQuestions)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(questions.map((q) => q.category))],
    [questions]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter((item) => {
      if (category !== "All" && item.category !== category) return false;
      if (difficulty !== "All" && item.difficulty !== difficulty) return false;
      if (q && !item.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [questions, search, category, difficulty]);

  return (
    <div className="min-h-screen text-text-primary">
      <AppHeader />

      <div className="flex justify-center px-6 pb-16">
        <div className="w-full max-w-5xl pt-10">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">Question Bank</h1>
          <p className="mb-8 text-text-secondary">
            Browse real interview questions by category and difficulty, and practice one at a
            time with instant AI feedback.
          </p>

          <div className="mb-8 space-y-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full rounded-lg border border-border bg-surface px-4 py-2
                text-text-primary placeholder-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-accent/50"
            />

            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`${SEGMENT_BASE} ${category === c ? SEGMENT_ACTIVE : SEGMENT_INACTIVE}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {["All", "easy", "medium", "hard"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`${SEGMENT_BASE} capitalize ${difficulty === d ? SEGMENT_ACTIVE : SEGMENT_INACTIVE}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {loading && <p className="text-text-secondary">Loading questions...</p>}

          {!loading && filtered.length === 0 && (
            <Card className="px-6 py-10 text-center">
              <p className="text-text-secondary">No questions match your filters.</p>
            </Card>
          )}

          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2"
          >
            {filtered.map((item) => (
              <Card key={item.id} variants={fadeUp} className="flex flex-col justify-between p-6">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-md bg-surface-hover px-2.5 py-1 text-xs text-text-secondary">
                      {item.category}
                    </span>
                    <span className={`text-xs font-medium capitalize ${DIFFICULTY_TONE[item.difficulty]}`}>
                      {item.difficulty}
                    </span>
                  </div>
                  <p className="text-text-primary">{item.text}</p>
                </div>
                <Button
                  as={Link}
                  to={user ? `/interview?practice=${item.id}` : "/login"}
                  className="mt-4 self-start"
                  size="sm"
                >
                  Practice This Question
                </Button>
              </Card>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
