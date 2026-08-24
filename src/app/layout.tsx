import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dheeraj Kumar - Portfolio",
  description: "Data Science & Automation Engineer",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
