import type { Metadata } from "next";
import { Crimson_Pro, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Open Voice Project",
  description: "TTRPG voice session participant portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${crimsonPro.variable} ${inter.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col font-serif text-ink"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(212, 201, 181, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(212, 201, 181, 0.2) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 100%, rgba(232, 224, 208, 0.4) 0%, transparent 50%),
            #f5f0e8
          `,
        }}
      >
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster
          theme="light"
          style={
            {
              "--normal-bg": "var(--popover)",
              "--normal-text": "var(--popover-foreground)",
              "--normal-border": "var(--border)",
            } as React.CSSProperties
          }
        />
      </body>
    </html>
  );
}
