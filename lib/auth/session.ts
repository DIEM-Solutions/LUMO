import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Person, Permissions } from "@/lib/types";

const NO_PROJECT_CREATE_LEVELS = new Set(["Intern", "Junior Innovation Lead"]);

/**
 * Every layout and page calls this to check who's logged in -- often
 * several times per navigation (root layout, the page itself, sometimes a
 * nested component). Each call was doing a real network round-trip to
 * Supabase's auth server plus a `people` lookup. Wrapped in React's
 * `cache()` so repeated calls within the same request reuse the first
 * result instead of re-fetching identical, unchanging-within-this-request
 * data three-plus times per navigation.
 */
export const getCurrentPerson = cache(async (): Promise<Person | null> => {
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

  if (data) return data as Person;

  // Auth user exists but people.auth_user_id was never set (trigger missing,
  // case-mismatched email, or account created before migrations). Try to link.
  const { data: linked, error } = await supabase.rpc("ensure_person_for_auth_user");
  if (error || !linked) return null;

  return linked as Person;
});

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
  const canCreateProjects = !!p.canCreateProjects && !NO_PROJECT_CREATE_LEVELS.has(person.role ?? "");
  return {
    isAdmin: false,
    canCreateProjects,
    canEditTeam: !!p.canEditTeam,
    canFinalizeRecap: !!p.canFinalizeRecap,
    canUploadDocuments: true,
    canApproveDayOff: !!p.canApproveDayOff,
  };
}

export function can(person: Person | null, key: keyof EffectivePermissions) {
  return personPermissions(person)[key];
}
