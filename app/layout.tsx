import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CHAVE_TEMA } from "@/lib/tema";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Produto Coringa — Madel",
  description: "Gerador de encomendas especiais da Madel",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // A classe "dark" é aplicada pelo script abaixo antes da hidratação (evita piscar o tema),
    // então o HTML do servidor sempre difere dela de propósito.
    <html
      suppressHydrationWarning
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var tema = localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});
                if (!tema) {
                  tema = window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
                }
                if (tema === "escuro") document.documentElement.classList.add("dark");
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <header className="flex items-center justify-between border-b-2 border-red-700 bg-black px-4 py-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/logo-madel.png" alt="Madel" className="h-8 w-auto" />
            <span className="font-semibold text-white">Produto Coringa</span>
          </div>
          <ThemeToggle />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
