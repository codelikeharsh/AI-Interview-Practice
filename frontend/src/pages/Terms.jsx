import LegalLayout from "../components/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Terms & Conditions" updated="the day you deploy this">
      <p>
        These terms govern your use of Anteroom, an AI mock interview coach ("the Service"). By creating an
        account or starting an interview, you agree to them.
      </p>

      <h2>What the Service does</h2>
      <p>
        The Service runs simulated technical interviews using an AI interviewer. It asks
        questions, listens to your spoken answers, evaluates them, and shows you a
        performance scorecard. It is a practice tool, not a real interview, a hiring
        decision, or professional career advice.
      </p>

      <h2>Your account</h2>
      <p>
        You sign in with Google. You're responsible for keeping access to that account
        secure. We may suspend accounts that abuse the Service (for example, deliberately
        overloading the system).
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don't use the Service to harass, abuse, or send unlawful content.</li>
        <li>Don't attempt to reverse engineer, scrape, or overload the Service.</li>
        <li>Don't rely on the Service's feedback as a substitute for professional advice.</li>
      </ul>

      <h2>No guarantees</h2>
      <p>
        The Service is provided "as is." AI-generated questions and feedback can be
        wrong, incomplete, or occasionally low quality. We don't guarantee availability,
        accuracy, or that practicing here will lead to any particular real-world outcome.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can delete your account and all associated interview history at any time from
        Settings. We can also suspend or terminate accounts that violate these terms.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms as the Service changes. Continuing to use the Service
        after an update means you accept the revised terms.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms? Reach out at support@example.com.</p>
    </LegalLayout>
  );
}
