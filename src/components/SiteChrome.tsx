import { Link, useLocation } from "@tanstack/react-router";
import { Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/cv-builder", label: "CV Builder" },
  { to: "/find-jobs", label: "Find Jobs" },
  { to: "/interview-coach", label: "Interview" },
  { to: "/cv-check", label: "CV Check" },
  { to: "/career-quiz", label: "Quiz" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const onLanding = loc.pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-sun shadow-glow">
            <Sparkles className="h-5 w-5 text-primary" />
          </span>
          JobGenie
        </Link>

        {!onLanding && (
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
                activeProps={{ className: "bg-primary-soft text-primary" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {onLanding ? (
          <Button asChild variant="gold" size="sm">
            <Link to="/onboard">Start Free</Link>
          </Button>
        ) : (
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-xl p-2 text-foreground hover:bg-primary-soft md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
      </div>

      {!onLanding && open && (
        <nav className="border-t border-border/60 bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-2">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-primary-soft hover:text-primary"
                activeProps={{ className: "bg-primary-soft text-primary" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/60 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <Sparkles className="h-5 w-5" />
            </span>
            JobGenie
          </div>
          <p className="mt-3 text-sm text-primary-foreground/70">
            Your AI career assistant. Built for South African youth, by people who believe in you.
          </p>
        </div>
        <div>
          <h4 className="font-display text-sm font-bold uppercase tracking-wider text-accent">Tools</h4>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/cv-builder" className="hover:text-accent">CV Builder</Link></li>
            <li><Link to="/find-jobs" className="hover:text-accent">Find Jobs</Link></li>
            <li><Link to="/interview-coach" className="hover:text-accent">Interview Coach</Link></li>
            <li><Link to="/cv-check" className="hover:text-accent">CV Check</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-bold uppercase tracking-wider text-accent">Discover</h4>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/career-quiz" className="hover:text-accent">Career Quiz</Link></li>
            <li><Link to="/dashboard" className="hover:text-accent">Dashboard</Link></li>
            <li><Link to="/onboard" className="hover:text-accent">Get Started</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-bold uppercase tracking-wider text-accent">Believe</h4>
          <p className="mt-3 text-sm italic text-primary-foreground/80">
            "I am because we are." — Ubuntu
          </p>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 px-4 py-4 text-center text-xs text-primary-foreground/60">
        © {new Date().getFullYear()} JobGenie · Made with care for African youth
      </div>
    </footer>
  );
}
