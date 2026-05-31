"use client";

import { useBets } from "./BetsContext";
import Image from "next/image";

export function UserBetsSidebar() {
  const { matches, userBets, loading } = useBets();

  if (loading) {
    return (
      <aside className="rounded-xl bg-dark-card border border-dark-border p-5 h-full min-h-[300px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-xs font-medium animate-pulse">Carregando seus palpites...</p>
        </div>
      </aside>
    );
  }

  // Filtra as partidas que o usuário já apostou
  const betMatchIds = Object.keys(userBets).map(Number);
  const userMatches = matches
    .filter((m) => betMatchIds.includes(m.id))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  return (
    <aside className="flex flex-col h-full">
      <div className="sticky top-6 rounded-xl bg-dark-card border border-dark-border overflow-hidden shadow-lg">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-dark-border bg-gradient-to-r from-gold-900/10 to-transparent flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🎯</span>
          <div>
            <h2 className="text-sm font-bold text-text-primary tracking-tight">Meus Palpites</h2>
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
              {userMatches.length} salvos
            </p>
          </div>
        </div>

        {/* Lista de Palpites */}
        <div className="max-h-[600px] overflow-y-auto hide-scrollbar">
          {userMatches.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-text-secondary font-medium mb-1 text-sm">Nenhum palpite salvo</p>
              <p className="text-text-muted text-xs">
                Seus palpites aparecerão aqui instantaneamente.
              </p>
            </div>
          ) : (
            <ul role="list" className="divide-y divide-dark-border">
              {userMatches.map((match) => {
                const bet = userBets[match.id];
                
                return (
                  <li key={match.id} className="p-4 hover:bg-dark-elevated/40 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-semibold text-text-muted uppercase tracking-widest">
                        {new Date(match.utcDate).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })} · {match.group ?? match.stage.replace(/_/g, " ")}
                      </p>
                      {/* Opcional: mostrar pontos aqui se tivéssemos o retorno do DB para a aposta concluída */}
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      {/* Times */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {match.homeTeam.shortName || match.homeTeam.name}{" "}
                          <span className="text-gold-500 font-medium mx-1 text-xs">vs</span>{" "}
                          {match.awayTeam.shortName || match.awayTeam.name}
                        </p>
                      </div>

                      {/* Placar Apostado */}
                      <div className="flex items-center gap-2 flex-shrink-0 bg-pitch-black px-3 py-1.5 rounded-lg border border-dark-border shadow-inner">
                        <span className="text-base font-black text-gold-400">
                          {bet.home}
                        </span>
                        <span className="text-text-muted font-bold text-xs">–</span>
                        <span className="text-base font-black text-gold-400">
                          {bet.away}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </aside>
  );
}
