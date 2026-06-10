import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/Avatar";
import { LiveMatchesFeed } from "@/components/ui/LiveMatchesFeed";
import type { Profile } from "@/types/database.types";
import { BetsProvider } from "@/components/dashboard/BetsContext";
import { UserBetsSidebar } from "@/components/dashboard/UserBetsSidebar";
import { AdminSyncButton } from "@/components/dashboard/AdminSyncButton";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { AnimatedCards, ParallaxBanner } from "@/components/dashboard/DashboardAnimations";
import { ZikaButton } from "@/components/dashboard/ZikaButton";
import { getZikadosDoDia } from "@/app/actions/zika";

export const metadata: Metadata = {
  title: "Home",
  description: "Acompanhe os jogos da rodada, o mural social e a tabela da Copa.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSigla(name: string): string {
  if (!name) return "?";
  if (name.length <= 3) return name.toUpperCase();
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name.slice(0, 3).toUpperCase();
  return parts.slice(0, 3).map((p: string) => p[0]).join("").toUpperCase();
}

function joinNomes(nomes: string[]): string {
  if (nomes.length === 0) return "";
  if (nomes.length === 1) return nomes[0];
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
  const last = nomes[nomes.length - 1];
  const rest = nomes.slice(0, -1).join(", ");
  return `${rest} e ${last}`;
}

function toBrasiliaDateStr(date: Date): string {
  return date
    .toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .reverse()
    .join("-");
}

// ─── Componente de card padrão ────────────────────────────────────────────────
function DestaqueCard({
  emoji,
  label,
  nome,
  detalhe,
  cor,
}: {
  emoji: string;
  label: string;
  nome: string;
  detalhe: string;
  cor: string;
}) {
  return (
    <div className="bg-dark-elevated py-3.5 px-4 rounded-xl border border-dark-border flex items-center gap-3">
      <div className="text-2xl drop-shadow-md shrink-0">{emoji}</div>
      <div className="overflow-hidden min-w-0">
        <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
          {label}
        </p>
        <p className="text-sm font-semibold text-text-primary truncate">
          {nome}{" "}
          <span className={`text-xs font-bold ${cor}`}>({detalhe})</span>
        </p>
      </div>
    </div>
  );
}

// ─── Componente de card de videntes com dropdown (Client Component) ───────────
// Precisa ser "use client" para ter interatividade, por isso fica num arquivo separado.
// Como page.tsx é Server Component, vamos usar um details/summary nativo do HTML
// que funciona sem JavaScript — semântico, acessível e sem bundle extra.
function VidenteCard({
  label,
  videntes,
}: {
  label: string;
  videntes: { username: string; jogos: string[] }[];
}) {
  return (
    <details className="group bg-dark-elevated rounded-xl border border-dark-border overflow-hidden">
      <summary className="flex items-center gap-3 py-3.5 px-4 cursor-pointer list-none select-none">
        <div className="text-2xl drop-shadow-md shrink-0">🔮</div>
        <div className="flex-1 overflow-hidden min-w-0">
          <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
            {label}
          </p>
          <p className="text-sm font-semibold text-text-primary truncate">
            {joinNomes(videntes.map((v) => v.username))}{" "}
            <span className="text-purple-400 text-xs font-bold">
              (ver acertos ▾)
            </span>
          </p>
        </div>
      </summary>

      {/* Dropdown expandido */}
      <div className="border-t border-dark-border px-4 pb-3 pt-2 flex flex-col gap-2">
        {videntes.map((v, i) => (
          <div key={i}>
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">
              {v.username}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {v.jogos.map((jogo, j) => (
                <span
                  key={j}
                  className="text-[11px] font-semibold bg-purple-900/30 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full"
                >
                  {jogo}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

// ─── Mural Social ─────────────────────────────────────────────────────────────
async function MuralSocial() {
  const supabase = await createClient();

  const zikadoNome = await getZikadosDoDia();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // ── Perfis ordenados por pontuação total ─────────────────────────────────
  const { data: profilesRaw } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, pontos_total")
    .order("pontos_total", { ascending: false });
  const profiles = (profilesRaw || []) as any[];

  // ── Último dia que teve partidas FINISHED ────────────────────────────────
  const { data: lastFinishedMatch } = await supabase
    .from("matches")
    .select("match_start_time")
    .eq("status", "FINISHED")
    .order("match_start_time", { ascending: false })
    .limit(1)
    .single();

  const lastDayStr = lastFinishedMatch
    ? toBrasiliaDateStr(new Date(lastFinishedMatch.match_start_time))
    : null;

  // ── Todas as partidas desse dia ──────────────────────────────────────────
  let matchesOfDay: any[] = [];
  let isRoundOngoing = false;
  let dataAtualizacao = "Recentemente";

  if (lastDayStr) {
    const dayStart = new Date(`${lastDayStr}T00:00:00-03:00`);
    const dayEnd = new Date(`${lastDayStr}T23:59:59-03:00`);

    const { data: dayMatchesRaw } = await supabase
      .from("matches")
      .select("id, home_team, away_team, home_score, away_score, match_start_time, status")
      .gte("match_start_time", dayStart.toISOString())
      .lte("match_start_time", dayEnd.toISOString())
      .order("match_start_time", { ascending: true });

    matchesOfDay = (dayMatchesRaw || []) as any[];
    isRoundOngoing = matchesOfDay.some((m: any) => m.status !== "FINISHED");

    if (matchesOfDay.length > 0) {
      const dateObj = new Date(matchesOfDay[0].match_start_time);
      dataAtualizacao = dateObj.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
      });
    }
  }

  const finishedMatches = matchesOfDay.filter((m: any) => m.status === "FINISHED");
  const finishedMatchIds = finishedMatches.map((m: any) => m.id);

  // ── Dados calculados para os destaques ───────────────────────────────────
  let craques: { username: string; total: number }[] = [];
  let micos: { username: string; total: number }[] = [];
  let videntes: { username: string; jogos: string[] }[] = [];
  let maxPtsDia = 0;
  let minPtsDia = 0;

  if (!isRoundOngoing && finishedMatchIds.length > 0) {
    const { data: betsRaw } = await supabase
      .from("bets")
      .select("user_id, match_id, pontos, home_score_bet, away_score_bet")
      .in("match_id", finishedMatchIds);

    const bets = (betsRaw || []) as any[];

    if (bets.length > 0) {
      const enriched = bets.map((b: any) => ({
        ...b,
        pontos: Number(b.pontos),
        home_score_bet: Number(b.home_score_bet),
        away_score_bet: Number(b.away_score_bet),
        username:
          profiles.find((p: any) => p.id === b.user_id)?.username ?? "Jogador",
      }));

      // Soma de pontos por usuário no dia
      const pontosPorUsuario = new Map<string, { username: string; total: number }>();
      for (const b of enriched) {
        const atual = pontosPorUsuario.get(b.user_id);
        if (atual) {
          atual.total += b.pontos;
        } else {
          pontosPorUsuario.set(b.user_id, { username: b.username, total: b.pontos });
        }
      }

      const rankingDia = Array.from(pontosPorUsuario.values()).sort(
        (a, b) => b.total - a.total
      );

      maxPtsDia = rankingDia[0].total;
      minPtsDia = rankingDia[rankingDia.length - 1].total;

      craques = rankingDia.filter((u) => u.total === maxPtsDia);
      if (minPtsDia !== maxPtsDia) {
        micos = rankingDia.filter((u) => u.total === minPtsDia);
      }

      // Videntes — agrupa acertos por usuário
      const acertosPorUsuario = new Map<string, { username: string; jogos: string[] }>();
      for (const b of enriched) {
        const partida = finishedMatches.find((m: any) => m.id === b.match_id);
        if (!partida) continue;
        const realHome = Number(partida.home_score);
        const realAway = Number(partida.away_score);
        if (b.home_score_bet === realHome && b.away_score_bet === realAway) {
          const jogoStr = `${toSigla(partida.home_team)} x ${toSigla(partida.away_team)}: ${realHome}x${realAway}`;
          const atual = acertosPorUsuario.get(b.user_id);
          if (atual) {
            atual.jogos.push(jogoStr);
          } else {
            acertosPorUsuario.set(b.user_id, { username: b.username, jogos: [jogoStr] });
          }
        }
      }
      videntes = Array.from(acertosPorUsuario.values());
    }
  }

  // ── Líder(es) e Lanterna(s) ──────────────────────────────────────────────
  const maxTotal = profiles[0]?.pontos_total ?? 0;
  const minTotal = profiles[profiles.length - 1]?.pontos_total ?? 0;
  const lideres = profiles.filter((p: any) => p.pontos_total === maxTotal);
  const lanternas =
    profiles.length > 1 && minTotal !== maxTotal
      ? profiles.filter((p: any) => p.pontos_total === minTotal)
      : [];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <section
      aria-labelledby="mural-heading"
      className="rounded-2xl bg-dark-card border border-dark-border shadow-md p-6 h-full flex flex-col gap-5 w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          id="mural-heading"
          className="text-lg font-bold text-text-primary tracking-tight"
        >
          💬 Mural Social
        </h2>
        {isRoundOngoing ? (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-900/40 text-orange-400 px-2.5 py-1 rounded-full border border-orange-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Rodada em andamento
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-green-900/30 text-green-400 px-2.5 py-1 rounded-full border border-green-500/30 flex items-center gap-1">
            ✅ Rodada Fechada
          </span>
        )}
      </div>

      <p className="text-sm text-text-muted font-medium">
        Última rodada:{" "}
        <strong className="text-text-secondary">{dataAtualizacao}</strong>
      </p>

      {/* Cards */}
      <div className="flex-1 flex flex-col gap-3">

        {/* 👑 Líder(es) Geral */}
        {lideres.length > 0 && (
          <DestaqueCard
            emoji="👑"
            label={lideres.length > 1 ? "Líderes Gerais" : "Líder Geral"}
            nome={joinNomes(lideres.map((p: any) => p.username))}
            detalhe={`${maxTotal} pts no total`}
            cor="text-neon-400"
          />
        )}

        {/* 🎯 Craque(s) da Rodada */}
        {craques.length > 0 && (
          <DestaqueCard
            emoji="🎯"
            label={craques.length > 1 ? "Craques da Rodada" : "Craque da Rodada"}
            nome={joinNomes(craques.map((c) => c.username))}
            detalhe={`${maxPtsDia} pts`}
            cor="text-yellow-400"
          />
        )}

        {/* 🔮 Vidente(s) — dropdown */}
        {videntes.length > 0 && (
          <VidenteCard
            label={videntes.length > 1 ? "Videntes!" : "Vidente!"}
            videntes={videntes}
          />
        )}

        {/* 💀 Mico(s) da Rodada */}
        {micos.length > 0 && (
          <DestaqueCard
            emoji="💀"
            label={micos.length > 1 ? "Micos da Rodada" : "Mico da Rodada"}
            nome={joinNomes(micos.map((m) => m.username))}
            detalhe={`${minPtsDia} pts`}
            cor="text-red-400"
          />
        )}

        {/* 🐢 Lanterna(s) */}
        {lanternas.length > 0 && (
          <DestaqueCard
            emoji="🐢"
            label={lanternas.length > 1 ? "Lanternas" : "Lanterna"}
            nome={joinNomes(lanternas.map((p: any) => p.username))}
            detalhe={`${minTotal} pts no total`}
            cor="text-text-muted"
          />
        )}

        {/* Estado vazio */}
        {lideres.length === 0 && (
          <div className="flex-1 rounded-xl border border-dark-border border-dashed bg-pitch-black/40 p-8 flex flex-col items-center justify-center text-center">
            <p className="text-text-secondary text-sm font-semibold">
              Aguardando resultados da rodada...
            </p>
          </div>
        )}

        {/* 🧿 Zikado da Rodada */}
        {zikadoNome && (
          <div className="bg-purple-900/20 py-3.5 px-4 rounded-xl border border-purple-500/30 flex items-center gap-3">
            <div className="text-2xl drop-shadow-md shrink-0">🧿</div>
            <div className="overflow-hidden min-w-0">
              <p className="text-[10px] text-purple-400 uppercase font-bold tracking-wider">
                Zikado da Rodada
              </p>
              <p className="text-sm font-semibold text-text-primary truncate">
                {zikadoNome}{" "}
                <span className="text-purple-400 text-xs font-bold ml-1">
                  recebeu o Vampetaço!
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {currentUser && profiles.length > 0 && (
        <div className="border-t border-dark-border w-full pt-5">
          <ZikaButton
            profiles={profiles.map((p: any) => ({
              id: p.id,
              username: p.username,
              avatar_url: p.avatar_url,
            }))}
            currentUserId={currentUser.id}
          />
        </div>
      )}
    </section>
  );
}

// ─── Página principal (Server Component) ──────────────────────────────────────
export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const displayName =
    profile?.username ?? user?.email?.split("@")[0] ?? "Jogador";

  return (
    <div className="page-enter min-h-dvh bg-pitch-black w-full flex flex-col items-center gap-6">

      {/* ── Header ── */}
      <header className="sticky top-4 z-40 bg-pitch-black/85 backdrop-blur-xl border border-dark-border/80 w-[calc(100%-2rem)] mx-auto pt-6 pb-4 px-4 rounded-2xl shadow-lg">
        <div className="max-w-7xl w-full mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Avatar src={profile?.avatar_url} name={displayName} size="md" />
            <div>
              <p className="text-[11px] font-semibold text-text-muted tracking-wider uppercase mb-0.5">
                Olá,
              </p>
              <p className="text-lg font-bold text-text-primary tracking-tight">
                {displayName}{" "}
                <span className="ml-1 text-base" aria-hidden="true">
                  👋
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-dark-card border border-dark-border px-5 py-2.5 rounded-xl shadow-sm text-right">
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
                Pontos
              </p>
              <p className="text-xl font-black text-neon-400 leading-none mt-1 tracking-tight">
                {profile?.pontos_total ?? 0}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* ── Faixa Copa 2026 (Parallax) ── */}
      <div className="w-[calc(100%-2rem)] mx-auto max-w-7xl rounded-2xl overflow-hidden">
        <ParallaxBanner text="🏆 Copa do Mundo 2026" />
      </div>

      {/* ── Conteúdo Principal ── */}
      <main className="w-[calc(100%-2rem)] mx-auto max-w-7xl flex flex-col gap-y-6">
        <BetsProvider>
          <AnimatedCards className="w-full">
            <div className="w-full flex flex-col lg:flex-row gap-6 lg:gap-4 items-start w-full">

              {/* Coluna Esquerda (Mural) - Último no mobile */}
              <div
                data-animate-card
                className="flex-1 w-full order-3 lg:order-1 flex flex-col h-fit"
              >
                <MuralSocial />
              </div>

              {/* Coluna Central (Jogos) - Primeiro no mobile */}
              <div
                data-animate-card
                className="flex-1 w-full order-1 lg:order-2 flex flex-col h-fit"
              >
                <LiveMatchesFeed />
              </div>

              {/* Coluna Direita (Meus Palpites) - Segundo no mobile */}
              <div
                data-animate-card
                className="flex-1 w-full order-2 lg:order-3 flex flex-col h-fit"
              >
                <UserBetsSidebar />
              </div>

            </div>
          </AnimatedCards>
        </BetsProvider>

        {/* ── Painel Administrativo Oculto ── */}
        <div className="mt-20 flex justify-center lg:justify-end opacity-20 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
          <AdminSyncButton />
        </div>
      </main>
    </div>
  );
}