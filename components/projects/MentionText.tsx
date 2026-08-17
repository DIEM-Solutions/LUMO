import { splitMentions } from "@/lib/domain/mentions";
import type { Person } from "@/lib/types";

export function MentionText({ text, people }: { text: string; people: Person[] }) {
  const segments = splitMentions(text, people);
  return (
    <>
      {segments.map((seg, i) =>
        seg.personId ? (
          <span className="mention-chip" key={i}>
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}
