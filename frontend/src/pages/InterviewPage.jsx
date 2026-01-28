import { useState } from "react";
import InterviewSetup from "./InterviewSetup";
import Interview from "./Interview";


export default function InterviewPage() {
  const [config, setConfig] = useState(null);

  return (
    <>
      {!config && (
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
