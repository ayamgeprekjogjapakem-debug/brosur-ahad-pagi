import type { Metadata } from "next";
import { Outfit, Amiri } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "./SettingsContext";
import AnalyticsTracker from "./AnalyticsTracker";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const amiri = Amiri({ weight: ["400", "700"], subsets: ["arabic"], variable: "--font-amiri" });

export const metadata: Metadata = {
  title: "Brosur MTA Digital | Arsip Kajian Ahad Pagi (Non-Official)",
  description: "Dedikasi untuk mempermudah peserta kajian mengakses, mencari, dan membaca arsip Brosur Ahad Pagi MTA secara instan dan komprehensif.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`min-h-full flex flex-col font-sans bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 ${amiri.variable}`} suppressHydrationWarning>
        <AnalyticsTracker />
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
