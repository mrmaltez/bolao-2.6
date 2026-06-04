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

export const metadata: Metadata = {
  title: "Home",
  description: "Acompanhe os jogos da rodada, o mural social e a tabela da Copa.",
};

// ─── Mural Social (placeholder) ─────────────────────────────────────────────
async function MuralSocial() {
  const supabase = await createClient();
  
  const { data: profiles } = await supabase
    .from("profiles")
    .select("username, pontos_total")
    .order("pontos_total", { ascending: false });

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
      <div className="flex items-center justify-between mb-5">
        <h2 id="mural-heading" className="text-lg font-bold text-text-primary tracking-tight">
          💬 Mural Social
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-neon-900/20 text-neon-400 px-2.5 py-1 rounded-full border border-neon-500/30">
          Giro da Rodada
        </span>
      </div>
      
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
      </div>
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
