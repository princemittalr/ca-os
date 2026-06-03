import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SplashProvider from "@/components/layout/SplashProvider";
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import OnboardingTour from "@/components/layout/OnboardingTour";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport = {
  themeColor: "#F8FAFC",
};

export const metadata: Metadata = {
  title: 'Reckon AI',
  icons: {
    icon: '/assets/reckon-logo.png',
  },
  description: "AI-powered operating system for Chartered Accountants. GST reconciliation, compliance automation, import recon, and intelligent financial workflows.",
  metadataBase: new URL("https://reckonai.com"),
  openGraph: {
    title: "Reckon AI – CA Intelligence Platform",
    description: "AI-powered operating system for Chartered Accountants. GST reconciliation, compliance automation, import recon, and intelligent financial workflows.",
    siteName: "Reckon AI",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reckon AI – CA Intelligence Platform",
    description: "AI-powered operating system for Chartered Accountants. GST reconciliation, compliance automation, import recon, and intelligent financial workflows.",
  },
  appleWebApp: {
    capable: true,
    title: "Reckon AI",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/assets/reckon-logo.png" />
      </head>
      <body className={`${inter.variable} font-sans bg-[#F8FAFC] text-slate-900 h-screen w-screen overflow-hidden flex`}>
        <SplashProvider>
          <ErrorBoundary>
            <ClientLayoutWrapper>
              <OnboardingTour />
              {children}
            </ClientLayoutWrapper>
          </ErrorBoundary>
        </SplashProvider>
      </body>
    </html>
  );
}