"use client";

import { useRef, useState } from "react";
import type { Person } from "@/lib/types";

export function MentionTextarea({
  value,
  onChange,
  people,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  people: Person[];
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = query === null ? [] : people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  function detectQuery(text: string, cursor: number) {
    const upToCursor = text.slice(0, cursor);
    const at = upToCursor.lastIndexOf("@");
    if (at === -1) return null;
    const between = upToCursor.slice(at + 1);
    if (/\s/.test(between)) return null;
    const before = upToCursor[at - 1];
    if (before && /\w/.test(before)) return null;
    return between;
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);
    const q = detectQuery(text, e.target.selectionStart ?? text.length);
    setQuery(q);
    setActiveIndex(0);
  }

  function selectPerson(person: Person) {
    const el = ref.current;
    if (!el) return;
    const cursor = el.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const at = upToCursor.lastIndexOf("@");
    if (at === -1) return;
    const next = `${value.slice(0, at)}@${person.name} ${value.slice(cursor)}`;
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      const pos = at + person.name.length + 2;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query === null || !matches.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectPerson(matches[activeIndex]);
    } else if (e.key === "Escape") {
      setQuery(null);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 120)}
        placeholder={placeholder}
      />
      {query !== null && matches.length > 0 && (
        <div className="mention-dropdown">
          {matches.map((p, i) => (
            <button
              type="button"
              key={p.id}
              className={`mention-option${i === activeIndex ? " active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectPerson(p);
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
