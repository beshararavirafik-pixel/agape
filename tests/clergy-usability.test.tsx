import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { sample, State } from "../lib/model.ts";
import { changeClergyRole } from "../lib/clergy-actions.ts";
import {
  defaultChurchLayout,
  resizeChurchObject,
} from "../lib/church-layout.ts";
test("role changes release only incompatible prayer assignments and preserve seating", () => {
  const s = sample(),
    id = crypto.randomUUID();
  s.records.push(
    {
      ...s.records[0],
      id,
      kind: "ceremony_clergy",
      title: "Mark",
      details: { role: "Deacon" },
    },
    {
      ...s.records[0],
      id: crypto.randomUUID(),
      kind: "ceremony_prayer",
      assignee_id: id,
    },
  );
  const result = changeClergyRole(s, id, "Priest");
  assert.equal(
    result.records.find((r) => r.id === id)?.details?.role,
    "Priest",
  );
  assert.equal(
    result.records.find(
      (r) => r.kind === "ceremony_prayer" && r.id === s.records.at(-1)!.id,
    )?.assignee_id,
    null,
  );
  assert.deepEqual(result.seats, s.seats);
  assert.equal(
    changeClergyRole(s, id, "Deacon").records.find(
      (r) => r.kind === "ceremony_prayer" && r.id === s.records.at(-1)!.id,
    )?.assignee_id,
    id,
  );
});
test("resizing snaps dimensions and leaves assignments intact", () => {
  const s = defaultChurchLayout();
  s.seats = { "pew-0:0": "deacon" };
  const next = resizeChurchObject(s, "pew-0", 14.2, 3.2);
  assert.equal(next.pews[0].width, 14);
  assert.equal(next.pews[0].depth, 3);
  assert.deepEqual(next.seats, s.seats);
  assert.equal(resizeChurchObject(s, "altar", -10, 100).altar.width, 1);
});
test("entry role stays selected and existing roles edit beside each name", async () => {
  const dom = new JSDOM("<html><body></body></html>", {
    url: "http://localhost",
  });
  for (const key of ["window", "document", "HTMLElement", "FormData", "Event"])
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
      await import("@testing-library/react"),
    { useState } = await import("react"),
    { default: Ceremony } = await import("../components/ceremony.tsx");
  let saved: State = sample();
  saved.records = saved.records.filter((r) => !r.kind.startsWith("ceremony_"));
  function Harness() {
    const [s, set] = useState(saved);
    return (
      <Ceremony
        state={s}
        change={(n) => {
          saved = n;
          set(n);
        }}
      />
    );
  }
  render(<Harness />);
  assert.equal(screen.queryByLabelText("Name"), null);
  fireEvent.click(screen.getByRole("button", { name: "Add clergy" }));
  fireEvent.change(screen.getByLabelText("Role"), {
    target: { value: "Priest" },
  });
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Father John" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  fireEvent.click(screen.getByRole("button", { name: "Add clergy" }));
  assert.equal(
    (screen.getByLabelText("Role") as HTMLSelectElement).value,
    "Priest",
  );
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Father Mark" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  assert.equal(
    saved.records.filter(
      (r) => r.kind === "ceremony_clergy" && r.details?.role === "Priest",
    ).length,
    2,
  );
  const priests = screen.getByText("Priests").closest("details")!;
  assert.equal(priests.open, false);
  assert.equal(priests.querySelector(".clergy-group-count")?.textContent, "2");
  fireEvent.click(priests.querySelector("summary")!);
  priests.open = true;
  fireEvent.click(screen.getByRole("button", { name: "Edit Father John" }));
  fireEvent.change(screen.getByLabelText("Role"), {
    target: { value: "Bishop" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  assert.equal(
    saved.records.find((r) => r.title === "Father John")?.details?.role,
    "Bishop",
  );
  assert.equal(
    screen
      .getByText("Priests")
      .closest("details")!
      .querySelector(".clergy-group-count")?.textContent,
    "1",
  );
  assert.equal(
    screen
      .getByText("Bishops")
      .closest("details")!
      .querySelector(".clergy-group-count")?.textContent,
    "1",
  );
  fireEvent.click(screen.getByRole("tab", { name: "Seating studio" }));
  assert.equal(document.body.style.overflow, "");
  fireEvent.click(screen.getByRole("tab", { name: "Ceremony & clergy" }));
  assert.equal(document.body.style.overflow, "");
  cleanup();
});
