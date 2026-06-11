"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

const DEADLINE_MINUTES = 5; // minutos antes do jogo que o palpite fecha

interface SaveBetParams {
  id: number;
  home_team: string;
  away_team: string;
  match_start_time: string;
  status: string;
  home_score_bet: number;
  away_score_bet: number;
}

export async function saveBet(params: SaveBetParams) {
  const supabase = await createClient();

  // 1. Validar usuário logado
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Você precisa estar logado para palpitar." };
  }

  // 2. Validar prazo — bloqueia se faltarem menos de 5 min ou jogo já começou
  const matchStart = new Date(params.match_start_time);
  const deadline = new Date(matchStart.getTime() - DEADLINE_MINUTES * 60 * 1000);
  const now = new Date();

  if (now >= deadline) {
    return {
      error: `Prazo encerrado! Os palpites fecham ${DEADLINE_MINUTES} minutos antes do jogo.`,
    };
  }

  // 3. Usar Service Role Key para contornar RLS na tabela matches
  let adminClient = supabase;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    adminClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  try {
    // 4. Upsert na tabela 'matches'
    const { data: matchData, error: matchError } = await adminClient
      .from("matches")
      .upsert(
        {
          id: params.id,
          home_team: params.home_team,
          away_team: params.away_team,
          match_start_time: params.match_start_time,
          status: params.status as any,
        },
        { onConflict: "id" }
      )
      .select("id")
      .single();

    if (matchError || !matchData) {
      console.error("[saveBet] Supabase Match Error:", matchError);
      if (matchError?.code === "42501") {
        return { error: "Sem permissão para criar partidas (falta Service Role Key no servidor)." };
      }
      return { error: "Erro ao registrar a partida no banco." };
    }

    // 5. Upsert na tabela 'bets'
    const { error: betError } = await supabase
      .from("bets")
      .upsert(
        {
          match_id: matchData.id as any,
          user_id: user.id,
          home_score_bet: params.home_score_bet,
          away_score_bet: params.away_score_bet,
        },
        { onConflict: "user_id, match_id" }
      );

    if (betError) {
      console.error("[saveBet] Supabase Bet Error:", betError);
      return { error: "Não foi possível salvar seu palpite." };
    }

    return { success: true };

  } catch (err) {
    console.error("[saveBet] Exceção:", err);
    return { error: "Ocorreu um erro interno ao processar o palpite." };
  }
}

export async function getUserBets() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { bets: [] };

  const { data, error } = await supabase
    .from("bets")
    .select("match_id, home_score_bet, away_score_bet")
    .eq("user_id", user.id);

  if (error || !data) {
    console.error("[getUserBets] Erro:", error);
    return { bets: [] };
  }

  return { bets: data };
}