import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardTable, LeaderboardSkeleton } from "@/components/ui/LeaderboardTable";
import { Suspense } from "react";
import type { RankingEntry } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Ranking",
  description: "Ranking geral do Bolão Copa 2026 — quem está liderando a disputa?",
};

function PodiumAvatar({
  name,
  src,
  size = "md",
  borderColor,
  glowColor,
}: {
  name: string;
  src?: string | null;
  size?: "md" | "lg" | "xl";
  borderColor: string;
  glowColor: string;
}) {
  const letter = name.charAt(0).toUpperCase();

  const colors = [
    ["#7C3AED", "#C084FC"],
    ["#0891B2", "#67E8F9"],
    ["#D97706", "#FCD34D"],
    ["#059669", "#6EE7B7"],
    ["#DC2626", "#FCA5A5"],
    ["#7C3AED", "#818CF8"],
    ["#DB2777", "#F9A8D4"],
    ["#EA580C", "#FED7AA"],
  ];
  const idx = name.charCodeAt(0) % colors.length;
  const [from, to] = colors[idx];

  const sizeMap = {
    md: { outer: "w-12 h-12", text: "text-lg" },
    lg: { outer: "w-16 h-16", text: "text-2xl" },
    xl: { outer: "w-20 h-20", text: "text-3xl" },
  };
  const { outer, text } = sizeMap[size];

  return (
    <div
      className={`${outer} rounded-full flex items-center justify-center font-black ${text} text-white select-none shrink-0`}
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
        border: `2px solid ${borderColor}`,
        boxShadow: `0 0 20px ${glowColor}`,
      }}
    >
      {letter}
    </div>
  );
}

function PodiumCard({
  entry,
  rank,
  height,
  isFirst,
}: {
  entry: RankingEntry;
  rank: number;
  height: string;
  isFirst?: boolean;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  const borderColors = ["#D4AF37", "#C0C0C0", "#CD7F32"];
  const glowColors = ["rgba(212,175,55,0.5)", "rgba(192,192,192,0.3)", "rgba(205,127,50,0.3)"];
  const bgColors = [
    "linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.03) 100%)",
    "linear-gradient(180deg, rgba(192,192,192,0.08) 0%, transparent 100%)",
    "linear-gradient(180deg, rgba(205,127,50,0.08) 0%, transparent 100%)",
  ];
  const i = rank - 1;

  return (
    <div className={`flex flex-col items-center gap-2 ${isFirst ? "z-10" : "z-0"}`}>
      <PodiumAvatar
        name={entry.username}
        src={entry.avatar_url}
        size={isFirst ? "xl" : "lg"}
        borderColor={borderColors[i]}
        glowColor={glowColors[i]}
      />
      <div
        className={`${height} w-24 sm:w-28 rounded-t-xl flex flex-col items-center justify-center gap-1 border-t border-x`}
        style={{
          background: bgColors[i],
          borderColor: borderColors[i] + "55",
        }}
      >
        <span className="text-base">{medals[i]}</span>
        <span className="text-[11px] font-bold text-text-secondary truncate w-20 text-center px-1">
          {entry.username}
        </span>
        <span className="text-sm font-black" style={{ color: borderColors[i] }}>
          {entry.pontos_total}
          <span className="text-[9px] font-normal ml-0.5">pts</span>
        </span>
      </div>
    </div>
  );
}

async function RankingContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, pontos_total")
    .order("pontos_total", { ascending: false });

  const ranking: RankingEntry[] = (profiles ?? []).map((profile: any, index) => ({
    user_id: profile.id,
    username: profile.username,
    avatar_url: profile.avatar_url,
    pontos_total: profile.pontos_total,
    position: index + 1,
  }));

  const first = ranking[0];
  const second = ranking[1];
  const third = ranking[2];

  return (
    <div className="flex flex-col gap-10">
      {/* Pódio */}
      {first && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(234,88,12,0.03) 100%)",
            border: "1px solid rgba(249,115,22,0.25)",
            boxShadow: "0 0 40px rgba(249,115,22,0.07), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="px-5 pt-8 pb-0 sm:px-8 sm:pt-10">
            <div className="flex items-end justify-center gap-4 sm:gap-8">
              {second && <PodiumCard entry={second} rank={2} height="h-20 sm:h-24" />}
              <PodiumCard entry={first} rank={1} height="h-28 sm:h-32" isFirst />
              {third && <PodiumCard entry={third} rank={3} height="h-16 sm:h-20" />}
            </div>
          </div>
        </div>
      )}

      {/* Lista Completa */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border: "1px solid rgba(249,115,22,0.12)",
          boxShadow: "0 0 24px rgba(249,115,22,0.04)",
        }}
      >
        <LeaderboardTable entries={ranking} currentUserId={user?.id} />
      </div>
    </div>
  );
}

export default function RankingPage() {
  return (
    /*
      Espelha exatamente a estrutura da HomePage:
      wrapper raiz com flex-col + gap-6 aplicado entre
      header e main diretamente — sem pt/mt que o sticky engole.
    */
    <div className="page-enter min-h-dvh bg-pitch-black w-full flex flex-col items-center gap-10 pt-4">

      {/* ── Header ── */}
      {/*
        sticky top-4 + w-[calc(100%-2rem)] espelha exatamente o padrão da HomePage:
        flutua com respiro nas laterais e no topo, participa do gap-6 do pai.
      */}
      <header className="sticky top-4 z-40 bg-pitch-black/85 backdrop-blur-xl border border-dark-border/80 w-[calc(100%-2rem)] mx-auto py-4 sm:py-5 px-4 rounded-2xl shadow-lg">
        <div className="flex flex-col items-center justify-center gap-1.5">
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight text-center">
            🏆 Ranking Geral
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
              ao vivo
            </span>
          </div>
        </div>
      </header>

      {/* ── Conteúdo ── */}
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-28 box-border">
        <Suspense fallback={<LeaderboardSkeleton rows={10} />}>
          <RankingContent />
        </Suspense>
      </main>

    </div>
  );
}