import { notFound } from "next/navigation";
import { AdminPanel } from "@/components/dashboard/AdminPanel";

interface PageProps {
    params: Promise<{ secret: string }>;
}

export default async function AdminPage({ params }: PageProps) {
    const { secret } = await params;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret || secret !== adminSecret) {
        notFound();
    }

    return <AdminPanel />;
}