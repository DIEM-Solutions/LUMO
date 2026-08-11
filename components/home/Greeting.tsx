export function Greeting({ greeting, message, firstName }: { greeting: string; message: string; firstName: string }) {
  return (
    <div className="home-greeting">
      {greeting}, {firstName}. {message}
    </div>
  );
}
