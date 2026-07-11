import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SoundProvider } from "@/components/sound-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const themeInitScript = `
(() => {
  try {
    const theme = window.localStorage.getItem("mimi-ui-theme-v1");
    document.documentElement.dataset.mimiTheme = theme === "light" ? "light" : "dark";
  } catch {
    document.documentElement.dataset.mimiTheme = "dark";
  }
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mimi PTE Words",
  description: "Calm vocabulary flashcards for Mimi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-full font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <SoundProvider>{children}</SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
