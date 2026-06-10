import clsx from "clsx";
import { Avatar } from "./Avatar";
import type { RankingEntry, MuralStatus } from "@/types/database.types";

interface LeaderboardTableProps {
  entries: RankingEntry[];
  currentUserId?: string;
}

// ── Configuração visual por status ───────────────────────────────────────────

const STATUS_CONFIG: Record<
  MuralStatus,
  { label: (delta: number | null) => string; color: string; icon: React.ReactNode }
> = {
  lider: {
    label: () => "Líder",
    color: "text-yellow-400",
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm2 2h10v2H7v-2z" />
      </svg>
    ),
  },
  subiu: {
    label: (delta) => (delta === 1 ? "Subiu 1 pos" : `Subiu ${delta} pos`),
    color: "text-emerald-500",
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ),
  },
  desceu: {
    label: (delta) =>
      Math.abs(delta ?? 0) === 1 ? "Caiu 1 pos" : `Caiu ${Math.abs(delta ?? 0)} pos`,
    color: "text-red-500",
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    ),
  },
  manteve: {
    label: () => "Manteve",
    color: "text-text-muted",
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
      </svg>
    ),
  },
  lanterna: {
    label: () => "Lanterna",
    color: "text-purple-400",
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a5 5 0 00-5 5c0 1.9 1.1 3.6 2.7 4.5L9 13h6l-.7-1.5A5 5 0 0012 2zm-2 13v1a2 2 0 004 0v-1H10z" />
      </svg>
    ),
  },
  novo: {
    label: () => "Estreia!",
    color: "text-blue-400",
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
};

// ── Componente de trend ───────────────────────────────────────────────────────

function TrendBadge({
  status,
  delta,
}: {
  status: MuralStatus | null;
  delta: number | null;
}) {
  if (!status) return null;
  const config = STATUS_CONFIG[status];
  return (
    <span className={clsx("flex items-center gap-0.5 text-[10px] font-medium", config.color)}>
      {config.icon}
      {config.label(delta)}
    </span>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="py-10 text-center text-text-muted text-sm border border-dark-border rounded-xl bg-dark-card border-dashed">
        Nenhum palpite registrado ainda.
      </div>
    );
  }

  return (
    /*
      px-3 sm:px-4 → padding horizontal nos itens da lista para que
      não encostem nas bordas no mobile.
      py-3 sm:py-4 → respiro vertical dentro do container.
    */
    <ul role="list" className="flex flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
      {entries.map((entry) => {
        const isCurrentUser = entry.user_id === currentUserId;
        const position = Number(entry.position);

        const status = entry.status as MuralStatus | null;
        const delta = entry.delta_posicao ?? null;

        return (
          <li
            key={entry.user_id}
            className={clsx(
              "flex items-center p-3 sm:p-4 rounded-xl shadow-md transition-all duration-150 hover:brightness-[1.15] hover:shadow-lg",
              isCurrentUser
                ? "bg-neon-900/10 border-2 border-neon-500 shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                : "bg-dark-card border border-dark-border"
            )}
            aria-label={`${position}º ${entry.username} — ${entry.pontos_total} pontos`}
          >
            {/* Posição */}
            <div className="w-8 sm:w-10 flex-shrink-0 text-center flex flex-col items-center justify-center">
              <span className="text-base sm:text-lg text-text-muted font-bold">{position}º</span>
            </div>

            {/* Avatar + Nome + Trend */}
            <div className="flex flex-1 items-center gap-3 sm:gap-4 pl-2 sm:pl-3 min-w-0">
              <Avatar src={entry.avatar_url} name={entry.username} size="md" />
              <div className="flex flex-col overflow-hidden">
                <span
                  className={clsx(
                    "text-sm sm:text-base font-semibold truncate",
                    isCurrentUser ? "text-neon-400" : "text-text-primary"
                  )}
                >
                  {entry.username}
                  {isCurrentUser && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-neon-500/20 text-neon-400 font-bold uppercase tracking-wider">
                      (Você)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <TrendBadge status={status} delta={delta} />
                </div>
              </div>
            </div>

            {/* Pontos */}
            <div className="text-right flex flex-col items-end flex-shrink-0 pl-2">
              <span
                className={clsx(
                  "font-black text-xl sm:text-2xl leading-none",
                  position === 1
                    ? "text-[#D4AF37]"
                    : position === 2
                      ? "text-[#C0C0C0]"
                      : position === 3
                        ? "text-[#CD7F32]"
                        : "text-text-primary"
                )}
              >
                {entry.pontos_total}
              </span>
              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider mt-1">
                pts
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function LeaderboardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center p-3 sm:p-4 rounded-xl border border-dark-border bg-dark-card shadow-md"
        >
          <div className="skeleton w-8 sm:w-10 h-8 rounded" />
          <div className="flex flex-1 items-center gap-3 sm:gap-4 pl-2 sm:pl-3">
            <div className="skeleton w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0" />
            <div className="flex flex-col gap-2">
              <div className="skeleton h-4 sm:h-5 w-28 sm:w-32 rounded" />
              <div className="skeleton h-3 w-14 sm:w-16 rounded" />
            </div>
          </div>
          <div className="skeleton h-7 sm:h-8 w-10 sm:w-12 rounded flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}