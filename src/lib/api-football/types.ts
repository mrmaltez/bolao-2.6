/**
 * Tipos TypeScript para a API-Football v3
 * Documentação: https://www.api-football.com/documentation-v3
 */

// ─── Resposta base da API ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  get: string;
  parameters: Record<string, string | number>;
  errors: unknown[];
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

// ─── Fixture (Partida) ───────────────────────────────────────────────────────
export interface ApiFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;           // ISO 8601
    timestamp: number;
    status: {
      long: string;
      short: "TBD" | "NS" | "1H" | "HT" | "2H" | "ET" | "BT" | "P" | "SUSP" | "INT" | "FT" | "AET" | "PEN" | "PST" | "CANC" | "ABD" | "AWD" | "WO" | "LIVE";
      elapsed: number | null;
    };
    venue: { id: number | null; name: string | null; city: string | null };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string | null;
    season: number;
    round: string;
  };
  teams: {
    home: ApiTeam;
    away: ApiTeam;
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime:  { home: number | null; away: number | null };
    fulltime:  { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty:   { home: number | null; away: number | null };
  };
}

// ─── Time ────────────────────────────────────────────────────────────────────
export interface ApiTeam {
  id: number;
  name: string;
  logo: string;
  winner?: boolean | null;
}

// ─── Artilheiro ──────────────────────────────────────────────────────────────
export interface ApiTopScorer {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    age: number;
    nationality: string;
    photo: string;
  };
  statistics: Array<{
    team: ApiTeam;
    goals: { total: number | null; assists: number | null };
    games: { appearences: number | null; minutes: number | null };
  }>;
}

// ─── Standings (Classificação) ───────────────────────────────────────────────
export interface ApiStanding {
  rank: number;
  team: ApiTeam;
  points: number;
  goalsDiff: number;
  group: string;
  form: string;
  status: string;
  description: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

export type ApiStandingsResponse = ApiStanding[][];
