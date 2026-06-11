"use client";

import { useState, useTransition } from "react";
import { Avatar } from "../ui/Avatar";
import { submitZikaVote } from "@/app/actions/zika";

interface ZikaModalProps {
  profiles: { id: string; username: string; avatar_url: string | null }[];
  currentUserId: string;
  onClose: () => void;
}

export function ZikaModal({ profiles, currentUserId, onClose }: ZikaModalProps) {
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleVote = (targetId: string) => {
    setLoadingId(targetId);
    setFeedback(null);
    startTransition(async () => {
      const res = await submitZikaVote(targetId);
      if (res.success) {
        setFeedback({ message: "Zika registrada! Que a maldição acompanhe seu alvo. 🧿", type: "success" });
        setTimeout(() => onClose(), 2000);
      } else {
        setFeedback({ message: res.error || "Erro ao zikar.", type: "error" });
        setLoadingId(null);
      }
    });
  };

  const targets = profiles.filter((p) => p.id !== currentUserId);

  return (
    // Overlay — ocupa 100dvh para descontar barra do browser mobile
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-black/80 backdrop-blur-sm p-4"
      style={{ height: "100dvh" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Container do modal — altura máxima dinâmica com margem segura */}
      <div
        className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col"
        style={{ maxHeight: "min(600px, calc(100dvh - 2rem))" }}
      >
        {/* Header — fixo, nunca some */}
        <div className="shrink-0 p-5 border-b border-dark-border flex justify-between items-center bg-dark-elevated rounded-t-2xl">
          <h2 className="text-xl font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
            <span className="text-2xl drop-shadow-md">🧿</span> Zique a Mossada
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-2xl leading-none transition-colors w-8 h-8 flex items-center justify-center"
          >
            &times;
          </button>
        </div>

        {/* Subtítulo — fixo */}
        <div className="shrink-0 px-5 pt-4 pb-2">
          <p className="text-sm text-text-secondary">
            Escolha o seu alvo de hoje. Quem acumular mais votos vai sofrer o Vampetaço no próximo login!{" "}
            <strong className="text-text-muted">(1 voto por dia)</strong>
          </p>
        </div>

        {/* Feedback — fixo, só aparece quando necessário */}
        {feedback && (
          <div className="shrink-0 px-5 pb-2">
            <div
              className={`p-3 rounded-lg text-sm font-semibold border ${feedback.type === "success"
                  ? "bg-green-900/20 text-green-400 border-green-500/30"
                  : "bg-red-900/20 text-red-400 border-red-500/30"
                }`}
            >
              {feedback.message}
            </div>
          </div>
        )}

        {/* Lista — única parte com scroll */}
        <ul className="flex-1 overflow-y-auto px-5 pb-5 pt-1 flex flex-col gap-3 overscroll-contain">
          {targets.map((p) => {
            const isVoting = loadingId === p.id;
            return (
              <li
                key={p.id}
                className="flex items-center justify-between bg-pitch-black/40 border border-dark-border py-3 px-4 rounded-xl hover:bg-dark-elevated transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={p.avatar_url} name={p.username} size="sm" />
                  <span className="font-semibold text-text-primary">{p.username}</span>
                </div>
                <button
                  disabled={isPending}
                  onClick={() => handleVote(p.id)}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                >
                  {isVoting ? "Zikando..." : "Zikar 🧿"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}