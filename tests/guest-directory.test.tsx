import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { useState } from "react";
import { sample, State, uid } from "../lib/model";
import GuestList from "../components/guest-list";
test("400 guests display without pagination, with alphabet navigation and local family actions", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost:3000",
  });
  for (const key of [
    "window",
    "document",
    "HTMLElement",
    "Event",
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
  const { render, screen, fireEvent, cleanup } =
    await import("@testing-library/react");
  const initial = sample();
  initial.seats = [];
  initial.guests = Array.from({ length: 400 }, (_, i) => ({
    ...initial.guests[0],
    id: uid(),
    name: `Guest ${String(i).padStart(4, "0")}`,
    household: `Household ${String(Math.floor(i / 2)).padStart(3, "0")}`,
    rsvp: "pending" as const,
  }));
  let current: State = initial;
  function Harness() {
    const [s, set] = useState(initial);
    current = s;
    return <GuestList state={s} change={set} edit={() => {}} />;
  }
  render(<Harness />);
  assert.ok(
    screen
      .getByRole("checkbox", { name: "Select all guests" })
      .closest(".guest-toolbar-actions"),
  );
  assert.ok(screen.getByText("Guest 0000 & family"));
  fireEvent.click(screen.getByRole("button", { name: /^Guests$/ }));
  assert.equal(screen.getAllByRole("row").length, 401);
  assert.equal(screen.queryByRole("button", { name: "Next guest page" }), null);
  let jumped = false;
  dom.window.HTMLElement.prototype.scrollIntoView = function () {
    jumped = this.getAttribute("data-letter") === "G";
  };
  fireEvent.click(screen.getByRole("button", { name: "Jump to G" }));
  assert.equal(jumped, true);
  assert.equal(
    screen.queryByRole("checkbox", { name: "Select this page" }),
    null,
  );
  assert.equal(
    screen.getAllByRole("checkbox", { name: "Select all guests" }).length,
    1,
  );
  fireEvent.click(screen.getByRole("checkbox", { name: "Select all guests" }));
  assert.ok(screen.getByRole("checkbox", { name: "Select all guests" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Select all guests" }));
  assert.equal(
    screen.queryByRole("combobox", { name: "Set selected RSVP" }),
    null,
  );
  fireEvent.click(screen.getByRole("checkbox", { name: "Select all guests" }));
  fireEvent.change(screen.getByLabelText("Set selected RSVP"), {
    target: { value: "accepted" },
  });
  assert.equal(current.guests.filter((g) => g.rsvp === "accepted").length, 400);
  fireEvent.change(screen.getByLabelText("Search guests"), {
    target: { value: "Guest 0399" },
  });
  assert.ok(screen.getByText("Guest 0399"));
  assert.equal(screen.getAllByRole("row").length, 2);
  fireEvent.click(screen.getByRole("button", { name: "Families" }));
  assert.ok(screen.getByRole("button", { name: /Guest 0398 & family/ }));
  fireEvent.click(screen.getByRole("button", { name: /Guest 0398 & family/ }));
  assert.ok(screen.getByText("Guest 0399"));
  cleanup();
  initial.guests = ["Mark Nosseir", "Heidy Nosseir", "Nader Nosseir"].map(
    (name, i) => ({
      ...initial.guests[i],
      id: String(i),
      name,
      household: `Individual ${i}`,
    }),
  );
  initial.family_links = [];
  render(<Harness />);
  assert.equal(screen.queryByText(/1 person total/), null);
  assert.equal(screen.queryByRole("button", { name: "Create family" }), null);
  fireEvent.click(screen.getByRole("button", { name: "Guests" }));
  for (const name of ["Mark Nosseir", "Heidy Nosseir", "Nader Nosseir"])
    fireEvent.click(screen.getByRole("checkbox", { name: `Select ${name}` }));
  fireEvent.click(screen.getByRole("button", { name: "Create family" }));
  fireEvent.change(screen.getByLabelText("Primary invitee"), {
    target: { value: "0" },
  });
  fireEvent.change(screen.getByLabelText("New family name"), {
    target: { value: "Mark Nosseir & family" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save family" }));
  fireEvent.click(screen.getByRole("button", { name: "Families" }));
  assert.equal(screen.queryByRole("button", { name: "Create family" }), null);
  assert.equal(current.guests[0].family_name, "Mark Nosseir & family");
  assert.ok(screen.getByRole("button", { name: /Mark Nosseir & family/ }));
  assert.ok(screen.getByText(/3 people total/));
  assert.equal(current.family_links?.length, 2);
  fireEvent.click(screen.getByRole("button", { name: "Open Mark Nosseir" }));
  assert.ok(screen.getByRole("button", { name: "Add relative" }));
  fireEvent.click(screen.getByRole("button", { name: "Add relative" }));
  fireEvent.change(screen.getByLabelText("Family member name"), {
    target: { value: "Mina Nosseir" },
  });
  fireEvent.change(screen.getByLabelText("Family member relationship"), {
    target: { value: "Sibling" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add member" }));
  assert.equal(current.guests.length, 4);
  assert.ok(screen.getByText(/4 people total/));
  fireEvent.click(screen.getByRole("button", { name: "Open Mark Nosseir" }));
  fireEvent.click(screen.getByRole("button", { name: "Rename family" }));
  fireEvent.change(screen.getByLabelText("Family name"), {
    target: { value: "The Nosseir Family" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save family name" }));
  assert.ok(screen.getByRole("button", { name: /The Nosseir Family/ }));
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "Select invitation for Mark Nosseir",
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete guests" }));
  assert.equal(current.guests.length, 0);
  assert.equal(current.family_links?.length, 0);
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  assert.equal(current.guests.length, 4);
  assert.equal(current.family_links?.length, 3);
  assert.ok(screen.getByRole("button", { name: /The Nosseir Family/ }));
  cleanup();
  dom.window.close();
});
