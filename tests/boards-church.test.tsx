import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { sample, State } from "../lib/model.ts";
test("photo boards retain images and captions; church pew edits and assignments persist independently", async () => {
  const dom = new JSDOM("<html><body></body></html>", {
    url: "http://localhost",
  });
  for (const k of ["window", "document", "HTMLElement", "Event", "FormData"])
    Object.defineProperty(globalThis, k, {
      value: (dom.window as any)[k],
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
  const { render, screen, fireEvent, waitFor, cleanup } =
    await import("@testing-library/react");
  const { default: PhotoBoard } = await import("../components/photo-board.tsx");
  let state = sample();
  state.records = state.records.filter((r) => !r.kind.startsWith("ceremony_"));
  let updated: State = state;
  const board = render(
    <PhotoBoard
      state={state}
      change={(s) => (updated = s)}
      kind="inspiration"
      demo
      ready
    />,
  );
  fireEvent.click(screen.getByLabelText("Add to inspiration"));
  fireEvent.click(screen.getByRole("button", { name: "Inspiration" }));
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "White roses" },
  });
  fireEvent.change(screen.getByLabelText("Image link"), {
    target: { value: "https://example.com/roses.jpg" },
  });
  fireEvent.change(screen.getByLabelText("Caption"), {
    target: { value: "For the ceremony" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Save idea" }).closest("form")!,
  );
  await waitFor(() =>
    assert.equal(updated.records.at(-1)?.title, "White roses"),
  );
  board.rerender(
    <PhotoBoard
      state={updated}
      change={(s) => (updated = s)}
      kind="inspiration"
      demo
      ready
    />,
  );
  assert.equal(
    screen.getByRole("img", { name: "White roses" }).getAttribute("src"),
    "https://example.com/roses.jpg",
  );
  assert.equal(screen.queryByText("For the ceremony"), null);
  fireEvent.click(screen.getByRole("button", { name: "Open White roses" }));
  assert.equal((screen.getByLabelText("Caption") as HTMLTextAreaElement).value, "For the ceremony");
  cleanup();
  const { default: Church } = await import("../components/church-seating.tsx");
  state.records.push(
    ...["Mark", "Bishop David", "Father John"].map((title, i) => ({
      ...state.records[0],
      id: crypto.randomUUID(),
      kind: "ceremony_clergy",
      title,
      details: { role: ["Deacon", "Bishop", "Priest"][i] },
    })),
  );
  const deacon = state.records.find((r) => r.title === "Mark")!;
  const initialSeats = JSON.stringify(state.seats);
  const church = render(<Church state={state} change={(s) => (updated = s)} />);

  fireEvent.change(screen.getByLabelText("Assign clergy"), {
    target: { value: "Mark" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Mark" }));
  state = updated;
  church.rerender(<Church state={state} change={(s) => (updated = s)} />);
  assert.equal(
    screen.getByLabelText("Assign clergy").getAttribute("value"),
    "",
  );
  assert.ok(screen.getAllByText("Mark").length);
  fireEvent.change(screen.getByLabelText("People per pew"), {
    target: { value: "3" },
  });
  assert.equal(
    JSON.parse(
      updated.records.find((r) => r.details?.layout)?.details?.layout || "{}",
    ).pews[0].capacity,
    3,
  );
  assert.equal(JSON.stringify(updated.seats), initialSeats);
  assert.ok(screen.getByText("Iconostasis"));
  assert.ok(screen.getByText("Altar"));
  fireEvent.click(screen.getByRole("button", { name: "Browse names" }));
  assert.ok(screen.getByRole("button", { name: "Bishop David" }));
  assert.ok(screen.getByRole("button", { name: "Father John" }));
  assert.equal(
    screen.queryByRole("option", { name: state.guests[0].name }),
    null,
  );
  fireEvent.change(screen.getByLabelText("People per pew"), {
    target: { value: "120" },
  });
  assert.equal(
    JSON.parse(updated.records.find((r) => r.details?.layout)!.details!.layout)
      .pews[0].capacity,
    120,
  );
  state = updated;
  church.rerender(<Church state={state} change={(s) => (updated = s)} />);
  fireEvent.click(screen.getByRole("button", { name: "Add pew" }));
  assert.equal(
    JSON.parse(
      updated.records.find((r) => r.details?.layout)!.details!.layout,
    ).pews.filter((p: any) => p.kind === "pew").length,
    6,
  );
  state = updated;
  church.rerender(<Church state={state} change={(s) => (updated = s)} />);
  fireEvent.click(screen.getByRole("button", { name: "Remove pew" }));
  assert.equal(
    JSON.parse(
      updated.records.find((r) => r.details?.layout)!.details!.layout,
    ).pews.filter((p: any) => p.kind === "pew").length,
    5,
  );
  state = updated;
  church.rerender(<Church state={state} change={(s) => (updated = s)} />);
  Object.defineProperty(window, "PointerEvent", {
    value: dom.window.MouseEvent,
    configurable: true,
  });
  const plan = screen.getByRole("img", {
    name: "Church clergy seating floor plan",
  });
  Object.defineProperty(plan, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, width: 700, height: 350 }),
  });
  const altar = screen.getByRole("button", { name: "Move altar" });
  fireEvent.pointerDown(altar, { clientX: 100, clientY: 100, button: 0 });
  fireEvent.pointerMove(
    screen.getByRole("img", { name: "Church clergy seating floor plan" }),
    { clientX: 120, clientY: 120 },
  );
  fireEvent.pointerUp(
    screen.getByRole("img", { name: "Church clergy seating floor plan" }),
    { clientX: 120, clientY: 120 },
  );
  const moved = JSON.parse(
    updated.records.find((r) => r.details?.layout)!.details!.layout,
  );
  assert.equal(moved.altar.x, 34);
  assert.equal(moved.altar.y, 5);
  state = updated;
  church.rerender(<Church state={state} change={(s) => (updated = s)} />);
  fireEvent.keyDown(screen.getByRole("button", { name: "bride throne" }), {
    key: "ArrowLeft",
  });
  assert.equal(
    JSON.parse(updated.records.find((r) => r.details?.layout)!.details!.layout)
      .bride.x,
    41.5,
  );
  state = updated;
  church.rerender(<Church state={state} change={(s) => (updated = s)} />);
  fireEvent.click(screen.getByRole("button", { name: "Move Deacon pew 1" }));
  const resize = screen.getByRole("button", { name: "Resize pew-0" });
  fireEvent.pointerDown(resize, { clientX: 100, clientY: 100, button: 0 });
  fireEvent.pointerMove(
    screen.getByRole("img", { name: "Church clergy seating floor plan" }),
    { clientX: 90, clientY: 120 },
  );
  fireEvent.pointerUp(
    screen.getByRole("img", { name: "Church clergy seating floor plan" }),
    { clientX: 90, clientY: 120 },
  );
  const resized = JSON.parse(
    updated.records.find((r) => r.details?.layout)!.details!.layout,
  );
  assert.equal(resized.pews[0].width, 14);
  assert.equal(resized.pews[0].depth, 3);
  assert.equal(resized.pews[0].x, 23);
  assert.equal(resized.pews[0].y, 16);
  cleanup();
  const { default: Ceremony } = await import("../components/ceremony.tsx");
  render(<Ceremony state={updated} change={(s) => (updated = s)} />);
  fireEvent.click(screen.getByRole("tab", { name: "Seating studio" }));
  assert.ok(
    screen.getByRole("img", { name: "Church clergy seating floor plan" }),
  );
  assert.equal(
    screen
      .getByRole("tab", { name: "Seating studio" })
      .getAttribute("aria-selected"),
    "true",
  );
  cleanup();
});
