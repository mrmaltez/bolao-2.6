import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Criar Conta",
  description: "Crie sua conta, faça seus palpites e entre na disputa do Bolão Copa 2026!",
};

export default function CadastroPage() {
  return (
    <main className="relative z-10 w-full min-h-screen flex items-center justify-center py-8 page-enter">
      <div className="w-[calc(100%-2rem)] mx-auto max-w-md bg-dark-card px-8 py-10 rounded-2xl shadow-2xl flex flex-col gap-6 border border-dark-border">
        {/* Header */}
        <div className="text-center">
          <Link
            href="/login"
            id="back-to-login-link"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-neon-400 transition-colors mb-6"
          >
            ← Voltar para o Login
          </Link>

          <h1 className="text-3xl font-black text-text-primary tracking-tight leading-tight">
            Entrar no Bolão
          </h1>
          <p className="text-lg font-bold text-neon-500 mt-1 uppercase tracking-widest">
            Copa do Mundo 2026
          </p>
          <p className="text-text-muted text-xs tracking-wide mt-2">
            Crie sua conta e faça seus palpites especiais
          </p>
        </div>

        {/* Aviso Palpite Especial */}
        <div className="px-4 py-3.5 rounded-xl bg-neon-900/20 border border-neon-700/30 text-sm">
          <p className="text-neon-400 font-medium mb-1">⚽ Palpite Especial</p>
          <p className="text-text-secondary text-xs leading-relaxed">
            Acertar o Campeão e a Final valem pontos bônus no Ranking!
            Esses campos só podem ser preenchidos agora no cadastro.
          </p>
        </div>

        <SignUpForm />

        <div className="relative">
          <hr className="neon-divider" />
        </div>

        <p className="text-center text-sm text-text-secondary">
          Já tem conta?{" "}
          <Link
            href="/login"
            id="go-to-login-link"
            className="text-neon-400 font-medium hover:text-neon-300 transition-colors underline underline-offset-2"
          >
            Fazer login
          </Link>
        </p>

        <p className="text-center text-xs text-text-muted">
          Ao criar sua conta, você concorda com as regras do bolão.
          Os palpites de Campeão e Final não poderão ser alterados após a Copa começar.
        </p>
      </div>
    </main>
  );
}
