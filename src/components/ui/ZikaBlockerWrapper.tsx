import { createClient } from "@/lib/supabase/server";
import { ZikaBlocker } from "@/components/ui/ZikaBlocker";
import { checkZikaPenalty } from "@/app/actions/zika";

export async function ZikaBlockerWrapper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const isPunished = await checkZikaPenalty(user.id);

  return <ZikaBlocker isPunished={isPunished} userId={user.id} />;
}
