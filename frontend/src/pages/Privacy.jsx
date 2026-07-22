import LegalLayout from "../components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="the day you deploy this">
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
          <strong>Google Gemini</strong> processes the text of interview questions and
          your transcribed answers to generate follow-up questions and scores.
        </li>
        <li>
          <strong>Speech-to-text</strong> transcription of your spoken answers currently
          runs locally on our server, not a third party.
        </li>
        <li>
          <strong>Text-to-speech</strong> sends question text to a Google service to
          generate the spoken audio you hear.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Your interview history is kept so you can track progress over time, until you
        delete it yourself.
      </p>

      <h2>Your controls</h2>
      <p>
        You can view your past interviews at any time under "My Interviews," and
        permanently delete your account and all associated interview history from
        Settings. Deletion is immediate and cannot be undone.
      </p>

      <h2>Contact</h2>
      <p>Questions about this policy? Reach out at support@example.com.</p>
    </LegalLayout>
  );
}
