"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    getChatMessages,
    sendChatMessage,
    markChatAsSeen,
    getChatUnreadStatus,
} from "@/app/actions/chat";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
    id: number;
    user_id: string;
    message: string;
    created_at: string;
    profiles: { username: string | null; avatar_url: string | null } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ChatWidget({ currentUserId }: { currentUserId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [input, setInput] = useState("");
    const [isPending, startTransition] = useTransition();
    const [loadError, setLoadError] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const supabase = createClient();

    // ── Checa mensagens não lidas ao montar (sem precisar abrir o chat) ───────
    useEffect(() => {
        getChatUnreadStatus().then((res) => setHasUnread(res.hasUnread));
    }, []);

    // ── Carrega histórico ao abrir o popup ─────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        let active = true;
        getChatMessages(50).then((res) => {
            if (active) setMessages(res.messages as ChatMessage[]);
        });

        markChatAsSeen();
        setHasUnread(false);

        return () => {
            active = false;
        };
    }, [isOpen]);

    // ── Realtime: escuta novas mensagens enquanto o componente existe ─────────
    useEffect(() => {
        const channel = supabase
            .channel("chat_messages_realtime")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "chat_messages" },
                async (payload) => {
                    const newRow = payload.new as Omit<ChatMessage, "profiles">;

                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("username, avatar_url")
                        .eq("id", newRow.user_id)
                        .single();

                    const fullMessage: ChatMessage = { ...newRow, profiles: profile ?? null };

                    setMessages((prev) => [...prev, fullMessage]);

                    if (!isOpen && newRow.user_id !== currentUserId) {
                        setHasUnread(true);
                    }

                    if (isOpen) {
                        markChatAsSeen();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, currentUserId]);

    // ── Scroll automático para a última mensagem ───────────────────────────────
    useEffect(() => {
        if (isOpen) {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        }
    }, [messages, isOpen]);

    // ── Auto-resize do textarea conforme o usuário digita ──────────────────────
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, [input]);

    // ── Envio de mensagem ───────────────────────────────────────────────────────
    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || isPending) return;

        setInput("");
        setLoadError(null);

        startTransition(async () => {
            const res = await sendChatMessage(trimmed);
            if (res.error) {
                setLoadError(res.error);
                setInput(trimmed);
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* ── Bolha flutuante — fundo transparente para não obstruir o conteúdo atrás */}
            <button
                onClick={() => setIsOpen((v) => !v)}
                aria-label={isOpen ? "Fechar chat" : "Abrir chat do bolão"}
                className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-50 w-14 h-14 rounded-full bg-pitch-black/30 backdrop-blur-md border border-orange-500/40 shadow-lg shadow-black/30 flex items-center justify-center hover:bg-pitch-black/50 hover:border-orange-500/70 active:scale-95 transition-all"
            >
                {isOpen ? (
                    <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                )}

                {hasUnread && !isOpen && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-pitch-black animate-pulse" />
                )}
            </button>

            {/* ── Popup do chat ── */}
            {isOpen && (
                <div
                    className="fixed z-50 bg-dark-card border border-dark-border rounded-2xl shadow-2xl flex flex-col overflow-hidden
                     inset-x-3 bottom-24 h-[60vh]
                     sm:inset-auto sm:bottom-24 sm:right-8 sm:top-auto
                     sm:w-[26rem] sm:h-[34rem]"
                >
                    {/* Header — padding inline para garantir o mesmo respiro do resto do popup */}
                    <div
                        className="border-b border-dark-border flex items-center justify-between bg-dark-elevated shrink-0"
                        style={{ paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "1rem", paddingBottom: "1rem" }}
                    >
                        <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-neon-500 animate-pulse" />
                            <h3 className="text-base font-bold text-text-primary tracking-tight">
                                💬 Chat do Bolão
                            </h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            aria-label="Fechar chat"
                            className="text-text-muted hover:text-text-primary transition-colors p-1"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Mensagens — cada linha é um envelope full-width; o gap entre elas
              e o padding do wrapper são o que garante o respiro lateral,
              não dependendo só de self-end no item. */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto flex flex-col gap-3"
                        style={{ paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "1.25rem", paddingBottom: "1rem" }}
                    >
                        {messages.length === 0 && (
                            <p className="text-center text-text-muted text-sm py-10">
                                Nenhuma mensagem ainda. Seja o primeiro a falar! 👋
                            </p>
                        )}

                        {messages.map((msg) => {
                            const isOwn = msg.user_id === currentUserId;
                            const displayName = msg.profiles?.username ?? "Jogador";

                            return (
                                // Envelope de linha cheia — controla o alinhamento esquerda/direita
                                <div
                                    key={msg.id}
                                    className={`w-full flex ${isOwn ? "justify-end" : "justify-start"}`}
                                >
                                    {/* Bloco da mensagem — max-w relativo à linha, nunca toca a borda
                      porque a linha já tem o padding do wrapper acima */}
                                    <div className={`flex flex-col gap-0.5 max-w-[82%] ${isOwn ? "items-end" : "items-start"}`}>
                                        <span
                                            className={`text-xs font-bold ${isOwn ? "text-neon-400" : "text-orange-400"
                                                }`}
                                        >
                                            {isOwn ? "Você" : displayName}
                                        </span>

                                        <p className="text-sm leading-snug text-text-primary break-words whitespace-pre-wrap">
                                            {msg.message}
                                        </p>

                                        <span className="text-[10px] text-text-muted">
                                            {formatTime(msg.created_at)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Erro de envio */}
                    {loadError && (
                        <p className="px-5 py-2 text-xs text-red-400 bg-red-950/30 border-t border-red-900/30 shrink-0">
                            {loadError}
                        </p>
                    )}

                    {/* Input — padding inline para garantir o mesmo respiro do resto do popup */}
                    <div
                        className="border-t border-dark-border bg-dark-elevated shrink-0"
                        style={{ padding: "1rem" }}
                    >
                        <div className="flex items-end gap-3">
                            <textarea
                                ref={textareaRef}
                                rows={1}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Digite sua mensagem..."
                                maxLength={500}
                                disabled={isPending}
                                className="flex-1 resize-none rounded-xl bg-black/50 border border-gray-800 focus:border-orange-500 outline-none transition text-sm leading-snug text-text-primary placeholder:text-text-muted disabled:opacity-50 min-h-[2.75rem] max-h-[7.5rem]"
                                style={{ paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isPending || !input.trim()}
                                aria-label="Enviar mensagem"
                                className="w-12 h-12 rounded-xl bg-neon-gradient flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all"
                            >
                                <svg className="w-5 h-5 text-pitch-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9-7-9-7v6H3v2h9v6z" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-[10px] text-text-muted" style={{ marginTop: "0.5rem", paddingLeft: "0.25rem" }}>
                            Enter para enviar · Shift + Enter para nova linha
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}