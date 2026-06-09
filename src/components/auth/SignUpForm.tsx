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
    password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
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

// Seleções classificadas/prováveis para a Copa 2026 (ordem alfabética)
const WORLD_CUP_TEAMS = [
  "Alemanha", "Arábia Saudita", "Argentina", "Austrália", "Áustria",
  "Bélgica", "Brasil", "Camarões", "Canadá", "Chile",
  "Colômbia", "Coreia do Sul", "Costa do Marfim", "Croácia",
  "Dinamarca", "Equador", "Espanha", "Estados Unidos",
  "França", "Gana", "Holanda", "Inglaterra",
  "Itália", "Japão", "Marrocos", "México",
  "Nigéria", "Paraguai", "Peru", "Polônia",
  "Portugal", "Senegal", "Sérvia", "Suíça", "Uruguai",
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      {/* Username */}
      <div className="flex flex-col gap-1">
        <label htmlFor="signup-username" className="text-xs font-medium tracking-widest uppercase text-text-secondary">
          Apelido no Bolão
        </label>
        <input
          id="signup-username"
          type="text"
          autoComplete="username"
          placeholder="Ex: RafahGol, Cris10, ZéDoBolão"
          {...register("username")}
          className="w-full p-3 rounded-lg bg-black/50 border border-gray-800 focus:border-orange-500 outline-none transition text-sm text-text-primary placeholder:text-text-muted"
        />
        {errors.username && (
          <p className="text-xs text-red-400">{errors.username.message}</p>
        )}
      </div>

      {/* E-mail */}
      <div className="flex flex-col gap-1">
        <label htmlFor="signup-email" className="text-xs font-medium tracking-widest uppercase text-text-secondary">
          E-mail
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
          {...register("email")}
          className="w-full p-3 rounded-lg bg-black/50 border border-gray-800 focus:border-orange-500 outline-none transition text-sm text-text-primary placeholder:text-text-muted"
        />
        {errors.email && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      {/* Senha */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-password" className="text-xs font-medium tracking-widest uppercase text-text-secondary">
            Senha
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("password")}
            className="w-full p-3 rounded-lg bg-black/50 border border-gray-800 focus:border-orange-500 outline-none transition text-sm text-text-primary placeholder:text-text-muted"
          />
          {errors.password && (
            <p className="text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-confirm-password" className="text-xs font-medium tracking-widest uppercase text-text-secondary">
            Confirmar
          </label>
          <input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("confirmPassword")}
            className="w-full p-3 rounded-lg bg-black/50 border border-gray-800 focus:border-orange-500 outline-none transition text-sm text-text-primary placeholder:text-text-muted"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      {/* Seção de Palpites Especiais agrupada visualmente */}
      <div className="bg-black/30 p-4 rounded-xl border border-gray-800 flex flex-col gap-5 mt-2">
        {/* Divisor temático removido ou substituído por título mais limpo */}
        <div className="text-center">
          <span className="text-[11px] text-neon-500 font-bold uppercase tracking-widest">
            ⚽ Seus Palpites Especiais
          </span>
        </div>

        {/* Palpite Campeão */}
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-campeao" className="text-xs font-medium tracking-widest uppercase text-text-secondary">
            🏆 Palpite Campeão
          </label>
          <select
            id="signup-campeao"
            defaultValue=""
            {...register("palpite_campeao")}
            className="w-full p-3 rounded-lg bg-black/50 border border-gray-800 focus:border-orange-500 outline-none transition text-sm text-text-primary"
          >
            <option value="" disabled>Selecione a seleção campeã...</option>
            {WORLD_CUP_TEAMS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.palpite_campeao && (
            <p className="text-xs text-red-400">{errors.palpite_campeao.message}</p>
          )}
        </div>

        {/* Palpite Final */}
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-final" className="text-xs font-medium tracking-widest uppercase text-text-secondary">
            🥇 Palpite da Final
          </label>
          <input
            id="signup-final"
            type="text"
            placeholder="Ex: Brasil vs Argentina"
            {...register("palpite_final")}
            className="w-full p-3 rounded-lg bg-black/50 border border-gray-800 focus:border-orange-500 outline-none transition text-sm text-text-primary placeholder:text-text-muted"
          />
          {errors.palpite_final && (
            <p className="text-xs text-red-400">{errors.palpite_final.message}</p>
          )}
          <p className="text-xs text-text-muted mt-0.5">
            Informe os dois times que disputarão a Final
          </p>
        </div>
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
        className="w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide text-pitch-black bg-neon-gradient hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
