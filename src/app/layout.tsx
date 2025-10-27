import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarLayout } from "@/components/SidebarLayout";

export const metadata: Metadata = {
  title: "QT Office - Check Printing System",
  description: "Comprehensive check printing and payment management system",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SidebarLayout>
            {children}
          </SidebarLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}