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

// ─── Mural Social (placeholder) ─────────────────────────────────────────────
async function MuralSocial() {
  const supabase = await createClient();

  // 1. Buscar perfis ordenados
  const { data: profilesRaw } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, pontos_total")
    .order("pontos_total", { ascending: false });
  const profiles = (profilesRaw || []) as any[];

  // Buscar o zikado do dia (mais votado de ontem)
  const zikadoNome = await getZikadosDoDia();

  // Pegar o user logado para passar ao ZikaButton
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // 2. Verificar o status da rodada atual (hoje)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const { data: pendingMatches } = await supabase
    .from("matches")
    .select("id")
    .gte("match_start_time", today.toISOString())
    .lte("match_start_time", endOfDay.toISOString())
    .neq("status", "FINISHED");

  const isRoundOngoing = pendingMatches && pendingMatches.length > 0;

  // 3. Pegar a data da última partida finalizada para mostrar "Atualizado em"
  const { data: lastMatch } = await supabase
    .from("matches")
    .select("match_start_time")
    .eq("status", "FINISHED")
    .order("match_start_time", { ascending: false })
    .limit(1)
    .single() as { data: { match_start_time: string } | null };

  let dataAtualizacao = "Recentemente";
  if (lastMatch?.match_start_time) {
    const dateObj = new Date(lastMatch.match_start_time);
    dataAtualizacao = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  if (!profiles || profiles.length === 0) {
    return (
      <section aria-labelledby="mural-heading" className="rounded-2xl bg-dark-card border border-dark-border shadow-md p-6 h-full flex flex-col w-full box-border">
        <div className="flex items-center justify-between mb-5">
          <h2 id="mural-heading" className="text-lg font-bold text-text-primary tracking-tight">
            💬 Mural Social
          </h2>
        </div>
        <div className="flex-1 rounded-xl border border-dark-border border-dashed bg-pitch-black/40 p-8 flex flex-col items-center justify-center text-center">
          <p className="text-text-secondary text-sm font-semibold">Sem dados ainda.</p>
        </div>
      </section>
    );
  }

  // ── 1. Ordenar por Pontos (único critério) ──
  const sortedProfiles = [...profiles].sort((a: any, b: any) => b.pontos_total - a.pontos_total);

  // ── 2. Atribuir posições com empates (mesma pontuação = mesma posição) ──
  const isTied = (a: any, b: any) => a.pontos_total === b.pontos_total;

  const positions: number[] = [];
  for (let i = 0; i < sortedProfiles.length; i++) {
    positions.push(i === 0 ? 0 : isTied(sortedProfiles[i], sortedProfiles[i - 1]) ? positions[i - 1] : i);
  }

  // ── 3. Calcular ranking anterior (sem os pontos do último dia finalizado) ──
  const { data: lastFinishedMatch } = await supabase
    .from("matches")
    .select("match_start_time")
    .eq("status", "FINISHED")
    .order("match_start_time", { ascending: false })
    .limit(1)
    .single() as { data: { match_start_time: string } | null };

  const posAnteriorMap: Record<string, number> = {};

  if (lastFinishedMatch?.match_start_time) {
    const lastDate = new Date(lastFinishedMatch.match_start_time);
    const dayStart = new Date(lastDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(lastDate); dayEnd.setHours(23, 59, 59, 999);

    const { data: lastDayMatches } = await supabase
      .from("matches")
      .select("id")
      .eq("status", "FINISHED")
      .gte("match_start_time", dayStart.toISOString())
      .lte("match_start_time", dayEnd.toISOString());

    const lastDayMatchIds = (lastDayMatches ?? []).map((m: { id: string }) => m.id);

    if (lastDayMatchIds.length > 0) {
      const { data: lastDayBets } = await supabase
        .from("bets")
        .select("user_id, pontos")
        .in("match_id", lastDayMatchIds)
        .not("pontos", "is", null);

      // Calcular pontos do último dia por user
      const ultimoDiaPts: Record<string, number> = {};
      (lastDayBets ?? []).forEach((bet: any) => {
        ultimoDiaPts[bet.user_id] = (ultimoDiaPts[bet.user_id] || 0) + (bet.pontos || 0);
      });

      // Ranking anterior
      const anterior = sortedProfiles.map((p: any) => ({
        ...p,
        pontos_total: p.pontos_total - (ultimoDiaPts[p.id] ?? 0),
      }));
      anterior.sort((a: any, b: any) => b.pontos_total - a.pontos_total);

      // Posições anteriores com empate
      const posAnt: number[] = [];
      for (let i = 0; i < anterior.length; i++) {
        posAnt.push(i === 0 ? 0 : isTied(anterior[i], anterior[i - 1]) ? posAnt[i - 1] : i);
      }
      anterior.forEach((p: any, idx: number) => { posAnteriorMap[p.id] = posAnt[idx]; });
    }
  }

  // ── 4. Agrupar em gruposDeClassificacao via reduce (somente por pontos) ──
  type GrupoClassificacao = {
    pontos: number;
    usuarios: any[];
  };

  const gruposDeClassificacao: GrupoClassificacao[] = sortedProfiles.reduce<GrupoClassificacao[]>((acc: any[], user: any) => {
    const grupoExistente = acc.find((g: any) => g.pontos === user.pontos_total);
    if (grupoExistente) {
      grupoExistente.usuarios.push(user);
    } else {
      acc.push({
        pontos: user.pontos_total,
        usuarios: [user],
      });
    }
    return acc;
  }, []);

  // Garantir a ordenação do array de grupos
  gruposDeClassificacao.sort((a, b) => b.pontos - a.pontos);

  // ── 5. Função para determinar emoji, label e detalhe de cada grupo pelo INDEX ──
  function getGrupoStatus(grupo: GrupoClassificacao, index: number, total: number) {
    const nomes = grupo.usuarios.map((u: any) => u.username).join(", ");
    const isMulti = grupo.usuarios.length > 1;

    // PRIMEIRO GRUPO (index 0)
    if (index === 0) {
      return {
        emoji: isMulti ? "⚔️" : "👑",
        label: isMulti ? "Dividindo o topo!" : "Líder Absoluto",
        nomes,
        detalhe: `${grupo.pontos} pts`,
        detalheCor: "text-neon-400",
        bg: "bg-dark-elevated",
        border: "border-dark-border",
      };
    }

    // ÚLTIMO GRUPO (somente se total > 1, senão é o mesmo que o primeiro)
    if (index === total - 1 && total > 1) {
      return {
        emoji: isMulti ? "🫂" : "🐢",
        label: isMulti ? "Abraçados na lanterna..." : "Lanterna",
        nomes,
        detalhe: `${grupo.pontos} pts`,
        detalheCor: "text-text-muted",
        bg: "bg-dark-elevated",
        border: "border-dark-border",
      };
    }

    // GRUPOS INTERMEDIÁRIOS
    if (isMulti) {
      return {
        emoji: "🤝",
        label: "Empate Técnico",
        nomes,
        detalhe: `${grupo.pontos} pts`,
        detalheCor: "text-yellow-400",
        bg: "bg-dark-elevated",
        border: "border-dark-border",
      };
    }

    // Grupo isolado no meio → verificar sobe/desce
    const user = grupo.usuarios[0];
    const posAtual = index;
    const posAnterior = posAnteriorMap[user.id] ?? posAtual;
    const variacao = posAnterior - posAtual;

    if (variacao > 0) {
      return {
        emoji: "🚀",
        label: "Subiu no Ranking",
        nomes: user.username,
        detalhe: `+${variacao} pos.`,
        detalheCor: "text-green-400",
        bg: "bg-dark-elevated",
        border: "border-dark-border",
      };
    }
    if (variacao < 0) {
      return {
        emoji: "📉",
        label: "Desceu no Ranking",
        nomes: user.username,
        detalhe: `${Math.abs(variacao)} pos.`,
        detalheCor: "text-red-400",
        bg: "bg-dark-elevated",
        border: "border-dark-border",
      };
    }

    return {
      emoji: "➖",
      label: "Manteve a Posição",
      nomes: user.username,
      detalhe: `${grupo.pontos} pts`,
      detalheCor: "text-text-muted",
      bg: "bg-dark-elevated",
      border: "border-dark-border",
    };
  }

  // ── 6. Renderização: .map() sobre gruposDeClassificacao ──
  return (
    <section
      aria-labelledby="mural-heading"
      className="rounded-2xl bg-dark-card border border-dark-border shadow-md p-6 h-full flex flex-col gap-5 w-full"
    >
      <div className="flex items-center justify-between">
        <h2 id="mural-heading" className="text-lg font-bold text-text-primary tracking-tight">
          💬 Mural Social
        </h2>
        {isRoundOngoing ? (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-900/40 text-orange-400 px-2.5 py-1 rounded-full border border-orange-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
            Rodada em andamento
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-green-900/30 text-green-400 px-2.5 py-1 rounded-full border border-green-500/30 flex items-center gap-1">
            ✅ Rodada Fechada
          </span>
        )}
      </div>

      <p className="text-sm text-text-muted font-medium">
        Baseado na última partida: <strong className="text-text-secondary">{dataAtualizacao}</strong>
      </p>

      <div className="flex-1 flex flex-col gap-4 justify-center">
        {/* .map() sobre os GRUPOS, não sobre usuários */}
        {gruposDeClassificacao.map((grupo, index) => {
          const status = getGrupoStatus(grupo, index, gruposDeClassificacao.length);
          return (
            <div key={index} className={`${status.bg} py-3.5 px-4 rounded-xl border ${status.border} flex items-center gap-3`}>
              <div className="text-2xl drop-shadow-md">{status.emoji}</div>
              <div>
                <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">{status.label}</p>
                <p className="text-sm font-semibold text-text-primary truncate">
                  {status.nomes} <span className={`text-xs font-bold ml-1 ${status.detalheCor}`}>({status.detalhe})</span>
                </p>
              </div>
            </div>
          );
        })}

        {/* Zikado do Dia (fora do .map dos grupos) */}
        {zikadoNome && (
          <div className="bg-purple-900/20 py-3.5 px-4 rounded-xl border border-purple-500/30 flex items-center gap-3">
            <div className="text-2xl drop-shadow-md">🧿</div>
            <div>
              <p className="text-[10px] text-purple-400 uppercase font-bold tracking-wider">Zikado da Rodada</p>
              <p className="text-sm font-semibold text-text-primary truncate">
                {zikadoNome} <span className="text-purple-400 text-xs font-bold ml-1">recebeu o Vampetaço!</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {currentUser && sortedProfiles && (
        <div className="border-t border-dark-border w-full pt-5">
          <ZikaButton
            profiles={sortedProfiles.map((p: any) => ({ id: p.id, username: p.username, avatar_url: p.avatar_url }))}
            currentUserId={currentUser.id}
          />
        </div>
      )}
    </section>
  );
}

// ─── Página principal (Server Component) ────────────────────────────────────
export default async function HomePage() {
  const supabase = await createClient();

  // Buscar dados do usuário
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? "Jogador";

  return (
    <div className="page-enter min-h-dvh bg-pitch-black w-full flex flex-col items-center gap-6">

      {/* ── Header ── */}
      <header className="sticky top-4 z-40 bg-pitch-black/85 backdrop-blur-xl border border-dark-border/80 w-[calc(100%-2rem)] mx-auto pt-6 pb-4 px-4 rounded-2xl shadow-lg">
        <div className="max-w-7xl w-full mx-auto flex justify-between items-center gap-4">
          {/* Lado Esquerdo: Avatar + Nome */}
          <div className="flex items-center gap-4">
            <Avatar
              src={profile?.avatar_url}
              name={displayName}
              size="md"
            />
            <div>
              <p className="text-[11px] font-semibold text-text-muted tracking-wider uppercase mb-0.5">Olá,</p>
              <p className="text-lg font-bold text-text-primary tracking-tight">
                {displayName} <span className="ml-1 text-base" aria-hidden="true">👋</span>
              </p>
            </div>
          </div>

          {/* Lado Direito: Pontos + Logout */}
          <div className="flex items-center gap-3">
            <div className="bg-dark-card border border-dark-border px-5 py-2.5 rounded-xl shadow-sm text-right">
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Pontos</p>
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
              <div data-animate-card className="flex-1 w-full order-3 lg:order-1 flex flex-col h-fit">
                <MuralSocial />
              </div>

              {/* Coluna Central (Jogos) - Primeiro no mobile */}
              <div data-animate-card className="flex-1 w-full order-1 lg:order-2 flex flex-col h-fit">
                <LiveMatchesFeed />
              </div>

              {/* Coluna Direita (Meus Palpites) - Segundo no mobile */}
              <div data-animate-card className="flex-1 w-full order-2 lg:order-3 flex flex-col h-fit">
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
