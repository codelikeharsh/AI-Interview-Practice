import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import InterviewSetup from "./InterviewSetup";
import Interview from "./Interview";


export default function InterviewPage() {
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const demoConfig = isDemo
    ? {
        role: "Software Engineer (Demo)",
        topics: ["DSA", "OOP", "System Design"],
        level: "fresher",
        duration: 5,
      }
    : null;
  const [config, setConfig] = useState(demoConfig);

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
