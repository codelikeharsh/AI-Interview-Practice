import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { apiFetch } from "../services/apiClient";
import AppHeader from "../components/AppHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export default function History() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    apiFetch("/interview/history")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load interview history");
        return res.json();
      })
      .then((data) => setSessions(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen text-text-primary">
      <AppHeader />

      <div className="px-6 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between pt-10">
            <h1 className="text-3xl font-semibold tracking-tight">My Interviews</h1>
            <Button as={Link} to="/interview">
              Start New Interview
            </Button>
          </div>

          {loading && <p className="text-text-secondary">Loading...</p>}
          {error && <p className="text-red-400">{error}</p>}

          {!loading && !error && sessions.length === 0 && (
            <Card className="px-6 py-10 text-center">
              <p className="text-text-secondary">
                No interviews yet. Start one to see it show up here.
              </p>
            </Card>
          )}

          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {sessions.map((s) => (
              <Card
                key={s.id}
                as={Link}
                to={`/result?session=${s.id}`}
                interactive
                variants={fadeUp}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <p className="font-medium text-text-primary">{s.role}</p>
                  <p className="text-sm text-text-secondary">
                    {s.started_at ? new Date(s.started_at).toLocaleString() : "Unknown date"}
                    {" · "}
                    {s.level}
                    {" · "}
                    {s.question_count} question{s.question_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-text-primary">
                    {s.overall_score ?? "-"}
                    <span className="text-sm text-text-tertiary"> /10</span>
                  </p>
                  <p className="text-sm text-text-secondary">{s.recommendation || "In progress"}</p>
                </div>
              </Card>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
