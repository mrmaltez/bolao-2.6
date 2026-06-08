"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

/**
 * Envolve os cards do dashboard e anima com fade-in + stagger na montagem.
 */
export function AnimatedCards({ children, className }: { children: React.ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-animate-card]", {
        y: 24,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.15,
      });
    }, containerRef);

    return () => ctx.revert(); // cleanup
  }, []);

  return <div ref={containerRef} className={className}>{children}</div>;
}

/**
 * Faixa da Copa com efeito parallax de mouse.
 * O texto se move suavemente na direção oposta ao cursor.
 */
export function ParallaxBanner({ text }: { text: string }) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const banner = bannerRef.current;
    const textEl = textRef.current;
    if (!banner || !textEl) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = banner.getBoundingClientRect();
      // Posição normalizada do mouse relativa ao banner (-0.5 a 0.5)
      const xNorm = (e.clientX - rect.left) / rect.width - 0.5;
      const yNorm = (e.clientY - rect.top) / rect.height - 0.5;

      // Move na direção OPOSTA ao mouse, com intensidade sutil
      gsap.to(textEl, {
        x: -xNorm * 14,
        y: -yNorm * 6,
        duration: 0.6,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(textEl, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
      });
    };

    // Registra os eventos no document para capturar o mouse mesmo fora do banner
    document.addEventListener("mousemove", handleMouseMove);
    banner.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      banner.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={bannerRef}
      className="w-full py-4 text-center bg-neon-500 shadow-[0_2px_12px_rgba(212,175,55,0.25)] overflow-hidden relative"
    >
      <span
        ref={textRef}
        className="inline-block text-xs font-black tracking-[0.3em] uppercase text-pitch-black will-change-transform select-none"
      >
        {text}
      </span>
    </div>
  );
}
