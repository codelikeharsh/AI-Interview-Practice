import LegalLayout from "../components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="August 26, 2026">
      <p>
        This describes what data Anteroom, an AI mock interview coach ("the Service"), collects, why, and
        what control you have over it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Google account info</strong> — your name, email address, and profile
          picture, when you sign in with Google.
        </li>
        <li>
          <strong>Interview content</strong> — the questions asked, your transcribed
          spoken answers, and the resulting scores/feedback for each session you run.
        </li>
        <li>
          <strong>Resume content</strong> — if you use resume-based interviews, the text
          extracted from your uploaded resume (name, skills, experience, education) is
          sent to our AI provider to build that interview's questions. The file itself
          and its extracted text are not stored after the interview is generated — they
          exist only for the duration of that request.
        </li>
        <li>
          <strong>Session cookie</strong> — a signed, httpOnly cookie that keeps you
          signed in. It contains no personal data itself, just a reference to your
          account.
        </li>
      </ul>

      <h2>What we don't collect</h2>
      <p>
        Your camera video is processed entirely in your browser (used only to give you
        live feedback on webcam framing) and is never uploaded, transmitted, or stored
        anywhere. We don't use third-party ad trackers or sell your data to anyone.
      </p>

      <h2>Third parties involved in running an interview</h2>
      <ul>
        <li>
          <strong>Groq</strong> processes the text of interview questions, your
          transcribed answers, and (for resume-based interviews) your resume text, to
          generate questions, scores, and feedback. Groq also transcribes your recorded
          audio answers into text.
        </li>
        <li>
          <strong>Microsoft Edge TTS</strong> converts question text into the spoken
          audio you hear during an interview.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Your interview history is kept so you can track progress over time, until you
        delete it yourself. Resume files and their extracted text are not retained past
        the interview they were used to generate.
      </p>

      <h2>Your controls</h2>
      <p>
        You can view your past interviews at any time under "My Interviews," and
        permanently delete your account and all associated interview history from
        Settings. Deletion is immediate and cannot be undone.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Reach out at{" "}
        <a href="mailto:hello@zero2one.live" className="text-accent hover:text-accent-hover underline">
          hello@zero2one.live
        </a>
        .
      </p>
    </LegalLayout>
  );
}
