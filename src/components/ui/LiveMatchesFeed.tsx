"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatMatchTime(utcDate: string): string {
  const date = new Date(utcDate);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

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

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "Agendado", className: "bg-dark-elevated text-text-muted border border-dark-border" },
  TIMED: { label: "Agendado", className: "bg-dark-elevated text-text-muted border border-dark-border" },
  IN_PLAY: { label: "AO VIVO", className: "bg-neon-500 text-pitch-black font-bold animate-pulse shadow-neon-glow" },
  PAUSED: { label: "Intervalo", className: "bg-neon-500/80 text-pitch-black font-bold" },
  FINISHED: { label: "Encerrado", className: "bg-dark-elevated text-text-secondary border border-dark-border" },
  POSTPONED: { label: "Adiado", className: "bg-dark-elevated text-neon-500 border border-neon-900/50" },
  CANCELLED: { label: "Cancelado", className: "bg-dark-elevated text-red-400 border border-red-900/50" },
};

// ─── Match Card ──────────────────────────────────────────────────────────────
function MatchCard({
  match,
  userBet,
  onSaveSuccess
}: {
  match: FDMatch;
  userBet?: { home: number, away: number };
  onSaveSuccess: (home: number, away: number) => void;
}) {
  const statusInfo = STATUS_MAP[match.status] ?? STATUS_MAP.SCHEDULED;
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isFinished = match.status === "FINISHED";
  const hasRealScore = match.score?.fullTime?.home !== null && match.score?.fullTime?.home !== undefined;

  // Bloqueio 5 minutos antes do início — reavaliado a cada segundo
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const matchTime = new Date(match.utcDate).getTime();
  const isLocked =
    now > matchTime - 5 * 60 * 1000 ||
    !["SCHEDULED", "TIMED"].includes(match.status);

  // Minutos restantes até o bloqueio (só exibe se faltar menos de 30 min)
  const minutesUntilLock = Math.ceil((matchTime - 5 * 60 * 1000 - now) / 60000);
  const showWarning = !isLocked && minutesUntilLock <= 30 && minutesUntilLock > 0;

  const [betHome, setBetHome] = useState<string>(userBet ? userBet.home.toString() : "");
  const [betAway, setBetAway] = useState<string>(userBet ? userBet.away.toString() : "");

  useEffect(() => {
    if (userBet) {
      setBetHome(userBet.home.toString());
      setBetAway(userBet.away.toString());
    }
  }, [userBet]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSave = async () => {
    if (betHome === "" || betAway === "") {
      setErrorMessage("Preencha ambos os placares!");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const { saveBet } = await import("@/app/actions/bet");

      const homeVal = Number(betHome);
      const awayVal = Number(betAway);

      const res = await saveBet({
        id: match.id,
        home_team: match.homeTeam.shortName || match.homeTeam.name || "Time Casa",
        away_team: match.awayTeam.shortName || match.awayTeam.name || "Time Visitante",
        match_start_time: match.utcDate,
        status: match.status,
        home_score_bet: homeVal,
        away_score_bet: awayVal,
      });

      if (res.error) {
        setErrorMessage(res.error);
        setSaveStatus("error");
      } else {
        setSaveStatus("success");
        onSaveSuccess(homeVal, awayVal);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Ocorreu um erro inesperado.");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  return (
    <article
      className={`rounded-xl bg-dark-card border shadow-md transition-all duration-300 ${isLive ? "border-neon-500 shadow-[0_0_20px_rgba(255,107,0,0.25)] animate-pulse-neon" : "border-dark-border"
        }`}
    >
      <div className="flex flex-col gap-5 p-5">
        {/* Header: fase + status + horário */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-widest uppercase text-text-muted font-medium">
            {match.group ?? match.stage.replace(/_/g, " ")}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-muted bg-dark-elevated px-2 py-0.5 rounded border border-dark-border">
              {formatMatchTime(match.utcDate)}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] tracking-wider uppercase ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Aviso de fechamento iminente */}
        {showWarning && (
          <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-900/20 border border-yellow-500/30">
            <span className="text-yellow-400 text-xs">⏱</span>
            <span className="text-yellow-400 text-xs font-bold">
              Palpites fecham em {minutesUntilLock} min
            </span>
          </div>
        )}

        {/* Placar / Palpite */}
        <div className="flex items-center justify-between gap-2">
          {/* Time Casa */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {match.homeTeam.crest ? (
              <Image
                src={match.homeTeam.crest}
                alt={match.homeTeam.shortName || "Casa"}
                width={48}
                height={36}
                className="object-contain rounded-md"
                style={{ aspectRatio: "4/3" }}
                unoptimized
              />
            ) : (
              <div className="w-12 h-9 rounded-md bg-dark-elevated border border-dark-border flex items-center justify-center text-xs text-text-muted font-bold tracking-wider">
                {match.homeTeam.tla ?? "CAS"}
              </div>
            )}
            <span className="text-sm font-semibold text-text-primary text-center leading-tight">
              {match.homeTeam.shortName ?? match.homeTeam.name}
            </span>
          </div>

          {/* Área Central */}
          <div className="flex flex-col items-center justify-center min-w-[120px] gap-2">
            {/* Placar Real */}
            {(isLive || isFinished) && hasRealScore && (
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-black ${isLive ? "text-neon-400" : "text-text-primary"}`}>
                  {match.score.fullTime.home}
                </span>
                <span className="text-xs text-text-muted uppercase tracking-widest font-bold">Placar</span>
                <span className={`text-2xl font-black ${isLive ? "text-neon-400" : "text-text-primary"}`}>
                  {match.score.fullTime.away}
                </span>
              </div>
            )}

            {/* Inputs de Palpite */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="20"
                value={betHome}
                onChange={(e) => setBetHome(e.target.value)}
                disabled={isLocked || isSaving}
                placeholder="-"
                className={`w-12 h-12 text-center text-xl font-bold rounded-lg border focus:outline-none transition-all duration-200 ${isLocked
                    ? "bg-dark-elevated/50 border-dark-border text-text-muted opacity-60 cursor-not-allowed"
                    : "bg-pitch-black border-transparent text-neon-400 focus:border-neon-500 focus:ring-1 focus:ring-neon-500 focus:drop-shadow-[0_0_8px_rgba(255,107,0,0.6)] shadow-inner hover:border-dark-border"
                  }`}
                aria-label={`Palpite gols ${match.homeTeam.shortName}`}
              />

              <div className="flex flex-col items-center justify-center">
                {isLocked ? (
                  <span className="text-text-muted text-sm" title="Palpites bloqueados">🔒</span>
                ) : (
                  <span className="text-text-muted text-xs font-bold">VS</span>
                )}
              </div>

              <input
                type="number"
                min="0"
                max="20"
                value={betAway}
                onChange={(e) => setBetAway(e.target.value)}
                disabled={isLocked || isSaving}
                placeholder="-"
                className={`w-12 h-12 text-center text-xl font-bold rounded-lg border focus:outline-none transition-all duration-200 ${isLocked
                    ? "bg-dark-elevated/50 border-dark-border text-text-muted opacity-60 cursor-not-allowed"
                    : "bg-pitch-black border-transparent text-neon-400 focus:border-neon-500 focus:ring-1 focus:ring-neon-500 focus:drop-shadow-[0_0_8px_rgba(255,107,0,0.6)] shadow-inner hover:border-dark-border"
                  }`}
                aria-label={`Palpite gols ${match.awayTeam.shortName}`}
              />
            </div>
          </div>

          {/* Time Visitante */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {match.awayTeam.crest ? (
              <Image
                src={match.awayTeam.crest}
                alt={match.awayTeam.shortName || "Visitante"}
                width={48}
                height={36}
                className="object-contain rounded-md"
                style={{ aspectRatio: "4/3" }}
                unoptimized
              />
            ) : (
              <div className="w-12 h-9 rounded-md bg-dark-elevated border border-dark-border flex items-center justify-center text-xs text-text-muted font-bold tracking-wider">
                {match.awayTeam.tla ?? "VIS"}
              </div>
            )}
            <span className="text-sm font-semibold text-text-primary text-center leading-tight">
              {match.awayTeam.shortName ?? match.awayTeam.name}
            </span>
          </div>
        </div>

        {/* Botão de salvar — só se não bloqueado */}
        {!isLocked && (
          <div className="pt-4 border-t border-dark-border flex flex-col items-center gap-2">
            {saveStatus === "error" && (
              <p className="text-xs text-red-400 font-medium text-center">{errorMessage}</p>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || isLocked || betHome === "" || betAway === ""}
              className={`w-full max-w-[200px] py-2 px-4 rounded-lg text-xs font-bold tracking-widest uppercase transition-all duration-300 border ${saveStatus === "success"
                  ? "bg-green-500/10 text-green-400 border-green-500/50"
                  : "bg-transparent text-neon-400 border-neon-500/50 hover:bg-neon-500/10 hover:border-neon-500 hover:drop-shadow-[0_0_8px_rgba(255,107,0,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-neon-500/50 disabled:hover:drop-shadow-none"
                }`}
            >
              {isSaving ? "Salvando..." : saveStatus === "success" ? "✔ Salvo" : "Salvar Palpite"}
            </button>
          </div>
        )}
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
import { useBets } from "@/components/dashboard/BetsContext";

export function LiveMatchesFeed() {
  const { matches, userBets, loading, error, updateLocalBet } = useBets();

  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [hasInitializedDay, setHasInitializedDay] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const touchStartX = useRef<number | null>(null);

  const groupedMatches = useMemo(() => {
    const groups: Record<string, FDMatch[]> = {};
    matches.forEach((match) => {
      const date = new Date(match.utcDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const localDateStr = `${year}-${month}-${day}`;
      if (!groups[localDateStr]) groups[localDateStr] = [];
      groups[localDateStr].push(match);
    });
    return groups;
  }, [matches]);

  const dayKeys = useMemo(() => Object.keys(groupedMatches).sort(), [groupedMatches]);

  useEffect(() => {
    if (!hasInitializedDay && dayKeys.length > 0) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      let index = dayKeys.indexOf(todayStr);
      if (index === -1) index = dayKeys.findIndex(date => date > todayStr);

      const initialIndex = index !== -1 ? index : dayKeys.length - 1;
      setCurrentDayIndex(initialIndex);
      setHasInitializedDay(true);
    }
  }, [dayKeys, hasInitializedDay]);

  const navigateDay = (direction: 1 | -1) => {
    const newIndex = currentDayIndex + direction;
    if (newIndex >= 0 && newIndex < dayKeys.length) {
      setSlideDirection(direction === 1 ? "right" : "left");
      setCurrentDayIndex(newIndex);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      navigateDay(diff > 0 ? 1 : -1);
    }
    touchStartX.current = null;
  };

  if (loading) {
    return (
      <section aria-labelledby="rodada-heading">
        <h2 id="rodada-heading" className="text-xl font-bold text-text-primary tracking-tight mb-4">
          Jogos da Copa 2026
        </h2>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <MatchCardSkeleton key={i} />)}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-labelledby="rodada-heading">
        <h2 id="rodada-heading" className="text-xl font-bold text-text-primary tracking-tight mb-4">
          Jogos da Copa 2026
        </h2>
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-5 py-6 text-center">
          <p className="text-red-400 text-sm font-semibold mb-1">Falha ao carregar os jogos</p>
          <p className="text-text-muted text-xs">{error}</p>
        </div>
      </section>
    );
  }

  if (dayKeys.length === 0) {
    return (
      <section aria-labelledby="rodada-heading">
        <h2 id="rodada-heading" className="text-xl font-bold text-text-primary tracking-tight mb-4">
          Jogos da Copa 2026
        </h2>
        <div className="rounded-xl border border-dark-border border-dashed bg-dark-card/40 px-6 py-10 text-center">
          <p className="text-text-muted text-sm font-medium">
            Nenhuma partida encontrada para a Copa do Mundo 2026.
          </p>
        </div>
      </section>
    );
  }

  const currentKey = dayKeys[currentDayIndex];

  return (
    <section
      aria-labelledby="rodada-heading"
      className="flex flex-col gap-4 w-full max-w-full overflow-hidden box-border px-4 pb-6"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navegação Diária */}
      <div className="flex items-center justify-between bg-dark-card/50 border border-dark-border rounded-xl px-4 py-3 shadow-sm">
        <button
          onClick={() => navigateDay(-1)}
          disabled={currentDayIndex === 0}
          className="p-2 text-neon-400 disabled:text-dark-border disabled:cursor-not-allowed hover:bg-dark-elevated rounded-lg transition-colors active:scale-95"
          aria-label="Dia anterior"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <h2 id="rodada-heading" className="text-sm font-bold text-text-primary tracking-wide text-center">
            {formatDayHeader(currentKey)}
          </h2>
        </div>

        <button
          onClick={() => navigateDay(1)}
          disabled={currentDayIndex === dayKeys.length - 1}
          className="p-2 text-neon-400 disabled:text-dark-border disabled:cursor-not-allowed hover:bg-dark-elevated rounded-lg transition-colors active:scale-95"
          aria-label="Próximo dia"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Lista de Partidas do Dia */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentKey}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="rounded-2xl bg-dark-card border border-dark-border shadow-md p-4 w-full"
        >
          <div className="flex flex-col gap-5">
            {groupedMatches[currentKey]?.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                userBet={userBets[match.id]}
                onSaveSuccess={(home, away) => updateLocalBet(match.id, home, away)}
              />
            ))}
            {(!groupedMatches[currentKey] || groupedMatches[currentKey].length === 0) && (
              <p className="text-center text-text-muted text-sm py-4">Nenhum jogo para este dia.</p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}