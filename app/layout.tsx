import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GraphQL Burp Generator",
  description: "Introspection JSON to Burp-ready GraphQL requests"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto min-h-screen max-w-7xl px-6 py-8">
          <header className="mb-8 border-b border-zinc-800 pb-4">
            <h1 className="text-2xl font-bold">GraphQL Burp Generator</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Introspection response to Burp-ready GraphQL requests
            </p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
