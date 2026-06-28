"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBets } from "./BetsContext";
import { createClient } from "@/lib/supabase/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface PlayerWithBets {
  id: string;
  username: string;
  avatar_url: string | null;
  bets: Record<number, { home: number; away: number }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDayHeader(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formatted = formatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getLogicalDateKey(utcDate: string): string {
  const date = new Date(utcDate);
  const spDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  spDate.setHours(spDate.getHours() - 3);
  const year = spDate.getFullYear();
  const month = String(spDate.getMonth() + 1).padStart(2, "0");
  const day = String(spDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function PlayerAvatar({ src, name }: { src: string | null; name: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-7 h-7 rounded-full object-cover border border-dark-border flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-neon-900/30 border border-neon-500/30 flex items-center justify-center flex-shrink-0">
      <span className="text-[9px] font-bold text-neon-400">{getInitials(name)}</span>
    </div>
  );
}

// ─── Card de cada jogo com dropdown ──────────────────────────────────────────
function MatchBetCard({
  match,
  players,
  isStarted,
}: {
  match: any;
  players: PlayerWithBets[];
  isStarted: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLLIElement>(null);

  const playersWithBet = players.filter((p) => p.bets[match.id] !== undefined);
  const playersWithoutBet = players.filter((p) => p.bets[match.id] === undefined);

  const handleToggle = () => {
    if (!isStarted) return;
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 260);
    }
  };

  return (
    <li
      ref={cardRef}
      className="rounded-xl bg-dark-elevated/20 border border-dark-border/50 overflow-hidden"
    >
      <button
        onClick={handleToggle}
        disabled={!isStarted}
        className={`w-full px-4 py-4 flex flex-col gap-2 transition-colors text-left ${isStarted ? "hover:bg-dark-elevated/40 cursor-pointer active:bg-dark-elevated/60" : "cursor-default"
          }`}
        aria-expanded={isOpen}
      >
        <p className="text-[9px] font-semibold text-text-muted uppercase tracking-widest">
          {match.group ?? match.stage?.replace(/_/g, " ")}
        </p>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-text-primary truncate flex-1 min-w-0">
            {match.homeTeam?.shortName || match.homeTeam?.name}{" "}
            <span className="text-neon-500 font-medium mx-1 text-xs">vs</span>{" "}
            {match.awayTeam?.shortName || match.awayTeam?.name}
          </p>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!isStarted ? (
              <span className="text-sm opacity-40">🔒</span>
            ) : (
              <svg
                className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && isStarted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-dark-border/50 px-4 py-2 flex flex-col">
              {playersWithBet.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-3">
                  Nenhum palpite registrado.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-dark-border/30">
                  {playersWithBet.map((player) => {
                    const bet = player.bets[match.id];
                    return (
                      <li
                        key={player.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <PlayerAvatar src={player.avatar_url} name={player.username} />
                          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide truncate">
                            {player.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 bg-pitch-black px-3 py-1.5 rounded-lg border border-dark-elevated shadow-inner min-w-[56px] justify-center">
                          <span className="text-sm font-black text-neon-400 drop-shadow-[0_0_5px_rgba(255,107,0,0.6)] tabular-nums">
                            {bet.home}
                          </span>
                          <span className="text-text-muted font-bold text-xs">×</span>
                          <span className="text-sm font-black text-neon-400 drop-shadow-[0_0_5px_rgba(255,107,0,0.6)] tabular-nums">
                            {bet.away}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {playersWithoutBet.length > 0 && (
                <div className="mt-1 pt-3 border-t border-dark-border/30">
                  <p className="text-[9px] uppercase tracking-widest text-text-muted font-semibold mb-2">
                    Sem palpite
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {playersWithoutBet.map((player) => (
                      <div key={player.id} className="flex items-center gap-1.5 opacity-35">
                        <PlayerAvatar src={player.avatar_url} name={player.username} />
                        <span className="text-[10px] text-text-muted">{player.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function AllBetsSidebar() {
  const { matches, loading: matchesLoading } = useBets();

  const [players, setPlayers] = useState<PlayerWithBets[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [hasInitializedDay, setHasInitializedDay] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    async function loadAllBets() {
      try {
        const supabase = createClient();
        const [{ data: profiles }, { data: bets }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .order("pontos_total", { ascending: false }),
          supabase
            .from("bets")
            .select("user_id, match_id, home_score_bet, away_score_bet")
            .limit(10000),
        ]);

        if (!profiles) return;

        const playersWithBets: PlayerWithBets[] = profiles.map((profile) => {
          const playerBets: Record<number, { home: number; away: number }> = {};
          (bets || [])
            .filter((b) => b.user_id === profile.id)
            .forEach((b) => {
              // Converte match_id para number para bater com match.id da API
              playerBets[Number(b.match_id)] = {
                home: b.home_score_bet,
                away: b.away_score_bet,
              };
            });
          return {
            id: profile.id,
            username: profile.username || "Jogador",
            avatar_url: profile.avatar_url,
            bets: playerBets,
          };
        });

        setPlayers(playersWithBets);
      } catch (err) {
        console.error("[AllBetsSidebar] Erro:", err);
      } finally {
        setLoadingPlayers(false);
      }
    }
    loadAllBets();
  }, []);

  const groupedMatches = useMemo(() => {
    const groups: Record<string, any[]> = {};
    matches.forEach((match) => {
      const key = getLogicalDateKey(match.utcDate);
      if (!groups[key]) groups[key] = [];
      groups[key].push(match);
    });
    Object.keys(groups).forEach((key) => {
      groups[key].sort(
        (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
      );
    });
    return groups;
  }, [matches]);

  const dayKeys = useMemo(() => Object.keys(groupedMatches).sort(), [groupedMatches]);

  useEffect(() => {
    if (!hasInitializedDay && dayKeys.length > 0) {
      const spNow = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
      );
      spNow.setHours(spNow.getHours() - 3);
      const todayStr = `${spNow.getFullYear()}-${String(spNow.getMonth() + 1).padStart(2, "0")}-${String(spNow.getDate()).padStart(2, "0")}`;
      let index = dayKeys.indexOf(todayStr);
      if (index === -1) index = dayKeys.findIndex((d) => d > todayStr);
      setCurrentDayIndex(index !== -1 ? index : dayKeys.length - 1);
      setHasInitializedDay(true);
    }
  }, [dayKeys, hasInitializedDay]);

  const navigateDay = (direction: 1 | -1) => {
    const newIndex = currentDayIndex + direction;
    if (newIndex >= 0 && newIndex < dayKeys.length) setCurrentDayIndex(newIndex);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) navigateDay(diff > 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const isLoading = matchesLoading || loadingPlayers;

  if (isLoading) {
    return (
      <aside className="rounded-xl bg-dark-card border border-dark-border p-5 min-h-[300px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-neon-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-xs font-medium animate-pulse">Carregando palpites...</p>
        </div>
      </aside>
    );
  }

  if (dayKeys.length === 0) {
    return (
      <aside className="rounded-xl bg-dark-card border border-dark-border p-5">
        <p className="text-text-muted text-sm text-center py-6">Nenhum jogo encontrado.</p>
      </aside>
    );
  }

  const safeDayIndex = Math.min(Math.max(0, currentDayIndex), dayKeys.length - 1);
  const currentKey = dayKeys[safeDayIndex];
  const matchesOfDay = groupedMatches[currentKey] || [];
  const betsCount = matchesOfDay.filter((m) => new Date(m.utcDate).getTime() <= now).length;

  return (
    <aside
      className="flex flex-col gap-4 w-full box-border pb-24"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navegação Diária */}
      <div className="flex items-center justify-between bg-dark-card/50 border border-dark-border rounded-xl px-4 py-3 shadow-sm">
        <button
          onClick={() => navigateDay(-1)}
          disabled={safeDayIndex === 0}
          className="p-2 text-neon-400 disabled:text-dark-border disabled:cursor-not-allowed hover:bg-dark-elevated rounded-lg transition-colors active:scale-95"
          aria-label="Dia anterior"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <h2 className="text-sm font-bold text-text-primary tracking-wide text-center">
            {formatDayHeader(currentKey)}
          </h2>
          <span className="text-[9px] uppercase tracking-widest text-text-muted font-semibold mt-0.5">
            {betsCount} jogo{betsCount !== 1 ? "s" : ""} revelado{betsCount !== 1 ? "s" : ""}
          </span>
        </div>

        <button
          onClick={() => navigateDay(1)}
          disabled={safeDayIndex === dayKeys.length - 1}
          className="p-2 text-neon-400 disabled:text-dark-border disabled:cursor-not-allowed hover:bg-dark-elevated rounded-lg transition-colors active:scale-95"
          aria-label="Próximo dia"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Card principal */}
      <div className="rounded-xl bg-dark-card border border-dark-border overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-dark-border bg-gradient-to-r from-neon-900/10 to-transparent flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">👥</span>
          <h2 className="text-sm font-bold text-text-primary tracking-tight">Palpites da Galera</h2>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentKey}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="p-4 pb-8"
          >
            <ul role="list" className="flex flex-col gap-3 mb-6">
              {matchesOfDay.map((match) => {
                const isStarted = new Date(match.utcDate).getTime() <= now;
                return (
                  <MatchBetCard
                    key={match.id}
                    match={match}
                    players={players}
                    isStarted={isStarted}
                  />
                );
              })}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}