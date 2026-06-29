import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadContacts } from "./load-contacts";

export const loadContactsForUser = cache(async (userId: string) => {
  const supabase = await createClient();
  return loadContacts(supabase, userId);
});