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
    <main className="relative z-10 w-full min-h-screen flex items-center justify-center page-enter">
      <div className="w-[calc(100%-2rem)] mx-auto max-w-md bg-dark-card px-8 py-10 rounded-2xl shadow-2xl flex flex-col gap-6 border border-dark-border">
        {/* Cabeçalho do Card */}
        <div className="flex flex-col items-center">
          <span className="text-4xl mb-2" role="img" aria-label="troféu">🏆</span>
          <h1 className="text-2xl font-bold text-center text-white">Bem-vindo ao Bolão</h1>
          <p className="text-gray-400 text-center text-sm mt-1">Faça login para continuar</p>
        </div>

        {/* Mensagem de cadastro realizado */}
        <SignupSuccessMessage searchParams={searchParams} />

        <LoginForm />

        <div className="relative mt-2">
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

        {/* Footer */}
        <p className="text-center text-xs text-text-muted">
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
