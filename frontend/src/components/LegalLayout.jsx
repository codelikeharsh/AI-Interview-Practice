import { Link } from "react-router-dom";

export default function LegalLayout({ title, updated, children }) {
  return (
    <div className="min-h-screen px-6 py-12 text-text-primary">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm text-accent hover:text-accent-hover transition">
          ← Back to home
        </Link>

        <h1 className="mb-1 mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
        {updated && <p className="mb-8 text-sm text-text-tertiary">Last updated {updated}</p>}

        <div className="mb-10 rounded-lg border border-border bg-surface px-5 py-4 text-sm text-text-secondary">
          This document is not legal advice and has not been reviewed by a lawyer. If
          you have concerns about how the Service handles your data or your rights as a
          user, reach out using the contact details below.
        </div>

        <div className="space-y-6 leading-relaxed text-text-secondary [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-text-primary [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          {children}
        </div>
      </div>
    </div>
  );
}
