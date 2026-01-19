import type { Metadata, Viewport } from "next";
import { Tajawal } from "next/font/google";
import { ThemeProvider } from "@/components";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  display: "swap",
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "Rasmalak - Your Smart Financial Advisor | راسمالك",
  description: "Rasmalak is your AI-powered personal financial advisor. Budget management, expense tracking, and financial planning in Arabic and English. راسمالك هو مستشارك المالي الشخصي بالذكاء الاصطناعي.",
  keywords: ["rasmalak", "راسمالك", "personal finance", "تمويل شخصي", "budget", "ميزانية", "AI", "ذكاء اصطناعي", "financial management", "إدارة مالية"],
  authors: [{ name: "Rasmalak AI" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rasmalak",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    alternateLocale: "en_US",
    siteName: "Rasmalak",
    title: "Rasmalak - Your Smart Financial Advisor",
    description: "AI-powered personal financial advisor for budget management and financial planning",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1B4D3E",
  viewportFit: "cover",
};

// Inline script to prevent layout shift by setting lang/dir/theme before React hydrates
const initScript = `
(function() {
  try {
    var stored = localStorage.getItem('rasmalak-storage');
    if (stored) {
      var data = JSON.parse(stored);
      var state = data.state || {};
      // Set language direction
      if (state.language) {
        document.documentElement.lang = state.language;
        document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';
      }
      // Set theme
      if (state.theme) {
        document.documentElement.setAttribute('data-theme', state.theme);
      }
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${tajawal.className} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
