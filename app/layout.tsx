import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Delta",
  description: "Early-stage founder AI agent workstation",
};

import Sidebar from "@/components/Sidebar";
import PageAnimate from "@/components/PageAnimate";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-screen flex overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
        <Sidebar />
        <PageAnimate>
          {children}
        </PageAnimate>
      </body>
    </html>
  );
}
