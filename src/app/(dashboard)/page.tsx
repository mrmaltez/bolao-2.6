import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/Avatar";
import { LiveMatchesFeed } from "@/components/ui/LiveMatchesFeed";
import type { Profile } from "@/types/database.types";
import { BetsProvider } from "@/components/dashboard/BetsContext";
import { UserBetsSidebar } from "@/components/dashboard/UserBetsSidebar";

export const metadata: Metadata = {
  title: "Home",
  description: "Acompanhe os jogos da rodada, o mural social e a tabela da Copa.",
};

// ─── Mural Social (placeholder) ─────────────────────────────────────────────
function MuralSocial() {
  return (
    <section aria-labelledby="mural-heading" className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 id="mural-heading" className="text-xl font-bold text-text-primary tracking-tight">
          Mural Social
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-dark-elevated text-text-muted px-2.5 py-1 rounded-full border border-dark-border">
          Em breve
        </span>
      </div>
      <div className="flex-1 rounded-xl border border-dark-border border-dashed bg-dark-card/40 p-8 flex flex-col items-center justify-center text-center">
        <div className="text-4xl mb-4 opacity-80">💬</div>
        <p className="text-text-secondary text-sm font-semibold mb-1">
          O mural ainda está vazio
        </p>
        <p className="text-text-muted text-xs">
          Em breve você poderá provocar a rapaziada aqui!
        </p>
      </div>
    </section>
  );
}

// ─── Tabela de grupos Copa ──────────────────────────────────────────────────
function TabelaCopa() {
  const grupos = [
    { group: "Grupo A", teams: ["Argentina", "Polônia", "México", "Arábia Saudita"] },
    { group: "Grupo B", teams: ["França", "Dinamarca", "Tunísia", "Austrália"] },
    { group: "Grupo C", teams: ["Brasil", "Sérvia", "Suíça", "Camarões"] },
    { group: "Grupo D", teams: ["Inglaterra", "EUA", "Irã", "País de Gales"] },
  ];

  return (
    <section aria-labelledby="tabela-heading" className="flex flex-col h-full">
      <h2 id="tabela-heading" className="text-xl font-bold text-text-primary tracking-tight mb-4">
        Tabela da Copa
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
        {grupos.map(({ group, teams }) => (
          <div
            key={group}
            className="rounded-xl bg-dark-card border border-dark-border p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-dark-border/50">
              <div className="w-1.5 h-4 rounded-full bg-gold-500" />
              <span className="text-xs font-bold text-text-primary tracking-wider uppercase">{group}</span>
            </div>
            <ul className="space-y-2">
              {teams.map((team, index) => (
                <li key={team} className="text-xs text-text-secondary flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold text-text-muted w-3">{index + 1}</span>
                    <span className="font-medium text-text-primary">{team}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-text-muted">0 pts</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-medium text-text-muted mt-4 text-center">
        * Tabela ilustrativa — será integrada com dados reais
      </p>
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
    <div className="page-enter">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-pitch-black/80 backdrop-blur-md border-b border-dark-border">
        <div className="px-5 py-4 max-w-7xl mx-auto flex items-center justify-between">
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

          <div className="flex items-center gap-3 bg-dark-card border border-dark-border px-4 py-2 rounded-xl shadow-sm">
            <div className="text-right">
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Pontos</p>
              <p className="text-xl font-black text-gold-400 leading-none mt-1 tracking-tight">
                {profile?.pontos_total ?? 0}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Faixa Copa 2026 ── */}
      <div className="w-full py-3 text-center text-xs font-bold tracking-[0.25em] uppercase text-pitch-black bg-gold-500 shadow-sm">
        🏆 Copa do Mundo 2026
      </div>

      {/* ── Conteúdo em Grid ── */}
      <main className="px-4 py-8 max-w-7xl mx-auto">
        <BetsProvider>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Coluna Esquerda (Mural) - Último no mobile */}
            <div className="lg:col-span-4 order-3 lg:order-1">
              <MuralSocial />
            </div>

            {/* Coluna Central (Jogos) - Primeiro no mobile */}
            <div className="lg:col-span-4 order-1 lg:order-2">
              <LiveMatchesFeed />
            </div>

            {/* Coluna Direita (Meus Palpites) - Segundo no mobile */}
            <div className="lg:col-span-4 order-2 lg:order-3">
              <UserBetsSidebar />
            </div>

          </div>
        </BetsProvider>
      </main>
    </div>
  );
}
