import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { useState } from "react";
import { useDisclosureAnchor } from "../lib/use-disclosure-anchor";

test("disclosure switching compensates for collapse and yields to manual scrolling", async () => {
  const dom = new JSDOM("<html><body></body></html>", {
    url: "http://localhost",
  });
  for (const key of ["window", "document", "Element", "HTMLElement", "Event"])
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
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0,
    scroll = 900,
    headerPosition = 1100;
  dom.window.requestAnimationFrame = (callback) => {
    frames.set(++frameId, callback);
    return frameId;
  };
  dom.window.cancelAnimationFrame = (id) => {
    frames.delete(id);
  };
  dom.window.scrollBy = ((options: ScrollToOptions) => {
    scroll = Math.max(0, scroll + (options.top || 0));
  }) as typeof dom.window.scrollBy;
  const { render, fireEvent, screen, cleanup } =
    await import("@testing-library/react");
  const list = document.createElement("div");
  list.className = "household-list";
  const header = document.createElement("button");
  const expansion = document.createElement("div");
  expansion.className = "family-expansion";
  list.append(header, expansion);
  document.body.append(list);
  list.getAnimations = () => [
    {
      effect: { target: expansion },
      playState: "running",
      pending: false,
    } as unknown as Animation,
  ];
  header.getBoundingClientRect = () =>
    ({ top: headerPosition - scroll }) as DOMRect;
  const advance = () => {
    const pending = Array.from(frames.values());
    frames.clear();
    pending.forEach((callback) => callback(performance.now()));
  };
  function Harness() {
    const [opened, setOpened] = useState("old");
    const anchor = useDisclosureAnchor(opened);
    return (
      <button
        onClick={() => {
          anchor("next", header);
          setOpened("next");
        }}
      >
        Switch family
      </button>
    );
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Switch family" }));
  headerPosition -= 200;
  advance();
  assert.equal(header.getBoundingClientRect().top, 200);
  await new Promise((resolve) => setTimeout(resolve, 600));
  advance();
  assert.ok(
    frames.size > 0,
    "follows a delayed CSS transition beyond a fixed timer",
  );
  headerPosition -= 227;
  advance();
  assert.equal(scroll, 473, "compensates for the full 427px collapse");
  assert.equal(header.getBoundingClientRect().top, 200);
  fireEvent.wheel(window);
  assert.equal(
    frames.size,
    0,
    "user input stops automatic scroll compensation",
  );
  headerPosition -= 50;
  advance();
  assert.equal(scroll, 473);
  cleanup();
  assert.equal(frames.size, 0);
  dom.window.close();
});
