import { LoginForm } from "@/components/auth/LoginForm";
import { loadAppSettings } from "@/lib/data/settings";

export default async function LoginPage() {
  const settings = await loadAppSettings();
  return <LoginForm logoUrl={settings.branding.logo_url} />;
}
