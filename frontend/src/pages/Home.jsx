import { useEffect, useState } from "react";
import { getHealth } from "../services/api";

export default function Home() {
  const [status, setStatus] = useState("Checking backend...");

  useEffect(() => {
    getHealth()
      .then(data => setStatus(data.status))
      .catch(() => setStatus("Backend not reachable ❌"));
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-extrabold text-green-400">
        AI Interview Coach 🚀
      </h1>

      <p className="text-lg text-white">
        Backend Status:
        <span className="ml-2 text-cyan-400">{status}</span>
      </p>
    </div>
  );
}
