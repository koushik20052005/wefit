import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import AuthGate from "@/components/AuthGate";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "WEFIT — Train. Eat. Repeat.",
  description: "Smart workout plans, diet coaching, and streaks. Built for gym members.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "WEFIT" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#09090B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full`}>
      <body className="min-h-dvh bg-ink font-sans text-white antialiased">
        <ToastProvider>
          <AuthGate>
            <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-ink shadow-[0_0_60px_rgba(0,0,0,0.6)]">
              {children}
            </div>
          </AuthGate>
        </ToastProvider>
      </body>
    </html>
  );
}
