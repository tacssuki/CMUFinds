import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/toaster";
import ChatButton from "@/components/ChatButton";
import SocketManager from "@/components/layout/SocketManager";
import { ThemeProvider } from "@/components/providers/theme-provider";

// Import token debug for development
import "@/lib/tokenDebug";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CMUFinds - Lost and Found System",
  description: "A platform to help City of Malabon University students find lost items and return found ones",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* You can add other head elements here if needed */}
      </head>
      <body className={inter.className}>
        <ThemeProvider
          defaultTheme="system"
        >
        <SocketManager />
        <Navbar />
        <main className="container min-h-screen py-8">
          {children}
        </main>
        <footer className="border-t py-6">
          <div className="container text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} CMUFinds. All rights reserved.</p>
          </div>
        </footer>
        <Toaster />
        <ChatButton />
        </ThemeProvider>
      </body>
    </html>
  );
} 