import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardTable, LeaderboardSkeleton } from "@/components/ui/LeaderboardTable";
import { Suspense } from "react";
import type { RankingEntry } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Ranking",
  description: "Ranking geral do Bolão Copa 2026 — quem está liderando a disputa?",
};

async function RankingContent() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, pontos_total")
    .order("pontos_total", { ascending: false });

  const ranking: RankingEntry[] = (profiles ?? []).map((profile, index) => ({
    user_id: profile.id,
    username: profile.username,
    avatar_url: profile.avatar_url,
    pontos_total: profile.pontos_total,
    position: index + 1,
  }));

  return (
    <LeaderboardTable
      entries={ranking}
      currentUserId={user?.id}
    />
  );
}

export default function RankingPage() {
  return (
    <div className="page-enter">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-pitch-black/80 backdrop-blur-md border-b border-dark-border px-5 py-4">
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              🏆 Ranking Geral
            </h1>
            <p className="text-[11px] font-medium text-text-muted mt-1 uppercase tracking-wider">
              Classificação em tempo real
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 max-w-xl mx-auto space-y-6">
        {/* Pódio (top 3) */}
        <div className="rounded-xl bg-dark-card border border-dark-border p-6 shadow-md text-center">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-6">Pódio Atual</p>
          <div className="flex items-end justify-center gap-4">
            {/* 2º */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl drop-shadow-sm">🥈</span>
              <div className="bg-dark-elevated h-16 w-20 rounded-t-xl flex items-center justify-center border-t border-x border-dark-border">
                <span className="text-xs font-bold text-text-muted">2º</span>
              </div>
            </div>
            {/* 1º */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl drop-shadow-md">🥇</span>
              <div
                className="h-24 w-24 rounded-t-xl flex items-center justify-center shadow-neon-glow relative overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)", border: "1px solid rgba(212,175,55,0.4)" }}
              >
                <div className="absolute inset-0 bg-shimmer animate-shimmer opacity-30" />
                <span className="text-lg font-black text-neon-400">1º</span>
              </div>
            </div>
            {/* 3º */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl drop-shadow-sm">🥉</span>
              <div className="bg-dark-elevated h-12 w-20 rounded-t-xl flex items-center justify-center border-t border-x border-dark-border">
                <span className="text-xs font-bold text-text-muted">3º</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela completa */}
        <Suspense fallback={<LeaderboardSkeleton rows={10} />}>
          <RankingContent />
        </Suspense>
      </main>
    </div>
  );
}
