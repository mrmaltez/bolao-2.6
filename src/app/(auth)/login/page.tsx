import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Faça login no Bolão Copa 2026 e entre na disputa!",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; signup?: string }>;
}) {
  return (
    <main className="min-h-dvh bg-pitch-black flex flex-col items-center justify-center px-6 py-12 page-enter">
      {/* Background decorativo */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(212,160,23,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Estrela decorativa top */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-neon-600/40 text-xs tracking-[0.4em] uppercase font-light select-none">
        ✦ Copa do Mundo 2026 ✦
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / Título */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-dark-card border border-dark-border mb-6 shadow-neon-glow relative">
            <span
              className="text-4xl"
              role="img"
              aria-label="troféu"
              style={{ filter: "drop-shadow(0 0 8px rgba(212,160,23,0.6))" }}
            >
              🏆
            </span>
            {/* Anel pulsante */}
            <div className="absolute inset-0 rounded-full border border-neon-600/30 animate-pulse-neon" />
          </div>

          <h1 className="text-4xl font-black text-text-primary tracking-tight leading-tight">
            Bolão
          </h1>
          <p className="text-xl font-bold text-neon-500 mt-1 uppercase tracking-widest">
            Copa 2026
          </p>
          <p className="text-text-muted text-xs tracking-widest uppercase mt-3">
            Entre para disputar com a rapaziada
          </p>
        </div>

        {/* Mensagem de cadastro realizado */}
        <SignupSuccessMessage searchParams={searchParams} />

        {/* Card do formulário */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-md">
          <LoginForm />

          <div className="relative my-6">
            <hr className="neon-divider" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 px-3 bg-dark-card text-xs text-text-muted">
              ou
            </span>
          </div>

          <p className="text-center text-sm text-text-secondary">
            Não tem conta?{" "}
            <Link
              href="/cadastro"
              id="go-to-signup-link"
              className="text-neon-400 font-medium hover:text-neon-300 transition-colors underline underline-offset-2"
            >
              Criar conta grátis
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-muted mt-6">
          Ao entrar, você concorda com as regras do bolão.
        </p>
      </div>
    </main>
  );
}

// Componente async para ler searchParams
async function SignupSuccessMessage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; signup?: string }>;
}) {
  const params = await searchParams;

  if (params.signup === "success") {
    return (
      <div className="mb-4 px-4 py-3 rounded-lg bg-green-950/50 border border-green-800/50 text-green-400 text-sm text-center animate-fade-in">
        ✅ Conta criada! Verifique seu e-mail para confirmar o cadastro.
      </div>
    );
  }

  if (params.error === "auth_callback_error") {
    return (
      <div className="mb-4 px-4 py-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-400 text-sm text-center animate-fade-in">
        ❌ Erro na autenticação. Por favor, tente novamente.
      </div>
    );
  }

  return null;
}
