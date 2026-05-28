import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // Se as credenciais Supabase não estiverem configuradas (ex: .env.local com placeholders),
  // permite a requisição sem autenticação para não bloquear o desenvolvimento.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const isConfigured =
    supabaseUrl.startsWith("http") && supabaseKey.length > 10;

  if (!isConfigured) {
    // Aviso no console durante desenvolvimento
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Bolão 26] ⚠️  Supabase não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local"
      );
    }
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
