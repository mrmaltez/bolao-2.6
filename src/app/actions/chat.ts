"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Busca as últimas N mensagens do chat geral, mais antigas primeiro.
 * Faz join manual com profiles para trazer username/avatar de cada autor.
 */
export async function getChatMessages(limit = 50) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("chat_messages")
        .select("id, user_id, message, created_at, profiles(username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("[Chat] Erro ao buscar mensagens:", error.message);
        return { messages: [] };
    }

    // Reverte para ordem cronológica (mais antiga primeiro) para exibição
    return { messages: (data ?? []).reverse() };
}

/**
 * Envia uma nova mensagem no chat geral.
 * O texto é limitado a 500 caracteres (mesmo limite do CHECK constraint no banco).
 */
export async function sendChatMessage(message: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Você precisa estar logado para enviar mensagens." };
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
        return { error: "A mensagem não pode estar vazia." };
    }
    if (trimmed.length > 500) {
        return { error: "Mensagem muito longa (máx. 500 caracteres)." };
    }

    const { error } = await supabase
        .from("chat_messages")
        .insert({ user_id: user.id, message: trimmed });

    if (error) {
        console.error("[Chat] Erro ao enviar mensagem:", error.message);
        return { error: "Não foi possível enviar a mensagem." };
    }

    return { success: true };
}

/**
 * Marca que o usuário viu o chat agora — usado para zerar o badge de não lidas.
 */
export async function markChatAsSeen() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Não autenticado." };

    const { error } = await supabase
        .from("profiles")
        .update({ last_seen_chat_at: new Date().toISOString() })
        .eq("id", user.id);

    if (error) {
        console.error("[Chat] Erro ao marcar como visto:", error.message);
        return { error: error.message };
    }

    return { success: true };
}

/**
 * Retorna o timestamp da última mensagem do chat e o last_seen_chat_at
 * do usuário atual — usado para decidir se mostra o badge de notificação.
 */
export async function getChatUnreadStatus() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { hasUnread: false };

    const [{ data: lastMessage }, { data: profile }] = await Promise.all([
        supabase
            .from("chat_messages")
            .select("created_at")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase
            .from("profiles")
            .select("last_seen_chat_at")
            .eq("id", user.id)
            .single(),
    ]);

    if (!lastMessage) return { hasUnread: false };

    const lastSeenAt = profile?.last_seen_chat_at
        ? new Date(profile.last_seen_chat_at).getTime()
        : 0;
    const lastMessageAt = new Date(lastMessage.created_at).getTime();

    return { hasUnread: lastMessageAt > lastSeenAt };
}