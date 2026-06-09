"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

type LoginData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    setServerError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : "Erro ao entrar. Tente novamente."
      );
      setIsLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      {/* E-mail */}
      <div className="flex flex-col gap-1">
        <label htmlFor="login-email" className="text-xs font-medium tracking-widest uppercase text-text-secondary">
          E-mail
        </label>
        <input
          id="login-email"
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
      <div className="flex flex-col gap-1">
        <label htmlFor="login-password" className="text-xs font-medium tracking-widest uppercase text-text-secondary">
          Senha
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
          className="w-full p-3 rounded-lg bg-black/50 border border-gray-800 focus:border-orange-500 outline-none transition text-sm text-text-primary placeholder:text-text-muted"
        />
        {errors.password && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      {/* Erro do servidor */}
      {serverError && (
        <div className="px-4 py-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-400 text-sm">
          {serverError}
        </div>
      )}

      {/* Botão */}
      <button
        id="login-submit-btn"
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide text-pitch-black bg-neon-gradient hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group mt-2"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-pitch-black/30 border-t-pitch-black rounded-full animate-spin" />
            Entrando...
          </span>
        ) : (
          <span className="relative z-10">Entrar</span>
        )}
      </button>
    </form>
  );
}
