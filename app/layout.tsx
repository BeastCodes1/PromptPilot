import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromptPilot — Turn your idea into a build plan",
  description: "Go from rough idea to a clear blueprint, practical roadmap, and AI-ready coding prompt.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
