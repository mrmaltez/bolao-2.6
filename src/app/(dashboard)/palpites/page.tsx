import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Match, Bet } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Palpites da Rapaziada",
  description: "Veja o que todo mundo apostou. Quem vai acertar mais?",
};

// Feature flag lida no servidor — nunca exposta ao cliente se for uma variável server-side
// Aqui usamos NEXT_PUBLIC_ para que o componente Zica também possa funcionar no cliente.
const ZICA_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ZICA_BUTTON === "true";

// ─── Botão Zica (apenas renderizado se a flag estiver ativa) ────────────────
function ZicaButton({ targetUsername }: { targetUsername: string }) {
  if (!ZICA_ENABLED) return null;

  return (
    <button
      id={`zica-btn-${targetUsername}`}
      className="
        ml-2 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase
        bg-gradient-to-r from-purple-900/80 to-purple-700/60
        border border-purple-600/50 text-purple-300
        hover:from-purple-700/80 hover:border-purple-400/70 hover:text-purple-200
        active:scale-95 transition-all duration-150
        flex-shrink-0
      "
      title={`Zica o palpite de ${targetUsername}! 🧿`}
      aria-label={`Zica o palpite de ${targetUsername}`}
    >
      🧿 Zica
    </button>
  );
}

// ─── Tipos auxiliares ────────────────────────────────────────────────────────
type BetWithUser = Bet & {
  profiles: Pick<Profile, "username" | "avatar_url">;
};

type MatchWithBets = Match & {
  bets: BetWithUser[];
};

// ─── Página ─────────────────────────────────────────────────────────────────
export default async function PalpitesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Buscar partidas com os palpites de todos os usuários (join com profiles)
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      *,
      bets (
        *,
        profiles ( username, avatar_url )
      )
    `)
    .in("status", ["scheduled", "live", "finished"])
    .order("match_start_time", { ascending: true })
    .limit(10)
    .returns<MatchWithBets[]>();

  const hasMatches = matches && matches.length > 0;

  return (
    <div className="page-enter">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-pitch-black/80 backdrop-blur-md border-b border-dark-border px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              🎯 Palpites da Rapaziada
            </h1>
            <p className="text-[11px] font-medium text-text-muted mt-1 uppercase tracking-wider">
              O que todo mundo apostou
            </p>
          </div>
          {ZICA_ENABLED && (
            <div className="px-2.5 py-1 rounded-lg bg-purple-900/30 border border-purple-700/40">
              <span className="text-[10px] text-purple-400 font-medium">🧿 Modo Zica ON</span>
            </div>
          )}
        </div>
      </header>

      <main className="px-4 py-8 max-w-xl mx-auto space-y-6">
        {!hasMatches ? (
          /* Estado vazio */
          <div className="py-16 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <p className="text-text-secondary font-medium mb-1">Nenhum palpite ainda</p>
            <p className="text-text-muted text-sm">
              Os palpites vão aparecer aqui assim que a galera começar a jogar!
            </p>
          </div>
        ) : (
          matches.map((match) => (
            <section
              key={match.id}
              className="rounded-xl bg-dark-card border border-dark-border overflow-hidden shadow-md"
              aria-labelledby={`match-heading-${match.id}`}
            >
              {/* Cabeçalho da partida */}
              <div className="px-5 py-4 border-b border-dark-border bg-gradient-to-r from-gold-900/10 to-transparent">
                <div className="flex items-center justify-between mb-1">
                  <h2
                    id={`match-heading-${match.id}`}
                    className="text-base font-bold text-text-primary"
                  >
                    {match.home_team}{" "}
                    <span className="text-gold-500 font-medium mx-1">vs</span>{" "}
                    {match.away_team}
                  </h2>
                  {match.home_score !== null && match.away_score !== null ? (
                    <span className="text-xl font-black text-gold-400 tracking-tight">
                      {match.home_score} – {match.away_score}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-dark-elevated text-[11px] font-medium text-text-muted border border-dark-border">
                      {new Date(match.match_start_time).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Sao_Paulo",
                      })}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
                  {match.group_name ?? match.stage} · {match.round}
                </p>
              </div>

              {/* Lista de palpites */}
              {match.bets.length === 0 ? (
                <div className="px-4 py-5 text-center text-xs text-text-muted">
                  Ninguém apostou nessa partida ainda.
                </div>
              ) : (
                <ul role="list" className="divide-y divide-dark-border">
                  {match.bets.map((bet) => {
                    const isCurrentUser = bet.user_id === user?.id;
                    const username = bet.profiles?.username ?? "?";

                    return (
                      <li
                        key={bet.id}
                        className={`
                          flex items-center justify-between px-4 py-3 gap-3
                          ${isCurrentUser ? "bg-gold-900/10" : "hover:bg-dark-elevated/40"}
                          transition-colors
                        `}
                      >
                        {/* Nome */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Mini avatar inicial */}
                          <div
                            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-gold-400 border border-dark-border"
                            style={{ background: "linear-gradient(145deg, #1e1e1e, #141414)" }}
                            aria-hidden="true"
                          >
                            {username.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`text-sm truncate ${
                              isCurrentUser ? "text-gold-400 font-medium" : "text-text-secondary"
                            }`}
                          >
                            {username}
                            {isCurrentUser && (
                              <span className="ml-1 text-[10px] text-gold-600 font-normal">(você)</span>
                            )}
                          </span>
                        </div>

                        {/* Palpite */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xl font-bold text-text-primary">
                            {bet.home_score_bet}
                          </span>
                          <span className="text-text-muted font-medium">–</span>
                          <span className="text-xl font-bold text-text-primary">
                            {bet.away_score_bet}
                          </span>

                          {/* Pontuação (se já calculada) */}
                          {bet.pontos !== null && (
                            <span
                              className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gold-900/30 text-gold-400 border border-gold-800/40"
                            >
                              +{bet.pontos}pts
                            </span>
                          )}

                          {/* 🧿 BOTÃO ZICA — Oculto por feature flag */}
                          {!isCurrentUser && (
                            <ZicaButton targetUsername={username} />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))
        )}
      </main>
    </div>
  );
}
