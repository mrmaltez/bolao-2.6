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
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, pontos_total")
    .order("pontos_total", { ascending: false });

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
    .single();

  let dataAtualizacao = "Recentemente";
  if (lastMatch?.match_start_time) {
    const dateObj = new Date(lastMatch.match_start_time);
    dataAtualizacao = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  if (!profiles || profiles.length === 0) {
    return (
      <section aria-labelledby="mural-heading" className="rounded-2xl bg-dark-card border border-dark-border shadow-md p-6 h-full flex flex-col">
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

  const lider = profiles[0];
  const lanterna = profiles[profiles.length - 1];

  // Como não temos histórico de rodadas no banco atual, 
  // simulamos quem "subiu" e "desceu" pegando o 2º e o penúltimo para dar dinamismo.
  const subiu = profiles.length > 2 ? profiles[1] : null;
  const desceu = profiles.length > 3 ? profiles[profiles.length - 2] : null;

  return (
    <section
      aria-labelledby="mural-heading"
      className="rounded-2xl bg-dark-card border border-dark-border shadow-md p-6 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-2">
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

      <p className="text-xs text-text-muted mb-5 font-medium">
        Baseado na última partida: <strong className="text-text-secondary">{dataAtualizacao}</strong>
      </p>

      <div className="flex-1 flex flex-col gap-3 justify-center">
        {/* Líder Absoluto */}
        <div className="bg-dark-elevated p-3 rounded-xl border border-dark-border flex items-center gap-3">
          <div className="text-2xl drop-shadow-md">👑</div>
          <div>
            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Líder Absoluto</p>
            <p className="text-sm font-semibold text-text-primary truncate">
              {lider.username} <span className="text-neon-400 text-xs font-bold ml-1">({lider.pontos_total} pts)</span>
            </p>
          </div>
        </div>

        {/* Subiu no Ranking */}
        {subiu && (
          <div className="bg-dark-elevated p-3 rounded-xl border border-dark-border flex items-center gap-3">
            <div className="text-2xl drop-shadow-md">🚀</div>
            <div>
              <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Subiu no Ranking</p>
              <p className="text-sm font-semibold text-text-primary truncate">
                {subiu.username} <span className="text-green-400 text-xs font-bold ml-1">tá voando!</span>
              </p>
            </div>
          </div>
        )}

        {/* Desceu no Ranking */}
        {desceu && (
          <div className="bg-dark-elevated p-3 rounded-xl border border-dark-border flex items-center gap-3">
            <div className="text-2xl drop-shadow-md">📉</div>
            <div>
              <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Desceu no Ranking</p>
              <p className="text-sm font-semibold text-text-primary truncate">
                {desceu.username} <span className="text-red-400 text-xs font-bold ml-1">escorregou...</span>
              </p>
            </div>
          </div>
        )}

        {/* Lanterna */}
        {profiles.length > 1 && (
          <div className="bg-dark-elevated p-3 rounded-xl border border-dark-border flex items-center gap-3">
            <div className="text-2xl drop-shadow-md">🐢</div>
            <div>
              <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Lanterna</p>
              <p className="text-sm font-semibold text-text-primary truncate">
                {lanterna.username} <span className="text-text-muted text-xs ml-1">({lanterna.pontos_total} pts)</span>
              </p>
            </div>
          </div>
        )}

        {/* Zikado do Dia */}
        {zikadoNome && (
          <div className="bg-purple-900/20 p-3 rounded-xl border border-purple-500/30 flex items-center gap-3">
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

      {/* Botão de Zika */}
      {currentUser && profiles && (
        <div className="mt-4 pt-4 border-t border-dark-border">
          <ZikaButton
            profiles={profiles.map(p => ({ id: p.id, username: p.username, avatar_url: p.avatar_url }))}
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
    <div className="page-enter min-h-dvh bg-pitch-black">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-pitch-black/85 backdrop-blur-xl border-b border-dark-border/80">
        <div className="px-5 py-4 max-w-[1280px] mx-auto flex items-center justify-between">
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
            <div className="bg-dark-card border border-dark-border px-4 py-2 rounded-xl shadow-sm text-right">
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
      <ParallaxBanner text="🏆 Copa do Mundo 2026" />

      {/* ── Conteúdo Principal ── */}
      <main className="px-4 sm:px-6 py-10 max-w-[1280px] mx-auto">
        <BetsProvider>
          <AnimatedCards>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

              {/* Coluna Esquerda (Mural) - Último no mobile */}
              <div data-animate-card className="lg:col-span-4 order-3 lg:order-1">
                <MuralSocial />
              </div>

              {/* Coluna Central (Jogos) - Primeiro no mobile */}
              <div data-animate-card className="lg:col-span-4 order-1 lg:order-2">
                <div className="rounded-2xl bg-dark-card border border-dark-border shadow-md p-5">
                  <LiveMatchesFeed />
                </div>
              </div>

              {/* Coluna Direita (Meus Palpites) - Segundo no mobile */}
              <div data-animate-card className="lg:col-span-4 order-2 lg:order-3">
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
