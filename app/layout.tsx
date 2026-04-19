import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { NavShell } from "@/components/nav-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "RoyalSquare Chess",
  description: "Play beautiful chess with AI, friends, and game review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#1d1b19] font-sans text-slate-100 antialiased">
        <Providers>
          <NavShell />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
