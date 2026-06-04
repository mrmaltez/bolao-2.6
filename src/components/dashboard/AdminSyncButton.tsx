"use client";

import { useState } from "react";
import { syncMatchResults } from "@/app/actions/admin";

export function AdminSyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSync = async () => {
    // Confirmação para evitar cliques acidentais
    if (!window.confirm("Atenção: Isso buscará todos os jogos finalizados e subscreverá os placares no banco de dados. Deseja continuar?")) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await syncMatchResults();
      if (res.success) {
        setMessage({ text: res.message || "Sincronizado com sucesso.", type: "success" });
      } else {
        setMessage({ text: res.error || "Erro na sincronização.", type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: "Erro fatal ao comunicar com o servidor.", type: "error" });
    } finally {
      setLoading(false);
      // Remove a mensagem após 5 segundos
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="flex flex-col items-center sm:items-end justify-center py-4">
      <button
        onClick={handleSync}
        disabled={loading}
        className="group relative flex items-center gap-2 px-3 py-1.5 bg-pitch-black/50 border border-dark-border hover:border-neon-900/50 hover:bg-dark-elevated transition-all rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        title="Admin: Sincronizar placares reais com o Supabase"
      >
        <div className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-neon-500 animate-pulse" : "bg-dark-border group-hover:bg-neon-500 transition-colors"}`} />
        <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest group-hover:text-neon-400 transition-colors">
          {loading ? "Sincronizando..." : "Sync API Placares"}
        </span>
      </button>

      {message && (
        <div className={`mt-2 text-[10px] font-bold px-3 py-1 rounded border ${message.type === "success"
            ? "bg-green-900/20 text-green-400 border-green-900/50"
            : "bg-red-900/20 text-red-400 border-red-900/50"
          }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
