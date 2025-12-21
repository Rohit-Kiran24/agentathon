import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <--- THIS LINE IS CRITICAL

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BizNexus",
  description: "Agentic AI Dashboard",
};

import { AuthProvider } from "@/context/AuthContext";

import GlobalBackground from "@/components/ui/GlobalBackground";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <GlobalBackground />
          <div className="relative z-10 min-h-screen">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}