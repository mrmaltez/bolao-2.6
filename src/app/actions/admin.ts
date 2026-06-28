"use server";

import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";


// Mapeia todos os status da API football-data.org para os valores aceitos pelo banco
function mapStatus(apiStatus: string | undefined): "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" {
  switch ((apiStatus ?? "").toUpperCase()) {
    case "FINISHED": return "FINISHED";
    case "IN_PLAY": return "LIVE";
    case "PAUSED": return "LIVE";
    case "POSTPONED": return "POSTPONED";
    case "CANCELLED": return "POSTPONED";
    case "SUSPENDED": return "POSTPONED";
    case "TIMED": return "SCHEDULED"; // API retorna TIMED para jogos agendados com horário
    case "SCHEDULED": return "SCHEDULED";
    default: return "SCHEDULED";
  }
}

/**
 * Extrai o placar do TEMPO REGULAMENTAR (90 min) de um jogo da API football-data.org v4.
 *
 * Desde a v4, score.regularTime existe SOMENTE quando o jogo foi decidido em
 * prorrogação ou pênaltis (mata-mata). Em jogos sem prorrogação (fase de grupos,
 * ou mata-mata decidido nos 90 min), regularTime não vem no payload — nesse caso
 * fullTime JÁ É o placar regulamentar, e usamos ele como fallback.
 *
 * Isso garante que pontuamos sempre pelo tempo normal, nunca pela prorrogação/pênaltis.
 */
function extractRegularTimeScore(m: any): { home_score: number | null; away_score: number | null } {
  const regular = m.score?.regularTime;
  const full = m.score?.fullTime;

  const home_score = regular?.home ?? full?.home ?? null;
  const away_score = regular?.away ?? full?.away ?? null;

  // Log de auditoria: avisa sempre que um jogo foi decidido fora do tempo normal,
  // mostrando os dois placares para conferência manual.
  const duration = m.score?.duration;
  if (duration && duration !== "REGULAR") {
    console.log(
      `[Admin Sync] ⚠️ Jogo ${m.id} (${m.homeTeam?.shortName ?? m.homeTeam?.name} x ${m.awayTeam?.shortName ?? m.awayTeam?.name}) ` +
      `decidido em ${duration}. Pontuando com tempo regulamentar: ${home_score}x${away_score} ` +
      `| Placar final real do confronto: ${full?.home}x${full?.away}`
    );
  }

  return { home_score, away_score };
}

export async function syncMatchResults() {
  console.log("[Admin Sync] Iniciando sincronização de placares...");

  try {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!token) throw new Error("FOOTBALL_DATA_TOKEN não configurada no servidor.");

    const response = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": token },
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`Erro na API football-data.org: Status ${response.status}`);

    const data = await response.json();

    if (data.matches?.length > 0) {
      console.log(`[Admin Sync] Total de jogos recebidos da API: ${data.matches.length}`);
      console.log("[Admin Sync] Status de um jogo de exemplo:", data.matches[0].status);
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");

    const adminClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    );

    const allMatches: any[] = data.matches || [];

    if (allMatches.length === 0) {
      console.log("[Admin Sync] Nenhuma partida retornada pela API.");
      return { success: true, count: 0, message: "Nenhum jogo encontrado na API." };
    }

    // ── PASSO 1: Upsert de TODOS os jogos (scheduled, live, finished) ──
    // Antes só enviava jogos FINISHED — por isso a grade WC nunca aparecia.
    const allUpsertData = allMatches.map((m: any) => {
      const { home_score, away_score } = extractRegularTimeScore(m);

      return {
        id: m.id,
        home_team: m.homeTeam?.shortName || m.homeTeam?.name || "TBD",
        away_team: m.awayTeam?.shortName || m.awayTeam?.name || "TBD",
        match_start_time: m.utcDate,
        home_score,
        away_score,
        status: mapStatus(m.status),
      };
    });

    const { error: upsertError } = await adminClient
      .from("matches")
      .upsert(allUpsertData, { onConflict: "id" });

    if (upsertError) {
      console.error("[Admin Sync] Erro no upsert de partidas:", upsertError);
      throw new Error(`Falha no upsert: ${upsertError.message}`);
    }

    console.log(`[Admin Sync] ${allUpsertData.length} partida(s) sincronizada(s) no banco.`);

    // ── PASSO 2: Calcular pontos — só para jogos FINISHED com placar ──
    const finishedMatches = allUpsertData.filter(
      (m: any) => m.home_score !== null && m.away_score !== null
    );

    if (finishedMatches.length === 0) {
      console.log("[Admin Sync] Nenhuma partida finalizada para calcular pontos.");
      return {
        success: true,
        count: allUpsertData.length,
        message: `${allUpsertData.length} jogo(s) sincronizado(s). Nenhum finalizado ainda.`,
      };
    }

    console.log("[Admin Sync] Calculando pontos dos usuários...");
    const scoringPromises = finishedMatches.map((m: any) =>
      scoreMatches(adminClient, m.id, m.home_score, m.away_score)
    );

    await Promise.all(scoringPromises);
    console.log(`[Admin Sync] Motor de pontuação executado para ${scoringPromises.length} partidas.`);

    // ── PASSO 3: Mural Social ─────────────────────────────────
    const matchesOrdenadas = finishedMatches
      .slice()
      .sort((a: any, b: any) =>
        new Date(a.match_start_time).getTime() - new Date(b.match_start_time).getTime()
      );

    for (let i = 0; i < matchesOrdenadas.length; i++) {
      const match = matchesOrdenadas[i];
      const isLatest = i >= matchesOrdenadas.length - 2;
      await syncMuralSocial(adminClient, Number(match.id), isLatest);
    }

    // ── PASSO 4: Zika da Rodada ───────────────────────────────
    console.log("[Admin Sync] Aplicando punições de zika...");
    const { punished, skipped } = await applyZikaPunishments(adminClient);
    if (skipped) {
      console.log("[Admin Sync] Zika já aplicada hoje, sync ignorado.");
    } else if (punished.length > 0) {
      console.log(`[Admin Sync] Zika aplicada para ${punished.length} jogador(es).`);
    } else {
      console.log("[Admin Sync] Nenhum voto de zika registrado hoje.");
    }

    console.log(`[Admin Sync] Sincronização concluída! ${allUpsertData.length} no banco · ${finishedMatches.length} pontuado(s).`);
    return {
      success: true,
      count: allUpsertData.length,
      message: `${allUpsertData.length} jogo(s) sincronizado(s) · ${finishedMatches.length} finalizado(s) pontuado(s).`,
    };

  } catch (error: any) {
    console.error("[Admin Sync] Falha crítica na rotina:", error);
    return { success: false, error: error.message || "Erro interno do servidor." };
  }
}

// ================================================================
// PALPITES ESPECIAIS (campeão + finalistas)
// ================================================================

export async function scoreSpecialBets(
  campeao: string,
  finalista1: string,
  finalista2: string
): Promise<{ success: boolean; processed?: number; error?: string }> {
  console.log(`[Special Bets] Processando — Campeão: ${campeao} | Final: ${finalista1} vs ${finalista2}`);

  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");

    const adminClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    );

    const { data: profiles, error: fetchError } = await adminClient
      .from("profiles")
      .select("id, palpite_campeao, palpite_final, pontos_total");

    if (fetchError) throw new Error(fetchError.message);
    if (!profiles || profiles.length === 0) return { success: true, processed: 0 };

    let processed = 0;

    for (const profile of profiles) {
      let bonus = 0;

      if (
        profile.palpite_campeao &&
        profile.palpite_campeao.trim().toLowerCase() === campeao.trim().toLowerCase()
      ) {
        bonus += 30;
        console.log(`[Special Bets] ${profile.id} acertou o campeão (+30)`);
      }

      if (profile.palpite_final) {
        const palpiteFinal = profile.palpite_final.trim().toLowerCase();
        const f1 = finalista1.trim().toLowerCase();
        const f2 = finalista2.trim().toLowerCase();

        const acertouFinal =
          palpiteFinal === `${f1} vs ${f2}` ||
          palpiteFinal === `${f2} vs ${f1}`;

        if (acertouFinal) {
          bonus += 30;
          console.log(`[Special Bets] ${profile.id} acertou a final (+30)`);
        }
      }

      if (bonus > 0) {
        const novoTotal = (profile.pontos_total ?? 0) + bonus;
        const { error: updateError } = await adminClient
          .from("profiles")
          .update({ pontos_total: novoTotal, updated_at: new Date().toISOString() })
          .eq("id", profile.id);

        if (updateError) {
          console.error(`[Special Bets] Erro ao atualizar ${profile.id}:`, updateError.message);
        } else {
          processed++;
        }
      }
    }

    console.log(`[Special Bets] Concluído. ${processed} usuário(s) receberam bônus.`);
    return { success: true, processed };

  } catch (error: any) {
    console.error("[Special Bets] Falha:", error);
    return { success: false, error: error.message || "Erro interno." };
  }
}

// ================================================================
// ZIKA
// ================================================================

async function applyZikaPunishments(
  adminClient: SupabaseClient<Database>
): Promise<{ punished: string[]; skipped: boolean }> {
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: alreadyPunished } = await (adminClient as any)
    .from("profiles")
    .select("id")
    .eq("zika_punished_date", todayStr)
    .limit(1)
    .maybeSingle();

  if (alreadyPunished) {
    console.log("[Zika] Punição já aplicada hoje, pulando.");
    return { punished: [], skipped: true };
  }

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
    return { punished: [], skipped: false };
  }

  if (!votes || votes.length === 0) return { punished: [], skipped: false };

  const voteCounts: Record<string, number> = {};
  for (const v of votes) {
    voteCounts[v.target_id] = (voteCounts[v.target_id] || 0) + 1;
  }

  const maxVotes = Math.max(...Object.values(voteCounts));
  const mostZikados = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);

  const { error: clearError } = await (adminClient as any)
    .from("profiles")
    .update({ zika_punished: false, zika_punished_date: null })
    .not("id", "is", null);

  if (clearError) {
    console.error("[Zika] Erro ao zerar punições:", clearError.message);
    return { punished: [], skipped: false };
  }

  const { error: punishError } = await (adminClient as any)
    .from("profiles")
    .update({ zika_punished: true, zika_punished_date: todayStr })
    .in("id", mostZikados);

  if (punishError) {
    console.error("[Zika] Erro ao marcar punidos:", punishError.message);
    return { punished: [], skipped: false };
  }

  console.log("[Zika] Punidos:", mostZikados);
  return { punished: mostZikados, skipped: false };
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
    const { error: snapshotError } = await adminClient.rpc("gerar_snapshot", {
      p_match_id: matchId,
    });
    if (snapshotError) {
      console.error("[Mural Social] Erro ao gerar snapshot:", snapshotError.message);
      return;
    }
  } else {
    const { data: existing } = await (adminClient as any)
      .from("ranking_snapshot")
      .select("id")
      .eq("match_id", matchId)
      .limit(1)
      .maybeSingle();

    if (!existing) {
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
// PONTUAÇÃO
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
      const totalPoints = (userBets as UserBetPartial[]).reduce(
        (acc, curr) => acc + (curr.pontos || 0), 0
      );
      console.log(`[Admin Sync] Atualizando profile do usuário ${userId} para totalPoints: ${totalPoints}`);

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