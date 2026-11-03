import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import Footer from "@/components/footer";
import Header from "@/components/header";
import Providers from "@/components/providers";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description:
    "Developer profiles built from evidence in your GitHub repositories.",
  title: "GitFlex",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} overflow-x-clip`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="overflow-x-clip">
        <Providers>
          <a
            className="fixed top-3 left-3 z-(--z-toast) -translate-y-full rounded-md bg-foreground px-3 py-2 text-background text-sm focus-visible:translate-y-0"
            href="#main"
          >
            Skip to content
          </a>
          <div className="grid min-h-svh grid-rows-[auto_1fr_auto]">
            <Header />
            <main id="main">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
