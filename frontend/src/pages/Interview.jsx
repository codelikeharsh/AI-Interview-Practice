import { useState } from "react";

/**
 * Backend base URL
 */
const API = "http://127.0.0.1:8000";

/**
 * MediaRecorder references (outside component to persist across renders)
 */
let mediaRecorder = null;
let audioChunks = [];

export default function Interview() {
  /* ---------------- STATE ---------------- */

  // Interview flow
  const [role, setRole] = useState("aiml");
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState("");
  const [questionCount, setQuestionCount] = useState(0);

  // Answer & feedback
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);

  // Speech analysis
  const [speechConfidence, setSpeechConfidence] = useState(null);

  // Final scorecard
  const [finalSummary, setFinalSummary] = useState(null);

  // UI control flags
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ---------------- START INTERVIEW ---------------- */
  /**
   * Starts a new interview session.
   * Calls backend → generates first question.
   */
  const startInterview = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setFeedback(null);
      setFinalSummary(null);
      setAnswer("");
      setSpeechConfidence(null);

      const res = await fetch(`${API}/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      setSessionId(data.session_id);
      setQuestion(data.question);
      setQuestionCount(1);
    } catch (err) {
      alert("Failed to start interview.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SUBMIT ANSWER ---------------- */
  /**
   * Sends answer to backend → gets feedback + next question.
   */
  const submitAnswer = async () => {
    if (!answer.trim() || loading) return;

    try {
      setLoading(true);

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
      setFeedback(data.evaluation);
      setQuestion(data.next_question);
      setAnswer("");
      setSpeechConfidence(null);
      setQuestionCount((c) => c + 1);
    } catch (err) {
      alert("Failed to submit answer.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- AUDIO RECORDING ---------------- */
  /**
   * Starts microphone recording.
   */
  const startRecording = async () => {
    if (recording || loading) return;

    audioChunks = [];
    setRecording(true);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.start();
  };

  /**
   * Stops recording, sends audio to backend for:
   * Whisper transcription + speech confidence analysis.
   * VERY IMPORTANT: stops mic tracks to turn mic OFF.
   */
  const stopRecording = async () => {
    if (!mediaRecorder) return;

    setRecording(false);
    setLoading(true);

    mediaRecorder.stop();

    mediaRecorder.onstop = async () => {
      // 🔴 HARD STOP MIC
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());

      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      const formData = new FormData();
      formData.append("file", audioBlob);

      try {
        const res = await fetch(`${API}/interview/transcribe`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        setAnswer(data.text || "");
        setSpeechConfidence(data.confidence || null);
      } catch (err) {
        alert("Speech transcription failed.");
      } finally {
        setLoading(false);
      }
    };
  };

  /* ---------------- END INTERVIEW ---------------- */
  /**
   * Fetches final interview scorecard.
   */
  const endInterview = async () => {
    try {
      const res = await fetch(`${API}/interview/final/${sessionId}`);
      const data = await res.json();
      setFinalSummary(data.summary);
    } catch (err) {
      alert("Failed to load final scorecard.");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-black text-white p-10">
      <h1 className="text-4xl font-bold text-green-400 mb-6">
        AI Interview Coach
      </h1>

      {/* ROLE SELECTION */}
      {!sessionId && (
        <div className="flex items-center gap-4">
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
            disabled={loading}
            className="bg-green-500 px-6 py-2 rounded text-black disabled:opacity-50"
          >
            {loading ? "Starting..." : "Start Interview"}
          </button>
        </div>
      )}

      {/* QUESTION + ANSWER FLOW */}
      {sessionId && (
        <>
          <p className="mt-6 text-gray-400">Question {questionCount}</p>

          <p className="text-xl text-cyan-400 mt-2">{question}</p>

          {/* RECORD CONTROLS */}
          <div className="mt-4 flex gap-4">
            <button
              onClick={startRecording}
              disabled={recording || loading}
              className="bg-yellow-400 px-4 py-2 rounded text-black disabled:opacity-50"
            >
              🎙 Start Recording
            </button>

            <button
              onClick={stopRecording}
              disabled={!recording}
              className="bg-red-400 px-4 py-2 rounded text-black disabled:opacity-50"
            >
              ⏹ Stop Recording
            </button>
          </div>

          {/* ANSWER INPUT */}
          <textarea
            className="w-full mt-4 p-3 text-black rounded"
            rows={5}
            placeholder="Type or record your answer..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />

          {/* SPEECH CONFIDENCE */}
          {speechConfidence && (
            <div className="mt-4 bg-gray-800 p-4 rounded">
              <h3 className="text-green-300 font-semibold mb-2">
                Speech Confidence
              </h3>
              <p>Words: {speechConfidence.words}</p>
              <p>Speaking Rate: {speechConfidence.wpm} wpm</p>
              <p>
                Confidence Score: {speechConfidence.confidence_score} / 10
              </p>

              {speechConfidence.tips.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-sm text-gray-300">
                  {speechConfidence.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* SUBMIT */}
          <button
            onClick={submitAnswer}
            disabled={loading || !answer.trim()}
            className="mt-4 bg-cyan-400 px-6 py-2 rounded text-black disabled:opacity-50"
          >
            {loading ? "Processing..." : "Submit Answer"}
          </button>

          {/* END INTERVIEW */}
          <button
            onClick={endInterview}
            className="mt-4 ml-4 bg-purple-500 px-6 py-2 rounded text-black"
          >
            End Interview
          </button>
        </>
      )}

      {/* FEEDBACK */}
      {feedback && (
        <div className="mt-6 bg-gray-900 p-4 rounded">
          <h2 className="text-green-300 font-semibold mb-2">Feedback</h2>
          <pre className="text-sm whitespace-pre-wrap text-gray-200">
            {typeof feedback === "string"
              ? feedback
              : JSON.stringify(feedback, null, 2)}
          </pre>
        </div>
      )}

      {/* FINAL SCORECARD */}
      {finalSummary && (
        <div className="mt-10 bg-gray-900 p-6 rounded">
          <h2 className="text-2xl text-green-400 mb-4">
            Final Interview Scorecard
          </h2>

          <p>Overall Score: {finalSummary.overall_score} / 10</p>
          <p>Relevance: {finalSummary.avg_relevance}</p>
          <p>Clarity: {finalSummary.avg_clarity}</p>
          <p>Depth: {finalSummary.avg_depth}</p>
          <p>Speech Confidence: {finalSummary.avg_confidence}</p>

          <p className="mt-3 font-semibold text-cyan-400">
            Recommendation: {finalSummary.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}
