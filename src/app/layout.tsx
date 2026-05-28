import type { Metadata, Viewport } from "next";
import "./globals.css";

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
      <body className="bg-pitch-black text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
