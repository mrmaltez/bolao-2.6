import clsx from "clsx";
import { Avatar } from "./Avatar";
import type { RankingEntry } from "@/types/database.types";

interface LeaderboardTableProps {
  entries: RankingEntry[];
  currentUserId?: string;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="py-10 text-center text-text-muted text-sm border border-dark-border rounded-xl bg-dark-card border-dashed">
        Nenhum palpite registrado ainda.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-card shadow-md">
      {/* Cabeçalho da tabela */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center px-5 py-3 bg-dark-elevated border-b border-dark-border">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted w-8 text-center">Pos</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted pl-4">Participante</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Pts</span>
      </div>

      {/* Linhas */}
      <ul role="list" className="divide-y divide-dark-border">
        {entries.map((entry, index) => {
          const isCurrentUser = entry.user_id === currentUserId;
          const position = Number(entry.position);
          const medal = position <= 3 ? MEDAL[position - 1] : null;

          return (
            <li
              key={entry.user_id}
              className={clsx(
                "grid grid-cols-[auto_1fr_auto] items-center px-5 py-4 gap-3 transition-colors",
                isCurrentUser
                  ? "bg-neon-900/10 border-l-4 border-l-neon-500 pl-4"
                  : "hover:bg-dark-elevated/50",
                index === 0 && "bg-gradient-to-r from-neon-900/5 to-transparent"
              )}
              aria-label={`${position}º ${entry.username} — ${entry.pontos_total} pontos`}
            >
              {/* Posição */}
              <div className="w-8 text-center">
                {medal ? (
                  <span className="text-xl leading-none" aria-hidden="true">{medal}</span>
                ) : (
                  <span className="text-sm text-text-muted font-bold">{position}º</span>
                )}
              </div>

              {/* Avatar + Nome */}
              <div className="flex items-center gap-4 pl-1 min-w-0">
                <Avatar
                  src={entry.avatar_url}
                  name={entry.username}
                  size="sm"
                />
                <span
                  className={clsx(
                    "text-sm font-semibold truncate",
                    isCurrentUser ? "text-neon-400" : "text-text-primary"
                  )}
                >
                  {entry.username}
                  {isCurrentUser && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-neon-500/20 text-neon-400 font-bold uppercase tracking-wider">(Você)</span>
                  )}
                </span>
              </div>

              {/* Pontos */}
              <div className="text-right flex flex-col items-end">
                <span
                  className={clsx(
                    "font-bold text-xl leading-none",
                    position === 1 ? "text-neon-400" : "text-text-primary"
                  )}
                >
                  {entry.pontos_total}
                </span>
                <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider mt-0.5">pts</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Skeleton
export function LeaderboardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-card shadow-md">
      <div className="px-5 py-3 bg-dark-elevated border-b border-dark-border">
        <div className="skeleton h-3 w-32 rounded" />
      </div>
      <ul className="divide-y divide-dark-border">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="grid grid-cols-[auto_1fr_auto] items-center px-5 py-4 gap-3">
            <div className="skeleton w-8 h-5 rounded" />
            <div className="flex items-center gap-4 pl-1">
              <div className="skeleton w-9 h-9 rounded-full" />
              <div className="skeleton h-4 w-28 rounded" />
            </div>
            <div className="skeleton h-6 w-10 rounded" />
          </li>
        ))}
      </ul>
    </div>
  );
}
