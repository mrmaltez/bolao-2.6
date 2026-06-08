import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardTable, LeaderboardSkeleton } from "@/components/ui/LeaderboardTable";
import { Avatar } from "@/components/ui/Avatar";
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

  const top3 = ranking.slice(0, 3);
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  return (
    <>
      {/* Pódio (top 3) */}
      {top3.length > 0 && (
        <div className="rounded-2xl bg-dark-card border border-dark-border p-6 shadow-md text-center mb-6">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-6">Pódio Atual</p>
          <div className="flex items-end justify-center gap-4">
            {/* 2º Lugar */}
            {second && (
              <div className="flex flex-col items-center gap-3 relative z-10">
                <Avatar src={second.avatar_url} name={second.username} size="lg" className="shadow-lg border-2 border-[#C0C0C0]" />
                <div className="bg-dark-elevated h-20 w-24 rounded-t-xl flex flex-col items-center justify-start pt-3 border-t border-x border-dark-border/50 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] relative">
                  <span className="text-3xl drop-shadow-sm absolute -top-5">🥈</span>
                  <span className="text-xs font-bold text-text-muted mt-3 truncate w-20 px-1">{second.username}</span>
                  <span className="text-sm font-black text-text-primary">{second.pontos_total} <span className="text-[10px] font-normal">pts</span></span>
                </div>
              </div>
            )}
            
            {/* 1º Lugar */}
            {first && (
              <div className="flex flex-col items-center gap-3 relative z-20 -mb-2">
                <Avatar src={first.avatar_url} name={first.username} size="xl" className="shadow-[0_0_20px_rgba(212,175,55,0.4)] border-2 border-[#D4AF37]" />
                <div
                  className="h-28 w-28 rounded-t-xl flex flex-col items-center justify-start pt-3 shadow-[0_-5px_20px_rgba(212,175,55,0.15)] relative overflow-hidden"
                  style={{ background: "linear-gradient(180deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)", border: "1px solid rgba(212,175,55,0.4)" }}
                >
                  <div className="absolute inset-0 bg-shimmer animate-shimmer opacity-30" />
                  <span className="text-4xl drop-shadow-md absolute -top-6">🥇</span>
                  <span className="text-sm font-bold text-neon-400 mt-4 truncate w-24 px-1">{first.username}</span>
                  <span className="text-lg font-black text-[#D4AF37]">{first.pontos_total} <span className="text-[10px] font-normal">pts</span></span>
                </div>
              </div>
            )}
            
            {/* 3º Lugar */}
            {third && (
              <div className="flex flex-col items-center gap-3 relative z-0">
                <Avatar src={third.avatar_url} name={third.username} size="lg" className="shadow-md border-2 border-[#CD7F32]" />
                <div className="bg-dark-elevated h-16 w-24 rounded-t-xl flex flex-col items-center justify-start pt-3 border-t border-x border-dark-border/50 shadow-[0_-5px_15px_rgba(0,0,0,0.2)] relative">
                  <span className="text-3xl drop-shadow-sm absolute -top-5">🥉</span>
                  <span className="text-xs font-bold text-text-muted mt-2 truncate w-20 px-1">{third.username}</span>
                  <span className="text-sm font-black text-text-primary">{third.pontos_total} <span className="text-[10px] font-normal">pts</span></span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista Completa */}
      <LeaderboardTable
        entries={ranking}
        currentUserId={user?.id}
      />
    </>
  );
}

export default function RankingPage() {
  return (
    <div className="page-enter min-h-dvh bg-pitch-black w-full flex flex-col items-center">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-pitch-black/85 backdrop-blur-xl border-b border-dark-border/80 w-full px-4 pt-6">
        <div className="py-5 max-w-7xl w-full mx-auto flex items-center justify-between">
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

      {/* ── Conteúdo Principal ── */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-10 box-border">
        <Suspense fallback={<LeaderboardSkeleton rows={10} />}>
          <RankingContent />
        </Suspense>
      </main>
    </div>
  );
}
