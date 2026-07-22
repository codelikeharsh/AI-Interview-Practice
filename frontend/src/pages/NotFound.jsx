import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-text-primary">
      <Card className="w-full max-w-sm p-8 text-center">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-accent">404</h1>
        <p className="mb-6 text-sm text-text-secondary">
          This page doesn't exist, or you don't have access to it.
        </p>
        <Button as={Link} to="/">
          Back to Home
        </Button>
      </Card>
    </div>
  );
}
