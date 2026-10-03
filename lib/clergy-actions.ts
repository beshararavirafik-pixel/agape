import { State } from "./model";
export const clergyRoles = ["Bishop", "Priest", "Deacon"] as const;
export function changeClergyRole(
  state: State,
  id: string,
  role: string,
): State {
  if (!clergyRoles.some((r) => r === role)) return state;
  return {
    ...state,
    records: state.records.map((r) =>
      r.id === id && r.kind === "ceremony_clergy"
        ? { ...r, details: { ...r.details, role } }
        : r.assignee_id === id && role !== "Deacon"
          ? { ...r, assignee_id: null }
          : r,
    ),
  };
}

export function sortClergy<
  T extends { title: string; details?: Record<string, string> },
>(people: T[]): T[] {
  const rank = ["Bishop", "Priest", "Deacon"];
  return [...people].sort((a, b) => {
    const ar = rank.indexOf(a.details?.role || "Deacon"),
      br = rank.indexOf(b.details?.role || "Deacon");
    return (
      ar - br || a.title.localeCompare(b.title, "en", { sensitivity: "base" })
    );
  });
}
