import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppHeader from "../components/AppHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useAuth } from "../context/useAuth";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function Settings() {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const canDelete = confirmText.trim().toLowerCase() === (user?.email || "").toLowerCase();

  const handleDelete = async () => {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteAccount();
      navigate("/");
    } catch {
      setError("Something went wrong deleting your account. Please try again.");
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen text-text-primary">
      <AppHeader />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex justify-center px-6 pb-16"
      >
        <div className="w-full max-w-2xl space-y-8 pt-10">
          <motion.h1 variants={fadeUp} className="text-3xl font-semibold tracking-tight">Settings</motion.h1>

          {/* PROFILE */}
          <Card variants={fadeUp} className="p-8">
            <h2 className="mb-4 text-lg font-semibold">Profile</h2>
            <div className="flex items-center gap-4">
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-16 w-16 rounded-full border border-border"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <p className="font-medium text-text-primary">{user.name}</p>
                <p className="text-sm text-text-secondary">{user.email}</p>
              </div>
            </div>
          </Card>

          {/* DANGER ZONE */}
          <Card variants={fadeUp} className="border-red-500/30 bg-red-500/[0.03] p-8">
            <h2 className="mb-2 text-lg font-semibold text-red-300">Danger Zone</h2>
            <p className="mb-5 text-sm text-text-secondary">
              Permanently delete your account and every interview you've ever run. This
              cannot be undone.
            </p>

            <label className="mb-2 block text-sm text-text-secondary">
              Type <span className="font-medium text-text-primary">{user.email}</span> to confirm
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={user.email}
              className="mb-4 w-full rounded-lg border border-border bg-surface px-4 py-2
                text-text-primary placeholder-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-red-400/50"
            />

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            <Button variant="danger" onClick={handleDelete} disabled={!canDelete || deleting}>
              {deleting ? "Deleting…" : "Permanently Delete Account"}
            </Button>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
