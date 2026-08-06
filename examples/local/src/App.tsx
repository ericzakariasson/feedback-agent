import { useFeedback } from "feedback-agent/react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";
type Route = "settings" | "account";

const THEME_KEY = "fw-example-theme";

function initialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const stored = document.documentElement.dataset.theme;
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function routeFromHash(): Route {
  return typeof location !== "undefined" && location.hash === "#account" ? "account" : "settings";
}

export function App() {
  const { track, open, captureScreenshot } = useFeedback();
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [dryRun, setDryRun] = useState<boolean | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [profile, setProfile] = useState({
    name: "Ada Example",
    email: "ada@example.test",
    password: "hunter2-demo",
    notes: "Office hours are masked in session replay.",
  });
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const sync = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    void fetch("/api/health")
      .then((response) => response.json())
      .then((body: { dryRun?: boolean }) => setDryRun(body.dryRun !== false))
      .catch(() => setDryRun(true));
  }, []);

  return (
    <div className="app">
      {dryRun !== false ? (
        <p className="banner" role="status">
          Local dry-run — reports stay on this machine. No Cursor agent is launched.
        </p>
      ) : (
        <p className="banner" role="status">
          Live dispatch is on. Actionable reports can open a pull request.
        </p>
      )}
      <nav className="nav" aria-label="Example">
        <a href="#settings" className={route === "settings" ? "active" : undefined}>
          Settings
        </a>
        <a href="#account" className={route === "account" ? "active" : undefined}>
          Account
        </a>
        <span className="nav-spacer" />
        <button
          type="button"
          className="secondary"
          onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </nav>
      <main className="page">
        {route === "settings" ? (
          <>
            <header className="top">
              <div>
                <h1>Settings</h1>
                <p className="lede">
                  Click around, switch pages, then send feedback. Session replay, breadcrumbs, and
                  errors are captured locally.
                </p>
              </div>
            </header>
            <section className="card">
              <h2>Plan</h2>
              <p>Switching plans is intentionally a little awkward so you have something to report.</p>
              <button
                type="button"
                onClick={() => {
                  track("save_plan_clicked", { plan: "pro" });
                  setSaved(true);
                  window.setTimeout(() => {
                    throw new Error("Cannot read properties of undefined (reading 'plan')");
                  }, 0);
                }}
              >
                Save plan
              </button>
              {saved ? <p className="muted">Clicked save — an error was also thrown for capture.</p> : null}
            </section>
            <section className="card">
              <h2>Custom hook</h2>
              <p className="muted">
                Same widget, opened from <code>useFeedback()</code>. Capture attaches the current
                viewport, then opens the form.
              </p>
              <div className="actions">
                <button type="button" className="secondary" onClick={open}>
                  Open feedback
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={capturing}
                  onClick={() => {
                    setCapturing(true);
                    void captureScreenshot().finally(() => {
                      setCapturing(false);
                      open();
                    });
                  }}
                >
                  {capturing ? "Capturing…" : "Capture page & open"}
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            <header className="top">
              <div>
                <h1>Account</h1>
                <p className="lede">
                  Email and password fields are masked in replay. Save, then report feedback from
                  another screen.
                </p>
              </div>
            </header>
            <form
              className="card"
              onSubmit={(event) => {
                event.preventDefault();
                track("profile_saved", { hasNotes: Boolean(profile.notes.trim()) });
                setProfileSaved(true);
              }}
            >
              <h2>Profile</h2>
              <label>
                Name
                <input
                  value={profile.name}
                  onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={profile.email}
                  onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={profile.password}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>
              <label>
                Notes
                <textarea
                  rows={3}
                  value={profile.notes}
                  onChange={(event) => setProfile((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <button type="submit">Save profile</button>
              {profileSaved ? <p className="muted">Saved locally. Open feedback to include this session.</p> : null}
            </form>
          </>
        )}
      </main>
    </div>
  );
}
