import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Card from "../components/ui/Card";

export default function Login() {
  const { user, loading, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expired = searchParams.get("expired") === "1";
  const [error, setError] = useState("");

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-text-primary">
      <Card className="w-full max-w-sm p-8 text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-xl font-semibold tracking-tight">
          <span className="h-2 w-2 rounded-full bg-accent" />
          Anteroom
        </div>
        <p className="mb-8 text-sm text-text-secondary">
          Sign in to start practicing your AI mock interview and track your progress over time.
        </p>

        {expired && (
          <p className="mb-6 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Your session expired. Please sign in again.
          </p>
        )}

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                setError("");
                await loginWithGoogle(credentialResponse.credential);
                navigate("/");
              } catch {
                setError("Sign-in failed. Please try again.");
              }
            }}
            onError={() => setError("Sign-in failed. Please try again.")}
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </Card>
    </div>
  );
}
