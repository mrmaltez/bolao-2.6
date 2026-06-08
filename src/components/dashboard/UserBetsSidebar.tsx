"use client";

import { useBets } from "./BetsContext";
import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

export function UserBetsSidebar() {
  const { matches, userBets, loading } = useBets();
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [hasInitializedDay, setHasInitializedDay] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const touchStartX = useRef<number | null>(null);

  const groupedUserMatches = useMemo(() => {
    const betMatchIds = Object.keys(userBets).map(Number);
    const groups: Record<string, any[]> = {};

    const userMatches = matches
      .filter((m) => betMatchIds.includes(m.id))
      .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

    userMatches.forEach((match) => {
      const date = new Date(match.utcDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const localDateStr = `${year}-${month}-${day}`;

      if (!groups[localDateStr]) {
        groups[localDateStr] = [];
      }
      groups[localDateStr].push(match);
    });

    return groups;
  }, [matches, userBets]);

  const dayKeys = useMemo(() => Object.keys(groupedUserMatches).sort(), [groupedUserMatches]);

  useEffect(() => {
    if (!hasInitializedDay && dayKeys.length > 0) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      let index = dayKeys.indexOf(todayStr);
      if (index === -1) {
        index = dayKeys.findIndex(date => date > todayStr);
      }

      const initialIndex = index !== -1 ? index : dayKeys.length - 1;
      setCurrentDayIndex(initialIndex);
      setHasInitializedDay(true);

    }
  }, [dayKeys, hasInitializedDay]);

  // Navegação pelas Setas

  const navigateDay = (direction: 1 | -1) => {
    const newIndex = currentDayIndex + direction;
    if (newIndex >= 0 && newIndex < dayKeys.length) {
      setSlideDirection(direction === 1 ? "right" : "left");
      setCurrentDayIndex(newIndex);
    }
  };

  if (loading) {
    return (
      <aside className="rounded-xl bg-dark-card border border-dark-border p-5 h-full min-h-[300px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-neon-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-xs font-medium animate-pulse">Carregando seus palpites...</p>
        </div>
      </aside>
    );
  }

  // Se não tiver nenhum palpite
  if (dayKeys.length === 0) {
    return (
      <aside className="flex flex-col h-full">
        <div className="sticky top-6 rounded-xl bg-dark-card border border-dark-border overflow-hidden shadow-lg">
          <div className="px-5 py-4 border-b border-dark-border bg-gradient-to-r from-neon-900/10 to-transparent flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🎯</span>
            <div>
              <h2 className="text-sm font-bold text-text-primary tracking-tight">Meus Palpites</h2>
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">0 salvos</p>
            </div>
          </div>
          <div className="px-5 py-10 text-center">
            <p className="text-text-secondary font-medium mb-1 text-sm">Nenhum palpite salvo</p>
            <p className="text-text-muted text-xs">
              Seus palpites aparecerão aqui instantaneamente.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  // Garantir que currentDayIndex não exceda o limite se os dias mudarem
  const safeDayIndex = Math.min(Math.max(0, currentDayIndex), Math.max(0, dayKeys.length - 1));
  const currentKey = dayKeys[safeDayIndex];
  const totalSaved = Object.keys(userBets).length;

  // Navegação por Swipe (Touch)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        navigateDay(1); // Swipe esquerda -> próximo dia
      } else {
        navigateDay(-1); // Swipe direita -> dia anterior
      }
    }
    touchStartX.current = null;
  };

  return (
    <aside 
      className="flex flex-col gap-4 h-full overflow-hidden w-full box-border"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navegação Diária (Igual a coluna de jogos) */}
      <div className="flex items-center justify-between bg-dark-card/50 border border-dark-border rounded-xl px-4 py-3 shadow-sm shrink-0">
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
            {groupedUserMatches[currentKey]?.length || 0} palpites no dia
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

      <div className="rounded-xl bg-dark-card border border-dark-border overflow-hidden shadow-lg flex flex-col gap-6 h-fit">
        {/* Cabeçalho */}
        <div className="px-5 py-5 border-b border-dark-border bg-gradient-to-r from-neon-900/10 to-transparent flex items-center gap-3 shrink-0">
          <span className="text-2xl" aria-hidden="true">🎯</span>
          <h2 className="text-sm font-bold text-text-primary tracking-tight">Meus Palpites</h2>
        </div>

        {/* Lista de Palpites do Dia (Apenas o ativo) */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentKey}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="w-full flex-shrink-0 p-5"
          >
            <ul role="list" className="flex flex-col gap-4">
            {groupedUserMatches[currentKey]?.map((match) => {
              const bet = userBets[match.id];

              return (
                <li key={match.id} className="p-4 hover:bg-dark-elevated/40 transition-colors rounded-xl bg-dark-elevated/20 border border-dark-border/50">
                  <div className="flex flex-col gap-3">
                    <p className="text-[9px] font-semibold text-text-muted uppercase tracking-widest">
                      {match.group ?? match.stage.replace(/_/g, " ")}
                    </p>

                    <div className="flex items-center justify-between gap-2">
                      {/* Times */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {match.homeTeam.shortName || match.homeTeam.name}{" "}
                          <span className="text-neon-500 font-medium mx-1 text-xs">vs</span>{" "}
                          {match.awayTeam.shortName || match.awayTeam.name}
                        </p>
                      </div>

                      {/* Placar Apostado */}
                      <div className="flex items-center gap-2 flex-shrink-0 bg-pitch-black px-3 py-1.5 rounded-lg border border-dark-elevated shadow-inner">
                        <span className="text-base font-black text-neon-400 drop-shadow-[0_0_5px_rgba(255,107,0,0.6)]">
                          {bet.home}
                        </span>
                        <span className="text-text-muted font-bold text-xs drop-shadow-none">–</span>
                        <span className="text-base font-black text-neon-400 drop-shadow-[0_0_5px_rgba(255,107,0,0.6)]">
                          {bet.away}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}

            {(!groupedUserMatches[currentKey] || groupedUserMatches[currentKey].length === 0) && (
              <li className="p-6 text-center">
                <p className="text-text-muted text-sm">Nenhum palpite para este dia.</p>
              </li>
            )}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}
