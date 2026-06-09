import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ZikaBlockerWrapper } from "@/components/ui/ZikaBlockerWrapper";

export const metadata: Metadata = {
  title: {
    default: "Bolão Copa 2026 🏆",
    template: "%s | Bolão Copa 2026",
  },
  description:
    "O bolão mais elegante da Copa do Mundo 2026. Faça seus palpites, dispute com a rapaziada e acompanhe o ranking em tempo real.",
  keywords: ["bolão", "copa do mundo 2026", "palpites", "futebol"],
  authors: [{ name: "Bolão 26" }],
  openGraph: {
    title: "Bolão Copa 2026 🏆",
    description: "Faça seus palpites e dispute com os amigos!",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#080808",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-pitch-black text-text-primary antialiased w-full min-h-screen flex flex-col items-center justify-start overflow-x-hidden relative">
        <Suspense fallback={null}>
          <ZikaBlockerWrapper />
        </Suspense>
        
        {/* Imagem de fundo global imersiva */}
        <div className="fixed inset-0 z-0 bg-[url('/copa1.jpg')] bg-cover bg-center opacity-10 pointer-events-none"></div>
        
        {/* Conteúdo Principal */}
        <div className="relative z-10 w-full flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
