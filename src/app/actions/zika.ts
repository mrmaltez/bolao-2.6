"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Registra o voto de zika do usuário logado em um alvo.
 * Limite: 1 voto por usuário por dia.
 */
export async function submitZikaVote(targetId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Usuário não autenticado." };
  }

  if (user.id === targetId) {
    return { success: false, error: "Você não pode zikar a si mesmo!" };
  }

  // Verificar se já votou hoje (horário UTC local)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Bypass tipagem: (supabase as any) para não precisar mexer no database.types.ts
  const { data: existingVote, error: fetchError } = await (supabase as any)
    .from("zika_votes")
    .select("id")
    .eq("voter_id", user.id)
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString())
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error("[Zika] Erro ao buscar votos de hoje:", fetchError);
    return { success: false, error: "Erro ao validar voto." };
  }

  if (existingVote) {
    return { success: false, error: "Você já gastou sua zika de hoje!" };
  }

  // Inserir voto fazendo bypass da tipagem
  const { error: insertError } = await (supabase as any)
    .from("zika_votes")
    .insert({
      voter_id: user.id,
      target_id: targetId,
    });

  if (insertError) {
    console.error("[Zika] Erro ao inserir voto:", insertError);
    return { success: false, error: "Falha ao registrar a zika." };
  }

  return { success: true };
}

/**
 * Pega os votos do dia anterior e retorna os IDs mais zikados.
 * Em caso de empate, todos os empatados em 1º são retornados.
 */
async function getZikadosDeOntem(supabase: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: votes, error } = await supabase
    .from("zika_votes")
    .select("target_id")
    .gte("created_at", yesterday.toISOString())
    .lt("created_at", today.toISOString());

  if (error || !votes || votes.length === 0) {
    return [];
  }

  // Contar votos por target_id
  const voteCounts: Record<string, number> = {};
  for (const v of votes) {
    voteCounts[v.target_id] = (voteCounts[v.target_id] || 0) + 1;
  }

  // Achar o valor máximo
  let maxVotes = 0;
  for (const count of Object.values(voteCounts)) {
    if (count > maxVotes) maxVotes = count;
  }

  // Pegar todos os que tiveram o máximo (desempate: todos sofrem)
  const mostZikados = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);

  return mostZikados;
}

/**
 * Verifica se o usuário logado está na lista de punidos de ontem.
 */
export async function checkZikaPenalty(userId: string) {
  const supabase = await createClient();
  const mostZikados = await getZikadosDeOntem(supabase as any);
  return mostZikados.includes(userId);
}

/**
 * Pega os nomes dos mais zikados de ontem para o Mural Social.
 */
export async function getZikadosDoDia() {
  const supabase = await createClient();
  const mostZikados = await getZikadosDeOntem(supabase as any);

  if (mostZikados.length === 0) return null;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("username")
    .in("id", mostZikados);

  if (!profiles || profiles.length === 0) return null;

  return profiles.map((p: any) => p.username).join(", ");
}
