import { createClient } from "@/lib/supabase/server";
import type { Person, Permissions } from "@/lib/types";

export async function getCurrentPerson(): Promise<Person | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("people")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return data as Person | null;
}

export type EffectivePermissions = Required<Permissions> & { isAdmin: boolean };

export function personPermissions(person: Person | null): EffectivePermissions {
  const empty: EffectivePermissions = {
    isAdmin: false,
    canCreateProjects: false,
    canEditTeam: false,
    canFinalizeRecap: false,
    canUploadDocuments: false,
    canApproveDayOff: false,
  };

  if (!person) return empty;

  if (person.role_type === "ceo" || person.role_type === "admin") {
    return {
      isAdmin: true,
      canCreateProjects: true,
      canEditTeam: true,
      canFinalizeRecap: true,
      canUploadDocuments: true,
      canApproveDayOff: true,
    };
  }

  const p = person.permissions ?? {};
  return {
    isAdmin: false,
    canCreateProjects: !!p.canCreateProjects,
    canEditTeam: !!p.canEditTeam,
    canFinalizeRecap: !!p.canFinalizeRecap,
    canUploadDocuments: !!p.canUploadDocuments,
    canApproveDayOff: !!p.canApproveDayOff,
  };
}

export function can(person: Person | null, key: keyof EffectivePermissions) {
  return personPermissions(person)[key];
}
