"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, LoaderCircle, LogIn, LogOut, UserRound, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";

export function AuthPanel() {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(configured);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const triggerButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);

  const openPanel = useCallback(() => {
    setIsOpen(true);
    setMessage(null);
    setError(null);
  }, []);

  const closePanel = useCallback(() => {
    if (isSubmitting) return;
    setIsOpen(false);
    setError(null);
    window.requestAnimationFrame(() => triggerButton.current?.focus());
  }, [isSubmitting]);

  useEffect(() => {
    if (!isOpen) return;
    if (user) closeButton.current?.focus();
    else emailInput.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) closePanel();
      if (event.key !== "Tab") return;
      const focusable = dialog.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closePanel, isOpen, isSubmitting, user]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    let active = true;
    void client.auth.getUser().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError("We couldn't check your sign-in status. Please reopen this panel.");
      setUser(data.user);
      setIsLoading(false);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!configured) {
      setError("Add the Supabase URL and publishable key to .env.local, then restart the dev server.");
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Supabase authentication is not configured.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error: authError } = await client.auth.signUp({ email: email.trim(), password });
        if (authError) throw authError;
        if (data.session && data.user) {
          setUser(data.user);
          setMessage("Your account is ready. You’re signed in.");
        } else {
          setMessage("Check your email for a confirmation link to finish creating your account.");
        }
      } else {
        const { data, error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        setUser(data.user);
        setMessage("You’re signed in.");
      }
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const { error: authError } = await client.auth.signOut();
      if (authError) throw authError;
      setUser(null);
      setMessage("You’re signed out.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't sign you out. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button ref={triggerButton} className="account-button" onClick={openPanel} disabled={isLoading} aria-haspopup="dialog">
        {user ? <UserRound size={14} /> : <LogIn size={14} />}
        <span>{user ? user.email : "Sign in"}</span>
      </button>
      {isOpen && (
        <div className="auth-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
          <section ref={dialog} className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button ref={closeButton} className="auth-close" aria-label="Close sign-in panel" onClick={closePanel} disabled={isSubmitting}><X size={17} /></button>
            <div className="auth-brand-mark"><UserRound size={18} /></div>
            <div className="auth-heading">
              <h2 id="auth-title">{user ? "Your account" : mode === "signin" ? "Welcome back" : "Create your account"}</h2>
              <p>{user ? user.email : "Sign in to your PromptPilot account."}</p>
            </div>

            {user ? (
              <div className="auth-account">
                <div className="auth-notice"><Check size={15} /> You’re signed in with Supabase.</div>
                <p className="auth-local-note">Project plans are still saved in this browser only. Cloud project sync has not been connected yet.</p>
                <button className="secondary-button auth-submit" onClick={signOut} disabled={isSubmitting}>
                  {isSubmitting ? <LoaderCircle size={15} className="animate-spin" /> : <LogOut size={15} />}
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <div className="auth-tabs" role="tablist" aria-label="Authentication options">
                  <button className={mode === "signin" ? "selected" : ""} role="tab" aria-selected={mode === "signin"} onClick={() => { setMode("signin"); setError(null); setMessage(null); }}>Sign in</button>
                  <button className={mode === "signup" ? "selected" : ""} role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(null); setMessage(null); }}>Create account</button>
                </div>
                <form className="auth-form" onSubmit={submit}>
                  <label htmlFor="auth-email">Email</label>
                  <input ref={emailInput} id="auth-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                  <label htmlFor="auth-password">Password</label>
                  <input id="auth-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
                  <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <><LoaderCircle size={15} className="animate-spin" /> Please wait...</> : mode === "signin" ? "Sign in" : "Create account"}
                  </button>
                </form>
              </>
            )}

            {message && <div className="auth-notice" role="status"><Check size={15} />{message}</div>}
            {error && <div className="auth-error" role="alert">{error}</div>}
            {!user && <p className="auth-local-note">Signing in won’t sync project plans yet; they remain saved in this browser.</p>}
          </section>
        </div>
      )}
    </>
  );
}
