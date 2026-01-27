import { useState, useRef } from "react";

const API = "http://127.0.0.1:8000";

let mediaRecorder = null;
let audioChunks = [];

export default function Interview() {
  /* ---------------- STATE ---------------- */
  const [role, setRole] = useState("aiml");
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState("");
  const [questionCount, setQuestionCount] = useState(0);

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [finalSummary, setFinalSummary] = useState(null);

  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);

  /* ---------------- VIDEO ---------------- */
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  /* ---------------- AUDIO ---------------- */
  const playInterviewer = () => {
  const audio = new Audio(`${API}/interview/audio?ts=${Date.now()}`);
  audio.play().catch(() => {
    console.warn("Audio autoplay blocked");
  });
};


  /* ---------------- START INTERVIEW ---------------- */
  const startInterview = async () => {
  if (starting) return;

  // ✅ MUST be first line
  document.documentElement.requestFullscreen?.();

  setStarting(true);

  try {
    const res = await fetch(`${API}/interview/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    const data = await res.json();

    setSessionId(data.session_id);
    setQuestion(data.question);
    setQuestionCount(1);

    // Camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;

    await playInterviewer();
  } catch (e) {
    alert("Failed to start interview.");
  } finally {
    setStarting(false);
  }
};


  /* ---------------- RECORDING ---------------- */
  const startRecording = async () => {
    if (recording) return;

    audioChunks = [];
    setRecording(true);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.start();
  };

  const stopRecording = async () => {
    if (!mediaRecorder) return;

    setRecording(false);
    mediaRecorder.stop();

    mediaRecorder.onstop = async () => {
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(audioChunks, { type: "audio/wav" });
      const formData = new FormData();
      formData.append("file", blob);

      const res = await fetch(`${API}/interview/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setAnswer(data.text || "");
    };
  };

  /* ---------------- SUBMIT ANSWER ---------------- */
  const submitAnswer = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API}/interview/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          question,
          answer,
        }),
      });

      const data = await res.json();

      // Repeat question flow
      if (data.repeat) {
        await playInterviewer();
        setSubmitting(false);
        return;
      }

      setFeedback(data.evaluation);
      setAnswer("");

      if (data.next_question) {
        setQuestion(data.next_question);
        setQuestionCount((c) => c + 1);
        await playInterviewer();
      }
    } catch {
      alert("Failed to submit answer.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- END INTERVIEW ---------------- */
  const endInterview = async () => {
  try {
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Exit fullscreen
    document.exitFullscreen?.();

    // Fetch final scorecard
    const res = await fetch(`${API}/interview/final/${sessionId}`);
    const data = await res.json();

    setFinalSummary(data.summary);

    // 🔑 EXIT INTERVIEW MODE
    setSessionId(null);
    setQuestion("");
    setQuestionCount(0);
    setAnswer("");
    setFeedback(null);
  } catch {
    alert("Failed to load final scorecard.");
  }
};

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-black text-white p-6">
      {!sessionId && (
        <div className="flex gap-4">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="text-black p-2 rounded"
          >
            <option value="aiml">AI / ML Engineer</option>
            <option value="software">Software Engineer</option>
          </select>

          <button
            onClick={startInterview}
            disabled={starting}
            className="bg-green-500 px-6 py-2 rounded text-black disabled:opacity-50"
          >
            {starting ? "Starting..." : "Start Interview"}
          </button>
        </div>
      )}

      {sessionId && (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-96 rounded border mb-6"
          />

          <p className="text-gray-400 mb-2">
            Question {questionCount}
          </p>

          <div className="flex gap-4 items-center">
            <button
              onClick={startRecording}
              disabled={recording}
              className="bg-yellow-400 px-4 py-2 rounded text-black disabled:opacity-50"
            >
              🎙 Start Answer
            </button>

            <button
              onClick={stopRecording}
              disabled={!recording}
              className="bg-red-400 px-4 py-2 rounded text-black disabled:opacity-50"
            >
              ⏹ Stop
            </button>

            {recording && (
              <span className="text-red-400 font-semibold">
                🔴 Recording…
              </span>
            )}
          </div>

          <textarea
            className="w-2/3 mt-4 p-3 text-black rounded"
            rows={4}
            placeholder="(Optional) Type answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />

          <div className="mt-4">
            <button
              onClick={submitAnswer}
              disabled={submitting || !answer.trim()}
              className="bg-cyan-400 px-6 py-2 rounded text-black disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Answer"}
            </button>

            <button
              onClick={endInterview}
              className="ml-4 bg-purple-500 px-6 py-2 rounded text-black"
            >
              End Interview
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {finalSummary && (
        <div className="mt-10 bg-gray-900 p-6 rounded">
          <h2 className="text-2xl text-green-400 mb-4">
            Final Interview Scorecard
          </h2>
          <pre>{JSON.stringify(finalSummary, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
