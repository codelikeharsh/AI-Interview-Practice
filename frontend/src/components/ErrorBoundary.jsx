import { Component } from "react";
import Card from "./ui/Card";
import Button from "./ui/Button";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Unhandled render error:", error, info);
    // Hook point for real error tracking later (Sentry, etc.) - mirrors
    // the SENTRY_DSN stub on the backend.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-6 text-text-primary">
          <Card className="w-full max-w-sm p-8 text-center">
            <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
            <p className="mb-6 text-sm text-text-secondary">
              An unexpected error occurred. Reloading usually fixes it.
            </p>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
