import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${plexSans.variable} antialiased`}>
        <Providers>
          <div className="grid min-h-svh grid-rows-[auto_1fr]">
            <Header />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
