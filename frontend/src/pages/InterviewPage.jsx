import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import InterviewSetup from "./InterviewSetup";
import Interview from "./Interview";


export default function InterviewPage() {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const isDemo = searchParams.get("demo") === "true";
  const demoConfig = isDemo
    ? {
        role: "Software Engineer (Demo)",
        topics: ["DSA", "OOP", "System Design"],
        level: "fresher",
        duration: 5,
        demo: true,
      }
    : null;
  const [config, setConfig] = useState(demoConfig);

  if (!isDemo) {
    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center text-text-secondary">
          Loading...
        </div>
      );
    }
    if (!user) {
      return <Navigate to="/login" replace />;
    }
  }

  return (
    <>
      {!config && !isDemo && (
        <InterviewSetup
          onStart={(cfg) => {
            setConfig(cfg); // save interview config
          }}
          onCancel={() => {
            window.history.back(); // go back to home
          }}
        />
      )}

      {config && <Interview config={config} />}
    </>
  );
}
