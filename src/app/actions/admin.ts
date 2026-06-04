"use server";

import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

export async function syncMatchResults() {
  console.log("[Admin Sync] Iniciando sincronização de placares...");

  try {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!token) {
      throw new Error("FOOTBALL_DATA_TOKEN não configurada no servidor.");
    }

    // Busca direta na API para ter a fonte primária de verdade
    const response = await fetch("https://api.football-data.org/v4/competitions/BSA/matches", {
      headers: {
        "X-Auth-Token": token,
      },
      cache: "no-store", // Garante que nunca usaremos cache nesta requisição vital
    });

    if (!response.ok) {
      throw new Error(`Erro na API football-data.org: Status ${response.status}`);
    }

    const data = await response.json();

    if (data.matches && data.matches.length > 0) {
      console.log('Status de um jogo de exemplo da API:', data.matches[0].status);
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
    }

    // Precisamos do Service Role para bypassar o RLS e fazer o upsert das partidas reais
    const adminClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    );



    // Filtramos apenas as partidas que já terminaram
    const finishedMatches = data.matches?.filter((m: any) => m.status && m.status.toUpperCase() === "FINISHED") || [];

    if (finishedMatches.length === 0) {
      console.log("[Admin Sync] Nenhuma partida finalizada no momento.");
      return { success: true, count: 0, message: "Nenhum jogo finalizado encontrado." };
    }

    // Mapeamento: enviamos os dados completos da partida + os placares,
    // garantindo que, se a partida não existir na tabela (ninguém apostou), ela seja inserida corretamente,
    // e se já existir, atualizamos o score e status.
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

    // Disparar o cálculo de pontos para as partidas finalizadas que possuem placar válido
    console.log("[Admin Sync] Calculando pontos dos usuários...");
    const scoringPromises = upsertData
      .filter((m: any) => m.home_score !== null && m.away_score !== null)
      .map((m: any) => scoreMatches(adminClient, m.id.toString(), m.home_score, m.away_score));

    await Promise.all(scoringPromises);
    console.log(`[Admin Sync] Motor de pontuação executado para ${scoringPromises.length} partidas.`);

    console.log(`[Admin Sync] Sincronização concluída com sucesso! ${finishedMatches.length} partidas atualizadas.`);
    return {
      success: true,
      count: finishedMatches.length,
      message: `${finishedMatches.length} placar(es) sincronizado(s) com sucesso.`
    };

  } catch (error: any) {
    console.error("[Admin Sync] Falha crítica na rotina:", error);
    return { success: false, error: error.message || "Erro interno do servidor durante a sincronização." };
  }
}

/**
 * Função pura para calcular a pontuação de uma aposta individual.
 * Regras:
 * - Placar Cheio (10 pontos): acertou exatamente o placar.
 * - Placar Simples (5 pontos): acertou o time vencedor ou empate.
 * - Acertou Gols (2 pontos por time): soma com o Placar Simples.
 */
async function calculatePoints(
  homeBet: number,
  awayBet: number,
  homeScore: number,
  awayScore: number
): Promise<number> {
  // 1. Placar Cheio
  if (homeBet === homeScore && awayBet === awayScore) {
    return 10;
  }

  let points = 0;

  // Determinar vencedor
  const betWinner = homeBet > awayBet ? "home" : homeBet < awayBet ? "away" : "draw";
  const actualWinner = homeScore > awayScore ? "home" : homeScore < awayScore ? "away" : "draw";

  // 2. Placar Simples
  if (betWinner === actualWinner) {
    points += 5;
  }

  // 3. Acertou Gols (acumula com Placar Simples, mas não entra se já foi Placar Cheio)
  if (homeBet === homeScore) {
    points += 2;
  }
  if (awayBet === awayScore) {
    points += 2;
  }

  return points;
}

async function scoreMatches(
  adminClient: SupabaseClient<Database>,
  matchId: string,
  homeScore: number,
  awayScore: number
) {
  console.log(`[Admin Sync] Procurando palpites para o jogo ID: ${matchId}`);

  // 1. Buscar todos os palpites para a partida
  const { data: bets, error: fetchError } = await adminClient
    .from("bets")
    .select("id, user_id, home_score_bet, away_score_bet")
    .eq("match_id", matchId);

  if (fetchError) {
    console.error(`[Admin Sync] Erro ao buscar palpites para o jogo ${matchId}:`, fetchError);
    return;
  }

  console.log(`[Admin Sync] Palpites encontrados para o jogo ${matchId}:`, bets);

  if (!bets || bets.length === 0) {
    return; // Nenhum palpite encontrado
  }

  // 2. Calcular e atualizar os pontos de cada palpite
  type BetPartial = { id: string; user_id: string; home_score_bet: number; away_score_bet: number };
  const typedBets = bets as BetPartial[];

  for (const bet of typedBets) {
    const pontos = await calculatePoints(bet.home_score_bet, bet.away_score_bet, homeScore, awayScore);

    console.log(`[Admin Sync] Palpite do user ${bet.user_id}: ${bet.home_score_bet}x${bet.away_score_bet} | Real: ${homeScore}x${awayScore} | Pontos calculados: ${pontos}`);

    const { error: updateError } = await adminClient
      .from("bets")
      .update({
        pontos: pontos,
        updated_at: new Date().toISOString()
      })
      .eq("id", bet.id);

    if (updateError) {
      console.error(`[Admin Sync] Erro ao atualizar pontos (bet_id: ${bet.id}) na tabela bets:`, updateError);
    }
  }

  // 3. Atualização Idempotente do Ranking (pontos_total em profiles)
  // Pegar todos os usuários únicos desta partida
  const userIds = [...new Set(bets.map(b => b.user_id))];

  // Para cada usuário, buscar TODAS as apostas com pontos já calculados e somar
  for (const userId of userIds) {
    const { data: userBets, error: userBetsError } = await adminClient
      .from("bets")
      .select("pontos")
      .eq("user_id", userId)
      .not("pontos", "is", null);

    if (userBetsError) {
      console.error(`[Admin Sync] Erro ao buscar histórico de apostas para o usuário ${userId}:`, userBetsError);
      continue;
    }

    if (userBets) {
      type UserBetPartial = { pontos: number | null };
      const ub = userBets as UserBetPartial[];
      const totalPoints = ub.reduce((acc, curr) => acc + (curr.pontos || 0), 0);
      console.log(`[Admin Sync] Atualizando profile do usuário ${userId} para totalPoints: ${totalPoints}`);

      const { error: profileUpdateError } = await adminClient
        .from("profiles")
        .update({ pontos_total: totalPoints, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (profileUpdateError) {
        console.error(`[Admin Sync] Erro ao atualizar pontos_total (user_id: ${userId}) na tabela profiles:`, profileUpdateError);
      }
    }
  }
}
