import type { Person } from "@/lib/types";

/** Every person whose full name appears as an "@Full Name" token in the text. */
export function parseMentionedIds(text: string, people: Person[]): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const p of people) {
    const escaped = p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`@${escaped}\\b`).test(text)) found.add(p.id);
  }
  return Array.from(found);
}

/** Splits text into plain-text and mention segments for rendering. */
export type MentionSegment = { text: string; personId: string | null };

export function splitMentions(text: string, people: Person[]): MentionSegment[] {
  if (!text) return [];
  const byName = [...people].sort((a, b) => b.name.length - a.name.length);
  if (!byName.length) return [{ text, personId: null }];

  const pattern = byName.map((p) => p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`@(${pattern})\\b`, "g");
  const segments: MentionSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > lastIndex) segments.push({ text: text.slice(lastIndex, match.index), personId: null });
    const person = byName.find((p) => p.name === match![1]);
    segments.push({ text: match[0], personId: person?.id ?? null });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), personId: null });
  return segments;
}
