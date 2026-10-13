import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
test("guest assignment sync, decline unseating, guest creation and device persistence", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost:3000",
  });
  for (const key of [
    "window",
    "document",
    "HTMLElement",
    "localStorage",
    "location",
    "Event",
    "KeyboardEvent",
    "FormData",
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
  Object.defineProperty(window, "scrollTo", {
    value: () => {},
    configurable: true,
  });
  const { render, fireEvent, screen, within, cleanup } =
    await import("@testing-library/react");
  const { default: Planner } = await import("../components/planner.tsx");
  render(<Planner />);
  await screen.findByRole("heading", { name: /Alex.*Jordan/ });
  fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
  assert.equal(
    screen
      .getByRole("button", { name: "Toggle menu" })
      .getAttribute("aria-expanded"),
    "true",
  );
  assert.equal(screen.queryByRole("button", { name: "Flowers & décor" }), null);
  assert.ok(screen.getByRole("button", { name: "Inspiration" }));
  fireEvent.click(screen.getByRole("button", { name: "Seating studio" }));
  assert.equal(
    screen
      .getByRole("button", { name: "Toggle menu" })
      .getAttribute("aria-expanded"),
    "false",
  );
  fireEvent.click(screen.getByRole("button", { name: "Suggest layout" }));
  const preview = screen
    .getByRole("img", { name: /layout preview/ })
    .getAttribute("aria-label");
  fireEvent.click(screen.getByRole("button", { name: "Generate another" }));
  assert.notEqual(
    screen
      .getByRole("img", { name: /layout preview/ })
      .getAttribute("aria-label"),
    preview,
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.change(screen.getByLabelText("Object type"), {
    target: { value: "serpentine" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add to room" }));
  assert.ok(document.querySelector("svg path"));
  assert.equal(screen.queryByRole("button", { name: "Add guest" }), null);
  fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
  fireEvent.click(screen.getByRole("button", { name: "Guests & RSVPs" }));
  fireEvent.click(screen.getByRole("button", { name: "Add guest" }));
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Studio Guest" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save guest" }));
  fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
  fireEvent.click(screen.getByRole("button", { name: "Seating studio" }));
  assert.ok(screen.getByRole("button", { name: /Studio Guest/ }));
  fireEvent.click(screen.getByRole("button", { name: /Amelia Carter/ }));
  fireEvent.click(
    screen.getByRole("button", { name: "Table 2 chair 1: empty" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
  fireEvent.click(screen.getByRole("button", { name: "Guests & RSVPs" }));
  fireEvent.click(screen.getByRole("button", { name: /^Guests$/ }));
  const row = screen.getByRole("row", { name: /Amelia Carter/ });
  assert.ok(within(row).getByText("Table 2"));
  fireEvent.click(
    within(row).getByRole("button", { name: "RSVP for Amelia Carter" }),
  );
  fireEvent.click(
    within(
      screen.getByRole("listbox", { name: "RSVP for Amelia Carter" }),
    ).getByRole("option", { name: "Declined" }),
  );
  assert.ok(within(row).getByText("Unseated"));
  fireEvent.click(screen.getByRole("button", { name: "Add guest" }));
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Test Guest" },
  });
  assert.equal(screen.queryByLabelText("Household"), null);
  assert.equal(screen.queryByLabelText("Group"), null);
  assert.equal(
    screen.queryByRole("button", { name: "Add family member" }),
    null,
  );
  const beforeBatch = JSON.parse(localStorage.getItem("ever-after-demo")!);
  fireEvent.click(screen.getByRole("button", { name: "Add more people" }));
  fireEvent.change(screen.getByLabelText("Full name 2"), {
    target: { value: "Discarded Guest" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add more people" }));
  fireEvent.change(screen.getByLabelText("Full name 3"), {
    target: { value: "Bulk Guest Three" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Remove guest 2" }));
  assert.equal(
    (screen.getByLabelText("Full name 2") as HTMLInputElement).value,
    "Bulk Guest Three",
  );
  fireEvent.click(
    screen.getByText("Email & dietary needs", { selector: "summary" }),
  );
  fireEvent.change(screen.getByLabelText("Email 2"), {
    target: { value: "three@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Meal / dietary needs 2"), {
    target: { value: "Vegetarian" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add more people" }));
  fireEvent.change(screen.getByLabelText("Full name 3"), {
    target: { value: "   " },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Save guests" }).closest("form")!,
  );
  assert.equal(
    JSON.parse(localStorage.getItem("ever-after-demo")!).guests.length,
    beforeBatch.guests.length,
  );
  fireEvent.input(screen.getByLabelText("Full name 3"), {
    target: { value: "Bulk Guest Four" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save guests" }));
  const batched = JSON.parse(localStorage.getItem("ever-after-demo")!);
  assert.equal(batched.guests.length, beforeBatch.guests.length + 3);
  assert.deepEqual(batched.family_links, beforeBatch.family_links);
  const added = batched.guests.filter((guest: any) =>
    ["Test Guest", "Bulk Guest Three", "Bulk Guest Four"].includes(guest.name),
  );
  assert.equal(new Set(added.map((guest: any) => guest.id)).size, 3);
  assert.ok(
    added.every(
      (guest: any) =>
        guest.household === "" &&
        guest.family_name === null &&
        guest.guest_group === "Other" &&
        guest.rsvp === "pending",
    ),
  );
  assert.equal(
    added.find((guest: any) => guest.name === "Bulk Guest Three").meal,
    "Vegetarian",
  );
  assert.equal(
    added.find((guest: any) => guest.name === "Bulk Guest Three").email,
    "three@example.com",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Open Bulk Guest Three" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Edit guest" }));
  fireEvent.change(screen.getByLabelText("Email", { exact: true }), {
    target: { value: "updated@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save guest" }));
  const editedBatch = JSON.parse(localStorage.getItem("ever-after-demo")!);
  const editedGuest = editedBatch.guests.find(
    (guest: any) => guest.name === "Bulk Guest Three",
  );
  assert.equal(editedGuest.email, "updated@example.com");
  assert.equal(editedGuest.household, "");
  assert.equal(editedGuest.family_name, null);
  assert.equal(editedGuest.guest_group, "Other");
  assert.deepEqual(editedBatch.family_links, beforeBatch.family_links);
  fireEvent.click(
    screen.getByRole("button", { name: "Open Bulk Guest Three" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Add guest" }));
  fireEvent.click(screen.getByRole("button", { name: "Paste a list" }));
  fireEvent.change(screen.getByLabelText("Paste guest names"), {
    target: {
      value: "  Paste Person One\n\nPaste Person Two\r\nPaste Person Three  ",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save guests" }));
  const pasted = JSON.parse(localStorage.getItem("ever-after-demo")!);
  assert.equal(pasted.guests.length, batched.guests.length + 3);
  assert.ok(
    ["Paste Person One", "Paste Person Two", "Paste Person Three"].every(
      (name) => pasted.guests.some((guest: any) => guest.name === name),
    ),
  );
  assert.ok(screen.getByText("Test Guest"));
  fireEvent.click(screen.getByRole("button", { name: "Remove Test Guest" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete guest" }));
  assert.ok(
    !JSON.parse(localStorage.getItem("ever-after-demo")!).guests.some(
      (g: any) => g.name === "Test Guest",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  assert.ok(screen.getByRole("row", { name: /Test Guest/ }));
  const saved = JSON.parse(localStorage.getItem("ever-after-demo")!);
  assert.ok(saved.guests.some((g: any) => g.name === "Test Guest"));
  assert.ok(
    !saved.seats.some(
      (s: any) =>
        s.guest_id ===
        saved.guests.find((g: any) => g.name === "Amelia Carter").id,
    ),
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Filter guest group" }),
    { target: { value: "Other" } },
  );
  assert.ok(screen.getByText("Test Guest"));
  assert.equal(screen.queryByText("Olivia Bennett"), null);
  fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
  fireEvent.click(screen.getByRole("button", { name: "Budget" }));
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Total budget (USD)" }),
    { target: { value: "45000" } },
  );
  assert.equal(
    JSON.parse(localStorage.getItem("ever-after-demo")!).event.budget,
    45000,
  );
  fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
  fireEvent.click(screen.getByRole("button", { name: "Design studio" }));
  const presets = document.querySelectorAll<HTMLButtonElement>(
    ".preset-grid button",
  );
  assert.equal(presets.length, 72);
  fireEvent.click(presets[12]);
  const active = JSON.parse(localStorage.getItem("ever-after-demo")!).event
    .palette;
  assert.equal(
    (screen.getByLabelText("Palette color 1") as HTMLInputElement).value,
    active[0],
  );
  fireEvent.click(screen.getByRole("button", { name: "Toggle menu" }));
  fireEvent.click(screen.getByRole("button", { name: "Church Ceremony" }));
  fireEvent.click(screen.getByRole("button", { name: "Add clergy" }));
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Deacon Mark" },
  });
  fireEvent.change(screen.getByLabelText("Role"), {
    target: { value: "Deacon" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  fireEvent.change(screen.getByLabelText("Prayer / responsibility"), {
    target: { value: "Opening response" },
  });
  const deacon = JSON.parse(
    localStorage.getItem("ever-after-demo")!,
  ).records.find((r: any) => r.title === "Deacon Mark");
  fireEvent.change(screen.getByLabelText("Deacon"), {
    target: { value: deacon.id },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add prayer" }));
  assert.equal(
    JSON.parse(localStorage.getItem("ever-after-demo")!).records.find(
      (r: any) => r.title === "Opening response",
    ).assignee_id,
    deacon.id,
  );
  fireEvent.click(screen.getByRole("button", { name: "Remove Deacon Mark" }));
  assert.equal(
    JSON.parse(localStorage.getItem("ever-after-demo")!).records.find(
      (r: any) => r.title === "Opening response",
    ).assignee_id,
    null,
  );
  cleanup();
  dom.window.close();
});
