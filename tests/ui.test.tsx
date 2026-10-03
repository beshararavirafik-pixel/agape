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
  fireEvent.change(within(row).getByRole("combobox"), {
    target: { value: "declined" },
  });
  assert.ok(within(row).getByText("Unseated"));
  fireEvent.click(screen.getByRole("button", { name: "Add guest" }));
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Test Guest" },
  });
  fireEvent.change(screen.getByLabelText("Household"), {
    target: { value: "Test family" },
  });
  fireEvent.change(screen.getByLabelText("Group"), {
    target: { value: "Friends" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save guest" }));
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
    { target: { value: "Friends" } },
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
  assert.equal(presets.length, 60);
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
