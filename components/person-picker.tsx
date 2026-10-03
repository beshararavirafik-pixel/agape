"use client";
import { useId, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
type Person = { id: string; name: string; group?: string; detail?: string };
export default function PersonPicker({
  people,
  label,
  choose,
}: {
  people: Person[];
  label: string;
  choose: (id: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false);
  const id = useId();
  const filtered = people.filter((p) =>
    p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <div className="person-picker">
      <label htmlFor={id}>{label}</label>
      <div className="person-picker-input">
        <Search size={16} />
        <input
          id={id}
          autoComplete="off"
          placeholder="Type a name or browse"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && filtered.length === 1) {
              e.preventDefault();
              choose(filtered[0].id);
              setQuery("");
              setOpen(false);
            }
          }}
          aria-controls={id + "-list"}
          aria-expanded={open}
        />
        <button
          type="button"
          aria-label={open ? "Close names" : "Browse names"}
          onClick={() => setOpen(!open)}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      {open && (
        <div
          id={id + "-list"}
          className="person-picker-list"
          aria-label={label + " names"}
        >
          {filtered.map((p, i) => (
            <div key={p.id}>
              {p.group && p.group !== filtered[i - 1]?.group && (
                <h4>{p.group}</h4>
              )}
              <button
                type="button"
                onClick={() => {
                  choose(p.id);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span>{p.name}</span>
                {p.detail && <small>{p.detail}</small>}
              </button>
            </div>
          ))}
          {!filtered.length && <p>No names found.</p>}
        </div>
      )}
    </div>
  );
}
