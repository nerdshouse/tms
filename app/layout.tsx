import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Nerdshouse Client Portal",
  description: "Client-facing change request portal for Nerdshouse Technologies LLP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextTopLoader color="#4a4fe0" height={2} showSpinner={false} />
        {children}
      </body>
    </html>
  );
}
