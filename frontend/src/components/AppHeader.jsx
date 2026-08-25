import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Button from "./ui/Button";
import logoIcon from "../assets/brand/icon-512.png";

function IconMenu({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconClose({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}

export default function AppHeader({ extraLinks }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="relative z-20 border-b border-border print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link to="/" className="flex items-center gap-2 text-base font-semibold tracking-tight text-text-primary">
          <img src={logoIcon} alt="" className="h-5 w-auto" />
          Anteroom
        </Link>

        {/* Desktop nav - unchanged layout/classes from before, just gated to md+ */}
        <div className="hidden items-center gap-6 text-sm text-text-secondary md:flex">
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

        {/* Mobile: hamburger toggle */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="text-text-secondary hover:text-text-primary md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <IconClose className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <div className="border-t border-border bg-bg px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4 text-sm text-text-secondary">
            {extraLinks}

            <Link to="/questions" className="hover:text-text-primary transition" onClick={closeMenu}>
              Question Bank
            </Link>

            {user ? (
              <>
                <Link to="/history" className="hover:text-text-primary transition" onClick={closeMenu}>
                  My Interviews
                </Link>
                <Link to="/settings" className="hover:text-text-primary transition" onClick={closeMenu}>
                  Settings
                </Link>
                <div className="flex items-center gap-2 border-t border-border pt-4">
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
                <Button
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <Button as={Link} to="/login" variant="secondary" size="sm" className="self-start" onClick={closeMenu}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
