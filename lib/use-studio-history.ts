"use client";
import { useRef, useState } from "react";
import { State } from "./model";

type Snapshot =
  | (Pick<State, "objects" | "seats"> & {
      room: Pick<State["event"], "room_width_ft" | "room_depth_ft">;
    })
  | Pick<State, "records">;
export function useStudioHistory(
  state: State,
  apply: (s: State) => void,
  mode: "church" | "reception",
) {
  const latest = useRef(state);
  latest.current = state;
  const past = useRef<Snapshot[]>([]),
    future = useRef<Snapshot[]>([]);
  const grouping = useRef(false);
  const [, refresh] = useState(0);
  const capture = (s: State): Snapshot =>
    mode === "church"
      ? { records: s.records.filter((r) => r.kind.startsWith("ceremony_")) }
      : {
          objects: s.objects,
          seats: s.seats,
          room: {
            room_width_ft: s.event.room_width_ft,
            room_depth_ft: s.event.room_depth_ft,
          },
        };
  const restore = (snapshot: Snapshot): State =>
    "records" in snapshot
      ? {
          ...latest.current,
          records: [
            ...latest.current.records.filter(
              (r) => !r.kind.startsWith("ceremony_"),
            ),
            ...snapshot.records,
          ],
        }
      : {
          ...latest.current,
          objects: snapshot.objects,
          event: { ...latest.current.event, ...snapshot.room },
          seats: snapshot.seats.filter((seat) =>
            latest.current.guests.some((g) => g.id === seat.guest_id),
          ),
        };
  function change(next: State) {
    const before = capture(latest.current),
      after = capture(next);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      if (!grouping.current)
        past.current = [...past.current.slice(-49), before];
      else if (!grouped.current) {
        past.current = [...past.current.slice(-49), before];
        grouped.current = true;
      }
      future.current = [];
      refresh((n) => n + 1);
    }
    latest.current = next;
    apply(next);
  }
  const grouped = useRef(false);
  function undo() {
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push(capture(latest.current));
    const next = restore(previous);
    latest.current = next;
    apply(next);
    refresh((n) => n + 1);
  }
  function redo() {
    const nextSnapshot = future.current.pop();
    if (!nextSnapshot) return;
    past.current.push(capture(latest.current));
    const next = restore(nextSnapshot);
    latest.current = next;
    apply(next);
    refresh((n) => n + 1);
  }
  return {
    change,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    begin: () => {
      grouping.current = true;
      grouped.current = false;
    },
    end: () => {
      grouping.current = false;
      grouped.current = false;
    },
  };
}
