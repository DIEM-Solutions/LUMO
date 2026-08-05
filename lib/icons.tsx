const PATHS: Record<string, string> = {
  home: '<path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5a1 1 0 0 1-1-1v-3.5h-3V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  projects: '<rect x="2.5" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="10.5" y="3" width="7" height="4.5" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="10.5" y="9.5" width="7" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="2.5" y="12" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="1.5"/>',
  planning: '<rect x="2.5" y="3.5" width="15" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 8h15M6.5 2v3M13.5 2v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  capacity: '<circle cx="10" cy="6.2" r="2.7" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 17c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  recap: '<path d="M4 16.5V10M10 16.5V4M16 16.5V8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M2.5 16.5h15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  documents: '<path d="M5.5 2.5h6L15.5 6.5V16a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M11.5 2.5V6a1 1 0 0 0 1 1h3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6.5 10.5h6M6.5 13.2h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  dayoff: '<rect x="2.5" y="3.5" width="15" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 8h15M6.5 2v3M13.5 2v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 12.3 9 14.3 13.2 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  settings: '<circle cx="10" cy="10" r="2.6" stroke="currentColor" stroke-width="1.5"/><path d="M10 3v2M10 15v2M17 10h-2M5 10H3M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  switch:
    '<path d="M6 3 3 6l3 3M3 6h9a3 3 0 0 1 3 3v1M14 17l3-3-3-3M17 14H8a3 3 0 0 1-3-3v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}
