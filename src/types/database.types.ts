// ============================================================
// Tipos do banco de dados Supabase — gerado a partir do schema
// Execute: npx supabase gen types typescript --local > src/types/database.types.ts
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          palpite_campeao: string | null;
          palpite_final: string | null;
          pontos_total: number;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          palpite_campeao?: string | null;
          palpite_final?: string | null;
          pontos_total?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          username?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          palpite_campeao?: string | null;
          palpite_final?: string | null;
          pontos_total?: number;
        };
      };
      matches: {
        Row: {
          id: string;
          created_at: string;
          api_football_id: number | null;
          round: string;
          home_team: string;
          away_team: string;
          home_team_flag: string | null;
          away_team_flag: string | null;
          home_score: number | null;
          away_score: number | null;
          match_start_time: string;
          status: "scheduled" | "live" | "finished" | "postponed";
          stage: "group" | "round_of_16" | "quarter" | "semi" | "third_place" | "final";
          group_name: string | null;
          venue: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          api_football_id?: number | null;
          round: string;
          home_team: string;
          away_team: string;
          home_team_flag?: string | null;
          away_team_flag?: string | null;
          home_score?: number | null;
          away_score?: number | null;
          match_start_time: string;
          status?: "scheduled" | "live" | "finished" | "postponed";
          stage?: "group" | "round_of_16" | "quarter" | "semi" | "third_place" | "final";
          group_name?: string | null;
          venue?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          api_football_id?: number | null;
          round?: string;
          home_team?: string;
          away_team?: string;
          home_team_flag?: string | null;
          away_team_flag?: string | null;
          home_score?: number | null;
          away_score?: number | null;
          match_start_time?: string;
          status?: "scheduled" | "live" | "finished" | "postponed";
          stage?: "group" | "round_of_16" | "quarter" | "semi" | "third_place" | "final";
          group_name?: string | null;
          venue?: string | null;
        };
      };
      bets: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          match_id: string;
          home_score_bet: number;
          away_score_bet: number;
          pontos: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          match_id: string;
          home_score_bet: number;
          away_score_bet: number;
          pontos?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          match_id?: string;
          home_score_bet?: number;
          away_score_bet?: number;
          pontos?: number | null;
        };
      };
    };
    Views: {
      ranking_view: {
        Row: {
          user_id: string;
          username: string;
          avatar_url: string | null;
          pontos_total: number;
          position: number;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      match_status: "scheduled" | "live" | "finished" | "postponed";
      match_stage: "group" | "round_of_16" | "quarter" | "semi" | "third_place" | "final";
    };
  };
}

// ─── Shorthand types ────────────────────────────────────────────────────────
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Bet = Database["public"]["Tables"]["bets"]["Row"];
export type RankingEntry = Database["public"]["Views"]["ranking_view"]["Row"];
