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
    <ul role="list" className="flex flex-col gap-4">
      {entries.map((entry, index) => {
        const isCurrentUser = entry.user_id === currentUserId;
        const position = Number(entry.position);
        const medal = position <= 3 ? MEDAL[position - 1] : null;
        
        // Mocking trend for UI demonstration (e.g. up, down, stable)
        const trend = index % 4 === 0 ? "up" : index % 4 === 1 ? "down" : "stable";

        return (
          <li
            key={entry.user_id}
            className={clsx(
              "flex items-center p-4 rounded-xl shadow-md transition-transform hover:scale-[1.01]",
              isCurrentUser
                ? "bg-neon-900/10 border-2 border-neon-500 shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                : "bg-dark-card border border-dark-border"
            )}
            aria-label={`${position}º ${entry.username} — ${entry.pontos_total} pontos`}
          >
            {/* Posição */}
            <div className="w-10 flex-shrink-0 text-center flex flex-col items-center justify-center">
              {medal ? (
                <span className="text-2xl leading-none" aria-hidden="true">{medal}</span>
              ) : (
                <span className="text-lg text-text-muted font-bold">{position}º</span>
              )}
            </div>

            {/* Avatar + Nome + Trend */}
            <div className="flex flex-1 items-center gap-4 pl-3 min-w-0">
              <Avatar
                src={entry.avatar_url}
                name={entry.username}
                size="md"
              />
              <div className="flex flex-col overflow-hidden">
                <span
                  className={clsx(
                    "text-base font-semibold truncate",
                    isCurrentUser ? "text-neon-400" : "text-text-primary"
                  )}
                >
                  {entry.username}
                  {isCurrentUser && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-neon-500/20 text-neon-400 font-bold uppercase tracking-wider">(Você)</span>
                  )}
                </span>
                
                {/* Trend Indicator */}
                <div className="flex items-center gap-1 mt-0.5">
                  {trend === "up" && (
                    <span className="flex items-center text-[10px] font-medium text-emerald-500">
                      <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                      Subiu 1 pos
                    </span>
                  )}
                  {trend === "down" && (
                    <span className="flex items-center text-[10px] font-medium text-red-500">
                      <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      Caiu 1 pos
                    </span>
                  )}
                  {trend === "stable" && (
                    <span className="flex items-center text-[10px] font-medium text-text-muted">
                      <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      </svg>
                      Manteve
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Pontos */}
            <div className="text-right flex flex-col items-end flex-shrink-0 pl-2">
              <span
                className={clsx(
                  "font-black text-2xl leading-none",
                  position === 1 ? "text-[#D4AF37]" : position === 2 ? "text-[#C0C0C0]" : position === 3 ? "text-[#CD7F32]" : "text-text-primary"
                )}
              >
                {entry.pontos_total}
              </span>
              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider mt-1">pts</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Skeleton
export function LeaderboardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center p-4 rounded-xl border border-dark-border bg-dark-card shadow-md">
          <div className="skeleton w-10 h-8 rounded" />
          <div className="flex flex-1 items-center gap-4 pl-3">
            <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
            <div className="flex flex-col gap-2">
               <div className="skeleton h-5 w-32 rounded" />
               <div className="skeleton h-3 w-16 rounded" />
            </div>
          </div>
          <div className="skeleton h-8 w-12 rounded flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}
