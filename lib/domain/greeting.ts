const MESSAGES = [
  "Have a productive day.",
  "Make it a great one.",
  "Let's get things done today.",
  "Wishing you a focused, productive day.",
  "Have a great day ahead.",
];

export function timeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function motivationalMessage(date: Date = new Date()): string {
  return MESSAGES[date.getDate() % MESSAGES.length];
}
