import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proteção server-side (o middleware já faz isso, mas é boa prática manter aqui também)
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-pitch-black flex flex-col">
      {/* Conteúdo principal com padding para o nav */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))" }}
      >
        {children}
      </div>

      {/* Bottom Navigation fixo */}
      <BottomNav />
    </div>
  );
}
