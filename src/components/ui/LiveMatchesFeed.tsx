"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// ─── Tipagem da football-data.org ────────────────────────────────────────────
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

interface FDMatch {
  id: number;
  utcDate: string;
  status: string;           // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | POSTPONED | CANCELLED
  matchday: number;
  stage: string;
  group: string | null;
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  score: {
    winner: string | null;
    duration: string;
    fullTime: FDScore;
    halfTime: FDScore;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(utcDate: string): string {
  const date = new Date(utcDate);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "Agendado",    className: "bg-dark-elevated text-text-muted border border-dark-border" },
  TIMED:     { label: "Agendado",    className: "bg-dark-elevated text-text-muted border border-dark-border" },
  IN_PLAY:   { label: "AO VIVO",     className: "bg-gold-500 text-pitch-black font-bold animate-pulse" },
  PAUSED:    { label: "Intervalo",   className: "bg-gold-500/80 text-pitch-black font-bold" },
  FINISHED:  { label: "Encerrado",   className: "bg-dark-elevated text-text-secondary border border-dark-border" },
  POSTPONED: { label: "Adiado",      className: "bg-dark-elevated text-gold-500 border border-gold-900/50" },
  CANCELLED: { label: "Cancelado",   className: "bg-dark-elevated text-red-400 border border-red-900/50" },
};

// ─── Match Card ──────────────────────────────────────────────────────────────
function MatchCard({ match }: { match: FDMatch }) {
  const statusInfo = STATUS_MAP[match.status] ?? STATUS_MAP.SCHEDULED;
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const hasScore = match.score.fullTime.home !== null && match.score.fullTime.away !== null;

  return (
    <article
      className={`rounded-xl bg-dark-card border shadow-md transition-all duration-300 ${
        isLive ? "border-gold-500/50 shadow-[0_0_20px_rgba(212,175,55,0.15)]" : "border-dark-border hover:border-gold-900/40"
      }`}
    >
      <div className="px-5 py-4">
        {/* Header: fase + status + horário */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] tracking-widest uppercase text-text-muted font-medium">
            {match.group ?? match.stage.replace(/_/g, " ")} · Rodada {match.matchday}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>

        {/* Placar principal */}
        <div className="flex items-center justify-between gap-4">
          {/* Time Casa */}
          <div className="flex-1 flex flex-col items-center gap-2.5">
            {match.homeTeam.crest ? (
              <Image
                src={match.homeTeam.crest}
                alt={match.homeTeam.shortName}
                width={48}
                height={36}
                className="object-contain rounded-md"
                style={{ aspectRatio: "4/3" }}
                unoptimized
              />
            ) : (
              <div className="w-12 h-9 rounded-md bg-dark-elevated border border-dark-border flex items-center justify-center text-xs text-text-muted font-bold tracking-wider">
                {match.homeTeam.tla}
              </div>
            )}
            <span className="text-sm font-semibold text-text-primary text-center leading-tight">
              {match.homeTeam.shortName}
            </span>
          </div>

          {/* Placar */}
          <div className="flex flex-col items-center justify-center min-w-[100px]">
            {hasScore ? (
              <div className="flex items-center gap-3">
                <span className={`text-4xl font-bold tracking-tighter ${isLive ? "text-gold-400" : "text-text-primary"}`}>
                  {match.score.fullTime.home}
                </span>
                <span className="text-xl font-medium text-text-muted">–</span>
                <span className={`text-4xl font-bold tracking-tighter ${isLive ? "text-gold-400" : "text-text-primary"}`}>
                  {match.score.fullTime.away}
                </span>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-lg font-bold text-text-muted mb-1 tracking-widest">VS</div>
                <div className="px-3 py-1 rounded bg-dark-elevated text-[11px] font-medium text-text-secondary tracking-wide border border-dark-border">
                  {formatDate(match.utcDate)}
                </div>
              </div>
            )}
          </div>

          {/* Time Visitante */}
          <div className="flex-1 flex flex-col items-center gap-2.5">
            {match.awayTeam.crest ? (
              <Image
                src={match.awayTeam.crest}
                alt={match.awayTeam.shortName}
                width={48}
                height={36}
                className="object-contain rounded-md"
                style={{ aspectRatio: "4/3" }}
                unoptimized
              />
            ) : (
              <div className="w-12 h-9 rounded-md bg-dark-elevated border border-dark-border flex items-center justify-center text-xs text-text-muted font-bold tracking-wider">
                {match.awayTeam.tla}
              </div>
            )}
            <span className="text-sm font-semibold text-text-primary text-center leading-tight">
              {match.awayTeam.shortName}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function MatchCardSkeleton() {
  return (
    <div className="rounded-xl bg-dark-card border border-dark-border p-5">
      <div className="flex justify-between mb-5">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-4 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 flex flex-col items-center gap-2.5">
          <div className="skeleton w-12 h-9 rounded-md" />
          <div className="skeleton h-4 w-16 rounded" />
        </div>
        <div className="skeleton h-12 w-24 rounded" />
        <div className="flex-1 flex flex-col items-center gap-2.5">
          <div className="skeleton w-12 h-9 rounded-md" />
          <div className="skeleton h-4 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal exportado ──────────────────────────────────────────
export function LiveMatchesFeed() {
  const [matches, setMatches] = useState<FDMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch("/api/matches");
        if (!res.ok) {
          throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setMatches(data.matches ?? []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setError(msg);
        console.error("[LiveMatchesFeed] Falha:", msg);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, []);

  return (
    <section aria-labelledby="rodada-heading">
      <h2 id="rodada-heading" className="text-xl font-bold text-text-primary tracking-tight mb-4">
        Jogos da Copa 2026
      </h2>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-5 py-6 text-center">
          <p className="text-red-400 text-sm font-semibold mb-1">Falha ao carregar os jogos</p>
          <p className="text-text-muted text-xs">{error}</p>
        </div>
      )}

      {/* Sem jogos */}
      {!loading && !error && matches.length === 0 && (
        <div className="rounded-xl border border-dark-border border-dashed bg-dark-card/40 px-6 py-10 text-center">
          <p className="text-text-muted text-sm font-medium">
            Nenhuma partida encontrada para a Copa do Mundo 2026.
          </p>
        </div>
      )}

      {/* Lista de partidas */}
      {!loading && !error && matches.length > 0 && (
        <div className="space-y-4">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </section>
  );
}
