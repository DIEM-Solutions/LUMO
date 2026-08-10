export function DiemWordmark({ logoUrl, large }: { logoUrl?: string | null; large?: boolean }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="DIEM" className={`diem-logo-img${large ? " lg" : ""}`} />
    );
  }
  return <span className="wm-text">DIEM</span>;
}
