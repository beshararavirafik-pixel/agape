"use client";
import { fluidChange } from "@/lib/motion";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Heart,
  LayoutDashboard,
  CheckSquare,
  Users,
  Wallet,
  Store,
  Palette,
  Images,
  CalendarDays,
  Clock,
  FileText,
  Armchair,
  Settings,
  Plus,
  ArrowUpRight,
  Check,
  Search,
  Menu,
  Download,
  Upload,
  X,
  Trash2,
} from "lucide-react";
import { supabase, configured, googleSignInAvailable } from "@/lib/supabase";
import { State, Guest, RecordItem, sample, uid } from "@/lib/model";
import Seating from "./seating";
import PhotoBoard from "./photo-board";
import DateInput from "./date-input";
import { loginErrorMessage } from "@/lib/auth-errors";
import { formatDate, parseDate } from "@/lib/dates";
import { savePlanningRecord } from "@/lib/vendor-budget";
import GuestList from "./guest-list";
import Overview from "./overview";
import WorkspaceMenu from "./workspace-menu";
import Ceremony from "./ceremony";
import { addFamily, relationships } from "@/lib/families";

import Onboarding from "./onboarding";
import Partner from "./partner";
import { palettes } from "@/lib/palettes";
const nav = [
  ["Overview", LayoutDashboard],
  ["Checklist", CheckSquare],
  ["Guests & RSVPs", Users],
  ["Seating studio", Armchair],
  ["Budget", Wallet],
  ["Church Ceremony", Heart],
  ["Vendors", Store],
  ["Design studio", Palette],
  ["Inspiration", Images],
  ["Planning timeline", CalendarDays],
  ["Wedding-day timeline", Clock],
  ["Notes & documents", FileText],
  ["Event settings", Settings],
] as const;
const kinds: Record<string, string> = {
  Checklist: "task",
  Budget: "budget",
  Vendors: "vendor",
  Inspiration: "inspiration",
  "Planning timeline": "timeline",
  "Wedding-day timeline": "day",
  "Notes & documents": "note",
};
const currency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
function emptyEvent(): State {
  const s = sample();
  return {
    ...s,
    event: {
      ...s.event,
      partner_one: "",
      partner_two: "",
      name: "Our celebration",
      venue: "",
      date: "",
    },
    guests: [],
    objects: [],
    seats: [],
    records: [],
  };
}
export default function Planner() {
  const [state, setState] = useState<State | null>(null),
    [page, setPage] = useState("Overview"),
    [mobile, setMobile] = useState(false),
    [user, setUser] = useState<string | null>(null),
    [demo, setDemo] = useState(!configured),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState(false),
    [authMode, setAuthMode] = useState("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [modal, setModal] = useState<"guest" | "record" | null>(null),
    [search, setSearch] = useState(""),
    [edit, setEdit] = useState<RecordItem | null>(null),
    [guestEdit, setGuestEdit] = useState<Guest | null>(null),
    [onboarding, setOnboarding] = useState(false),
    [inviteLink, setInviteLink] = useState("");
  const [googleAvailable, setGoogleAvailable] = useState(false);
  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    googleSignInAvailable(controller.signal)
      .then((available) => {
        if (!controller.signal.aborted) setGoogleAvailable(available);
      })
      .catch(() => {})
      .finally(() => window.clearTimeout(timeout));
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);
  const [topbarHidden, setTopbarHidden] = useState(false);
  useEffect(() => {
    let anchor = window.scrollY;
    let frame = 0;
    const track = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const current = Math.max(0, window.scrollY);
        const distance = current - anchor;
        if (current < 100) {
          setTopbarHidden(false);
          anchor = current;
        } else if (Math.abs(distance) >= 8) {
          setTopbarHidden(distance > 0);
          anchor = current;
        }
      });
    };
    window.addEventListener("scroll", track, { passive: true });
    return () => {
      window.removeEventListener("scroll", track);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  useEffect(() => {
    const readPage = () => {
      const requested = decodeURIComponent(location.hash.slice(1));
      const value = requested === "Flowers & décor" ? "Inspiration" : requested;
      setPage(nav.some(([name]) => name === value) ? value : "Overview");
      setSearch("");
      setMobile(false);
    };
    readPage();
    window.addEventListener("popstate", readPage);
    window.addEventListener("hashchange", readPage);
    return () => {
      window.removeEventListener("popstate", readPage);
      window.removeEventListener("hashchange", readPage);
    };
  }, []);
  function navigate(name: string) {
    if (name !== page)
      window.history.pushState(
        { page: name },
        "",
        "#" + encodeURIComponent(name),
      );
    fluidChange(() => {
      setPage(name);
      setSearch("");
      setMobile(false);
      window.scrollTo?.({ top: 0, behavior: "instant" });
    });
  }
  async function logout() {
    setMobile(false);
    if (demo) {
      setDemo(false);
      setState(null);
    } else if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) setError(error.message);
    }
  }
  const [familyDraft, setFamilyDraft] = useState<
    { name: string; relationship: string; existing_id?: string }[]
  >([]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const closeMenu = useCallback(() => setMobile(false), []);
  const editVersion = useRef(0);
  const authUser = useRef<string | null>(null);
  const dateLabel = (date: string) =>
    date
      ? new Date(date + "T12:00:00").toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        })
      : "Date undecided";
  useEffect(() => {
    const incomingInvite = new URLSearchParams(location.search).get("invite");
    if (incomingInvite)
      localStorage.setItem("ever-after-invite", incomingInvite);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((r) => r.unregister()))
        .catch(() => {});
    if (!supabase) {
      const saved = localStorage.getItem("ever-after-demo");
      try {
        setState(saved ? JSON.parse(saved) : sample());
      } catch {
        setState(sample());
      }
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      authUser.current = data.session?.user.id || null;
      setUser(authUser.current);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "PASSWORD_RECOVERY") setRecovery(true);
      const nextUser = session?.user.id || null;
      if (authUser.current !== nextUser) {
        setState(null);
        setDemo(false);
        authUser.current = nextUser;
        setUser(nextUser);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (user && !demo) {
      const token =
        new URLSearchParams(location.search).get("invite") ||
        localStorage.getItem("ever-after-invite");
      if (token) {
        supabase!
          .rpc("accept_partner_invite", { invite_token: token })
          .then(async ({ data, error }) => {
            if (error) {
              await load();
              setError(error.message);
            } else {
              localStorage.removeItem("ever-after-invite");
              history.replaceState({}, "", location.pathname);
              load(data);
            }
          });
      } else load();
    }
  }, [user, demo]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!demo && ["Unsaved changes", "Sync paused"].includes(message)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [demo, message]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    dialog?.querySelector<HTMLElement>("input,button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab" && dialog) {
        const items = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            "button,input,select,textarea,a[href]",
          ),
        ).filter((a) => !a.hasAttribute("disabled"));
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [modal]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "navigate_planning_section",
          description:
            "Open a planning section in the visible planner. This does not save or modify planning records.",
          inputSchema: {
            type: "object",
            properties: {
              section: { type: "string", enum: nav.map(([name]) => name) },
            },
            required: ["section"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute(input: unknown) {
            const section = (input as { section?: unknown })?.section;
            if (
              typeof section !== "string" ||
              !nav.some(([name]) => name === section)
            )
              throw new Error("Unknown planning section");
            window.history.pushState(
              { page: section },
              "",
              "#" + encodeURIComponent(section),
            );
            setPage(section);
            setSearch("");
            setMobile(false);
            return { section };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  useEffect(() => {
    if (
      !user ||
      demo ||
      !state ||
      onboarding ||
      busy ||
      message === "Unsaved changes" ||
      message === "Sync paused"
    )
      return;
    const timer = setInterval(async () => {
      const { data } = await supabase!
        .from("events")
        .select("revision")
        .eq("id", state.event.id)
        .single();
      if (data && data.revision !== revision) load(state.event.id);
    }, 4000);
    return () => clearInterval(timer);
  }, [user, demo, state?.event.id, revision, message, busy, onboarding]);
  useEffect(() => {
    if (
      !demo &&
      state &&
      !onboarding &&
      !busy &&
      message === "Unsaved changes"
    ) {
      const timer = setTimeout(() => save(), 1100);
      return () => clearTimeout(timer);
    }
  }, [state, demo, onboarding, busy, message, revision]);
  async function invitePartner(
    partnerEmail: string,
    eventId = state?.event.id,
  ) {
    if (!supabase || !eventId) return;
    const { data, error } = await supabase.rpc("create_partner_invite", {
      event_id: eventId,
      partner_email: partnerEmail,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setInviteLink(`${location.origin}/?invite=${encodeURIComponent(data)}`);
    navigate("Event settings");
  }
  async function finishSetup(draft: State, partnerEmail: string) {
    const next = {
      ...draft,
      event: {
        ...draft.event,
        name: `${draft.event.partner_one} & ${draft.event.partner_two}`,
      },
    };
    if (demo) {
      change(next);
      setOnboarding(false);
      return;
    }
    setBusy(true);
    setError("");
    const { data, error } = await supabase!.rpc("save_plan", {
      plan: next,
      expected_revision: 0,
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    setState({ ...next, event: { ...next.event, owner_id: user! } });
    setRevision(data);
    setMessage("All changes saved");
    setOnboarding(false);
    setBusy(false);
    if (partnerEmail) await invitePartner(partnerEmail, next.event.id);
  }
  async function load(eventId?: string, ignoreStored = false) {
    if (!supabase) return;
    setBusy(true);
    setError("");
    const atStart = editVersion.current;
    let query = supabase.from("events").select("*").order("date").limit(1);
    const selectedId =
      eventId || (!ignoreStored && localStorage.getItem("ea-active-" + user));
    if (selectedId) query = query.eq("id", selectedId);
    const { data: events, error: e } = await query;
    if (e) {
      setError(e.message);
      setBusy(false);
      return;
    }
    if (!events?.length && selectedId) {
      localStorage.removeItem("ea-active-" + user);
      return load(undefined, true);
    }
    if (!events?.length) {
      setState(emptyEvent());
      setOnboarding(true);
      setRevision(0);
      setBusy(false);
      return;
    }
    const ev = events[0];
    localStorage.setItem("ea-active-" + user, ev.id);
    const results = await Promise.all(
      [
        "guests",
        "floor_objects",
        "seats",
        "planning_records",
        "family_links",
      ].map((t) => supabase!.from(t).select("*").eq("event_id", ev.id)),
    );
    const err = results.find((r) => r.error)?.error;
    if (err) setError(err.message);
    else if (editVersion.current === atStart) {
      const { revision: r, ...event } = ev;
      event.date = event.date || "";
      setRevision(r);
      setMessage("All changes saved");
      setState({
        event,
        guests: results[0].data || [],
        objects: results[1].data || [],
        seats: results[2].data || [],
        records: results[3].data || [],
        family_links: results[4].data || [],
      });
    }
    setBusy(false);
  }
  function change(s: State) {
    if (state && s.event.date !== state.event.date) {
      s = {
        ...s,
        records: s.records.map((r) =>
          r.kind === "day" && r.date.includes("T")
            ? {
                ...r,
                date:
                  (s.event.date || state.event.date) +
                  "T" +
                  r.date.split("T")[1],
              }
            : r,
        ),
      };
    }
    editVersion.current++;
    setState(s);
    setMessage("Unsaved changes");
    if (demo) {
      try {
        localStorage.setItem("ever-after-demo", JSON.stringify(s));
        setMessage("Saved on this device");
      } catch {
        setError(
          "Device storage is full. Remove some photos or sign in to save your photo boards.",
        );
      }
    }
  }
  async function save() {
    if (!state || !supabase || demo) return;
    setBusy(true);
    setError("");
    const atStart = editVersion.current;
    const { data, error } = await supabase.rpc("save_plan", {
      plan: state,
      expected_revision: revision,
    });
    if (error) {
      setError(error.message);
      setMessage("Sync paused");
    } else {
      setRevision(data);
      setMessage(
        editVersion.current === atStart
          ? "All changes saved"
          : "Unsaved changes",
      );
    }
    setBusy(false);
  }
  async function googleLogin() {
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: location.origin,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) setError("Google sign-in could not start. Please try again.");
    } catch {
      setError("Google sign-in could not start. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function auth(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const result =
      authMode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: location.origin },
          })
        : authMode === "reset"
          ? await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: location.origin,
            })
          : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setError(loginErrorMessage(result.error, authMode));
    else if (authMode !== "login")
      setMessage(
        authMode === "signup"
          ? "Check your email to confirm your account."
          : "Check your email for a password reset link.",
      );
    setBusy(false);
  }
  function beginRecord(r?: RecordItem) {
    setEdit(r || null);
    setModal("record");
  }
  async function fileUpload(file: File) {
    if (!supabase || !state || demo) {
      setError("Sign in to upload private documents.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a file smaller than 10 MB.");
      return;
    }
    if (message === "Unsaved changes" || revision === 0) {
      setError("Save your event before uploading a document.");
      return;
    }
    setBusy(true);
    const path = `${state.event.id}/${uid()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage
      .from("planning-documents")
      .upload(path, file);
    if (error) setError(error.message);
    else {
      change({
        ...state,
        records: [
          ...state.records,
          {
            id: uid(),
            event_id: state.event.id,
            kind: "document",
            title: file.name,
            status: "open",
            amount: 0,
            paid: 0,
            date: "",
            notes: "",
            url: "",
            vendor_id: null,
            storage_path: path,
          },
        ],
      });
      setMessage("Document uploaded. Save changes to attach it.");
    }
    setBusy(false);
  }
  if (recovery)
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h2>A fresh start.</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const { error } = await supabase!.auth.updateUser({ password });
              if (error) setError(error.message);
              else {
                setRecovery(false);
                setMessage("Password updated");
              }
            }}
          >
            <label>
              New password
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="primary">Update password</button>
          </form>
          {error && <p role="alert">{error}</p>}
        </div>
      </div>
    );
  if (!state)
    return (
      <div className="auth-shell">
        <div className="auth-visual">
          <span>For the day you’ll always remember.</span>
        </div>
        <div className="auth-card">
          <div className="brand">
            <Heart /> Agapē
          </div>
          <span className="eyebrow">WEDDINGS & ENGAGEMENTS</span>
          <h1>
            Your day.
            <br />
            <em>Your way.</em>
          </h1>
          {configured && !user ? (
            <>
              <div className="segmented">
                <button
                  aria-pressed={authMode === "login"}
                  onClick={() => setAuthMode("login")}
                >
                  Sign in
                </button>
                <button
                  aria-pressed={authMode === "signup"}
                  onClick={() => setAuthMode("signup")}
                >
                  Create account
                </button>
              </div>
              {googleAvailable && authMode !== "reset" && (
                <button
                  className="google-login"
                  disabled={busy}
                  onClick={googleLogin}
                >
                  Continue with Google
                </button>
              )}
              <form onSubmit={auth}>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
                {authMode !== "reset" && (
                  <label>
                    Password
                    <input
                      type="password"
                      minLength={authMode === "signup" ? 8 : undefined}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={
                        authMode === "signup"
                          ? "new-password"
                          : "current-password"
                      }
                    />
                  </label>
                )}
                <button className="primary" disabled={busy}>
                  {authMode === "signup"
                    ? "Create your account"
                    : authMode === "reset"
                      ? "Send reset link"
                      : "Sign in"}
                </button>
              </form>
              <button
                className="text-button"
                onClick={() => setAuthMode("reset")}
              >
                Forgot password?
              </button>
              <button
                onClick={() => {
                  setDemo(true);
                  setState(sample());
                }}
              >
                Explore the sample planner
              </button>
            </>
          ) : (
            <p>
              {busy ? "Opening your celebration…" : "Preparing your planner…"}
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
        </div>
      </div>
    );
  if (onboarding)
    return (
      <Onboarding
        initial={state}
        busy={busy}
        error={error}
        complete={finishSetup}
      />
    );
  const guests = state.guests;
  const accepted = guests.filter((g) => g.rsvp === "accepted").length;
  const tasks = state.records.filter((r) => r.kind === "task");
  const expenses = state.records.filter((r) => r.kind === "budget");
  const planned = expenses.reduce((a, r) => a + r.amount, 0),
    paid = expenses.reduce((a, r) => a + r.paid, 0);
  const title =
    page === "Overview"
      ? "Your celebration."
      : page === "Seating studio"
        ? "Seating studio"
        : page === "Design studio"
          ? "Set the mood."
          : page;
  const kind = kinds[page];
  const records = state.records
    .filter((r) =>
      page === "Notes & documents"
        ? ["note", "document"].includes(r.kind)
        : r.kind === kind,
    )
    .filter((r) => r.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      kind === "day"
        ? (a.date.split("T")[1] || "").localeCompare(b.date.split("T")[1] || "")
        : a.date.localeCompare(b.date),
    );
  return (
    <div className={`app-shell ${page === "Overview" ? "overview-page" : ""}`}>
      {mobile && (
        <WorkspaceMenu
          state={state}
          page={page}
          close={closeMenu}
          navigate={navigate}
          logout={logout}
          demo={demo}
        />
      )}
      <main>
        <header
          className="topbar"
          data-hidden={topbarHidden && !mobile}
          inert={mobile || topbarHidden}
        >
          <button
            className="mobile-menu"
            aria-label="Toggle menu"
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={18} /> <span>Menu</span>
          </button>
          <a
            className="brand header-brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("Overview");
            }}
          >
            Agapē<span className="brand-dot">.</span>
          </a>
          <div className="top-actions">
            {!demo && (
              <button className="primary small" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        </header>
        <div className="content" data-page={page} key={page} inert={mobile}>
          {demo && (
            <div className="demo-notice">
              Sample planner · saved on this device.
              <button
                className="text-button"
                onClick={() => {
                  setState(emptyEvent());
                  setOnboarding(true);
                }}
              >
                Set up your celebration
              </button>
              {!configured && (
                <span>
                  {" "}
                  Connect Supabase to enable accounts and cloud saving.
                </span>
              )}
            </div>
          )}
          {error && (
            <div role="alert" className="error">
              {error}
              {message === "Sync paused" && (
                <button
                  onClick={() => {
                    editVersion.current++;
                    load(state.event.id);
                  }}
                >
                  Reload and discard unsaved changes
                </button>
              )}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {page !== "Overview" && (
            <div className="page-heading">
              <div>
                <h1>{title}</h1>
              </div>
              {kind && !["inspiration", "decor"].includes(kind) && (
                <button
                  className="primary add-circle"
                  aria-label={`Add ${kind === "task" ? "task" : kind === "day" ? "moment" : kind}`}
                  title={`Add ${kind === "task" ? "task" : kind === "day" ? "moment" : kind}`}
                  onClick={() => beginRecord()}
                >
                  <Plus size={18} />
                </button>
              )}
            </div>
          )}
          {page === "Overview" && (
            <Overview state={state} change={change} navigate={navigate} />
          )}
          {page === "Church Ceremony" && (
            <Ceremony state={state} change={change} />
          )}
          {page === "Seating studio" && (
            <Seating state={state} change={change} />
          )}
          {page === "Guests & RSVPs" && (
            <GuestList
              addGuest={() => {
                setGuestEdit(null);
                setFamilyDraft([]);
                setModal("guest");
              }}
              state={state}
              change={change}
              edit={(g) => {
                setGuestEdit(g);
                setFamilyDraft([]);
                setModal("guest");
              }}
            />
          )}
          {["inspiration", "decor"].includes(kind) && (
            <PhotoBoard
              state={state}
              change={change}
              kind={kind}
              demo={demo}
              ready={revision > 0 && message !== "Unsaved changes"}
            />
          )}
          {kind && !["inspiration", "decor"].includes(kind) && (
            <>
              {page === "Budget" && (
                <div className="stat-grid">
                  <div className="card stat budget-edit">
                    <div>
                      <span>Total budget</span>
                      <Wallet size={16} />
                    </div>
                    <label>
                      <span className="sr-only">Total budget (USD)</span>
                      <span className="currency-symbol">$</span>
                      <input
                        type="number"
                        min="0"
                        aria-label="Total budget (USD)"
                        value={state.event.budget}
                        onChange={(e) =>
                          change({
                            ...state,
                            event: {
                              ...state.event,
                              budget: Math.max(0, +e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    <small>Edit your budget here</small>
                  </div>
                  <Stat
                    label="Planned"
                    value={currency(planned)}
                    detail={`${Math.round((planned / (state.event.budget || 1)) * 100)}% allocated`}
                    icon={<CheckSquare />}
                  />
                  <Stat
                    label="Paid"
                    value={currency(paid)}
                    detail="Payments recorded"
                    icon={<Check />}
                  />
                  <Stat
                    label="Remaining"
                    value={currency(state.event.budget - planned)}
                    detail={
                      planned > state.event.budget
                        ? "Over budget"
                        : "Available to allocate"
                    }
                    icon={<Heart />}
                  />
                </div>
              )}
              <section className="card">
                <div className="card-heading">
                  <h3>{page}</h3>
                  <SearchInput value={search} onChange={setSearch} />
                </div>
                {page === "Checklist" && (
                  <div className="checklist-tools">
                    <button
                      onClick={() => {
                        const titles =
                          state.event.mode === "wedding"
                            ? [
                                "Set your celebration budget",
                                "Draft the guest list",
                                "Book ceremony and reception venues",
                                "Book photographer",
                                "Choose flowers and décor",
                                "Send invitations",
                                "Confirm catering and dietary needs",
                                "Finalize seating plan",
                                "Confirm vendor arrival times",
                                "Prepare wedding-day timeline",
                              ]
                            : [
                                "Set your engagement budget",
                                "Choose the venue",
                                "Draft the guest list",
                                "Book catering",
                                "Choose décor and flowers",
                                "Send invitations",
                                "Finalize seating plan",
                              ];
                        change({
                          ...state,
                          records: [
                            ...state.records,
                            ...titles
                              .filter((t) => !tasks.some((r) => r.title === t))
                              .map((title, i) => ({
                                id: uid(),
                                event_id: state.event.id,
                                kind: "task",
                                title,
                                status: "open",
                                amount: 0,
                                paid: 0,
                                date: state.event.date
                                  ? new Date(
                                      new Date(state.event.date).getTime() -
                                        (titles.length - i) * 14 * 86400000,
                                    )
                                      .toISOString()
                                      .slice(0, 10)
                                  : "",
                                notes:
                                  "Suggested based on your event date. Adjust to suit your plans.",
                                url: "",
                                vendor_id: null,
                                storage_path: null,
                              })),
                          ],
                        });
                      }}
                    >
                      Generate {state.event.mode} checklist
                    </button>
                    <small>
                      Suggested milestones, tailored to your event date.
                    </small>
                  </div>
                )}
                {page === "Notes & documents" && (
                  <label className="upload-label">
                    <Upload size={16} /> Upload PDF or image (10 MB max)
                    <input
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) fileUpload(f);
                      }}
                    />
                  </label>
                )}
                <div
                  className={
                    page === "Wedding-day timeline"
                      ? "record-list day-timeline"
                      : page === "Inspiration"
                        ? "inspiration-grid"
                        : "record-list"
                  }
                >
                  {records.map((r) => (
                    <article
                      className={`record-row ${r.status === "done" ? "completed" : ""}`}
                      key={r.id}
                    >
                      {kind === "day" && (
                        <time className="moment-time">
                          {r.date
                            ? new Date(r.date).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "Time TBD"}
                        </time>
                      )}
                      {kind === "task" && (
                        <button
                          className={`check-circle ${r.status === "done" ? "checked" : ""}`}
                          aria-label={`Toggle ${r.title}`}
                          onClick={() =>
                            change({
                              ...state,
                              records: state.records.map((a) =>
                                a.id === r.id
                                  ? {
                                      ...a,
                                      status:
                                        r.status === "done" ? "open" : "done",
                                    }
                                  : a,
                              ),
                            })
                          }
                        >
                          {r.status === "done" && <Check size={13} />}
                        </button>
                      )}
                      <div
                        className="record-body"
                        onClick={
                          kind === "task" ? () => beginRecord(r) : undefined
                        }
                      >
                        {page === "Inspiration" &&
                          r.url &&
                          /^https:\/\//.test(r.url) && (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inspiration-link"
                            >
                              <Images size={30} /> View inspiration{" "}
                              <ArrowUpRight size={16} />
                            </a>
                          )}
                        <button
                          className="record-title"
                          onClick={(e) => {
                            e.stopPropagation();
                            beginRecord(r);
                          }}
                        >
                          {r.title}
                        </button>
                        {r.notes && <p>{r.notes}</p>}
                        {page !== "Inspiration" &&
                          /^https?:\/\//.test(r.url) && (
                            <a
                              className="text-button"
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open link ↗
                            </a>
                          )}
                        <small>
                          {r.date &&
                            (["day", "vendor", "note", "document"].includes(
                              r.kind,
                            )
                              ? r.kind === "day"
                                ? new Date(r.date).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })
                                : ""
                              : formatDate(r.date))}
                          {r.kind === "vendor" &&
                            r.details?.arrival_time &&
                            ` · Arrival ${r.details.arrival_time}${r.details.end_time ? `–${r.details.end_time}` : ""}`}
                          {r.vendor_id &&
                            ` · ${state.records.find((v) => v.id === r.vendor_id)?.title}`}
                        </small>
                        {r.kind === "document" && (
                          <button
                            onClick={async () => {
                              if (demo && r.url.startsWith("/")) {
                                window.open(
                                  r.url,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                                return;
                              }
                              if (!supabase || !r.storage_path) return;
                              const { data, error } = await supabase.storage
                                .from("planning-documents")
                                .createSignedUrl(r.storage_path, 60);
                              if (error) setError(error.message);
                              else
                                window.open(
                                  data.signedUrl,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                            }}
                          >
                            <Download size={14} /> Open document
                          </button>
                        )}
                      </div>
                      {["budget", "decor", "vendor"].includes(r.kind) && (
                        <div className="amount">
                          <strong>{currency(r.amount)}</strong>
                          <small>{currency(r.paid)} paid</small>
                        </div>
                      )}
                      {kind !== "task" && (
                        <span className="badge">{r.status}</span>
                      )}
                      <button
                        aria-label={`Remove ${r.title}`}
                        onClick={() => {
                          change({
                            ...state,
                            records: state.records
                              .filter((a) => a.id !== r.id)
                              .map((a) =>
                                a.vendor_id === r.id
                                  ? { ...a, vendor_id: null }
                                  : a,
                              ),
                          });
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </article>
                  ))}
                </div>
                {!records.length && (
                  <Empty text="Make room for the details. Add your first item." />
                )}
              </section>
            </>
          )}
          {page === "Design studio" && (
            <section className="card design-card">
              <div className="eyebrow">YOUR SIGNATURE COLORS</div>
              <h2>Your palette.</h2>
              <div className="palette-editor">
                {state.event.palette.map((c, i) => (
                  <label key={i}>
                    <input
                      aria-label={`Palette color ${i + 1}`}
                      type="color"
                      value={c}
                      onChange={(e) =>
                        change({
                          ...state,
                          event: {
                            ...state.event,
                            palette: state.event.palette.map((v, j) =>
                              i === j ? e.target.value : v,
                            ),
                          },
                        })
                      }
                    />
                    <span>{c.toUpperCase()}</span>
                  </label>
                ))}
              </div>
              <div className="preset-grid">
                {palettes.map(([name, ...colors]) => (
                  <button
                    key={name}
                    onClick={() =>
                      change({
                        ...state,
                        event: { ...state.event, palette: colors },
                      })
                    }
                  >
                    <div>
                      {colors.map((c) => (
                        <i key={c} style={{ background: c }} />
                      ))}
                    </div>
                    {name}
                  </button>
                ))}
              </div>
              <p className="muted">
                Choose a starting point, then make it yours.
              </p>
            </section>
          )}
          {page === "Event settings" && (
            <section className="card settings">
              <h3>Celebration details</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!demo) save();
                  else setMessage("Saved on this device");
                }}
              >
                <div className="form-grid">
                  {[
                    ["partner_one", "Your name"],
                    ["partner_two", "Partner’s name"],
                    ["name", "Celebration name"],
                    ["venue", "Venue"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        required={key !== "venue"}
                        value={String(
                          state.event[key as keyof typeof state.event],
                        )}
                        onChange={(e) =>
                          change({
                            ...state,
                            event: { ...state.event, [key]: e.target.value },
                          })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    Planning mode
                    <select
                      value={state.event.mode}
                      onChange={(e) =>
                        change({
                          ...state,
                          event: {
                            ...state.event,
                            mode: e.target.value as "wedding" | "engagement",
                          },
                        })
                      }
                    >
                      <option value="wedding">Wedding</option>
                      <option value="engagement">Engagement</option>
                    </select>
                  </label>
                  <label>
                    Celebration date
                    <DateInput
                      value={state.event.date}
                      onChange={(e) =>
                        change({
                          ...state,
                          event: { ...state.event, date: e },
                        })
                      }
                    />
                  </label>
                  <label>
                    Total budget (USD)
                    <input
                      type="number"
                      required
                      min="0"
                      value={state.event.budget}
                      onChange={(e) =>
                        change({
                          ...state,
                          event: { ...state.event, budget: +e.target.value },
                        })
                      }
                    />
                  </label>
                </div>
                <button className="primary" disabled={busy}>
                  Save celebration
                </button>
              </form>
              <hr />
              <Partner
                onInvite={invitePartner}
                link={inviteLink}
                isOwner={demo || state.event.owner_id === user}
                demo={demo}
              />
            </section>
          )}
          <footer className="page-footer">
            <span className="footer-couple">
              {state.event.partner_one} & {state.event.partner_two}
            </span>
            <span className="brand footer-brand">Agapē</span>
            <span
              className="footer-palette"
              aria-label="Celebration color palette"
            >
              {state.event.palette.map((color, i) => (
                <i key={i} style={{ background: color }} />
              ))}
            </span>
          </footer>
        </div>
      </main>
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={modal === "guest" ? "Guest details" : "Planning item"}
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            <h2>
              {modal === "guest"
                ? guestEdit
                  ? "Guest details"
                  : "Someone you love"
                : edit
                  ? "The details"
                  : "A new little detail"}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const v = (k: string) => String(f.get(k) || "");
                if (modal === "guest") {
                  const g: Guest = {
                    id: guestEdit?.id || uid(),
                    event_id: state.event.id,
                    name: v("name"),
                    household: v("household"),
                    family_name: guestEdit?.family_name || null,
                    guest_group: v("guest_group") || "Family",
                    email: v("email"),
                    meal: v("meal"),
                    rsvp: guestEdit?.rsvp || "pending",
                  };
                  change(addFamily(state, g, familyDraft));
                } else {
                  const r: RecordItem = {
                    id: edit?.id || uid(),
                    event_id: state.event.id,
                    kind: edit?.kind || kind || "note",
                    title: v("title"),
                    notes: v("notes"),
                    date:
                      (edit?.kind || kind) === "day"
                        ? v("time") && state.event.date
                          ? state.event.date + "T" + v("time")
                          : ""
                        : ["task", "timeline"].includes(edit?.kind || kind)
                          ? parseDate(v("date"))
                          : "",
                    status: v("status"),
                    amount: Number(v("amount")),
                    paid: Number(v("paid")),
                    url: v("url"),
                    vendor_id: v("vendor_id") || null,
                    storage_path: edit?.storage_path || null,
                    details: {
                      ...edit?.details,
                      arrival_time: v("arrival_time"),
                      end_time: v("end_time"),
                    },
                  };
                  const result = savePlanningRecord(state, r, v("vendor_name"));
                  change(result);
                }
                setModal(null);
              }}
            >
              {modal === "guest" ? (
                <>
                  <label>
                    Full name
                    <input
                      name="name"
                      required
                      defaultValue={guestEdit?.name}
                      autoFocus
                    />
                  </label>
                  <label>
                    Group
                    <input
                      name="guest_group"
                      list="guest-groups"
                      defaultValue={guestEdit?.guest_group || "Family"}
                    />
                    <datalist id="guest-groups">
                      {["Family", "Friends", "Work", "Other"].map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                  </label>
                  <label>
                    Household
                    <input
                      name="household"
                      defaultValue={guestEdit?.household}
                      placeholder="e.g. The Bennett family"
                    />
                  </label>
                  <fieldset className="family-editor">
                    <legend>Invite together</legend>
                    {guestEdit &&
                      (state.family_links || [])
                        .filter(
                          (l) =>
                            l.guest_id === guestEdit.id ||
                            l.related_guest_id === guestEdit.id,
                        )
                        .map((l) => (
                          <div className="ceremony-row" key={l.id}>
                            <span>
                              {
                                state.guests.find(
                                  (g) =>
                                    g.id ===
                                    (l.guest_id === guestEdit.id
                                      ? l.related_guest_id
                                      : l.guest_id),
                                )?.name
                              }{" "}
                              ·{" "}
                              {l.guest_id === guestEdit.id
                                ? l.relationship
                                : "Linked invitation"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                change({
                                  ...state,
                                  family_links: state.family_links?.filter(
                                    (a) => a.id !== l.id,
                                  ),
                                })
                              }
                            >
                              Unlink
                            </button>
                          </div>
                        ))}
                    {familyDraft.map((r, i) => (
                      <div className="family-row" key={i}>
                        <select
                          aria-label={`Relationship ${i + 1}`}
                          value={r.relationship}
                          onChange={(e) =>
                            setFamilyDraft(
                              familyDraft.map((a, j) =>
                                j === i
                                  ? { ...a, relationship: e.target.value }
                                  : a,
                              ),
                            )
                          }
                        >
                          {relationships.map((a) => (
                            <option key={a}>{a}</option>
                          ))}
                        </select>
                        <input
                          aria-label={`Family member ${i + 1}`}
                          placeholder="New guest name"
                          value={r.name}
                          disabled={!!r.existing_id}
                          onChange={(e) =>
                            setFamilyDraft(
                              familyDraft.map((a, j) =>
                                j === i ? { ...a, name: e.target.value } : a,
                              ),
                            )
                          }
                        />
                        <select
                          aria-label={`Existing guest ${i + 1}`}
                          value={r.existing_id || ""}
                          onChange={(e) =>
                            setFamilyDraft(
                              familyDraft.map((a, j) =>
                                j === i
                                  ? { ...a, existing_id: e.target.value }
                                  : a,
                              ),
                            )
                          }
                        >
                          <option value="">New guest</option>
                          {guests
                            .filter((g) => g.id !== guestEdit?.id)
                            .map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setFamilyDraft(
                              familyDraft.filter((_, j) => j !== i),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      aria-label="Add family member"
                      title="Add family member"
                      className="add-circle"
                      type="button"
                      onClick={() =>
                        setFamilyDraft([
                          ...familyDraft,
                          { name: "", relationship: "Relative" },
                        ])
                      }
                    >
                      <Plus size={18} />
                    </button>
                  </fieldset>
                  <label>
                    Email
                    <input
                      name="email"
                      type="email"
                      defaultValue={guestEdit?.email}
                    />
                  </label>
                  <label>
                    Meal / dietary needs
                    <input
                      name="meal"
                      defaultValue={guestEdit?.meal || "Standard"}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    {kind === "vendor" ? "Vendor name" : "Title"}
                    <input
                      required
                      name="title"
                      defaultValue={edit?.title}
                      autoFocus
                    />
                  </label>
                  <label>
                    Notes
                    <textarea
                      name="notes"
                      rows={3}
                      defaultValue={edit?.notes}
                    />
                  </label>
                  <div className="form-grid">
                    {kind === "day" ? (
                      <label>
                        Time
                        <input
                          required
                          type="time"
                          name="time"
                          defaultValue={edit?.date?.split("T")[1]?.slice(0, 5)}
                        />
                      </label>
                    ) : ["task", "timeline"].includes(kind) ? (
                      <label>
                        Date
                        <input
                          type="text"
                          name="date"
                          placeholder="MM/DD/YYYY"
                          pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
                          defaultValue={formatDate(edit?.date || "")}
                          onChange={(e) =>
                            e.target.setCustomValidity(
                              e.target.value && !parseDate(e.target.value)
                                ? "Enter a valid date in MM/DD/YYYY format"
                                : "",
                            )
                          }
                        />
                      </label>
                    ) : null}
                    <label>
                      Status
                      <select
                        name="status"
                        defaultValue={edit?.status || "open"}
                      >
                        {[
                          "open",
                          "done",
                          "booked",
                          "researching",
                          "contacted",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    {["budget", "decor", "vendor"].includes(kind) && (
                      <>
                        <label>
                          Planned amount
                          <input
                            type="number"
                            name="amount"
                            min="0"
                            step="0.01"
                            defaultValue={edit?.amount || 0}
                          />
                        </label>
                        <label>
                          Paid
                          <input
                            type="number"
                            name="paid"
                            min="0"
                            step="0.01"
                            defaultValue={edit?.paid || 0}
                          />
                        </label>
                      </>
                    )}
                  </div>
                  <label>
                    Link
                    <input
                      type="url"
                      name="url"
                      placeholder="https://…"
                      defaultValue={edit?.url}
                    />
                  </label>
                  {kind === "vendor" && (
                    <div className="form-grid">
                      <label>
                        Arrival time
                        <input
                          type="time"
                          name="arrival_time"
                          defaultValue={edit?.details?.arrival_time}
                        />
                      </label>
                      <label>
                        Departure time
                        <input
                          type="time"
                          name="end_time"
                          defaultValue={edit?.details?.end_time}
                        />
                      </label>
                    </div>
                  )}
                  {kind === "budget" && (
                    <label>
                      Vendor name
                      <input
                        name="vendor_name"
                        required
                        defaultValue={
                          state.records.find((v) => v.id === edit?.vendor_id)
                            ?.title || ""
                        }
                        list="budget-vendors"
                        placeholder="Choose or add a vendor"
                      />
                      <datalist id="budget-vendors">
                        {state.records
                          .filter((v) => v.kind === "vendor")
                          .map((v) => (
                            <option key={v.id} value={v.title} />
                          ))}
                      </datalist>
                    </label>
                  )}
                  {!["vendor", "budget"].includes(kind) && (
                    <label>
                      Related vendor
                      <select
                        name="vendor_id"
                        defaultValue={edit?.vendor_id || ""}
                      >
                        <option value="">None</option>
                        {state.records
                          .filter((r) => r.kind === "vendor")
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.title}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                </>
              )}
              <button className="primary">
                Save {modal === "guest" ? "guest" : "detail"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card stat">
      <div>
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Heart size={28} />
      <p>{text}</p>
    </div>
  );
}
function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="search">
      <Search size={15} />
      <input
        aria-label="Search items"
        placeholder="Search…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
