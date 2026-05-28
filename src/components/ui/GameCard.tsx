import Image from "next/image";
import clsx from "clsx";
import type { Match } from "@/types/database.types";

interface GameCardProps {
  match: Match;
  userBet?: { home_score_bet: number; away_score_bet: number } | null;
  showBetInput?: boolean;
  onBet?: (matchId: string, home: number, away: number) => void;
}

const STATUS_CONFIG = {
  scheduled: { label: "Em Breve",   badge: "bg-dark-elevated text-text-muted border-dark-border" },
  live:      { label: "AO VIVO",    badge: "bg-gold-500 text-pitch-black font-bold animate-pulse shadow-gold-glow" },
  finished:  { label: "Encerrado",  badge: "bg-dark-elevated text-text-secondary border-dark-border" },
  postponed: { label: "Adiado",     badge: "bg-dark-elevated text-gold-500 border-gold-900/50" },
};

function formatMatchTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function FlagOrInitial({ flag, team }: { flag?: string | null; team: string }) {
  if (flag) {
    return (
      <Image
        src={flag}
        alt={`Bandeira ${team}`}
        width={48}
        height={36}
        className="object-cover rounded-md shadow-sm border border-dark-border"
        style={{ aspectRatio: "4/3" }}
      />
    );
  }
  return (
    <div className="w-12 h-9 rounded-md bg-dark-elevated border border-dark-border flex items-center justify-center text-xs text-text-muted font-bold tracking-wider">
      {team.slice(0, 3).toUpperCase()}
    </div>
  );
}

export function GameCard({ match, userBet }: GameCardProps) {
  const status = STATUS_CONFIG[match.status];
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const hasScore = match.home_score !== null && match.away_score !== null;
  const isDeadlinePassed = new Date() >= new Date(match.match_start_time);

  return (
    <article
      className={clsx(
        "relative rounded-xl bg-dark-card border shadow-md transition-all duration-300",
        isLive ? "border-gold-500/50 shadow-gold-glow/20" : "border-dark-border hover:border-gold-900/40"
      )}
      aria-label={`${match.home_team} vs ${match.away_team}`}
    >
      {/* Conteúdo */}
      <div className="px-5 py-4">
        {/* Header: rodada + status + horário */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] tracking-widest uppercase text-text-muted font-medium">
            {match.group_name ?? match.stage.replace("_", " ")} · {match.round}
          </span>
          <span className={clsx("px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase border", status.badge)}>
            {status.label}
          </span>
        </div>

        {/* Placar principal */}
        <div className="flex items-center justify-between gap-4">
          {/* Time Casa */}
          <div className="flex-1 flex flex-col items-center gap-2.5">
            <FlagOrInitial flag={match.home_team_flag} team={match.home_team} />
            <span className="text-sm font-semibold text-text-primary text-center leading-tight">
              {match.home_team}
            </span>
          </div>

          {/* Placar */}
          <div className="flex flex-col items-center justify-center min-w-[100px]">
            {hasScore && (isFinished || isLive) ? (
              <div className="flex items-center gap-3">
                <span className={clsx("text-4xl font-bold tracking-tighter", isLive ? "text-gold-400" : "text-text-primary")}>
                  {match.home_score}
                </span>
                <span className="text-xl font-medium text-text-muted">–</span>
                <span className={clsx("text-4xl font-bold tracking-tighter", isLive ? "text-gold-400" : "text-text-primary")}>
                  {match.away_score}
                </span>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-lg font-bold text-text-muted mb-1 tracking-widest">VS</div>
                <div className="px-3 py-1 rounded bg-dark-elevated text-[11px] font-medium text-text-secondary tracking-wide border border-dark-border">
                  {formatMatchTime(match.match_start_time)}
                </div>
              </div>
            )}
            {match.venue && (
              <div className="text-[10px] text-text-muted text-center mt-2 max-w-[120px] truncate">
                📍 {match.venue}
              </div>
            )}
          </div>

          {/* Time Visitante */}
          <div className="flex-1 flex flex-col items-center gap-2.5">
            <FlagOrInitial flag={match.away_team_flag} team={match.away_team} />
            <span className="text-sm font-semibold text-text-primary text-center leading-tight">
              {match.away_team}
            </span>
          </div>
        </div>

        {/* Palpite do usuário */}
        {userBet !== undefined && (
          <>
            <div className="mt-5 pt-3 border-t border-dark-border border-dashed flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-widest text-text-muted font-medium">
                Seu Palpite
              </span>
              {userBet ? (
                <div className="flex items-center gap-2.5 bg-pitch-black px-3 py-1 rounded-md border border-dark-elevated">
                  <span className="text-base font-bold text-gold-400">
                    {userBet.home_score_bet}
                  </span>
                  <span className="text-xs text-text-muted">–</span>
                  <span className="text-base font-bold text-gold-400">
                    {userBet.away_score_bet}
                  </span>
                  {!isDeadlinePassed && (
                    <span className="text-[10px] text-text-muted ml-1">(editável)</span>
                  )}
                </div>
              ) : isDeadlinePassed ? (
                <span className="text-[11px] font-medium text-text-muted bg-dark-elevated px-2 py-0.5 rounded">Prazo encerrado</span>
              ) : (
                <span className="text-[11px] font-medium text-gold-500 bg-gold-900/10 px-2 py-0.5 rounded border border-gold-900/30">Palpite pendente →</span>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

// Skeleton loader para o GameCard
export function GameCardSkeleton() {
  return (
    <div className="rounded-xl bg-dark-card border border-dark-border overflow-hidden p-5">
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
