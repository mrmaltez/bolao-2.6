import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artilharia",
  description: "Artilheiros da Copa do Mundo 2026 — quem está fazendo mais gols?",
};

// Dados estáticos de exemplo — será integrado com API-Football
const ARTILHEIROS_MOCK = [
  { rank: 1, name: "Kylian Mbappé",      country: "França",    flag: "https://flagcdn.com/w40/fr.png", goals: 8, team: "Real Madrid" },
  { rank: 2, name: "Erling Haaland",     country: "Noruega",   flag: "https://flagcdn.com/w40/no.png", goals: 7, team: "Manchester City" },
  { rank: 3, name: "Vinicius Jr.",        country: "Brasil",    flag: "https://flagcdn.com/w40/br.png", goals: 6, team: "Real Madrid" },
  { rank: 4, name: "Harry Kane",         country: "Inglaterra", flag: "https://flagcdn.com/w40/gb-eng.png", goals: 5, team: "Bayern Munich" },
  { rank: 5, name: "Lionel Messi",       country: "Argentina", flag: "https://flagcdn.com/w40/ar.png", goals: 5, team: "Inter Miami" },
  { rank: 6, name: "Lamine Yamal",       country: "Espanha",   flag: "https://flagcdn.com/w40/es.png", goals: 4, team: "Barcelona" },
  { rank: 7, name: "Rodri",             country: "Espanha",   flag: "https://flagcdn.com/w40/es.png", goals: 3, team: "Manchester City" },
  { rank: 8, name: "Pedri",            country: "Espanha",   flag: "https://flagcdn.com/w40/es.png", goals: 3, team: "Barcelona" },
];

const GOAL_COLORS = [
  "from-neon-600/80 to-neon-900/20",
  "from-slate-400/60 to-slate-800/20",
  "from-amber-700/60 to-amber-900/20",
];

export default function ArtilhariaPage() {
  const maxGoals = ARTILHEIROS_MOCK[0]?.goals ?? 1;

  return (
    <div className="page-enter">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-pitch-black/80 backdrop-blur-md border-b border-dark-border px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              ⚽ Artilharia
            </h1>
            <p className="text-[11px] font-medium text-text-muted mt-1 uppercase tracking-wider">
              Gols marcados na Copa do Mundo 2026
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 max-w-xl mx-auto">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-text-muted uppercase tracking-widest">
            {ARTILHEIROS_MOCK.length} artilheiros
          </span>
          <span className="text-xs text-text-muted italic">
            * Dados ilustrativos
          </span>
        </div>

        <div className="space-y-1 rounded-xl overflow-hidden border border-dark-border bg-dark-card shadow-md">
          {ARTILHEIROS_MOCK.map((player, index) => {
            const barWidth = Math.round((player.goals / maxGoals) * 100);
            const isTop3 = index < 3;
            const medals = ["🥇", "🥈", "🥉"];

            return (
              <article
                key={player.rank}
                className="relative px-4 py-3.5 flex items-center gap-4 border-b border-dark-border last:border-0 overflow-hidden"
                aria-label={`${player.rank}º ${player.name} — ${player.goals} gols`}
              >
                {/* Barra de fundo proporcional aos gols */}
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${isTop3 ? GOAL_COLORS[index] : "from-dark-elevated/40 to-transparent"} pointer-events-none`}
                  style={{ width: `${barWidth}%` }}
                  aria-hidden="true"
                />

                {/* Posição */}
                <div className="relative z-10 w-7 text-center flex-shrink-0">
                  {isTop3 ? (
                    <span className="text-lg leading-none">{medals[index]}</span>
                  ) : (
                    <span className="text-xs text-text-muted font-medium">{player.rank}º</span>
                  )}
                </div>

                {/* Bandeira */}
                <div className="relative z-10 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={player.flag}
                    alt={`Bandeira ${player.country}`}
                    width={28}
                    height={21}
                    className="rounded shadow-sm object-cover"
                    style={{ aspectRatio: "4/3" }}
                  />
                </div>

                {/* Nome + time */}
                <div className="relative z-10 flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {player.name}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {player.team} · {player.country}
                  </p>
                </div>

                {/* Gols */}
                <div className="relative z-10 text-right flex-shrink-0">
                  <span
                    className={`text-2xl font-black tracking-tight leading-none ${
                      index === 0 ? "text-neon-400" : "text-text-primary"
                    }`}
                  >
                    {player.goals}
                  </span>
                  <span className="block text-[9px] font-medium text-text-muted tracking-widest uppercase">gols</span>
                </div>
              </article>
            );
          })}
        </div>

        {/* Aviso integração */}
        <div className="mt-6 px-4 py-3.5 rounded-xl bg-dark-card border border-dark-border/50 border-dashed text-center">
          <p className="text-xs text-text-muted">
            🔌 Será integrado com dados reais via{" "}
            <span className="text-neon-600">API-Football.com</span> assim que a Copa começar.
          </p>
        </div>
      </main>
    </div>
  );
}
