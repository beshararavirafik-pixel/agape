import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { sample, State } from "../lib/model.ts";
import { palettes } from "../lib/palettes.ts";
test("first-time setup accepts an undecided date and carries partner invitation email", async () => {
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
  const { render, fireEvent, screen, waitFor, cleanup } =
    await import("@testing-library/react");
  const { default: Onboarding } = await import("../components/onboarding.tsx");
  let result: { state: State; email: string } | undefined;
  const initial = sample();
  initial.event.date = "";
  initial.event.partner_one = "";
  initial.event.partner_two = "";
  render(
    <Onboarding
      initial={initial}
      busy={false}
      error=""
      complete={async (state, email) => {
        result = { state, email };
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: "Ravi" },
  });
  fireEvent.change(screen.getByLabelText("Your partner’s name"), {
    target: { value: "Mia" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByLabelText("Budget to start with (USD)"), {
    target: { value: "45000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByLabelText(/Partner’s email/), {
    target: { value: "mia@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open our planner" }));
  await waitFor(() => assert.ok(result));
  assert.equal(result!.state.event.date, "");
  assert.equal(result!.state.event.partner_one, "Ravi");
  assert.equal(result!.state.event.budget, 45000);
  assert.equal(result!.email, "mia@example.com");
  assert.equal(palettes.length, 60);
  assert.equal(new Set(palettes.map((p) => p.slice(1).join(","))).size, 60);
  cleanup();
  dom.window.close();
});
