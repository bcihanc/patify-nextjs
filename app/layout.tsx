import { Nunito } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

// Base URL for absolute OG/Twitter image URLs (metadataBase). Two failure modes
// this guards against, both of which broke WhatsApp link previews:
//   1. Unset in production → must NOT fall back to localhost (WhatsApp can't
//      fetch localhost, so the pet photo never rendered). Default to the real
//      production domain when NODE_ENV is production.
//   2. PUBLIC_URL already carrying a protocol (e.g. "https://patify.net") →
//      the old `https://${PUBLIC_URL}` produced "https://https://patify.net".
//      Normalize by only prefixing the protocol when it's missing.
const rawUrl =
  process.env.PUBLIC_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://patify.net");
const defaultUrl = /^https?:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Patify",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const nunito = Nunito({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={nunito.className} suppressHydrationWarning>
    <head>
      <meta name="appleid-signin-client-id" content="com.bcc.buschat.web" />
      <meta name="appleid-signin-scope" content="name email" />
      <meta name="appleid-signin-redirect-uri" content="https://uynwrqccvfcwunrzoxva.supabase.co/auth/v1/callback" />
      <meta name="appleid-signin-use-popup" content="false" />
    </head>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
