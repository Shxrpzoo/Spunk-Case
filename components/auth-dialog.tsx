"use client";
import { useState } from "react";
import { X, LockKeyhole, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
export function AuthDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [create, setCreate] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="modal-backdrop">
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          className="icon-button close"
          onClick={onClose}
          aria-label="Close sign in"
        >
          <X />
        </button>
        <span className="eyebrow">
          <LockKeyhole size={14} /> FRIENDS ONLY
        </span>
        <h2 id="auth-title">WHO ARE YOU?</h2>
        <p>Your name. Your collection. Your little empire.</p>
        <div className="segmented">
          <button
            className={!create ? "selected" : ""}
            onClick={() => setCreate(false)}
          >
            Welcome back
          </button>
          <button
            className={create ? "selected" : ""}
            onClick={() => setCreate(true)}
          >
            New player
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              await api("auth", {
                name: f.get("name"),
                passcode: f.get("passcode"),
                invite: f.get("invite") ?? "",
                create,
              });
              onSuccess();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Player name
            <input
              name="name"
              minLength={2}
              maxLength={30}
              required
              autoComplete="username"
              autoFocus
            />
          </label>
          <label>
            Passcode
            <input
              name="passcode"
              type="password"
              minLength={6}
              maxLength={128}
              required
              autoComplete={create ? "new-password" : "current-password"}
              placeholder="At least 6 characters"
            />
          </label>
          {create && (
            <label>
              Friends invite code
              <input
                name="invite"
                type="password"
                required
                autoComplete="off"
              />
            </label>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary full" disabled={busy}>
            {busy
              ? "Signing in…"
              : create
                ? "Create my player"
                : "Back to my collection"}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="micro">
          {create
            ? "Keep your passcode safe. Use the same name and passcode on any device."
            : "Progress is saved to your player. Forgotten your passcode? Ask the owner to reset it."}
        </p>
      </section>
    </div>
  );
}
