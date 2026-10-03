"use client";
import DateInput from "./date-input";
import { formatDate } from "@/lib/dates";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Heart, Check } from "lucide-react";
import { State } from "@/lib/model";
export default function Onboarding({
  initial,
  busy,
  error,
  complete,
}: {
  initial: State;
  busy: boolean;
  error: string;
  complete: (s: State, email: string) => Promise<void>;
}) {
  const [step, setStep] = useState(0),
    [draft, setDraft] = useState(initial),
    [email, setEmail] = useState("");
  const set = (key: string, value: string | number) =>
    setDraft({ ...draft, event: { ...draft.event, [key]: value } });
  return (
    <div className="onboarding-shell">
      <div className="onboarding-art">
        <div className="brand">
          <Heart /> Agapē
        </div>
        <div className="onboarding-orbit">
          <i />
          <i />
          <Heart size={60} />
        </div>
        <h1>A beautiful beginning.</h1>
        <p>Your people. Your plans. Your way.</p>
      </div>
      <section className="card onboarding-card">
        <div className="step-dots">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i <= step ? "current" : ""} />
          ))}
        </div>
        <small>STEP {step + 1} OF 3</small>
        <h2>
          {
            [
              "Let’s start with you.",
              "What are you dreaming of?",
              "Better, together.",
            ][step]
          }
        </h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (step < 2) setStep(step + 1);
            else await complete(draft, email);
          }}
        >
          {step === 0 && (
            <>
              <div className="form-grid">
                <label>
                  Your name
                  <input
                    required
                    autoFocus
                    value={draft.event.partner_one}
                    onChange={(e) => set("partner_one", e.target.value)}
                  />
                </label>
                <label>
                  Your partner’s name
                  <input
                    required
                    value={draft.event.partner_two}
                    onChange={(e) => set("partner_two", e.target.value)}
                  />
                </label>
              </div>
              <label>
                Celebration
                <select
                  value={draft.event.mode}
                  onChange={(e) => set("mode", e.target.value)}
                >
                  <option value="wedding">Wedding</option>
                  <option value="engagement">Engagement</option>
                </select>
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <label>
                A date you’re hoping for{" "}
                <span className="optional">Optional</span>
                <DateInput
                  value={draft.event.date || ""}
                  onChange={(e) => set("date", e)}
                />
              </label>
              <label>
                Budget to start with (USD)
                <input
                  type="number"
                  min="0"
                  required
                  value={draft.event.budget}
                  onChange={(e) => set("budget", +e.target.value)}
                />
              </label>
              <label>
                Venue <span className="optional">Optional</span>
                <input
                  value={draft.event.venue}
                  onChange={(e) => set("venue", e.target.value)}
                  placeholder="Still exploring? Leave this blank."
                />
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <p className="muted">
                Invite your partner to plan with you. You’ll share the same
                guests, seating, budget, and details.
              </p>
              <label>
                Partner’s email <span className="optional">Optional</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@example.com"
                />
              </label>
              <div className="setup-summary">
                <Check size={16} />
                <span>
                  {draft.event.partner_one} & {draft.event.partner_two}
                  <small>
                    {draft.event.mode === "wedding" ? "Wedding" : "Engagement"}{" "}
                    · {formatDate(draft.event.date) || "Date to be decided"}
                  </small>
                </span>
              </div>
              <small>
                You’ll get a private invitation link to send them. You can also
                invite them later.
              </small>
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="onboarding-actions">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Setting up…"
                : step === 2
                  ? "Open our planner"
                  : "Continue"}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
