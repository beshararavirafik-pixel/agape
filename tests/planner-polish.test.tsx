import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { sample, State } from "../lib/model.ts";
import { defaultChurchLayout } from "../lib/church-layout.ts";
import { sortClergy } from "../lib/clergy-actions.ts";
import { loginErrorMessage } from "../lib/auth-errors.ts";

test("complete sample has 150 guests, connected budgets, all sections and the reference church arrangement", () => {
  const s = sample();
  assert.equal(s.guests.length, 150);
  for (const kind of [
    "task",
    "budget",
    "vendor",
    "inspiration",
    "decor",
    "timeline",
    "day",
    "note",
    "document",
    "ceremony_clergy",
    "ceremony_prayer",
  ])
    assert.ok(
      s.records.some((r) => r.kind === kind),
      kind,
    );
  const layout = JSON.parse(
    s.records.find((r) => r.details?.layout)!.details!.layout,
  );
  assert.deepEqual(layout.pews, defaultChurchLayout().pews);
  assert.equal(layout.pews.length, 5);
  assert.ok(layout.pews.every((p: any) => p.rotation === 90));
  assert.equal(layout.bride.x, layout.groom.x);
  assert.ok(layout.bride.y < layout.groom.y);
  for (const expense of s.records.filter((r) => r.kind === "budget"))
    assert.ok(
      s.records.some(
        (r) =>
          r.id === expense.vendor_id &&
          r.kind === "vendor" &&
          r.amount === expense.amount,
      ),
    );
  assert.ok(
    s.records
      .filter((r) => r.kind === "day")
      .every((r) => r.date.startsWith(s.event.date + "T")),
  );
  const sorted = sortClergy([
    { title: "Zach", details: { role: "Deacon" } },
    { title: "Peter", details: { role: "Priest" } },
    { title: "Andrew", details: { role: "Bishop" } },
    { title: "John", details: { role: "Priest" } },
    { title: "Anna", details: { role: "Deacon" } },
  ]);
  assert.deepEqual(
    sorted.map((r) => r.title),
    ["Andrew", "John", "Peter", "Anna", "Zach"],
  );
  assert.match(
    loginErrorMessage(
      { message: "Invalid login credentials", code: "invalid_credentials" },
      "login",
    ),
    /password is wrong/i,
  );
  assert.equal(
    loginErrorMessage({ message: "Network unavailable" }, "login"),
    "Network unavailable",
  );
});

let testDOM: JSDOM | undefined;
function setup() {
  if (testDOM) {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    return testDOM;
  }
  const dom = new JSDOM("<html><body></body></html>", {
    url: "http://localhost",
  });
  for (const key of [
    "window",
    "document",
    "HTMLElement",
    "Event",
    "FormData",
    "localStorage",
    "location",
    "KeyboardEvent",
  ])
    Object.defineProperty(globalThis, key, {
      value: (dom.window as any)[key],
      configurable: true,
    });
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    writable: true,
    configurable: true,
  });
  window.scrollTo = () => {};
  testDOM = dom;
  return dom;
}

test("church assignment browses ranks or searches names, undo/redo restores seats and pews, and thrones stay mandatory", async () => {
  setup();
  const { render, screen, fireEvent, cleanup, within } =
    await import("@testing-library/react");
  const { useState } = await import("react"),
    { default: Church } = await import("../components/church-seating.tsx");
  let saved = sample();
  function Harness() {
    const [s, set] = useState(saved);
    return (
      <Church
        state={s}
        change={(n) => {
          saved = n;
          set(n);
        }}
      />
    );
  }
  render(<Harness />);
  try {
    fireEvent.click(screen.getByRole("button", { name: "Add pew" }));
    const layout = () =>
      JSON.parse(saved.records.find((r) => r.details?.layout)!.details!.layout);
    assert.equal(layout().pews.length, 6);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    assert.equal(layout().pews.length, 5);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    assert.equal(layout().pews.length, 6);
    fireEvent.click(screen.getByRole("button", { name: "Move Deacon pew 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Browse names" }));
    const directory = document.querySelector(".person-picker-list")!;
    assert.deepEqual(
      Array.from(directory.querySelectorAll("h4")).map((n) => n.textContent),
      ["Bishops", "Priests", "Deacons"],
    );
    fireEvent.change(screen.getByLabelText("Assign clergy"), {
      target: { value: "Mariam Hanna" },
    });
    const old = layout().seats;
    fireEvent.click(
      within(directory as HTMLElement).getByRole("button", {
        name: /Mariam Hanna/,
      }),
    );
    const person = saved.records.find((r) => r.title === "Mariam Hanna")!;
    assert.ok(
      Object.entries(layout().seats).some(
        ([key, id]) => key.startsWith("pew-0:") && id === person.id,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    assert.deepEqual(layout().seats, old);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    assert.notDeepEqual(layout().seats, old);
    assert.equal(screen.queryByRole("button", { name: "Clergy throne" }), null);
    fireEvent.keyDown(screen.getByRole("button", { name: "bride throne" }), {
      key: "Enter",
    });
    fireEvent.click(screen.getByRole("button", { name: "Size & layout" }));
    assert.equal(screen.queryByRole("button", { name: "Resize bride" }), null);
    assert.equal(screen.queryByRole("button", { name: "Rotate" }), null);
    assert.equal(screen.queryByRole("button", { name: /Remove throne/ }), null);
    const chart = document.querySelector(".church-chart-details")!;
    assert.ok(
      document
        .querySelector(".church-workbench")!
        .compareDocumentPosition(chart) &
        window.Node.DOCUMENT_POSITION_FOLLOWING,
    );
    assert.equal(document.body.style.overflow, "");
  } finally {
    cleanup();
  }
});

test("reception undo/redo restores object creation, seat replacement and room dimensions", async () => {
  setup();
  const { render, screen, fireEvent, cleanup, within } =
    await import("@testing-library/react");
  const { useState } = await import("react"),
    { default: Seating } = await import("../components/seating.tsx");
  let saved = sample();
  const initial = saved.objects.length;
  function Harness() {
    const [s, set] = useState(saved);
    return (
      <Seating
        state={s}
        change={(n) => {
          saved = n;
          set(n);
        }}
      />
    );
  }
  render(<Harness />);
  try {
    fireEvent.click(screen.getByRole("button", { name: "Add to room" }));
    assert.equal(saved.objects.length, initial + 1);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    assert.equal(saved.objects.length, initial);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    assert.equal(saved.objects.length, initial + 1);
    fireEvent.keyDown(screen.getByRole("button", { name: "Select Table 1" }), {
      key: "Enter",
    });
    fireEvent.change(screen.getByLabelText("Assign guest to table"), {
      target: { value: "Amelia Carter" },
    });
    const old = saved.seats;
    fireEvent.click(
      within(
        document.querySelector(".person-picker-list") as HTMLElement,
      ).getByRole("button", { name: /Amelia Carter/ }),
    );
    assert.ok(
      saved.seats.some(
        (s) =>
          s.guest_id === saved.guests[4].id &&
          s.table_id === saved.objects[0].id,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    assert.deepEqual(saved.seats, old);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    assert.notDeepEqual(saved.seats, old);
    fireEvent.change(screen.getByLabelText("Room width (ft)"), {
      target: { value: "120" },
    });
    assert.equal(saved.event.room_width_ft, 120);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    assert.equal(saved.event.room_width_ft, 110);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    assert.equal(saved.event.room_width_ft, 120);
  } finally {
    cleanup();
  }
});

test("browser Back/Forward follows sections, checklist click edits, wedding-day forms accept only time", async () => {
  setup();
  const { render, screen, fireEvent, cleanup, waitFor } =
    await import("@testing-library/react");
  const { default: Planner } = await import("../components/planner.tsx");
  render(<Planner />);
  try {
    await screen.findByRole("heading", { name: /Alex.*Jordan/ });
    const go = (name: string) => {
      fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
      fireEvent.click(screen.getByRole("button", { name }));
    };
    go("Checklist");
    go("Budget");
    window.history.back();
    await waitFor(() =>
      assert.ok(screen.getByRole("heading", { name: "Checklist", level: 1 })),
    );
    window.history.forward();
    await waitFor(() =>
      assert.ok(screen.getByRole("heading", { name: "Budget", level: 1 })),
    );
    go("Checklist");
    fireEvent.click(
      screen.getByRole("button", { name: "Book a photographer" }),
    );
    assert.ok(screen.getByLabelText("Notes"));
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Order invitations" }),
    );
    assert.equal(
      screen.queryByRole("button", { name: "Order invitations" }),
      null,
    );
    assert.equal(document.querySelector(".record-row .badge"), null);
    assert.equal(document.querySelector(".topbar .save-status"), null);
    assert.equal(document.querySelector(".topbar .profile-circle"), null);
    assert.equal(screen.queryByRole("button", { name: /Install app/ }), null);
    go("Wedding-day timeline");
    fireEvent.click(screen.getByRole("button", { name: "Add moment" }));
    assert.equal(screen.queryByLabelText("Date"), null);
    assert.equal(
      (screen.getByLabelText("Time") as HTMLInputElement).type,
      "time",
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Evening blessing" },
    });
    fireEvent.change(screen.getByLabelText("Time"), {
      target: { value: "21:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save detail" }));
    const s = JSON.parse(localStorage.getItem("ever-after-demo")!);
    assert.equal(
      s.records.find((r: any) => r.title === "Evening blessing").date,
      s.event.date + "T21:00",
    );
    assert.ok(document.querySelector(".day-timeline .moment-time"));
    for (const page of ["Vendors", "Notes & documents"]) {
      go(page);
      fireEvent.click(
        screen.getByRole("button", {
          name: page === "Vendors" ? "Add vendor" : "Add note",
        }),
      );
      assert.equal(screen.queryByLabelText("Date"), null);
      fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    }
  } finally {
    cleanup();
  }
});
