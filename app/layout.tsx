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
  metadataBase: new URL('https://brosurmta.vercel.app'), // Ganti dengan URL asli nantinya
  title: {
    template: "%s | Brosur MTA Digital",
    default: "Brosur MTA Digital | Arsip Kajian Ahad Pagi",
  },
  description: "Arsip lengkap Brosur Ahad Pagi MTA (Majlis Tafsir Al-Qur'an). Cari dalil, hadits, dan penjelasan tentang zakat, sholat, ibadah, dan muamalah menurut Brosur MTA.",
  keywords: ["brosur mta", "kajian mta", "ahad pagi mta", "majlis tafsir al quran", "referensi brosur mta", "zakat mta", "sholat mta"],
  openGraph: {
    title: "Brosur MTA Digital | Arsip Kajian Ahad Pagi",
    description: "Arsip referensi kajian Ahad Pagi MTA. Temukan kumpulan dalil dan penjelasan lengkap di sini.",
    type: "website",
    locale: "id_ID",
  },
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
