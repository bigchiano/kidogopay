import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://kidogopay.xyz"),
  title: {
    default: "KidogoPay | USDC and USDT to KES and NGN",
    template: "%s | KidogoPay",
  },
  description:
    "Get a USDC and USDT address that pays straight into your bank account or M-Pesa. Buy stablecoins with M-Pesa or a Nigerian bank transfer.",
};

export const viewport: Viewport = {
  themeColor: "#1e2466",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
