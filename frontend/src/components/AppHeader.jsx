import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Button from "./ui/Button";
import logoIcon from "../assets/brand/icon-512.png";

export default function AppHeader({ extraLinks }) {
  const { user, logout } = useAuth();

  return (
    <nav className="relative z-10 border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link to="/" className="flex items-center gap-2 text-base font-semibold tracking-tight text-text-primary">
          <img src={logoIcon} alt="" className="h-5 w-auto" />
          Anteroom
        </Link>

        <div className="flex items-center gap-6 text-sm text-text-secondary">
          {extraLinks}

          <Link to="/questions" className="hover:text-text-primary transition">
            Question Bank
          </Link>

          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/history" className="hover:text-text-primary transition">
                My Interviews
              </Link>
              <Link to="/settings" className="hover:text-text-primary transition">
                Settings
              </Link>
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-6 w-6 rounded-full border border-border"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="text-text-secondary">{user.name}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={logout}>
                Sign out
              </Button>
            </div>
          ) : (
            <Button as={Link} to="/login" variant="secondary" size="sm">
              Sign in
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
