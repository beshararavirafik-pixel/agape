import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { useState } from "react";
import GuestList from "../components/guest-list";
import { sample } from "../lib/model";
import { invitationFamilies } from "../lib/families";

test("dragging moves one guest, preserves RSVP/seats, and supports the RSVP menu and reversible family details", async () => {
  const dom = new JSDOM("<html><body></body></html>", {
    url: "http://localhost",
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
  const { render, screen, fireEvent, cleanup, within } =
    await import("@testing-library/react");
  const initial = sample();
  initial.guests = initial.guests.slice(0, 4).map((g, i) => ({
    ...g,
    household: i < 2 ? "Target household" : "Source household",
    family_name: i < 2 ? "Target family" : "Source family",
  }));
  initial.family_links = [];
  let current = initial;
  function Harness() {
    const [state, setState] = useState(initial);
    current = state;
    return <GuestList state={state} change={setState} edit={() => {}} />;
  }
  render(<Harness />);
  const renderedFamilyNames = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".household-card .household-heading strong",
    ),
    (heading) => heading.textContent,
  );
  assert.deepEqual(
    renderedFamilyNames,
    [...renderedFamilyNames].sort((a, b) => a!.localeCompare(b!)),
    "family cards follow alphabetical reading order in the DOM",
  );
  const source = screen.getByRole("button", { name: /Source family/ });
  const target = screen.getByRole("button", { name: /Target family/ });
  const destination = target.closest("article")!;
  fireEvent.drop(destination);
  assert.equal(current, initial, "external drops are ignored");
  fireEvent.click(source);
  fireEvent.click(target);
  assert.equal(source.getAttribute("aria-expanded"), "false");
  assert.equal(target.getAttribute("aria-expanded"), "true");
  assert.equal(
    screen.getByRole("dialog", { name: "Target family" }).id,
    target.getAttribute("aria-controls"),
    "family members open in a dedicated details window",
  );
  fireEvent.click(source);
  assert.equal(target.getAttribute("aria-expanded"), "false");
  assert.equal(source.getAttribute("aria-expanded"), "true");
  const moved = initial.guests[3];
  const transfer = { setData() {}, effectAllowed: "", dropEffect: "" };
  fireEvent.dragStart(
    screen.getByRole("button", { name: `Open ${moved.name}` }),
    { dataTransfer: transfer },
  );
  fireEvent.dragOver(destination, { dataTransfer: transfer });
  assert.ok(destination.classList.contains("is-drop-target"));
  fireEvent.drop(destination, { dataTransfer: transfer });
  const family = invitationFamilies(current).find(
    (f) => f.title === "Target family",
  )!;
  assert.equal(family.members.length, 3);
  assert.ok(family.members.some((g) => g.id === moved.id));
  assert.equal(current.guests.length, 4);
  assert.deepEqual(current.seats, initial.seats);
  assert.deepEqual(
    current.guests.map((g) => g.rsvp),
    initial.guests.map((g) => g.rsvp),
  );
  assert.equal(destination.classList.contains("is-drop-target"), false);
  assert.equal(screen.queryByText(/moved to/), null);
  assert.ok(screen.getByRole("button", { name: "Undo" }));
  assert.ok(screen.getByRole("button", { name: "Redo" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  assert.equal(
    invitationFamilies(current).find((f) => f.title === "Target family")!
      .members.length,
    2,
  );
  fireEvent.click(screen.getByRole("button", { name: "Redo" }));
  assert.equal(
    invitationFamilies(current).find((f) => f.title === "Target family")!
      .members.length,
    3,
  );
  const trigger = screen.getByRole("button", {
    name: `RSVP for ${moved.name}`,
  });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  const menu = screen.getByRole("listbox", { name: `RSVP for ${moved.name}` });
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  assert.equal(document.activeElement?.getAttribute("role"), "option");
  fireEvent.click(within(menu).getByRole("option", { name: "Accepted" }));
  assert.equal(current.guests.find((g) => g.id === moved.id)?.rsvp, "accepted");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  assert.equal(
    current.guests.find((g) => g.id === moved.id)?.rsvp,
    initial.guests.find((g) => g.id === moved.id)?.rsvp,
  );
  fireEvent.click(screen.getByRole("button", { name: "Redo" }));
  assert.equal(current.guests.find((g) => g.id === moved.id)?.rsvp, "accepted");
  assert.equal(screen.queryByRole("listbox"), null);
  assert.equal(document.activeElement, trigger);
  fireEvent.click(trigger);
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  assert.equal(screen.queryByRole("listbox"), null);
  assert.equal(target.getAttribute("aria-expanded"), "false");
  assert.equal(screen.queryByRole("dialog"), null);
  assert.equal(
    screen.queryByRole("button", { name: `Open ${moved.name}` }),
    null,
  );
  fireEvent.click(target);
  assert.ok(screen.getByRole("dialog", { name: "Target family" }));
  assert.ok(screen.getByRole("button", { name: `Open ${moved.name}` }));
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  assert.equal(screen.queryByRole("dialog"), null);
  cleanup();
  dom.window.close();
});
