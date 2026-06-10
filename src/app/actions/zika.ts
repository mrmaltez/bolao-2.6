"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitZikaVote(targetId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return { success: false, error: "Usuário não autenticado." };
  if (user.id === targetId) return { success: false, error: "Você não pode zikar a si mesmo!" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: existingVote, error: fetchError } = await (supabase as any)
    .from("zika_votes")
    .select("id")
    .eq("voter_id", user.id)
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString())
    .limit(1)
    .maybeSingle();

  if (fetchError) return { success: false, error: "Erro ao validar voto." };
  if (existingVote) return { success: false, error: "Você já gastou sua zika de hoje!" };

  const { error: insertError } = await (supabase as any)
    .from("zika_votes")
    .insert({ voter_id: user.id, target_id: targetId });

  if (insertError) return { success: false, error: "Falha ao registrar a zika." };

  return { success: true };
}

/**
 * Lê o campo zika_punished direto do perfil — simples e confiável.
 */
export async function checkZikaPenalty(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("zika_punished")
    .eq("id", userId)
    .single();

  if (error || !data) return false;
  return data.zika_punished === true;
}

/**
 * Chamado pelo ZikaBlocker após os 60 segundos — limpa a punição no banco.
 */
export async function clearZikaPenalty(userId: string): Promise<void> {
  const supabase = await createClient();
  await (supabase as any)
    .from("profiles")
    .update({ zika_punished: false })
    .eq("id", userId);
}

/**
 * Chamado pelo admin ao sincronizar a rodada.
 * Busca votos de HOJE e marca os mais zikados como punidos no banco.
 */
export async function applyZikaPunishments(): Promise<{ punished: string[] }> {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: votes, error } = await (supabase as any)
    .from("zika_votes")
    .select("target_id")
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString());

  if (error || !votes || votes.length === 0) return { punished: [] };

  // Contar votos por target
  const voteCounts: Record<string, number> = {};
  for (const v of votes) {
    voteCounts[v.target_id] = (voteCounts[v.target_id] || 0) + 1;
  }

  const maxVotes = Math.max(...Object.values(voteCounts));
  const mostZikados = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);

  // Zera punições antigas e marca os novos punidos
  await (supabase as any)
    .from("profiles")
    .update({ zika_punished: false })
    .not("id", "is", null);

  await (supabase as any)
    .from("profiles")
    .update({ zika_punished: true })
    .in("id", mostZikados);

  return { punished: mostZikados };
}

/**
 * Pega os nomes dos mais zikados para o Mural Social.
 */
export async function getZikadosDoDia() {
  const supabase = await createClient();

  const { data: profiles } = await (supabase as any)
    .from("profiles")
    .select("username")
    .eq("zika_punished", true);

  if (!profiles || profiles.length === 0) return null;
  return profiles.map((p: any) => p.username).join(", ");
}