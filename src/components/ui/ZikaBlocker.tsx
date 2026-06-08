"use client";

import { useEffect, useState } from "react";

interface ZikaBlockerProps {
  isPunished: boolean;
  userId: string;
}

export function ZikaBlocker({ isPunished, userId }: ZikaBlockerProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!isPunished) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const servedKey = `zika_served_date_${userId}`;
    const alreadyServed = localStorage.getItem(servedKey);

    // Se já cumpriu a punição hoje, não bloqueia de novo
    if (alreadyServed === todayStr) return;

    // Ativar bloqueio e marcar no localStorage
    setIsBlocked(true);
    localStorage.setItem(servedKey, todayStr);

    // Deslogar o usuário silenciosamente enquanto ele cumpre o castigo
    const logoutSilently = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Erro ao deslogar silenciosamente:", e);
      }
    };
    logoutSilently();
  }, [isPunished, userId]);

  // Temporizador de 60 segundos
  useEffect(() => {
    if (!isBlocked) return;

    if (countdown <= 0) {
      setIsBlocked(false);
      window.location.href = "/login";
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isBlocked, countdown]);

  if (!isBlocked) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-pitch-black"
      style={{ pointerEvents: "auto" }}
    >
      {/* Imagem do Vampetaço */}
      <div className="relative w-72 h-72 sm:w-96 sm:h-96 mb-8">
        <img
          src="/zika-image.png"
          alt="Você foi zikado! Vampetaço!"
          className="w-full h-full object-contain drop-shadow-[0_0_40px_rgba(147,51,234,0.5)]"
          onError={(e) => {
            // Fallback caso a imagem não exista ainda
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Mensagem */}
      <div className="text-center px-6">
        <h1 className="text-3xl sm:text-5xl font-black text-purple-400 uppercase tracking-tight mb-3 animate-pulse">
          🧿 Você foi Zikado! 🧿
        </h1>
        <p className="text-text-secondary text-base sm:text-lg mb-8 max-w-md">
          A mossada te elegeu o alvo do dia. Aguentar é o preço da fama!
        </p>
      </div>

      {/* Countdown */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-7xl sm:text-8xl font-black text-purple-300 tabular-nums leading-none">
          {countdown}
        </div>
        <p className="text-xs text-text-muted font-bold uppercase tracking-widest">
          segundos restantes
        </p>
      </div>

      {/* Barra de progresso visual */}
      <div className="w-64 sm:w-80 h-2 bg-dark-elevated rounded-full mt-8 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${((60 - countdown) / 60) * 100}%` }}
        />
      </div>
    </div>
  );
}
