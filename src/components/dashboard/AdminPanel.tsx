"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { syncMatchResults, scoreSpecialBets } from "@/app/actions/admin";

// ─── Cliente Supabase público (só leitura de times) ──────────────────────────
function getSupabaseClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

export function AdminPanel() {
    return (
        <main className="min-h-screen bg-pitch-black flex flex-col items-center justify-start px-4 py-12 gap-8">
            <div className="flex flex-col items-center gap-1 text-center">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-neon-500 animate-pulse" />
                    <span className="text-[10px] text-neon-400 font-bold uppercase tracking-[0.2em]">
                        Painel Admin
                    </span>
                    <div className="w-2 h-2 rounded-full bg-neon-500 animate-pulse" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                    Central de Controle
                </h1>
                <p className="text-xs text-text-muted max-w-xs">
                    Ações administrativas do bolão. Só você sabe que essa página existe.
                </p>
            </div>

            <div className="w-full max-w-md flex flex-col gap-4">
                <SyncCard />
                <SpecialBetsCard />
            </div>

            <p className="text-[10px] text-text-muted/30 mt-4 select-none">
                não compartilhe esta URL
            </p>
        </main>
    );
}

// ─── Card: Sync de Placares ──────────────────────────────────────────────────

function SyncCard() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    const handleSync = async () => {
        if (!window.confirm("Buscar todos os jogos finalizados e atualizar placares + pontuação?")) return;

        setLoading(true);
        setMessage(null);

        try {
            const res = await syncMatchResults();
            setMessage(
                res.success
                    ? { text: res.message || "Sincronizado com sucesso.", type: "success" }
                    : { text: res.error || "Erro na sincronização.", type: "error" }
            );
        } catch {
            setMessage({ text: "Erro fatal ao comunicar com o servidor.", type: "error" });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(null), 6000);
        }
    };

    return (
        <div className="flex flex-col gap-3 p-5 bg-pitch-black/60 border border-dark-border rounded-xl">
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-white">Sincronizar Placares</span>
                    <span className="text-xs text-text-muted leading-relaxed">
                        Busca jogos finalizados na API, atualiza placares no banco e recalcula a pontuação de todos os palpites.
                    </span>
                </div>
                <div className="text-xl select-none">⚽</div>
            </div>

            <button
                onClick={handleSync}
                disabled={loading}
                className="group flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-neon-900/20 border border-neon-900/40 hover:border-neon-500/60 hover:bg-neon-900/30 text-neon-400 text-xs font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <div className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-neon-400 animate-pulse" : "bg-neon-600 group-hover:bg-neon-400 transition-colors"}`} />
                {loading ? "Sincronizando..." : "Executar Sync"}
            </button>

            {message && <Feedback message={message} />}
        </div>
    );
}

// ─── Card: Palpites Especiais ────────────────────────────────────────────────

function SpecialBetsCard() {
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const [times, setTimes] = useState<string[]>([]);
    const [loadingTimes, setLoadingTimes] = useState(false);
    const [campeao, setCampeao] = useState("");
    const [finalista1, setFinalista1] = useState("");
    const [finalista2, setFinalista2] = useState("");

    // Busca times únicos do banco ao abrir o formulário
    useEffect(() => {
        if (!showForm || times.length > 0) return;

        const fetchTimes = async () => {
            setLoadingTimes(true);
            try {
                const supabase = getSupabaseClient();
                const { data, error } = await supabase
                    .from("matches")
                    .select("home_team, away_team");

                if (error) throw error;

                const set = new Set<string>();
                data?.forEach((m: any) => {
                    if (m.home_team) set.add(m.home_team);
                    if (m.away_team) set.add(m.away_team);
                });

                setTimes([...set].sort());
            } catch (err) {
                console.error("[AdminPanel] Erro ao buscar times:", err);
            } finally {
                setLoadingTimes(false);
            }
        };

        fetchTimes();
    }, [showForm]);

    const handleSubmit = async () => {
        if (!campeao || !finalista1 || !finalista2) {
            setMessage({ text: "Selecione todos os campos.", type: "error" });
            return;
        }
        if (finalista1 === finalista2) {
            setMessage({ text: "Os dois finalistas precisam ser times diferentes.", type: "error" });
            return;
        }

        const ok = window.confirm(
            `⚠️ Confirmar resultado final:\n\nCampeão: ${campeao}\nFinal: ${finalista1} vs ${finalista2}\n\nEsta ação computa +30pts por acerto. Usuários já processados são ignorados.`
        );
        if (!ok) return;

        setLoading(true);
        setMessage(null);

        try {
            const res = await scoreSpecialBets(campeao, finalista1, finalista2);
            if (res.success) {
                setMessage({ text: `${res.processed} usuário(s) processado(s) com sucesso.`, type: "success" });
                setShowForm(false);
                setCampeao(""); setFinalista1(""); setFinalista2("");
            } else {
                setMessage({ text: res.error || "Erro ao processar.", type: "error" });
            }
        } catch {
            setMessage({ text: "Erro fatal ao comunicar com o servidor.", type: "error" });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(null), 8000);
        }
    };

    return (
        <div className="flex flex-col gap-3 p-5 bg-pitch-black/60 border border-dark-border rounded-xl">
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-white">Palpites Especiais</span>
                    <span className="text-xs text-text-muted leading-relaxed">
                        Computa os bônus de fim de campeonato: +30 pts por acertar o campeão e +30 pts por acertar os dois finalistas.
                    </span>
                </div>
                <div className="text-xl select-none">🏆</div>
            </div>

            {!showForm && (
                <button
                    onClick={() => setShowForm(true)}
                    disabled={loading}
                    className="group flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-yellow-900/20 border border-yellow-900/40 hover:border-yellow-500/60 hover:bg-yellow-900/30 text-yellow-400 text-xs font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-700 group-hover:bg-yellow-400 transition-colors" />
                    Informar Resultado Final
                </button>
            )}

            {showForm && (
                <div className="flex flex-col gap-3 pt-1">
                    {loadingTimes ? (
                        <div className="flex items-center justify-center gap-2 py-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                            <span className="text-xs text-text-muted">Carregando times...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <SelectField
                                label="Campeão"
                                value={campeao}
                                onChange={setCampeao}
                                options={times}
                                placeholder="Selecione o campeão"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <SelectField
                                    label="Finalista 1"
                                    value={finalista1}
                                    onChange={setFinalista1}
                                    options={times}
                                    placeholder="Selecione..."
                                />
                                <SelectField
                                    label="Finalista 2"
                                    value={finalista2}
                                    onChange={setFinalista2}
                                    options={times}
                                    placeholder="Selecione..."
                                />
                            </div>

                            {/* Preview do resultado selecionado */}
                            {(campeao || finalista1 || finalista2) && (
                                <div className="flex flex-col gap-1 px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg">
                                    <span className="text-[10px] text-text-muted uppercase tracking-widest">Resumo</span>
                                    <span className="text-xs text-white">
                                        🏆 <span className="text-yellow-300">{campeao || "—"}</span>
                                    </span>
                                    <span className="text-xs text-white">
                                        ⚔️ <span className="text-text-muted">{finalista1 || "—"} vs {finalista2 || "—"}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || loadingTimes}
                            className="flex-1 px-4 py-2 bg-yellow-600/20 border border-yellow-600/50 hover:bg-yellow-600/30 text-yellow-300 text-xs font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Processando..." : "Confirmar"}
                        </button>
                        <button
                            onClick={() => { setShowForm(false); setMessage(null); }}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-pitch-black/50 border border-dark-border hover:border-dark-border/60 text-text-muted text-xs font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {message && <Feedback message={message} />}
        </div>
    );
}

// ─── Auxiliares ──────────────────────────────────────────────────────────────

function SelectField({
    label,
    value,
    onChange,
    options,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder: string;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                {label}
            </span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-xs text-white focus:border-yellow-500/50 outline-none transition-colors appearance-none cursor-pointer"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
            >
                <option value="" disabled>{placeholder}</option>
                {options.map((time) => (
                    <option key={time} value={time}>{time}</option>
                ))}
            </select>
        </label>
    );
}

function Feedback({ message }: { message: { text: string; type: "success" | "error" } }) {
    return (
        <div className={`text-[11px] font-bold px-3 py-2 rounded-lg border ${message.type === "success"
                ? "bg-green-900/20 text-green-400 border-green-900/50"
                : "bg-red-900/20 text-red-400 border-red-900/50"
            }`}>
            {message.text}
        </div>
    );
}