"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUserBets } from "@/app/actions/bet";

// Reaproveitando a interface FDMatch já definida
interface FDTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface FDScore {
  home: number | null;
  away: number | null;
}

export interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  group: string | null;
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  score: {
    winner: string | null;
    duration: string;
    fullTime: FDScore;
  };
}

export interface UserBetState {
  home: number;
  away: number;
}

interface BetsContextType {
  matches: FDMatch[];
  userBets: Record<number, UserBetState>;
  loading: boolean;
  error: string | null;
  updateLocalBet: (matchId: number, home: number, away: number) => void;
}

const BetsContext = createContext<BetsContextType | undefined>(undefined);

export function BetsProvider({ children }: { children: ReactNode }) {
  const [matches, setMatches] = useState<FDMatch[]>([]);
  const [userBets, setUserBets] = useState<Record<number, UserBetState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch matches from API and user bets from Supabase in parallel
        const [matchesRes, betsRes] = await Promise.all([
          fetch("/api/matches").then(res => {
            if (!res.ok) throw new Error(`Erro API: ${res.status}`);
            return res.json();
          }),
          getUserBets(),
        ]);

        setMatches(matchesRes.matches ?? []);

        // Converte o array de apostas em um dicionário focado no match_id
        const betsMap: Record<number, UserBetState> = {};
        if (betsRes.bets) {
          betsRes.bets.forEach((bet: any) => {
            betsMap[bet.match_id] = {
              home: bet.home_score_bet,
              away: bet.away_score_bet,
            };
          });
        }
        setUserBets(betsMap);

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setError(msg);
        console.error("[BetsContext] Falha ao carregar dados:", msg);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const updateLocalBet = (matchId: number, home: number, away: number) => {
    setUserBets((prev) => ({
      ...prev,
      [matchId]: { home, away },
    }));
  };

  return (
    <BetsContext.Provider value={{ matches, userBets, loading, error, updateLocalBet }}>
      {children}
    </BetsContext.Provider>
  );
}

export function useBets() {
  const context = useContext(BetsContext);
  if (context === undefined) {
    throw new Error("useBets must be used within a BetsProvider");
  }
  return context;
}
