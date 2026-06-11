"use client";

import { useEffect, useRef, useState } from "react";
import { clearZikaPenalty } from "@/app/actions/zika";

interface ZikaBlockerProps {
  isPunished: boolean;
  userId: string;
}

const ALL_ZIKA_IMAGES = [
  "/zika-image.png",
  "/zika-image-2.png",
  "/zika-image-3.png",
  "/zika-image-4.png",
  "/zika-image-5.png",
  "/zika-image-6.png",
  "/zika-image-7.png",
  "/zika-image-8.png",
  "/zika-image-9.png",
  "/zika-image-10.png",
  "/zika-image-11.png",
  "/zika-image-12.png",
  "/zika-image-13.png",
  "/zika-image-14.png",
  "/zika-image-15.png",
  "/zika-image-16.png",
  "/zika-image-17.png",
  "/zika-image-18.png",
  "/zika-image-19.png",
  "/zika-image-20.png",
  "/zika-image-21.png",
  "/zika-image-22.png",
  "/zika-image-23.png",
  "/zika-image-24.png",
  "/zika-image-25.png",
  "/zika-image-26.png",
  "/zika-image-27.png",
  "/zika-image-28.png",
];

const ZIKA_MESSAGES = [
  "A mossada te elegeu o alvo do dia. Aguentar é o preço da fama!",
  "Receba com dignidade. A zika escolheu você.",
  "Todo herói tem seu fardo. O seu é esse aqui.",
  "Não foi pessoal. Bom, foi um pouco pessoal.",
  "A maldição foi lançada. Boa sorte na próxima rodada.",
  "A democracia falou. E ela não gostou de você.",
  "Unanimidade é rara. Parabéns pelo feito.",
];

const TOTAL_IMAGES = 10;
const IMG_DURATION = 6000;
const TOTAL_SECONDS = 60;

function sampleN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

export function ZikaBlocker({ isPunished, userId }: ZikaBlockerProps) {
  const [isBlocked, setIsBlocked] = useState(isPunished);
  const [countdown, setCountdown] = useState(TOTAL_SECONDS);
  const [imgIndex, setImgIndex] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [sessionImages, setSessionImages] = useState<string[] | null>(null);
  const clearedRef = useRef(false);

  // Sorteio 100% client-side: roda só após hidratação
  useEffect(() => {
    if (!isPunished) return;
    setSessionImages(sampleN(ALL_ZIKA_IMAGES, TOTAL_IMAGES));
  }, [isPunished]);

  // Countdown
  useEffect(() => {
    if (!isBlocked) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isBlocked]);

  // Rotação de imagem a cada 6s
  useEffect(() => {
    if (!isBlocked || !sessionImages) return;
    const rotator = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setImgIndex((prev) => (prev + 1) % TOTAL_IMAGES);
        setMsgIndex((prev) => (prev + 1) % ZIKA_MESSAGES.length);
        setFadeIn(true);
      }, 400);
    }, IMG_DURATION);
    return () => clearInterval(rotator);
  }, [isBlocked, sessionImages]);

  // Libera ao zerar
  useEffect(() => {
    if (!isBlocked || countdown > 0 || clearedRef.current) return;
    clearedRef.current = true;
    clearZikaPenalty(userId).finally(() => setIsBlocked(false));
  }, [countdown, isBlocked, userId]);

  if (!isBlocked || !sessionImages) return null;

  const progress = ((TOTAL_SECONDS - countdown) / TOTAL_SECONDS) * 100;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-pitch-black overflow-hidden"
      style={{ pointerEvents: "auto" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-purple-900/20 blur-3xl" />
      </div>

      <div className="relative h-full flex items-center justify-center px-6 lg:px-16">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 w-full max-w-5xl">

          {/* Imagem */}
          <div
            className="flex flex-col items-center gap-3 shrink-0"
            style={{ opacity: fadeIn ? 1 : 0, transition: "opacity 0.4s ease" }}
          >
            <div className="w-64 h-80 sm:w-72 sm:h-96 lg:w-96 lg:h-[480px] rounded-2xl overflow-hidden ring-2 ring-purple-500/40 shadow-[0_0_80px_rgba(147,51,234,0.4)]">
              <img
                src={sessionImages[imgIndex]}
                alt="Você foi zikado!"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://picsum.photos/seed/zika${imgIndex}/400/560`;
                }}
              />
            </div>
            <div className="flex gap-2">
              {sessionImages.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === imgIndex ? "bg-purple-400 scale-125" : "bg-purple-800"
                    }`}
                />
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col items-center lg:items-start gap-5 text-center lg:text-left">
            <h1
              className="text-xl sm:text-2xl lg:text-3xl font-black text-purple-500 uppercase tracking-widest animate-pulse"
              style={{ whiteSpace: "nowrap" }}
            >
              🧿 Você foi Zikado! 🧿
            </h1>

            <p
              className="text-text-secondary text-sm sm:text-base leading-relaxed max-w-xs"
              style={{ opacity: fadeIn ? 1 : 0, transition: "opacity 0.4s ease" }}
            >
              {ZIKA_MESSAGES[msgIndex]}
            </p>

            <div className="flex flex-col items-center lg:items-start gap-1">
              <div className="text-6xl sm:text-7xl lg:text-8xl font-black text-purple-300 tabular-nums leading-none">
                {countdown}
              </div>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                segundos restantes
              </p>
            </div>

            <div className="w-56 sm:w-72 lg:w-80 h-1 bg-purple-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-700 to-purple-400 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}