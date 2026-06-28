import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import { ChatWidget } from "@/components/dashboard/ChatWidget";

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
    <div className="w-full min-h-screen flex flex-col items-center justify-start bg-pitch-black">
      {/* Conteúdo principal com padding para o nav */}
      <div
        className="flex-1 w-full overflow-y-auto p-4 md:p-0"
        style={{ paddingBottom: "calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))" }}
      >
        {children}
      </div>

      {/* Bottom Navigation fixo */}
      <BottomNav />

      {/* Chat flutuante — visível em todas as páginas do dashboard */}
      <ChatWidget currentUserId={user.id} />
    </div>
  );
}