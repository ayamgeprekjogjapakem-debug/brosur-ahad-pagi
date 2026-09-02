import type { Metadata } from "next";
import { Inter, Amiri, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "./SettingsContext";
import AnalyticsTracker from "./AnalyticsTracker";
import ThemeToggle from "./components/ThemeToggle";
import NetworkStatus from "./components/NetworkStatus";
import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const amiri = Amiri({ weight: ["400", "700"], subsets: ["arabic"], variable: "--font-amiri" });
const notoNaskh = Noto_Naskh_Arabic({ weight: ["400", "700"], subsets: ["arabic"], variable: "--font-trad-arabic" });

export const metadata: Metadata = {
  title: "Brosur MTA Digital | Arsip Kajian Ahad Pagi (Non-Official)",
  description: "Dedikasi untuk mempermudah peserta kajian mengakses, mencari, dan membaca arsip Brosur Ahad Pagi MTA secara instan dan komprehensif.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Ambil pengaturan tema dari cookie
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value;
  const isDarkMode = theme === 'dark';

  return (
    <html
      lang="id"
      className={`${inter.variable} ${isDarkMode ? 'dark' : ''} h-full print:h-auto antialiased`}
      suppressHydrationWarning
    >
      <body className={`min-h-full print:min-h-0 print:h-auto flex flex-col font-sans bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 ${amiri.variable} ${notoNaskh.variable}`} suppressHydrationWarning>
        <AnalyticsTracker />
        <ThemeToggle />
        <NetworkStatus />
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
