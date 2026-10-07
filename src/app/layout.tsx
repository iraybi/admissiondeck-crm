import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/tokens.css";
import "@/styles/layout.css";

export const metadata: Metadata = {
  title: "AdmissionDeck CRM",
  description:
    "Multi-tenant student consulting platform for firms, agencies, and counsellors.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
