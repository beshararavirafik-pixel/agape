const locks = new WeakMap<HTMLElement, { count: number; previous: string }>();
export function lockBodyScroll() {
  const body = document.body;
  let lock = locks.get(body);
  if (!lock) {
    lock = { count: 0, previous: body.style.overflow };
    locks.set(body, lock);
  }
  lock.count++;
  body.style.overflow = "hidden";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--lock!.count === 0) {
      body.style.overflow = lock!.previous;
      locks.delete(body);
    }
  };
}
