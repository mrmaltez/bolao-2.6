"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const signUpSchema = z
  .object({
    username: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(30, "Máximo 30 caracteres")
      .regex(/^[a-zA-Z0-9_]+$/, "Apenas letras, números e _"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string(),
    palpite_campeao: z
      .string()
      .min(2, "Informe o seu palpite para o Campeão")
      .max(50, "Máximo 50 caracteres"),
    palpite_final: z
      .string()
      .min(5, "Informe o confronto da Final (ex: Brasil vs Argentina)")
      .max(100, "Máximo 100 caracteres"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type SignUpData = z.infer<typeof signUpSchema>;

// Seleções da Copa 2026 — para o datalist de sugestões
const SELECOES = [
  "Argentina", "Brasil", "França", "Alemanha", "Espanha", "Inglaterra",
  "Portugal", "Holanda", "Bélgica", "Croácia", "Itália", "Uruguai",
  "México", "Estados Unidos", "Canadá", "Marrocos", "Senegal", "Japão",
];

export function SignUpForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpData>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = async (data: SignUpData) => {
    setIsLoading(true);
    setServerError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          palpite_campeao: data.palpite_campeao,
          palpite_final: data.palpite_final,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setServerError(
        error.message.includes("already registered")
          ? "E-mail já cadastrado. Faça o login."
          : `Erro ao cadastrar: ${error.message}`
      );
      setIsLoading(false);
      return;
    }

    // Sucesso — redireciona para login com mensagem de confirmação
    router.push("/login?signup=success");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Username */}
      <div className="space-y-1.5">
        <label htmlFor="signup-username" className="block text-xs font-medium tracking-widest uppercase text-text-secondary">
          Apelido no Bolão
        </label>
        <input
          id="signup-username"
          type="text"
          autoComplete="username"
          placeholder="Ex: RafahGol, Cris10, ZéDoBolão"
          {...register("username")}
          className="w-full px-4 py-3.5 rounded-lg bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/40 transition-all duration-200 text-sm"
        />
        {errors.username && (
          <p className="text-xs text-red-400">{errors.username.message}</p>
        )}
      </div>

      {/* E-mail */}
      <div className="space-y-1.5">
        <label htmlFor="signup-email" className="block text-xs font-medium tracking-widest uppercase text-text-secondary">
          E-mail
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
          {...register("email")}
          className="w-full px-4 py-3.5 rounded-lg bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/40 transition-all duration-200 text-sm"
        />
        {errors.email && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      {/* Senha */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="block text-xs font-medium tracking-widest uppercase text-text-secondary">
            Senha
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("password")}
            className="w-full px-4 py-3.5 rounded-lg bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/40 transition-all duration-200 text-sm"
          />
          {errors.password && (
            <p className="text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="signup-confirm-password" className="block text-xs font-medium tracking-widest uppercase text-text-secondary">
            Confirmar
          </label>
          <input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("confirmPassword")}
            className="w-full px-4 py-3.5 rounded-lg bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/40 transition-all duration-200 text-sm"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      {/* Divisor temático */}
      <div className="relative py-4 my-2">
        <hr className="gold-divider" />
        <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 px-3 bg-dark-card text-[11px] text-gold-500 font-bold uppercase tracking-widest">
          ⚽ Seus Palpites Especiais
        </span>
      </div>

      {/* Palpite Campeão */}
      <div className="space-y-1.5">
        <label htmlFor="signup-campeao" className="block text-xs font-medium tracking-widest uppercase text-text-secondary">
          🏆 Palpite Campeão
        </label>
        <input
          id="signup-campeao"
          type="text"
          list="selecoes-list"
          placeholder="Qual seleção vai ser Campeã?"
          {...register("palpite_campeao")}
          className="w-full px-4 py-3.5 rounded-lg bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/40 transition-all duration-200 text-sm"
        />
        <datalist id="selecoes-list">
          {SELECOES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {errors.palpite_campeao && (
          <p className="text-xs text-red-400">{errors.palpite_campeao.message}</p>
        )}
      </div>

      {/* Palpite Final */}
      <div className="space-y-1.5">
        <label htmlFor="signup-final" className="block text-xs font-medium tracking-widest uppercase text-text-secondary">
          🥇 Palpite da Final
        </label>
        <input
          id="signup-final"
          type="text"
          placeholder="Ex: Brasil vs Argentina"
          {...register("palpite_final")}
          className="w-full px-4 py-3.5 rounded-lg bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/40 transition-all duration-200 text-sm"
        />
        {errors.palpite_final && (
          <p className="text-xs text-red-400">{errors.palpite_final.message}</p>
        )}
        <p className="text-xs text-text-muted">
          Informe os dois times que disputarão a Final
        </p>
      </div>

      {/* Erro do servidor */}
      {serverError && (
        <div className="px-4 py-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-400 text-sm">
          {serverError}
        </div>
      )}

      {/* Botão */}
      <button
        id="signup-submit-btn"
        type="submit"
        disabled={isLoading}
        className="w-full py-4 rounded-lg font-semibold text-sm tracking-wide text-pitch-black bg-gold-gradient hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-pitch-black/30 border-t-pitch-black rounded-full animate-spin" />
            Criando conta...
          </span>
        ) : (
          "Criar Conta e Entrar no Bolão"
        )}
      </button>
    </form>
  );
}
