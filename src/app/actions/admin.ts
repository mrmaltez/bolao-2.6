"use server";

import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

// ================================================================
// SYNC PRINCIPAL (inalterado)
// ================================================================

export async function syncMatchResults() {
  console.log("[Admin Sync] Iniciando sincronização de placares...");

  try {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!token) throw new Error("FOOTBALL_DATA_TOKEN não configurada no servidor.");

    const response = await fetch("https://api.football-data.org/v4/competitions/BSA/matches", {
      headers: { "X-Auth-Token": token },
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`Erro na API football-data.org: Status ${response.status}`);

    const data = await response.json();

    if (data.matches?.length > 0) {
      console.log("Status de um jogo de exemplo da API:", data.matches[0].status);
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");

    const adminClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    );

    const finishedMatches =
      data.matches?.filter(
        (m: any) => m.status && m.status.toUpperCase() === "FINISHED"
      ) || [];

    if (finishedMatches.length === 0) {
      console.log("[Admin Sync] Nenhuma partida finalizada no momento.");
      return { success: true, count: 0, message: "Nenhum jogo finalizado encontrado." };
    }

    const upsertData = finishedMatches.map((m: any) => ({
      id: m.id,
      home_team: m.homeTeam?.shortName || m.homeTeam?.name || "TBD",
      away_team: m.awayTeam?.shortName || m.awayTeam?.name || "TBD",
      match_start_time: m.utcDate,
      home_score: m.score?.fullTime?.home ?? null,
      away_score: m.score?.fullTime?.away ?? null,
      status: (m.status ? m.status.toUpperCase() : "SCHEDULED") as any,
    }));

    const { error } = await adminClient
      .from("matches")
      .upsert(upsertData, { onConflict: "id" });

    if (error) {
      console.error("[Admin Sync] Erro detalhado do Supabase:", error);
      throw new Error(`Falha no upsert: ${error.message}`);
    }

    // ── Calcula pontos ────────────────────────────────────────
    console.log("[Admin Sync] Calculando pontos dos usuários...");
    const scoringPromises = upsertData
      .filter((m: any) => m.home_score !== null && m.away_score !== null)
      .map((m: any) => scoreMatches(adminClient, m.id, m.home_score, m.away_score));

    await Promise.all(scoringPromises);
    console.log(`[Admin Sync] Motor de pontuação executado para ${scoringPromises.length} partidas.`);

    // ── Mural Social ──────────────────────────────────────────
    const matchesOrdenadas = finishedMatches
      .slice()
      .sort((a: any, b: any) =>
        new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
      );

    for (let i = 0; i < matchesOrdenadas.length; i++) {
      const match = matchesOrdenadas[i];
      const isLatest = i >= matchesOrdenadas.length - 2;
      await syncMuralSocial(adminClient, Number(match.id), isLatest);
    }

    // ── Zika da Rodada ────────────────────────────────────────
    console.log("[Admin Sync] Aplicando punições de zika...");
    const { punished } = await applyZikaPunishments(adminClient);
    if (punished.length > 0) {
      console.log(`[Admin Sync] Zika aplicada para ${punished.length} jogador(es).`);
    } else {
      console.log("[Admin Sync] Nenhum voto de zika registrado hoje.");
    }

    console.log(`[Admin Sync] Sincronização concluída! ${finishedMatches.length} partidas atualizadas.`);
    return {
      success: true,
      count: finishedMatches.length,
      message: `${finishedMatches.length} placar(es) sincronizado(s) com sucesso.`,
    };

  } catch (error: any) {
    console.error("[Admin Sync] Falha crítica na rotina:", error);
    return { success: false, error: error.message || "Erro interno do servidor." };
  }
}

// ================================================================
// PALPITES ESPECIAIS — acionado manualmente pelo admin no fim do campeonato
// ================================================================

/**
 * Computa os pontos bônus de palpites especiais (Campeão + Final).
 * - Acertar o Campeão: +30 pts
 * - Acertar os dois finalistas (ordem não importa): +30 pts
 * - Máximo: 60 pts por usuário
 *
 * Idempotente: usuários com especiais_computados = true são ignorados,
 * então pode ser acionado mais de uma vez sem risco de duplicar pontos.
 *
 * @param campeao   Nome exato da seleção campeã (ex: "Brasil")
 * @param finalista1 Primeiro finalista (ex: "Brasil")
 * @param finalista2 Segundo finalista (ex: "Argentina")
 */
export async function scoreSpecialBets(
  campeao: string,
  finalista1: string,
  finalista2: string
): Promise<{ success: boolean; processed: number; error?: string }> {
  console.log(`[Special Bets] Iniciando cômputo — Campeão: ${campeao} | Final: ${finalista1} vs ${finalista2}`);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return { success: false, processed: 0, error: "SUPABASE_SERVICE_ROLE_KEY não configurada." };
  }

  const adminClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  try {
    // Busca apenas quem ainda não teve os especiais computados
    const { data: profiles, error: fetchError } = await (adminClient as any)
      .from("profiles")
      .select("id, palpite_campeao, palpite_final, pontos_total, pontos_especiais")
      .eq("especiais_computados", false);

    if (fetchError) {
      console.error("[Special Bets] Erro ao buscar profiles:", fetchError.message);
      return { success: false, processed: 0, error: fetchError.message };
    }

    if (!profiles || profiles.length === 0) {
      console.log("[Special Bets] Nenhum usuário pendente de cômputo.");
      return { success: true, processed: 0 };
    }

    // Normaliza para comparação case-insensitive
    const normalize = (s: string) => s?.trim().toLowerCase() ?? "";
    const campeaoNorm = normalize(campeao);
    const f1Norm = normalize(finalista1);
    const f2Norm = normalize(finalista2);

    let processed = 0;

    for (const profile of profiles) {
      let pontosEspeciais = 0;

      // ── Acerto do Campeão ──────────────────────────────────
      if (normalize(profile.palpite_campeao) === campeaoNorm) {
        pontosEspeciais += 30;
        console.log(`[Special Bets] ✅ Campeão acertado pelo user ${profile.id} (+30)`);
      }

      // ── Acerto da Final (ordem não importa) ───────────────
      if (profile.palpite_final) {
        // Suporta separadores "vs", "x" ou "X"
        const partes = profile.palpite_final
          .split(/\s+(?:vs|x|X)\s+/i)
          .map((s: string) => normalize(s.trim()));

        const [p1, p2] = partes;

        const acertouFinal =
          p1 !== undefined &&
          p2 !== undefined &&
          ((p1 === f1Norm && p2 === f2Norm) ||
            (p1 === f2Norm && p2 === f1Norm));

        if (acertouFinal) {
          pontosEspeciais += 30;
          console.log(`[Special Bets] ✅ Final acertada pelo user ${profile.id} (+30)`);
        }
      }

      // ── Atualiza profile ───────────────────────────────────
      const novoTotal = (profile.pontos_total ?? 0) + pontosEspeciais;

      const { error: updateError } = await (adminClient as any)
        .from("profiles")
        .update({
          pontos_especiais: pontosEspeciais,
          pontos_total: novoTotal,
          especiais_computados: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) {
        console.error(`[Special Bets] Erro ao atualizar user ${profile.id}:`, updateError.message);
        continue;
      }

      console.log(`[Special Bets] User ${profile.id} — +${pontosEspeciais} pts especiais | Total: ${novoTotal}`);
      processed++;
    }

    console.log(`[Special Bets] ✅ Concluído — ${processed} usuário(s) processado(s).`);
    return { success: true, processed };

  } catch (err: any) {
    console.error("[Special Bets] Falha crítica:", err);
    return { success: false, processed: 0, error: err.message };
  }
}

// ================================================================
// ZIKA
// ================================================================

async function applyZikaPunishments(
  adminClient: SupabaseClient<Database>
): Promise<{ punished: string[] }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: votes, error } = await (adminClient as any)
    .from("zika_votes")
    .select("target_id")
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString());

  if (error) {
    console.error("[Zika] Erro ao buscar votos:", error.message);
    return { punished: [] };
  }

  if (!votes || votes.length === 0) return { punished: [] };

  const voteCounts: Record<string, number> = {};
  for (const v of votes) {
    voteCounts[v.target_id] = (voteCounts[v.target_id] || 0) + 1;
  }

  const maxVotes = Math.max(...Object.values(voteCounts));
  const mostZikados = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);

  const { error: clearError } = await (adminClient as any)
    .from("profiles")
    .update({ zika_punished: false })
    .not("id", "is", null);

  if (clearError) {
    console.error("[Zika] Erro ao zerar punições:", clearError.message);
    return { punished: [] };
  }

  const { error: punishError } = await (adminClient as any)
    .from("profiles")
    .update({ zika_punished: true })
    .in("id", mostZikados);

  if (punishError) {
    console.error("[Zika] Erro ao marcar punidos:", punishError.message);
    return { punished: [] };
  }

  console.log("[Zika] Punidos:", mostZikados);
  return { punished: mostZikados };
}

// ================================================================
// MURAL SOCIAL
// ================================================================

async function syncMuralSocial(
  adminClient: SupabaseClient<Database>,
  matchId: number,
  isLatest: boolean
) {
  console.log(`[Mural Social] Processando match_id: ${matchId} | regerando: ${isLatest}`);

  if (isLatest) {
    console.log(`[Mural Social] Regerando snapshot para match_id: ${matchId}...`);
    const { error: snapshotError } = await adminClient.rpc("gerar_snapshot", {
      p_match_id: matchId,
    });
    if (snapshotError) {
      console.error("[Mural Social] Erro ao gerar snapshot:", snapshotError.message);
      return;
    }
  } else {
    const { data: existing } = await adminClient
      .from("ranking_snapshot")
      .select("id")
      .eq("match_id", matchId)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      console.log(`[Mural Social] Gerando snapshot para match_id: ${matchId}...`);
      const { error: snapshotError } = await adminClient.rpc("gerar_snapshot", {
        p_match_id: matchId,
      });
      if (snapshotError) {
        console.error("[Mural Social] Erro ao gerar snapshot:", snapshotError.message);
        return;
      }
    } else {
      console.log(`[Mural Social] Snapshot antigo preservado para match_id: ${matchId}.`);
      return;
    }
  }

  const { error: muralError } = await adminClient.rpc("calcular_mural_social", {
    p_match_id: matchId,
  });

  if (muralError) {
    console.error("[Mural Social] Erro ao calcular mural:", muralError.message);
    return;
  }

  console.log(`[Mural Social] ✅ Mural atualizado para match_id: ${matchId}`);
}

// ================================================================
// PONTUAÇÃO DE PARTIDAS
// ================================================================

async function calculatePoints(
  homeBet: number,
  awayBet: number,
  homeScore: number,
  awayScore: number
): Promise<number> {
  if (homeBet === homeScore && awayBet === awayScore) return 10;

  let points = 0;
  const betWinner = homeBet > awayBet ? "home" : homeBet < awayBet ? "away" : "draw";
  const actualWinner = homeScore > awayScore ? "home" : homeScore < awayScore ? "away" : "draw";

  if (betWinner === actualWinner) points += 5;
  if (homeBet === homeScore) points += 2;
  if (awayBet === awayScore) points += 2;

  return points;
}

async function scoreMatches(
  adminClient: SupabaseClient<Database>,
  matchId: string,
  homeScore: number,
  awayScore: number
) {
  console.log(`[Admin Sync] Procurando palpites para o jogo ID: ${matchId}`);

  const { data: bets, error: fetchError } = await adminClient
    .from("bets")
    .select("id, user_id, home_score_bet, away_score_bet")
    .eq("match_id", matchId);

  if (fetchError) {
    console.error(`[Admin Sync] Erro ao buscar palpites para o jogo ${matchId}:`, fetchError);
    return;
  }

  console.log(`[Admin Sync] Palpites encontrados para o jogo ${matchId}:`, bets);
  if (!bets || bets.length === 0) return;

  type BetPartial = { id: string; user_id: string; home_score_bet: number; away_score_bet: number };
  const typedBets = bets as BetPartial[];

  for (const bet of typedBets) {
    const pontos = await calculatePoints(bet.home_score_bet, bet.away_score_bet, homeScore, awayScore);
    console.log(`[Admin Sync] Palpite do user ${bet.user_id}: ${bet.home_score_bet}x${bet.away_score_bet} | Real: ${homeScore}x${awayScore} | Pontos calculados: ${pontos}`);

    const { error: updateError } = await adminClient
      .from("bets")
      .update({ pontos, updated_at: new Date().toISOString() })
      .eq("id", bet.id);

    if (updateError) {
      console.error(`[Admin Sync] Erro ao atualizar pontos (bet_id: ${bet.id}):`, updateError);
    }
  }

  const userIds = [...new Set(bets.map((b) => b.user_id))];

  for (const userId of userIds) {
    const { data: userBets, error: userBetsError } = await adminClient
      .from("bets")
      .select("pontos")
      .eq("user_id", userId)
      .not("pontos", "is", null);

    if (userBetsError) {
      console.error(`[Admin Sync] Erro ao buscar histórico de apostas para ${userId}:`, userBetsError);
      continue;
    }

    if (userBets) {
      type UserBetPartial = { pontos: number | null };

      // Soma pontos de partidas + pontos especiais já computados
      const pontosPartidas = (userBets as UserBetPartial[]).reduce(
        (acc, curr) => acc + (curr.pontos || 0), 0
      );

      // Busca pontos_especiais do profile para não perder na recalculação
      const { data: profileData } = await (adminClient as any)
        .from("profiles")
        .select("pontos_especiais")
        .eq("id", userId)
        .single();

      const pontosEspeciais = profileData?.pontos_especiais ?? 0;
      const totalPoints = pontosPartidas + pontosEspeciais;

      console.log(`[Admin Sync] Atualizando profile do usuário ${userId} — partidas: ${pontosPartidas} + especiais: ${pontosEspeciais} = ${totalPoints}`);

      const { error: profileUpdateError } = await adminClient
        .from("profiles")
        .update({ pontos_total: totalPoints, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (profileUpdateError) {
        console.error(`[Admin Sync] Erro ao atualizar pontos_total (user_id: ${userId}):`, profileUpdateError);
      }
    }
  }
}