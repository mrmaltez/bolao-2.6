"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

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

  // Usar Service Role Key para contornar RLS na tabela matches, se existir.
  let adminClient = supabase;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    adminClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  try {
    // 2. Passo A: Upsert na tabela 'matches' (usando a chave primaria 'id' como o ID da API)
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
      console.error("[saveBet] Supabase Match Error Detalhado:", matchError);
      
      if (matchError?.code === "42501") {
        return { error: "Sem permissão para criar partidas (Falta Service Role Key no servidor)." };
      }
      return { error: "Erro ao registrar a partida no banco." };
    }

    // 3. Passo B: Upsert na tabela 'bets' com o ID da partida
    const { error: betError } = await supabase
      .from("bets")
      .upsert(
        {
          match_id: matchData.id as any, // matchData.id é numérico conforme schema atual do usuário
          user_id: user.id,
          home_score_bet: params.home_score_bet,
          away_score_bet: params.away_score_bet,
        },
        { onConflict: "user_id, match_id" }
      );

    if (betError) {
      console.error("[saveBet] Supabase Bet Error Detalhado:", betError);
      
      // Identificar erro de Trigger (Horário do Jogo)
      // TODO: REMOVER MODO DE TESTE
      // if (betError.message.includes("Prazo de palpite encerrado")) {
      //   return { error: "Prazo encerrado! O jogo já começou ou faltam menos de 5 minutos." };
      // }
      
      return { error: "Não foi possível salvar seu palpite." };
    }

    return { success: true };
    
  } catch (err) {
    console.error("[saveBet] Exceção Capturada:", err);
    return { error: "Ocorreu um erro interno ao processar o palpite." };
  }
}

export async function getUserBets() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { bets: [] };
  }

  // Busca os palpites do usuário logado, trazendo o ID da API associado à partida
  const { data, error } = await supabase
    .from("bets")
    .select("match_id, home_score_bet, away_score_bet")
    .eq("user_id", user.id);

  if (error || !data) {
    console.error("[getUserBets] Erro ao buscar palpites:", error);
    return { bets: [] };
  }

  return { bets: data };
}
