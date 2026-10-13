import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

test("the small standard-shaped 3D pointer stays clear of controls and text fields", async () => {
  const dom = new JSDOM("<html><body></body></html>", {
    url: "http://localhost",
  });
  for (const key of ["window", "document", "HTMLElement", "Element", "Event"])
    Object.defineProperty(globalThis, key, {
      value: (dom.window as any)[key],
      configurable: true,
    });
  Object.defineProperty(dom.window, "matchMedia", {
    value: () => ({ matches: true, addListener() {}, removeListener() {} }),
    configurable: true,
  });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    writable: true,
    configurable: true,
  });

  const { render, fireEvent, cleanup } = await import("@testing-library/react");
  const { default: ThreeDCursor } =
    await import("../components/three-d-cursor");
  const view = render(
    <>
      <button type="button">Add guest</button>
      <input aria-label="Guest name" />
      <ThreeDCursor />
    </>,
  );
  const button = view.getByRole("button");

  fireEvent.pointerMove(button, {
    pointerType: "mouse",
    clientX: 50,
    clientY: 40,
  });
  const cursor = view.container.querySelector<HTMLElement>(".three-d-cursor")!;
  assert.equal(cursor.dataset.interactive, "true");
  assert.equal(cursor.style.left, "50px");
  assert.equal(cursor.style.top, "40px");
  assert.equal(cursor.style.width, "18px");
  assert.equal(cursor.style.height, "24px");
  assert.ok(cursor.querySelector(".three-d-cursor-surface"));

  fireEvent.pointerMove(view.getByRole("textbox"), {
    pointerType: "mouse",
    clientX: 60,
    clientY: 45,
  });
  assert.equal(cursor.dataset.hidden, "true");
  assert.equal(cursor.dataset.interactive, "false");

  cleanup();
  assert.equal(
    dom.window.document.documentElement.classList.contains("agape-3d-cursor"),
    false,
  );
  dom.window.close();
});
